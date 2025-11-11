import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_BASE = '/api';

function App() {
  const [data, setData] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [message, setMessage] = useState(null);

  // Sheet/tab states
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');

  // Filter states
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [data, activeSheet, searchQuery, selectedVendor, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/storage`);
      
      if (response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
        // Multi-sheet data
        setData(response.data.data);
        setSheetNames(response.data.sheetNames || Object.keys(response.data.data));
        
        // Set initial active sheet if not set
        if (!activeSheet && response.data.sheetNames && response.data.sheetNames.length > 0) {
          setActiveSheet(response.data.sheetNames[0]);
        }
        
        // Extract filter options from current active sheet data
        const currentSheetData = response.data.data[activeSheet] || [];
        extractFilterOptions(currentSheetData);
      } else {
        // Legacy single sheet data
        setData(response.data.data || []);
        extractFilterOptions(response.data.data || []);
      }
      
      setLastSync(response.data.lastSync);
      setError(null);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const extractFilterOptions = (data) => {
    // Assuming common column names - adjust based on your actual sheet structure
    const vendorField = data.length > 0 ? Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('vendor') || key.toLowerCase().includes('manufacturer')
    ) : null;
    
    const statusField = data.length > 0 ? Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('status') || key.toLowerCase().includes('support')
    ) : null;

    if (vendorField) {
      const uniqueVendors = [...new Set(data.map(item => item[vendorField]).filter(v => v && v.trim()))];
      setVendors(uniqueVendors.sort());
    }

    if (statusField) {
      const uniqueStatuses = [...new Set(data.map(item => item[statusField]).filter(s => s && s.trim()))];
      setStatuses(uniqueStatuses.sort());
    }
  };

  const applyFilters = () => {
    let filtered = [];
    
    // Get current sheet data
    if (Array.isArray(data)) {
      // Legacy single sheet data
      filtered = data;
    } else if (data && typeof data === 'object' && activeSheet) {
      // Multi-sheet data - get data from active sheet
      filtered = data[activeSheet] || [];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          value && value.toString().toLowerCase().includes(query)
        )
      );
    }

    // Apply vendor filter
    if (selectedVendor && filtered.length > 0) {
      const vendorField = Object.keys(filtered[0] || {}).find(key => 
        key.toLowerCase().includes('vendor') || key.toLowerCase().includes('manufacturer')
      );
      if (vendorField) {
        filtered = filtered.filter(item => item[vendorField] === selectedVendor);
      }
    }

    // Apply status filter
    if (selectedStatus && filtered.length > 0) {
      const statusField = Object.keys(filtered[0] || {}).find(key => 
        key.toLowerCase().includes('status') || key.toLowerCase().includes('support')
      );
      if (statusField) {
        filtered = filtered.filter(item => item[statusField] === selectedStatus);
      }
    }

    setFilteredData(filtered);
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      setMessage('Syncing data...');
      const response = await axios.post(`${API_BASE}/storage/sync`);
      setMessage(`Sync completed! ${response.data.count} records updated.`);
      await fetchData();
    } catch (err) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExport = (format) => {
    window.open(`${API_BASE}/storage/export/${format}`, '_blank');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedVendor('');
    setSelectedStatus('');
  };

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName);
    resetFilters();
  };

  if (loading && (Array.isArray(data) ? data.length === 0 : Object.keys(data).length === 0)) {
    return (
      <div className="container">
        <div className="loading">Loading storage integration data...</div>
      </div>
    );
  }

  // Get columns from current sheet data
  let currentSheetData = [];
  if (Array.isArray(data)) {
    currentSheetData = data;
  } else if (data && typeof data === 'object' && activeSheet) {
    currentSheetData = data[activeSheet] || [];
  }
  
  const columns = currentSheetData.length > 0 ? Object.keys(currentSheetData[0]).filter(key => !['id', 'last_updated', 'sheet_name'].includes(key)) : [];

  return (
    <div className="container">
      <div className="header">
        <h1>Storage Integration Dashboard</h1>
        <p>OpenShift Virtualization Storage Compatibility Status</p>
        {lastSync && (
          <div className="sync-status">
            Last updated: {new Date(lastSync).toLocaleString()}
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {sheetNames.length > 1 && (
        <div className="tabs">
          <div className="tab-list">
            {sheetNames.map(sheetName => (
              <button
                key={sheetName}
                className={`tab ${activeSheet === sheetName ? 'active' : ''}`}
                onClick={() => handleSheetChange(sheetName)}
              >
                {sheetName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search vendors, models, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          {vendors.length > 0 && (
            <select 
              value={selectedVendor} 
              onChange={(e) => setSelectedVendor(e.target.value)}
            >
              <option value="">All Vendors</option>
              {vendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
          )}

          {statuses.length > 0 && (
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          )}

          {(selectedVendor || selectedStatus || searchQuery) && (
            <button className="btn btn-secondary" onClick={resetFilters}>
              Clear Filters
            </button>
          )}
        </div>

        <div className="actions">
          <button 
            className="btn btn-primary" 
            onClick={handleSync}
            disabled={loading}
          >
            {loading ? 'Syncing...' : 'Sync Now'}
          </button>
          <button 
            className="btn btn-success" 
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </button>
          <button 
            className="btn btn-success" 
            onClick={() => handleExport('json')}
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="data-table">
        <div className="table-header">
          <h3>Storage Integration Status{activeSheet && sheetNames.length > 1 ? ` - ${activeSheet}` : ''}</h3>
          <div className="table-stats">
            Showing {filteredData.length} of {currentSheetData.length} records
          </div>
        </div>

        <div className="table-container">
          {filteredData.length > 0 ? (
            <table>
              <thead>
                <tr>
                  {columns.map(column => (
                    <th key={column}>
                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={row.id || index}>
                    {columns.map(column => (
                      <td key={column}>{row[column] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="loading">
              {currentSheetData.length === 0 ? 'No data available' : 'No results match your search criteria'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
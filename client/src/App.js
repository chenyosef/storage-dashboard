import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_BASE = '/api';

function App() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [message, setMessage] = useState(null);

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
  }, [data, searchQuery, selectedVendor, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/storage`);
      setData(response.data.data);
      setLastSync(response.data.lastSync);
      
      // Extract unique vendors and statuses for filters
      extractFilterOptions(response.data.data);
      
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
    let filtered = data;

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
    if (selectedVendor) {
      const vendorField = Object.keys(data[0] || {}).find(key => 
        key.toLowerCase().includes('vendor') || key.toLowerCase().includes('manufacturer')
      );
      if (vendorField) {
        filtered = filtered.filter(item => item[vendorField] === selectedVendor);
      }
    }

    // Apply status filter
    if (selectedStatus) {
      const statusField = Object.keys(data[0] || {}).find(key => 
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

  if (loading && data.length === 0) {
    return (
      <div className="container">
        <div className="loading">Loading storage integration data...</div>
      </div>
    );
  }

  const columns = data.length > 0 ? Object.keys(data[0]).filter(key => !['id', 'last_updated'].includes(key)) : [];

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
          <h3>Storage Integration Status</h3>
          <div className="table-stats">
            Showing {filteredData.length} of {data.length} records
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
              {data.length === 0 ? 'No data available' : 'No results match your search criteria'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
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
    // Helper function to get string value from cell (handles both string and hyperlink objects)
    const getCellValue = (cell) => {
      if (cell && typeof cell === 'object' && cell.text) {
        return cell.text;
      }
      return cell;
    };

    // Assuming common column names - adjust based on your actual sheet structure
    const vendorField = data.length > 0 ? Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('vendor') || key.toLowerCase().includes('manufacturer')
    ) : null;
    
    const statusField = data.length > 0 ? Object.keys(data[0]).find(key => 
      key.toLowerCase().includes('status') || key.toLowerCase().includes('support')
    ) : null;

    if (vendorField) {
      const uniqueVendors = [...new Set(data.map(item => getCellValue(item[vendorField])).filter(v => v && v.trim()))];
      setVendors(uniqueVendors.sort());
    }

    if (statusField) {
      const uniqueStatuses = [...new Set(data.map(item => getCellValue(item[statusField])).filter(s => s && s.trim()))];
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
        Object.values(item).some(value => {
          // Handle hyperlink objects
          if (value && typeof value === 'object' && value.text) {
            return value.text.toLowerCase().includes(query) || 
                   (value.url && value.url.toLowerCase().includes(query));
          }
          // Handle regular string values
          return value && value.toString().toLowerCase().includes(query);
        })
      );
    }

    // Helper function to get string value from cell (handles both string and hyperlink objects)
    const getCellValue = (cell) => {
      if (cell && typeof cell === 'object' && cell.text) {
        return cell.text;
      }
      return cell;
    };

    // Apply vendor filter
    if (selectedVendor && filtered.length > 0) {
      const vendorField = Object.keys(filtered[0] || {}).find(key => 
        key.toLowerCase().includes('vendor') || key.toLowerCase().includes('manufacturer')
      );
      if (vendorField) {
        filtered = filtered.filter(item => getCellValue(item[vendorField]) === selectedVendor);
      }
    }

    // Apply status filter
    if (selectedStatus && filtered.length > 0) {
      const statusField = Object.keys(filtered[0] || {}).find(key => 
        key.toLowerCase().includes('status') || key.toLowerCase().includes('support')
      );
      if (statusField) {
        filtered = filtered.filter(item => getCellValue(item[statusField]) === selectedStatus);
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

  // Function to detect and render hyperlinks in text
  const renderCellContent = (content) => {
    // Handle Google Sheets hyperlink objects
    if (content && typeof content === 'object' && content.isLink) {
      return (
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="cell-link"
          title={content.url}
        >
          {content.text}
        </a>
      );
    }

    // Handle regular text content
    if (!content || typeof content !== 'string') {
      return content || '-';
    }

    // Enhanced URL regex pattern that matches various URL formats
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+)/gi;
    const parts = content.split(urlRegex);
    
    if (parts.length === 1) {
      // No URLs found, return original content with line breaks preserved
      return content.split('\n').map((line, index) => (
        index === 0 ? line : [<br key={`br-${index}`} />, line]
      )).flat();
    }

    // Process parts and create elements
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        // This is a raw URL
        let url = part.trim();
        let displayUrl = url;
        
        // Add protocol if missing for www links
        if (url.toLowerCase().startsWith('www.')) {
          url = 'https://' + url;
        }
        
        // Truncate very long URLs for display
        if (displayUrl.length > 60) {
          displayUrl = displayUrl.substring(0, 57) + '...';
        }
        
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="cell-link raw-url"
            title={part.trim()}
          >
            {displayUrl}
          </a>
        );
      } else {
        // Regular text - preserve line breaks
        return part.split('\n').map((line, lineIndex) => (
          lineIndex === 0 ? line : [<br key={`br-${index}-${lineIndex}`} />, line]
        )).flat();
      }
    }).flat();
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
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1>Storage Integration Dashboard</h1>
            <p>OpenShift Virtualization Storage Compatibility</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleSync}
              disabled={loading}
            >
              {loading ? 'Syncing...' : 'Sync Now'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleExport('json')}
            >
              Export JSON
            </button>
          </div>
        </div>
        {lastSync && (
          <div className="sync-status">
            Last updated: {new Date(lastSync).toLocaleString()}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Data Sources</h3>
            {sheetNames.length > 1 && (
              <div className="tab-navigation">
                {sheetNames.map(sheetName => (
                  <button
                    key={sheetName}
                    className={`sidebar-tab ${activeSheet === sheetName ? 'active' : ''}`}
                    onClick={() => handleSheetChange(sheetName)}
                  >
                    {sheetName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Search & Filters</h3>
            
            <div className="search-section">
              <label htmlFor="search">Search</label>
              <input
                id="search"
                type="text"
                placeholder="Search vendors, models, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-input"
              />
            </div>

            {vendors.length > 0 && (
              <div className="filter-section">
                <label htmlFor="vendor-filter">Vendor</label>
                <select 
                  id="vendor-filter"
                  value={selectedVendor} 
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="sidebar-select"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(vendor => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
              </div>
            )}

            {statuses.length > 0 && (
              <div className="filter-section">
                <label htmlFor="status-filter">Status</label>
                <select 
                  id="status-filter"
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="sidebar-select"
                >
                  <option value="">All Statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            )}

            {(selectedVendor || selectedStatus || searchQuery) && (
              <button className="btn btn-outline reset-filters" onClick={resetFilters}>
                Clear Filters
              </button>
            )}

            <div className="filter-stats">
              <p>Showing {filteredData.length} of {currentSheetData.length} records</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="content-area">
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <div className="data-section">
            <div className="section-header">
              <h2>
                {activeSheet && sheetNames.length > 1 ? activeSheet : 'Storage Integration Status'}
              </h2>
            </div>

            <div className="table-container">
              {filteredData.length > 0 ? (
                <table className="data-table">
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
                          <td key={column}>{renderCellContent(row[column])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>
                    {currentSheetData.length === 0 ? 'No data available' : 'No results match your search criteria'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
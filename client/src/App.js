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
  
  // Smart checkbox filters
  const [availableFilters, setAvailableFilters] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [data, activeSheet, searchQuery, selectedVendor, selectedStatus, selectedFilters, availableFilters]);

  useEffect(() => {
    if (data && activeSheet) {
      // Extract filter options when active sheet changes
      let currentSheetData = [];
      if (Array.isArray(data)) {
        currentSheetData = data;
      } else if (data && typeof data === 'object' && activeSheet) {
        currentSheetData = data[activeSheet] || [];
      }
      extractFilterOptions(currentSheetData);
    }
  }, [data, activeSheet]);

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
    if (!data || data.length === 0) {
      setAvailableFilters({});
      setVendors([]);
      setStatuses([]);
      return;
    }

    // Helper function to get string value from cell (handles rich text, hyperlinks, and strings)
    const getCellValue = (cell) => {
      if (cell && typeof cell === 'object') {
        if (cell.isRichText && cell.richText) {
          // Combine all rich text parts into one string
          return cell.richText.map(part => part.text).join('');
        }
        if (cell.text) {
          return cell.text;
        }
      }
      return cell;
    };

    // Smart field detection with priority keywords
    const fieldMappings = {
      partner: ['partner', 'vendor', 'manufacturer', 'company', 'provider'],
      product: ['product', 'model', 'name', 'device', 'system'],
      status: ['status', 'state', 'support', 'condition', 'phase']
    };

    const fields = Object.keys(data[0]);
    const detectedFilters = {};

    // Detect filter fields based on keywords
    Object.entries(fieldMappings).forEach(([filterType, keywords]) => {
      const field = fields.find(fieldName => 
        keywords.some(keyword => fieldName.toLowerCase().includes(keyword))
      );
      
      if (field) {
        // Get unique values for this field
        const uniqueValues = [...new Set(
          data
            .map(item => getCellValue(item[field]))
            .filter(value => value && typeof value === 'string' && value.trim())
            .map(value => value.trim())
        )].sort();

        // Only include fields that have multiple values and reasonable count
        if (uniqueValues.length > 1 && uniqueValues.length <= 50) {
          detectedFilters[filterType] = {
            field: field,
            label: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            values: uniqueValues
          };
        }
      }
    });

    setAvailableFilters(detectedFilters);

    // Legacy support for dropdowns (keep existing functionality)
    const vendorField = fields.find(key => 
      key.toLowerCase().includes('vendor') || key.toLowerCase().includes('manufacturer') || key.toLowerCase().includes('partner')
    );
    
    const statusField = fields.find(key => 
      key.toLowerCase().includes('status') || key.toLowerCase().includes('support')
    );

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
          // Handle rich text objects
          if (value && typeof value === 'object' && value.isRichText && value.richText) {
            return value.richText.some(part =>
              part.text.toLowerCase().includes(query) ||
              (part.url && part.url.toLowerCase().includes(query))
            );
          }
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

    // Helper function to get string value from cell (handles rich text, hyperlinks, and strings)
    const getCellValue = (cell) => {
      if (cell && typeof cell === 'object') {
        if (cell.isRichText && cell.richText) {
          // Combine all rich text parts into one string
          return cell.richText.map(part => part.text).join('');
        }
        if (cell.text) {
          return cell.text;
        }
      }
      return cell;
    };

    // Apply checkbox filters
    Object.entries(selectedFilters).forEach(([filterType, selectedValues]) => {
      if (selectedValues.length > 0 && availableFilters[filterType]) {
        const field = availableFilters[filterType].field;
        filtered = filtered.filter(item => {
          const cellValue = getCellValue(item[field]);
          return selectedValues.includes(cellValue);
        });
      }
    });

    // Apply legacy dropdown filters (for backward compatibility)
    if (selectedVendor && filtered.length > 0) {
      const vendorField = Object.keys(filtered[0] || {}).find(key => 
        key.toLowerCase().includes('vendor') || key.toLowerCase().includes('manufacturer')
      );
      if (vendorField) {
        filtered = filtered.filter(item => getCellValue(item[vendorField]) === selectedVendor);
      }
    }

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

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedVendor('');
    setSelectedStatus('');
    setSelectedFilters({});
  };

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName);
    resetFilters();
  };

  // Handle checkbox filter changes
  const handleFilterChange = (filterType, value, checked) => {
    setSelectedFilters(prev => {
      const current = prev[filterType] || [];
      if (checked) {
        return { ...prev, [filterType]: [...current, value] };
      } else {
        return { ...prev, [filterType]: current.filter(v => v !== value) };
      }
    });
  };

  // Check if all values for a filter are selected
  const isAllSelected = (filterType) => {
    if (!availableFilters[filterType]) return false;
    const selected = selectedFilters[filterType] || [];
    return selected.length === availableFilters[filterType].values.length;
  };

  // Toggle all values for a filter
  const handleSelectAll = (filterType, selectAll) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: selectAll ? [...availableFilters[filterType].values] : []
    }));
  };

  // Helper function to determine status color based on value
  const getStatusColor = (value) => {
    if (!value || typeof value !== 'string') return null;

    const lowerValue = value.toLowerCase().trim();

    // Green statuses
    const greenKeywords = ['green', 'yes', 'active', 'supported', 'available', 'enabled', 'pass', 'passed', 'success', 'completed', 'approved', 'ga', 'stable'];
    if (greenKeywords.some(keyword => lowerValue.includes(keyword))) {
      return 'status-green';
    }

    // Red statuses
    const redKeywords = ['red', 'no', 'not supported', 'unsupported', 'unavailable', 'disabled', 'fail', 'failed', 'error', 'rejected', 'deprecated', 'eol', 'end of life'];
    if (redKeywords.some(keyword => lowerValue.includes(keyword))) {
      return 'status-red';
    }

    // Yellow statuses
    const yellowKeywords = ['yellow', 'warning', 'pending', 'in progress', 'partial', 'limited', 'beta', 'preview', 'tech preview', 'experimental', 'caution'];
    if (yellowKeywords.some(keyword => lowerValue.includes(keyword))) {
      return 'status-yellow';
    }

    return null;
  };

  // Function to detect and render hyperlinks in text
  const renderCellContent = (content, columnName = '') => {
    // Handle rich text with partial hyperlinks
    if (content && typeof content === 'object' && content.isRichText && content.richText) {
      return content.richText.map((part, index) => {
        if (part.isLink && part.url) {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cell-link"
              title={part.url}
            >
              {part.text}
            </a>
          );
        } else {
          // Plain text part - preserve line breaks
          const textParts = part.text.split('\n').map((line, lineIndex) => (
            lineIndex === 0 ? line : [<br key={`br-${index}-${lineIndex}`} />, line]
          )).flat();
          return <span key={index}>{textParts}</span>;
        }
      });
    }

    // Handle Google Sheets hyperlink objects (entire cell is a link)
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

    // Check if this is a status field and apply color
    const isStatusField = columnName.toLowerCase().includes('status') ||
                          columnName.toLowerCase().includes('support');
    const statusColor = isStatusField ? getStatusColor(content) : null;

    // Enhanced URL regex pattern that matches various URL formats
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+)/gi;
    const parts = content.split(urlRegex);

    if (parts.length === 1) {
      // No URLs found, return original content with line breaks preserved
      const textContent = content.split('\n').map((line, index) => (
        index === 0 ? line : [<br key={`br-${index}`} />, line]
      )).flat();

      // Wrap in status badge if this is a status field
      if (statusColor) {
        return <span className={`status-badge ${statusColor}`}>{textContent}</span>;
      }
      return textContent;
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

  // Calculate insights from filtered data
  const calculateInsights = () => {
    if (!filteredData || filteredData.length === 0) {
      return null;
    }

    const insights = {
      total: filteredData.length,
      statusCounts: { green: 0, yellow: 0, red: 0 },
      partnerCounts: {},
      csiCertified: 0,
      csiTotal: 0
    };

    // Helper to get cell value
    const getCellValue = (cell) => {
      if (cell && typeof cell === 'object') {
        if (cell.isRichText && cell.richText) {
          // Combine all rich text parts into one string
          return cell.richText.map(part => part.text).join('');
        }
        if (cell.text) {
          return cell.text;
        }
      }
      return cell;
    };

    filteredData.forEach(row => {
      // Count status distribution
      if (row.status) {
        const status = getCellValue(row.status).toLowerCase();
        if (status.includes('green')) insights.statusCounts.green++;
        else if (status.includes('yellow')) insights.statusCounts.yellow++;
        else if (status.includes('red')) insights.statusCounts.red++;
      }

      // Count products by partner
      if (row.partner) {
        const partner = getCellValue(row.partner);
        insights.partnerCounts[partner] = (insights.partnerCounts[partner] || 0) + 1;
      }

      // Count CSI certified
      if (row.csi_certified !== undefined) {
        insights.csiTotal++;
        const csiValue = getCellValue(row.csi_certified);
        if (csiValue && csiValue.toLowerCase().includes('yes')) {
          insights.csiCertified++;
        }
      }
    });

    return insights;
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
          </div>
        </div>
        {lastSync && (
          <div className="sync-status">
            Last updated: {new Date(lastSync).toLocaleString()}
          </div>
        )}
      </header>

      {/* Internal Use Warning Banner */}
      <div className="warning-banner">
        <div className="warning-content">
          <svg className="warning-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <strong>RED HAT CONFIDENTIAL</strong> - This dashboard is for internal Red Hat employees only. Do not share with external customers or partners.
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-content">
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
              <h3 className="sidebar-title">Search</h3>
              <div className="search-section">
                <input
                  id="search"
                  type="text"
                  placeholder="Search across all fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sidebar-input"
                />
              </div>
            </div>

            {/* Smart Checkbox Filters */}
            {Object.entries(availableFilters).map(([filterType, filterConfig]) => (
              <div key={filterType} className="sidebar-section">
                <div className="filter-header">
                  <h4 className="sidebar-title">{filterConfig.label}</h4>
                  <div className="filter-controls">
                    <button
                      className="filter-toggle"
                      onClick={() => handleSelectAll(filterType, !isAllSelected(filterType))}
                      title={isAllSelected(filterType) ? "Deselect All" : "Select All"}
                    >
                      {isAllSelected(filterType) ? "None" : "All"}
                    </button>
                  </div>
                </div>
                <div className="checkbox-group">
                  {filterConfig.values.map(value => (
                    <label key={value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(selectedFilters[filterType] || []).includes(value)}
                        onChange={(e) => handleFilterChange(filterType, value, e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-text">{value}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Legacy dropdown filters for backward compatibility */}
            {vendors.length > 0 && Object.keys(availableFilters).length === 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-title">Vendor</h4>
                <select 
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

            {statuses.length > 0 && Object.keys(availableFilters).length === 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-title">Status</h4>
                <select 
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

            {/* Filter Actions */}
            <div className="sidebar-section sidebar-actions">
              {(Object.values(selectedFilters).some(arr => arr.length > 0) || selectedVendor || selectedStatus || searchQuery) && (
                <button className="btn btn-outline reset-filters" onClick={resetFilters}>
                  Clear All Filters
                </button>
              )}
              
              <div className="filter-stats">
                <p>Showing {filteredData.length} of {currentSheetData.length} records</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="content-area">
          <div className="content-area-inner">
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <div className="data-section">
            <div className="section-header">
              <h2>
                {activeSheet && sheetNames.length > 1 ? activeSheet : 'Storage Integration Status'}
              </h2>
            </div>

            {/* Insights Summary - Only for sheets with "status" in name */}
            {(() => {
              // Only show insights for sheets with "status" in the name
              if (!activeSheet || !activeSheet.toLowerCase().includes('status')) {
                return null;
              }

              const insights = calculateInsights();
              if (!insights) return null;

              const totalStatus = insights.statusCounts.green + insights.statusCounts.yellow + insights.statusCounts.red;
              const csiPercentage = insights.csiTotal > 0
                ? Math.round((insights.csiCertified / insights.csiTotal) * 100)
                : null;

              return (
                <div className="insights-container">
                  {/* Status Overview */}
                  {totalStatus > 0 && (
                    <div className="insight-card">
                      <div className="insight-header">Compatibility Status</div>
                      <div className="insight-stats">
                        <div className="insight-stat stat-green">
                          <span className="insight-value">{insights.statusCounts.green}</span>
                          <span className="insight-label">Ready</span>
                        </div>
                        <div className="insight-stat stat-yellow">
                          <span className="insight-value">{insights.statusCounts.yellow}</span>
                          <span className="insight-label">In Progress</span>
                        </div>
                        <div className="insight-stat stat-red">
                          <span className="insight-value">{insights.statusCounts.red}</span>
                          <span className="insight-label">Blocked</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CSI Certification */}
                  {csiPercentage !== null && (
                    <div className="insight-card">
                      <div className="insight-header">CSI Certification</div>
                      <div className="insight-stats">
                        <div className="insight-stat">
                          <span className="insight-value insight-percentage">{csiPercentage}%</span>
                          <span className="insight-label">{insights.csiCertified} of {insights.csiTotal} certified</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
                          <td key={column}>{renderCellContent(row[column], column)}</td>
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
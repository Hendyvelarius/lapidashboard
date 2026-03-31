import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiUrl } from '../api';
import './OF1TargetModal.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMinPeriode() {
  // Minimum selectable period = next month after current
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriode(p) {
  const year = p.slice(0, 4);
  const month = parseInt(p.slice(4, 6), 10) - 1;
  return `${MONTH_NAMES[month]} ${year}`;
}

function generateFuturePeriods(count = 12) {
  const periods = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const p = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    periods.push(p);
  }
  return periods;
}

const OF1TargetModal = ({ isOpen, onClose }) => {
  const [selectedPeriode, setSelectedPeriode] = useState(() => getMinPeriode());
  const [products, setProducts] = useState([]);
  const [existingTargets, setExistingTargets] = useState({});
  const [productTargets, setProductTargets] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [bulkPercentage, setBulkPercentage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [notification, setNotification] = useState(null);

  // Copy modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetPeriods, setCopyTargetPeriods] = useState(new Set());

  const futurePeriods = useMemo(() => generateFuturePeriods(12), []);

  // Load products and existing config when period changes
  const loadData = useCallback(async (periode) => {
    setLoading(true);
    try {
      const [productsRes, configRes] = await Promise.all([
        fetch(apiUrl(`/api/of1TargetProducts?periode=${periode}`)),
        fetch(apiUrl(`/api/of1TargetConfig?periodes=${periode}`))
      ]);
      const productsData = await productsRes.json();
      const configData = await configRes.json();

      setProducts(productsData.data || []);

      // Map existing targets
      const targetMap = {};
      (configData.data || []).forEach(row => {
        targetMap[row.Product_ID] = row.PersenTarget;
      });
      setExistingTargets(targetMap);
      setProductTargets(targetMap);
      setSelectedProducts(new Set());
      setHasChanges(false);
      setBulkPercentage('');
    } catch (err) {
      console.error('Failed to load OF1 target data:', err);
      showNotification('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && selectedPeriode) {
      loadData(selectedPeriode);
    }
  }, [isOpen, selectedPeriode, loadData]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter === 'FOKUS') {
      list = list.filter(p => p.Product_Group === '1. PRODUK FOKUS');
    } else if (categoryFilter === 'NON_FOKUS') {
      list = list.filter(p => p.Product_Group === '2. PRODUK NON FOKUS');
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.Product_ID || '').toLowerCase().includes(term) ||
        (p.Product_Name || '').toLowerCase().includes(term) ||
        (p.Product_Code || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [products, categoryFilter, searchTerm]);

  const fokusProducts = useMemo(() => products.filter(p => p.Product_Group === '1. PRODUK FOKUS'), [products]);
  const nonFokusProducts = useMemo(() => products.filter(p => p.Product_Group === '2. PRODUK NON FOKUS'), [products]);

  // Selection handlers
  const toggleProduct = (productId) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const selectCategory = (category) => {
    const categoryProducts = category === 'FOKUS' ? fokusProducts : nonFokusProducts;
    setSelectedProducts(prev => {
      const next = new Set(prev);
      const allSelected = categoryProducts.every(p => next.has(p.Product_ID));
      if (allSelected) {
        // Deselect all in category
        categoryProducts.forEach(p => next.delete(p.Product_ID));
      } else {
        // Select all in category
        categoryProducts.forEach(p => next.add(p.Product_ID));
      }
      return next;
    });
  };

  const selectAll = () => {
    const visible = filteredProducts;
    setSelectedProducts(prev => {
      const next = new Set(prev);
      const allSelected = visible.every(p => next.has(p.Product_ID));
      if (allSelected) {
        visible.forEach(p => next.delete(p.Product_ID));
      } else {
        visible.forEach(p => next.add(p.Product_ID));
      }
      return next;
    });
  };

  // Apply bulk percentage
  const applyBulkPercentage = () => {
    const pct = parseInt(bulkPercentage, 10);
    if (isNaN(pct) || pct < 0 || pct > 1000) {
      showNotification('error', 'Please enter a valid percentage (0-1000)');
      return;
    }
    if (selectedProducts.size === 0) {
      showNotification('error', 'Please select at least one product');
      return;
    }
    setProductTargets(prev => {
      const next = { ...prev };
      selectedProducts.forEach(pid => {
        next[pid] = pct;
      });
      return next;
    });
    setHasChanges(true);
    showNotification('success', `Applied ${pct}% to ${selectedProducts.size} product(s)`);
  };

  // Quick category-based apply
  const quickApplyCategory = (category, percentage) => {
    const pct = parseInt(percentage, 10);
    if (isNaN(pct) || pct < 0) return;
    const categoryProducts = category === 'FOKUS' ? fokusProducts : nonFokusProducts;
    setProductTargets(prev => {
      const next = { ...prev };
      categoryProducts.forEach(p => {
        next[p.Product_ID] = pct;
      });
      return next;
    });
    setHasChanges(true);
    showNotification('success', `Applied ${pct}% to all ${category === 'FOKUS' ? 'Fokus' : 'Non Fokus'} products`);
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      const targets = products.map(p => ({
        Product_ID: p.Product_ID,
        PersenTarget: productTargets[p.Product_ID] ?? 0
      }));

      const res = await fetch(apiUrl('/api/of1TargetConfig'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periode: selectedPeriode, targets })
      });
      const result = await res.json();
      if (result.success) {
        setExistingTargets({ ...productTargets });
        setHasChanges(false);
        showNotification('success', `Targets saved for ${formatPeriode(selectedPeriode)}`);
      } else {
        showNotification('error', result.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      showNotification('error', 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  };

  // Copy to other periods
  const handleCopy = async () => {
    if (copyTargetPeriods.size === 0) {
      showNotification('error', 'Please select at least one target month');
      return;
    }
    setSaving(true);
    try {
      const targets = products.map(p => ({
        Product_ID: p.Product_ID,
        PersenTarget: productTargets[p.Product_ID] ?? 0
      }));

      const results = await Promise.all(
        Array.from(copyTargetPeriods).map(targetPeriode =>
          fetch(apiUrl('/api/of1TargetConfig'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ periode: targetPeriode, targets })
          }).then(r => r.json())
        )
      );

      const failed = results.filter(r => !r.success);
      if (failed.length === 0) {
        showNotification('success', `Copied to ${copyTargetPeriods.size} month(s) successfully`);
        setShowCopyModal(false);
        setCopyTargetPeriods(new Set());
      } else {
        showNotification('error', `${failed.length} month(s) failed to save`);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      showNotification('error', 'Failed to copy targets');
    } finally {
      setSaving(false);
    }
  };

  // Individual target change
  const handleTargetChange = (productId, value) => {
    const pct = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(pct) && pct >= 0 && pct <= 1000) {
      setProductTargets(prev => ({ ...prev, [productId]: pct }));
      setHasChanges(true);
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    const fokusWithTarget = fokusProducts.filter(p => (productTargets[p.Product_ID] ?? 0) > 0).length;
    const nonFokusWithTarget = nonFokusProducts.filter(p => (productTargets[p.Product_ID] ?? 0) > 0).length;
    return { fokusWithTarget, nonFokusWithTarget, totalFokus: fokusProducts.length, totalNonFokus: nonFokusProducts.length };
  }, [fokusProducts, nonFokusProducts, productTargets]);

  if (!isOpen) return null;

  return (
    <div className="of1target-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="of1target-modal">
        {/* Header */}
        <div className="of1target-header">
          <div className="of1target-header-left">
            <h2>OF1 Target Setup</h2>
            <span className="of1target-subtitle">Configure target percentages per product</span>
          </div>
          <button className="of1target-close" onClick={onClose}>&times;</button>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`of1target-notification of1target-notification-${notification.type}`}>
            {notification.type === 'success' ? '✓' : '✕'} {notification.message}
          </div>
        )}

        {/* Controls Bar */}
        <div className="of1target-controls">
          {/* Period Selector */}
          <div className="of1target-control-group">
            <label>Period</label>
            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value)}
              className="of1target-select"
            >
              {futurePeriods.map(p => (
                <option key={p} value={p}>{formatPeriode(p)}</option>
              ))}
            </select>
          </div>

          {/* Quick Category Apply */}
          <div className="of1target-control-group of1target-quick-apply">
            <label>Quick Apply by Category</label>
            <div className="of1target-quick-buttons">
              <button
                className="of1target-cat-btn of1target-cat-fokus"
                onClick={() => selectCategory('FOKUS')}
                title="Select all Fokus products"
              >
                {fokusProducts.every(p => selectedProducts.has(p.Product_ID)) && fokusProducts.length > 0 ? '☑' : '☐'} Fokus ({stats.totalFokus})
              </button>
              <button
                className="of1target-cat-btn of1target-cat-nonfokus"
                onClick={() => selectCategory('NON_FOKUS')}
                title="Select all Non Fokus products"
              >
                {nonFokusProducts.every(p => selectedProducts.has(p.Product_ID)) && nonFokusProducts.length > 0 ? '☑' : '☐'} Non Fokus ({stats.totalNonFokus})
              </button>
            </div>
          </div>

          {/* Bulk Percentage Input */}
          <div className="of1target-control-group">
            <label>Set % for Selected ({selectedProducts.size})</label>
            <div className="of1target-bulk-input">
              <input
                type="number"
                min="0"
                max="1000"
                value={bulkPercentage}
                onChange={(e) => setBulkPercentage(e.target.value)}
                placeholder="%"
                className="of1target-pct-input"
                onKeyDown={(e) => { if (e.key === 'Enter') applyBulkPercentage(); }}
              />
              <button
                className="of1target-apply-btn"
                onClick={applyBulkPercentage}
                disabled={selectedProducts.size === 0 || !bulkPercentage}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="of1target-summary">
          <div className="of1target-summary-item">
            <span className="of1target-summary-dot of1target-dot-fokus"></span>
            Fokus: <strong>{stats.fokusWithTarget}</strong>/{stats.totalFokus} configured
          </div>
          <div className="of1target-summary-item">
            <span className="of1target-summary-dot of1target-dot-nonfokus"></span>
            Non Fokus: <strong>{stats.nonFokusWithTarget}</strong>/{stats.totalNonFokus} configured
          </div>
          <div className="of1target-summary-spacer"></div>
          <div className="of1target-filter-group">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="of1target-filter-select"
            >
              <option value="ALL">All Products</option>
              <option value="FOKUS">Fokus Only</option>
              <option value="NON_FOKUS">Non Fokus Only</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product..."
              className="of1target-search"
            />
          </div>
        </div>

        {/* Product Table */}
        <div className="of1target-table-container">
          {loading ? (
            <div className="of1target-loading">Loading products...</div>
          ) : (
            <table className="of1target-table">
              <thead>
                <tr>
                  <th className="of1target-th-check">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.Product_ID))}
                      onChange={selectAll}
                      title="Select/Deselect all visible"
                    />
                  </th>
                  <th className="of1target-th-id">ID</th>
                  <th className="of1target-th-name">Product Name</th>
                  <th className="of1target-th-group">Category</th>
                  <th className="of1target-th-pct">Target %</th>
                  <th className="of1target-th-status">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const currentPct = productTargets[p.Product_ID] ?? 0;
                  const originalPct = existingTargets[p.Product_ID] ?? 0;
                  const isChanged = currentPct !== originalPct;
                  const isFokus = p.Product_Group === '1. PRODUK FOKUS';
                  return (
                    <tr
                      key={p.Product_ID}
                      className={`of1target-row ${selectedProducts.has(p.Product_ID) ? 'of1target-row-selected' : ''} ${isChanged ? 'of1target-row-changed' : ''}`}
                      onClick={() => toggleProduct(p.Product_ID)}
                    >
                      <td className="of1target-td-check">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(p.Product_ID)}
                          onChange={() => toggleProduct(p.Product_ID)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="of1target-td-id">{p.Product_ID}</td>
                      <td className="of1target-td-name">{p.Product_Name || p.Product_Code || '—'}</td>
                      <td className="of1target-td-group">
                        <span className={`of1target-badge ${isFokus ? 'of1target-badge-fokus' : 'of1target-badge-nonfokus'}`}>
                          {isFokus ? 'Fokus' : 'Non Fokus'}
                        </span>
                      </td>
                      <td className="of1target-td-pct" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          value={currentPct}
                          onChange={(e) => handleTargetChange(p.Product_ID, e.target.value)}
                          className={`of1target-cell-input ${currentPct > 0 ? 'of1target-cell-active' : ''}`}
                        />
                      </td>
                      <td className="of1target-td-status">
                        {isChanged && <span className="of1target-changed-dot" title="Modified">●</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="of1target-empty">No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="of1target-footer">
          <div className="of1target-footer-left">
            <button
              className="of1target-copy-btn"
              onClick={() => setShowCopyModal(true)}
              disabled={Object.keys(productTargets).length === 0}
              title="Copy current setup to other months"
            >
              📋 Copy to Other Months
            </button>
          </div>
          <div className="of1target-footer-right">
            <button className="of1target-cancel-btn" onClick={onClose}>Close</button>
            <button
              className="of1target-save-btn"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Copy Modal */}
        {showCopyModal && (
          <div className="of1target-copy-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCopyModal(false); }}>
            <div className="of1target-copy-modal">
              <div className="of1target-copy-header">
                <h3>Copy Targets from {formatPeriode(selectedPeriode)}</h3>
                <button className="of1target-close" onClick={() => setShowCopyModal(false)}>&times;</button>
              </div>
              <p className="of1target-copy-desc">Select which months to copy the current target configuration to:</p>
              <div className="of1target-copy-grid">
                {futurePeriods.filter(p => p !== selectedPeriode).map(p => (
                  <label key={p} className={`of1target-copy-item ${copyTargetPeriods.has(p) ? 'of1target-copy-item-selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={copyTargetPeriods.has(p)}
                      onChange={() => {
                        setCopyTargetPeriods(prev => {
                          const next = new Set(prev);
                          if (next.has(p)) next.delete(p);
                          else next.add(p);
                          return next;
                        });
                      }}
                    />
                    <span>{formatPeriode(p)}</span>
                  </label>
                ))}
              </div>
              <div className="of1target-copy-footer">
                <button className="of1target-cancel-btn" onClick={() => setShowCopyModal(false)}>Cancel</button>
                <button
                  className="of1target-save-btn"
                  onClick={handleCopy}
                  disabled={copyTargetPeriods.size === 0 || saving}
                >
                  {saving ? 'Copying...' : `Copy to ${copyTargetPeriods.size} Month(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OF1TargetModal;

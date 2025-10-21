import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import DashboardLoading from './DashboardLoading';
import Sidebar from './Sidebar';
import Modal from './Modal';
import { apiUrl } from '../api';
import './ProductionDashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Department colors for headers
const deptColors = {
  'PN1': '#4f8cff',
  'PN2': '#9333ea',
};

// Stage priority order (lower number = displayed first)
const stagePriority = {
  'Timbang': 1,
  'Mixing': 2,
  'Granulasi': 3,
  'Cetak': 4,
  'Filling': 5,
  'Coating': 6,
  'Kemas Primer': 7,
  'Kemas Sekunder': 8,
  'QC': 9,
  'Mikro': 10,
  'QA': 11,
};

// Helper function to get stage priority (default to 999 for unknown stages)
const getStagePriority = (stageName) => {
  return stagePriority[stageName] || 999;
};

// Helper function to get color based on batch count (queue intensity)
const getQueueColor = (batchCount) => {
  if (batchCount === 0) {
    return '#10b981'; // Green - good, no queue
  } else if (batchCount <= 5) {
    return '#22c55e'; // Light green - minimal queue
  } else if (batchCount <= 10) {
    return '#84cc16'; // Yellow-green - moderate queue
  } else if (batchCount <= 15) {
    return '#eab308'; // Yellow - building up
  } else if (batchCount <= 20) {
    return '#f59e0b'; // Orange - getting concerning
  } else if (batchCount <= 25) {
    return '#f97316'; // Deep orange - high queue
  } else if (batchCount <= 30) {
    return '#ef4444'; // Red - very high queue
  } else {
    return '#dc2626'; // Deep red - critical queue
  }
};

// Helper function to parse SQL Server datetime correctly
// ISSUE: SQL Server stores datetime in LOCAL Indonesian time (UTC+7)
// But the mssql Node.js driver returns it as ISO string with 'Z' (treating it as UTC)
// So "2025-10-21T08:21:54.353Z" in the API is actually 08:21 Indonesian time, NOT UTC
// We need to parse it as if the 'Z' wasn't there
const parseSQLDateTime = (sqlDateString) => {
  if (!sqlDateString) return null;
  
  // Remove the 'Z' to treat it as local time, not UTC
  // "2025-10-21T08:21:54.353Z" becomes "2025-10-21T08:21:54.353"
  const localDateString = sqlDateString.replace('Z', '');
  return new Date(localDateString);
};

const ProductionDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [rawWipData, setRawWipData] = useState([]);
  const [processedWipData, setProcessedWipData] = useState([]);
  const [pctData, setPctData] = useState({});
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStageData, setSelectedStageData] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState(null);

  // Process raw WIP data according to business rules
  const processWIPData = (rawData) => {
    if (!rawData || rawData.length === 0) return [];

    // Step 1: Filter out batches that have completed "Approve Realese" (yes, with typo)
    const batchesWithApproveRelease = new Set();
    rawData.forEach(entry => {
      if (entry.nama_tahapan === 'Approve Realese' && entry.EndDate) {
        batchesWithApproveRelease.add(entry.Batch_No);
      }
    });

    const activeBatches = rawData.filter(entry => 
      !batchesWithApproveRelease.has(entry.Batch_No)
    );

    // Step 2: Group by Group_Dept and Jenis_Sediaan
    const grouped = {};
    
    activeBatches.forEach(entry => {
      const dept = entry.Group_Dept || 'Unknown';
      const jenisSediaan = entry.Jenis_Sediaan || 'Unknown';
      const tahapanGroup = entry.tahapan_group || 'Other';
      const batchNo = entry.Batch_No;

      // Skip entries with "Other" tahapan_group (not part of production process)
      if (tahapanGroup === 'Other') {
        return;
      }

      const key = `${dept}|${jenisSediaan}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          dept,
          jenisSediaan,
          stages: {},
          batches: new Set(),
        };
      }

      // Track all unique tahapan_groups for this dept+jenisSediaan
      if (!grouped[key].stages[tahapanGroup]) {
        grouped[key].stages[tahapanGroup] = {
          batchesInProgress: new Set(),
          entries: [],
        };
      }

      grouped[key].stages[tahapanGroup].entries.push(entry);
      grouped[key].batches.add(batchNo);
    });

    // Step 3: Calculate batches in progress per stage and average days
    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      
      Object.keys(group.stages).forEach(stageName => {
        const stage = group.stages[stageName];
        
        // Group entries by Batch_No
        const batchEntries = {};
        stage.entries.forEach(entry => {
          if (!batchEntries[entry.Batch_No]) {
            batchEntries[entry.Batch_No] = [];
          }
          batchEntries[entry.Batch_No].push(entry);
        });

        const batchDurations = []; // Store duration for each batch in progress
        const currentDate = new Date();

        // Check each batch: has at least one StartDate AND at least one missing EndDate
        Object.keys(batchEntries).forEach(batchNo => {
          const entries = batchEntries[batchNo];
          const hasStartDate = entries.some(e => e.StartDate);
          const hasMissingEndDate = entries.some(e => !e.EndDate);

          if (hasStartDate && hasMissingEndDate) {
            stage.batchesInProgress.add(batchNo);
            
            // Find the oldest StartDate for this batch in this stage
            const startDates = entries
              .filter(e => e.StartDate)
              .map(e => parseSQLDateTime(e.StartDate))
              .filter(date => date !== null);
            
            if (startDates.length > 0) {
              const oldestStartDate = new Date(Math.min(...startDates));
              const durationInDays = Math.floor((currentDate - oldestStartDate) / (1000 * 60 * 60 * 24));
              batchDurations.push(durationInDays);
            }
          }
        });

        // Calculate average days
        if (batchDurations.length > 0) {
          const totalDays = batchDurations.reduce((sum, days) => sum + days, 0);
          stage.averageDays = Math.round(totalDays / batchDurations.length);
        } else {
          stage.averageDays = 0;
        }
      });
    });

    // Step 4: Convert to array format for rendering
    const result = [];
    
    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      
      // Sort stages by priority
      const stageNames = Object.keys(group.stages).sort((a, b) => {
        return getStagePriority(a) - getStagePriority(b);
      });
      
      const stageCounts = stageNames.map(stageName => 
        group.stages[stageName].batchesInProgress.size
      );

      const stageAverageDays = stageNames.map(stageName =>
        group.stages[stageName].averageDays || 0
      );

      result.push({
        dept: group.dept,
        jenisSediaan: group.jenisSediaan,
        stages: stageNames,
        stageCounts: stageCounts,
        stageAverageDays: stageAverageDays,
        totalBatches: Array.from(group.batches).length,
        key: key,
      });
    });

    // Sort by dept (PN1 first, then PN2), then by jenisSediaan
    result.sort((a, b) => {
      if (a.dept !== b.dept) {
        return a.dept.localeCompare(b.dept);
      }
      return a.jenisSediaan.localeCompare(b.jenisSediaan);
    });

    return result;
  };

  // Handle stage circle click to show batch details
  const handleStageClick = (dept, jenisSediaan, stageName) => {
    // Filter raw data for this specific dept, jenisSediaan, and stage
    const batchesWithApproveRelease = new Set();
    rawWipData.forEach(entry => {
      if (entry.nama_tahapan === 'Approve Realese' && entry.EndDate) {
        batchesWithApproveRelease.add(entry.Batch_No);
      }
    });

    const stageEntries = rawWipData.filter(entry => {
      const entryDept = entry.Group_Dept || 'Unknown';
      const entryJenisSediaan = entry.Jenis_Sediaan || 'Unknown';
      const entryTahapanGroup = entry.tahapan_group || 'Other';
      
      return entryDept === dept 
        && entryJenisSediaan === jenisSediaan 
        && entryTahapanGroup === stageName
        && entryTahapanGroup !== 'Other'
        && !batchesWithApproveRelease.has(entry.Batch_No);
    });

    // Group by Batch_No to get unique batches with their details
    const batchDetails = {};
    stageEntries.forEach(entry => {
      const batchNo = entry.Batch_No;
      if (!batchDetails[batchNo]) {
        batchDetails[batchNo] = {
          batchNo: batchNo,
          productId: entry.Product_ID,
          productName: entry.Product_Name,
          batchDate: entry.Batch_Date,
          entries: [],
          hasStartDate: false,
          hasMissingEndDate: false,
          tasksInProgress: 0,
          totalTasks: 0,
        };
      }
      batchDetails[batchNo].entries.push(entry);
      batchDetails[batchNo].totalTasks++;
      if (entry.StartDate) batchDetails[batchNo].hasStartDate = true;
      if (!entry.EndDate) {
        batchDetails[batchNo].hasMissingEndDate = true;
        batchDetails[batchNo].tasksInProgress++;
      }
    });

    // Filter to only show batches that are actually in progress (has StartDate and missing EndDate)
    const activeBatches = Object.values(batchDetails).filter(
      batch => batch.hasStartDate && batch.hasMissingEndDate
    );

    setSelectedStageData({
      dept,
      jenisSediaan,
      stageName,
      batches: activeBatches,
      color: deptColors[dept] || '#4f8cff',
    });
    setModalOpen(true);
  };

  // Handle task details click
  const handleTaskDetailsClick = (batch, stageName, color) => {
    // Sort tasks: in progress first, then unstarted, then completed
    const sortedTasks = [...batch.entries].sort((a, b) => {
      const aInProgress = a.StartDate && !a.EndDate;
      const bInProgress = b.StartDate && !b.EndDate;
      const aUnstarted = !a.StartDate;
      const bUnstarted = !b.StartDate;
      const aCompleted = a.StartDate && a.EndDate;
      const bCompleted = b.StartDate && b.EndDate;

      // In progress first
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;

      // Then unstarted
      if (aInProgress === bInProgress) {
        if (aUnstarted && !bUnstarted) return -1;
        if (!aUnstarted && bUnstarted) return 1;
      }

      // Completed last
      return 0;
    });

    setSelectedTaskData({
      batchNo: batch.batchNo,
      productName: batch.productName,
      productId: batch.productId,
      batchDate: batch.batchDate,
      stageName: stageName,
      tasks: sortedTasks,
      color: color,
    });
    setTaskModalOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch PCT Breakdown data
        const pctResponse = await fetch(apiUrl('/api/pctBreakdown'));
        if (!pctResponse.ok) {
          throw new Error(`PCT API error! status: ${pctResponse.status}`);
        }
        
        const pctResult = await pctResponse.json();
        const pctDataItem = pctResult.data && pctResult.data.length > 0 ? pctResult.data[0] : null;
        
        if (pctDataItem) {
          const pctBreakdown = {
            Timbang: Math.round(pctDataItem.Avg_Timbang_Days || 0),
            Proses: Math.round(pctDataItem.Avg_Proses_Days || 0),
            QC: Math.round(pctDataItem.Avg_QC_Days || 0),
            Mikro: Math.round(pctDataItem.Avg_Mikro_Days || 0),
            QA: Math.round(pctDataItem.Avg_QA_Days || 0),
          };
          setPctData(pctBreakdown);
        } else {
          setPctData({
            Timbang: 0,
            Proses: 0,
            QC: 0,
            Mikro: 0,
            QA: 0,
          });
        }

        // Fetch WIP data
        const wipResponse = await fetch(apiUrl('/api/wipData'));
        if (!wipResponse.ok) {
          throw new Error(`WIP API error! status: ${wipResponse.status}`);
        }

        const wipResult = await wipResponse.json();
        const wipRawData = wipResult.data || [];
        
        console.log('Raw WIP Data:', wipRawData);
        setRawWipData(wipRawData);

        // Process WIP data
        const processed = processWIPData(wipRawData);
        console.log('Processed WIP Data:', processed);
        setProcessedWipData(processed);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        
        // Fallback to empty data
        setPctData({
          Timbang: 0,
          Proses: 0,
          QC: 0,
          Mikro: 0,
          QA: 0,
        });
        setProcessedWipData([]);
        
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create grouped bar chart data for WIP (removed - not needed for stepper view)

  // WIP Bar chart options (removed - not needed for stepper view)

  // Create bar chart data for PCT
  const pctChartData = {
    labels: Object.keys(pctData),
    datasets: [
      {
        label: 'Average Days',
        data: Object.values(pctData),
        backgroundColor: [
          'rgba(79, 140, 255, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(56, 230, 197, 0.8)',
          'rgba(255, 179, 71, 0.8)',
          'rgba(229, 115, 115, 0.8)',
        ],
        borderColor: [
          '#4f8cff',
          '#9333ea',
          '#38e6c5',
          '#ffb347',
          '#e57373',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const pctOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} days`;
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + ' days';
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return <DashboardLoading text="Loading Production Dashboard..." />;
  }

  return (
    <div className="production-dashboard">
      <Sidebar />
      <div className="production-main-content">
        <div className="production-content">
        {/* WIP Section */}
        <section className="production-section">
          
          {processedWipData.length === 0 ? (
            <div className="no-data-message" style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '32px',
              textAlign: 'center',
              color: '#6b7280',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ marginBottom: '8px', color: '#374151' }}>No Active Batches</h3>
              <p>There are currently no batches in progress.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Group by Department - Side by Side */}
              {['PN1', 'PN2'].map(dept => {
                const deptData = processedWipData.filter(item => item.dept === dept);
                
                return (
                  <div key={dept}>
                    <h2 className="section-title" style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: deptColors[dept] || '#374151',
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: `3px solid ${deptColors[dept] || '#e5e7eb'}`,
                    }}>
                      {dept} WIP Tracker
                    </h2>
                    
                    {deptData.length === 0 ? (
                      <div style={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '24px',
                        textAlign: 'center',
                        color: '#9ca3af',
                        fontSize: '0.9rem',
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                        <p>No active batches</p>
                      </div>
                    ) : (
                      <div className="wip-stepper-grid">
                        {deptData.map((product, index) => {
                          const totalBatches = product.stageCounts.reduce((sum, val) => sum + val, 0);
                          const color = deptColors[product.dept] || '#4f8cff';
                          
                          return (
                            <div key={product.key} className="wip-stepper-card">
                              <div className="wip-stepper-header" style={{ borderLeftColor: color }}>
                                <h3 className="wip-stepper-title">{product.jenisSediaan}</h3>
                                <div className="wip-stepper-total">
                                  <span className="stepper-total-label">Queues:</span>
                                  <span className="stepper-total-value" style={{ color: color }}>
                                    {totalBatches}
                                  </span>
                                  <span className="stepper-total-label" style={{ marginLeft: '16px' }}>
                                    Total Batch: {product.totalBatches}
                                  </span>
                                </div>
                              </div>
                              <div className="wip-stepper-body">
                                <div className="stepper-container">
                                  {product.stages.map((stage, stageIndex) => {
                                    const batchCount = product.stageCounts[stageIndex] || 0;
                                    const averageDays = product.stageAverageDays[stageIndex] || 0;
                                    const isLast = stageIndex === product.stages.length - 1;
                                    
                                    return (
                                      <div key={`stage-${stageIndex}`} className="stepper-item">
                                        {/* Average Days Display or "Clear" label */}
                                        <div style={{
                                          fontSize: '0.75rem',
                                          color: batchCount > 0 ? '#6b7280' : '#9ca3af',
                                          fontWeight: '600',
                                          marginBottom: '4px',
                                          textAlign: 'center',
                                          minHeight: '16px', // Maintain consistent height
                                        }}>
                                          {batchCount > 0 ? `${averageDays}d avg` : 'clear'}
                                        </div>
                                        <div className="stepper-circle-wrapper">
                                          <div 
                                            className="stepper-circle" 
                                            style={{ 
                                              backgroundColor: getQueueColor(batchCount),
                                              opacity: batchCount > 0 ? 1 : 0.3,
                                              cursor: batchCount > 0 ? 'pointer' : 'default',
                                            }}
                                            onClick={() => {
                                              if (batchCount > 0) {
                                                handleStageClick(product.dept, product.jenisSediaan, stage);
                                              }
                                            }}
                                            title={batchCount > 0 ? `Click to view ${batchCount} batch${batchCount > 1 ? 'es' : ''} in ${stage}` : ''}
                                          >
                                            <span className="stepper-batch-count">{batchCount}</span>
                                          </div>
                                          {!isLast && <div className="stepper-line"></div>}
                                        </div>
                                        <div className="stepper-label">{stage}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PCT Breakdown Section */}
        <section className="production-section">
          <h2 className="section-title">Product Cycle Time (PCT) Breakdown</h2>
          {error && (
            <div className="error-banner" style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#c33',
            }}>
              <strong>⚠️ Error loading data:</strong> {error}
            </div>
          )}
          <div className="pct-row">
            <div className="pct-card">
              <div className="pct-description">
                <p>Average days for each stage in the production process (Last 2 months)</p>
                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                  📊 Data from completed batches with "Approve Release"
                </small>
              </div>
              <div className="pct-chart-container">
                <Bar data={pctChartData} options={pctOptions} />
              </div>
            </div>
            <div className="pct-placeholder-card">
              <div className="placeholder-content">
                <div className="placeholder-icon">📊</div>
                <h3>Additional Metrics</h3>
                <p>More production insights coming soon</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      </div>

      {/* Batch Details Modal */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={selectedStageData ? `${selectedStageData.stageName} - ${selectedStageData.jenisSediaan} (${selectedStageData.dept})` : ''}
      >
        {selectedStageData && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              background: `linear-gradient(135deg, ${selectedStageData.color}15, ${selectedStageData.color}05)`,
              borderRadius: '8px',
              borderLeft: `4px solid ${selectedStageData.color}`,
            }}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '4px' }}>
                <strong>Department:</strong> {selectedStageData.dept} | 
                <strong style={{ marginLeft: '8px' }}>Product Type:</strong> {selectedStageData.jenisSediaan} | 
                <strong style={{ marginLeft: '8px' }}>Stage:</strong> {selectedStageData.stageName}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: selectedStageData.color }}>
                {selectedStageData.batches.length} Batch{selectedStageData.batches.length > 1 ? 'es' : ''} in Progress
              </div>
            </div>

            {selectedStageData.batches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📦</div>
                <p>No batches in progress</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedStageData.batches.map((batch, index) => (
                  <div 
                    key={batch.batchNo} 
                    style={{
                      padding: '16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2c3e50', marginBottom: '4px' }}>
                          Batch No: {batch.batchNo}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                          Batch Date: {batch.batchDate}
                        </div>
                      </div>
                      <div style={{
                        background: selectedStageData.color,
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}>
                        #{index + 1}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '8px',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px' }}>
                          Product ID
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                          {batch.productId}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px' }}>
                          Product Name
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                          {batch.productName}
                        </div>
                      </div>
                    </div>

                    <div 
                      style={{ 
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #e5e7eb',
                        fontSize: '0.8rem',
                        background: `linear-gradient(135deg, ${selectedStageData.color}10, ${selectedStageData.color}05)`,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: `1px solid ${selectedStageData.color}30`,
                      }}
                      onClick={() => handleTaskDetailsClick(batch, selectedStageData.stageName, selectedStageData.color)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${selectedStageData.color}20, ${selectedStageData.color}10)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${selectedStageData.color}10, ${selectedStageData.color}05)`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ color: '#6c757d' }}>
                          <strong style={{ color: selectedStageData.color }}>{batch.tasksInProgress}/{batch.totalTasks}</strong> task{batch.totalTasks > 1 ? 's' : ''} in progress
                        </div>
                        <div style={{ fontSize: '0.9rem', color: selectedStageData.color }}>
                          👁️ View Details
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Task Details Modal */}
      <Modal 
        open={taskModalOpen} 
        onClose={() => setTaskModalOpen(false)} 
        title={selectedTaskData ? `Task Details - Batch ${selectedTaskData.batchNo}` : ''}
      >
        {selectedTaskData && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              background: `linear-gradient(135deg, ${selectedTaskData.color}15, ${selectedTaskData.color}05)`,
              borderRadius: '8px',
              borderLeft: `4px solid ${selectedTaskData.color}`,
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>
                {selectedTaskData.productName}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <strong>Product ID:</strong> {selectedTaskData.productId}
                </div>
                <div>
                  <strong>Batch No:</strong> {selectedTaskData.batchNo}
                </div>
                <div>
                  <strong>Batch Date:</strong> {selectedTaskData.batchDate}
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.9rem', color: selectedTaskData.color, fontWeight: '600' }}>
                Stage: {selectedTaskData.stageName}
              </div>
            </div>

            {selectedTaskData.tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📋</div>
                <p>No tasks found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedTaskData.tasks.map((task, index) => {
                  const isInProgress = task.StartDate && !task.EndDate;
                  const isUnstarted = !task.StartDate;
                  const isCompleted = task.StartDate && task.EndDate;

                  let statusBadge = '';
                  let statusColor = '';
                  let bgColor = '';
                  
                  if (isInProgress) {
                    statusBadge = '🔄 In Progress';
                    statusColor = '#f59e0b';
                    bgColor = '#fffbeb';
                  } else if (isUnstarted) {
                    statusBadge = '⏸️ Not Started';
                    statusColor = '#6b7280';
                    bgColor = '#f9fafb';
                  } else if (isCompleted) {
                    statusBadge = '✅ Completed';
                    statusColor = '#10b981';
                    bgColor = '#f0fdf4';
                  }

                  return (
                    <div 
                      key={index}
                      style={{
                        padding: '12px 16px',
                        background: bgColor,
                        border: `1px solid ${statusColor}30`,
                        borderLeft: `4px solid ${statusColor}`,
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                            {task.nama_tahapan}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            Order: {task.urutan}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: statusColor,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: 'white',
                          border: `1px solid ${statusColor}40`,
                          whiteSpace: 'nowrap',
                        }}>
                          {statusBadge}
                        </div>
                      </div>

                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '8px',
                        fontSize: '0.8rem',
                      }}>
                        <div>
                          <div style={{ color: '#9ca3af', fontSize: '0.7rem', marginBottom: '2px' }}>
                            START DATE
                          </div>
                          <div style={{ color: '#374151', fontWeight: '500' }}>
                            {task.StartDate ? parseSQLDateTime(task.StartDate).toLocaleString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af', fontSize: '0.7rem', marginBottom: '2px' }}>
                            END DATE
                          </div>
                          <div style={{ color: '#374151', fontWeight: '500' }}>
                            {task.EndDate ? parseSQLDateTime(task.EndDate).toLocaleString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductionDashboard;

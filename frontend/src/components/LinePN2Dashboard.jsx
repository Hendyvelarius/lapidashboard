import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Sidebar from './Sidebar';
import Modal from './Modal';
import DashboardLoading from './DashboardLoading';
import { apiUrl } from '../api';
import './LinePN2Dashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

// WIP Summary Donut with Pointers Component
const WIPDonutWithPointers = ({ stages }) => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const totalBatches = stages.reduce((sum, stage) => sum + stage.value, 0);
  
  const colors = [
    { bg: 'rgba(79, 140, 255, 0.8)', border: '#4f8cff' },
    { bg: 'rgba(147, 51, 234, 0.8)', border: '#9333ea' },
    { bg: 'rgba(56, 230, 197, 0.8)', border: '#38e6c5' },
    { bg: 'rgba(255, 179, 71, 0.8)', border: '#ffb347' },
    { bg: 'rgba(34, 197, 94, 0.8)', border: '#22c55e' },
    { bg: 'rgba(239, 68, 68, 0.8)', border: '#ef4444' },
    { bg: 'rgba(236, 72, 153, 0.8)', border: '#ec4899' },
    { bg: 'rgba(245, 158, 11, 0.8)', border: '#f59e0b' },
  ];

  // Calculate slice data
  let currentAngle = -90;
  const slices = stages.map((stage, index) => {
    const percentage = (stage.value / totalBatches) * 100;
    const sweepAngle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    
    currentAngle = endAngle;
    
    return {
      name: stage.name,
      value: stage.value,
      percentage,
      sweepAngle,
      startAngle,
      endAngle,
      midAngle,
      color: colors[index] || colors[0]
    };
  });

  const size = 280;
  const center = size / 2;
  const outerRadius = 65;
  const innerRadius = 45;
  const labelRadius = outerRadius + 30;

  const polarToCartesian = (angle, radius) => {
    const rads = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rads),
      y: center + radius * Math.sin(rads)
    };
  };

  const getSmartLabelPosition = (midAngle) => {
    if (midAngle >= -90 && midAngle <= 90) {
      return {
        textAnchor: 'start',
        lineExtension: 15
      };
    } else {
      return {
        textAnchor: 'end',
        lineExtension: 15
      };
    }
  };

  const createSlicePath = (slice) => {
    const start = polarToCartesian(slice.startAngle, outerRadius);
    const end = polarToCartesian(slice.endAngle, outerRadius);
    const startInner = polarToCartesian(slice.startAngle, innerRadius);
    const endInner = polarToCartesian(slice.endAngle, innerRadius);
    
    const largeArc = slice.sweepAngle > 180 ? 1 : 0;
    
    return `
      M ${start.x} ${start.y}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${end.x} ${end.y}
      L ${endInner.x} ${endInner.y}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}
      Z
    `;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '250px', overflow: 'visible' }}>
      <svg 
        width={size} 
        height={size} 
        style={{ 
          position: 'absolute', 
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          overflow: 'visible'
        }}
      >
        {slices.map((slice, index) => {
          const midPoint = polarToCartesian(slice.midAngle, outerRadius + 5);
          const labelPoint = polarToCartesian(slice.midAngle, labelRadius);
          const labelPos = getSmartLabelPosition(slice.midAngle);
          
          const horizontalEnd = {
            x: labelPoint.x + (labelPos.textAnchor === 'start' ? labelPos.lineExtension : -labelPos.lineExtension),
            y: labelPoint.y
          };
          
          return (
            <g key={index}>
              <path
                d={createSlicePath(slice)}
                fill={slice.color.bg}
                stroke={slice.color.border}
                strokeWidth="2"
                style={{
                  opacity: animated ? 1 : 0,
                  transition: 'all 0.3s ease',
                  transitionDelay: `${index * 0.1}s`
                }}
              />
              
              <path
                d={`M ${midPoint.x} ${midPoint.y} L ${labelPoint.x} ${labelPoint.y} L ${horizontalEnd.x} ${horizontalEnd.y}`}
                stroke={slice.color.border}
                strokeWidth="1.5"
                fill="none"
                style={{
                  opacity: animated ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                  transitionDelay: `${0.3 + index * 0.1}s`
                }}
              />
              
              <circle
                cx={horizontalEnd.x}
                cy={horizontalEnd.y}
                r="2.5"
                fill={slice.color.border}
                style={{
                  opacity: animated ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  transitionDelay: `${0.5 + index * 0.1}s`
                }}
              />
              
              <text
                x={horizontalEnd.x + (labelPos.textAnchor === 'start' ? 6 : -6)}
                y={horizontalEnd.y - 2}
                textAnchor={labelPos.textAnchor}
                style={{
                  fontSize: '9px',
                  fontWeight: '600',
                  fill: '#374151',
                  opacity: animated ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  transitionDelay: `${0.5 + index * 0.1}s`
                }}
              >
                {slice.name}
              </text>
              
              <text
                x={horizontalEnd.x + (labelPos.textAnchor === 'start' ? 6 : -6)}
                y={horizontalEnd.y + 10}
                textAnchor={labelPos.textAnchor}
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  fill: slice.color.border,
                  opacity: animated ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  transitionDelay: `${0.5 + index * 0.1}s`
                }}
              >
                {slice.value}
              </text>
            </g>
          );
        })}
      </svg>
      
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        opacity: animated ? 1 : 0,
        transition: 'opacity 0.5s ease',
        transitionDelay: '0.3s'
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: '#374151',
          lineHeight: '1'
        }}>
          {totalBatches}
        </div>
        <div style={{ 
          fontSize: '0.65rem', 
          color: '#6b7280',
          marginTop: '4px'
        }}>
          Total Batches
        </div>
      </div>
    </div>
  );
};

// Helper function to get stage-specific thresholds for PN1
const getStageThresholds = (stageName) => {
  const thresholds = {
    'Terima Bahan': { min: 3, med: 6, max: 10 },
    'Filling': { min: 4, med: 8, max: 12 },
    'Mixing': { min: 5, med: 10, max: 15 },
    'Granulasi': { min: 6, med: 12, max: 18 },
    'Cetak': { min: 5, med: 10, max: 15 },
    'Coating': { min: 4, med: 8, max: 12 },
    'Kemas Primer': { min: 2, med: 4, max: 6 },
    'Kemas Sekunder': { min: 3, med: 5, max: 7 },
  };
  
  return thresholds[stageName] || { min: 5, med: 10, max: 15 };
};

// Helper function to get color based on batch count
const getQueueColor = (batchCount, stageName) => {
  if (batchCount === 0) {
    return '#10b981'; // Dark green - no queue
  }
  
  const thresholds = getStageThresholds(stageName);
  const { min, med, max } = thresholds;
  
  const minMidpoint = min / 2;
  const medMidpoint = (min + med) / 2;
  const maxMidpoint = (med + max) / 2;
  
  if (batchCount <= minMidpoint) {
    return '#22c55e'; // Light green
  } else if (batchCount <= min) {
    return '#84cc16'; // Lime green
  } else if (batchCount <= medMidpoint) {
    return '#eab308'; // Yellow
  } else if (batchCount <= med) {
    return '#f59e0b'; // Orange
  } else if (batchCount <= maxMidpoint) {
    return '#f97316'; // Deep orange
  } else if (batchCount <= max) {
    return '#ef4444'; // Light red
  } else {
    return '#dc2626'; // Deep red - critical
  }
};

// Speedometer Component
const Speedometer = ({ label, value, maxValue = 50, stageName, batches = [], onClick, onBatchClick }) => {
  const thresholds = getStageThresholds(stageName);
  const { min, med, max } = thresholds;
  
  const needleColor = value > 0 ? getQueueColor(value, stageName) : '#9ca3af';
  
  // Calculate needle position
  let needleAngle;
  if (value === 0) {
    needleAngle = -90;
  } else if (value <= min) {
    needleAngle = -90 + (value / min) * 36;
  } else if (value <= med) {
    const ratio = (value - min) / (med - min);
    needleAngle = -54 + ratio * 36;
  } else if (value <= max) {
    const ratio = (value - med) / (max - med);
    needleAngle = -18 + ratio * 36;
  } else {
    const excess = Math.min(value - max, max);
    const ratio = excess / max;
    needleAngle = 18 + ratio * 72;
  }
  
  const fixedSegments = [
    { size: maxValue * 0.10, color: '#22c55e' },
    { size: maxValue * 0.10, color: '#84cc16' },
    { size: maxValue * 0.10, color: '#eab308' },
    { size: maxValue * 0.10, color: '#f59e0b' },
    { size: maxValue * 0.10, color: '#f97316' },
    { size: maxValue * 0.10, color: '#ef4444' },
    { size: maxValue * 0.40, color: '#dc2626' },
  ];
  
  const gaugeData = {
    datasets: [
      {
        data: fixedSegments.map(s => s.size),
        backgroundColor: fixedSegments.map(s => s.color),
        borderColor: fixedSegments.map(s => s.color),
        borderWidth: 2,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    animation: false,
  };

  // Sort batches by days in stage (descending)
  const sortedBatches = [...batches].sort((a, b) => b.daysInStage - a.daysInStage);

  return (
    <div 
      className="speedometer-container" 
      onClick={() => onClick && onClick(stageName)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="speedometer-gauge">
        <div className="speedometer-chart">
          <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
            <Doughnut data={gaugeData} options={gaugeOptions} />
          </div>
          <div 
            className="speedometer-needle"
            style={{
              backgroundColor: needleColor,
              transform: `translateX(-50%) rotate(${needleAngle}deg)`,
              boxShadow: value > 0 ? `0 0 6px ${needleColor}` : 'none',
            }}
          />
          <div 
            className="speedometer-center"
            style={{
              backgroundColor: needleColor,
            }}
          />
          <div className="speedometer-value" style={{ color: needleColor }}>
            {value}
          </div>
        </div>
      </div>
      <div className="speedometer-label">
        <div className="speedometer-label-text">{label}</div>
        <div className="speedometer-status">{value > 0 ? `${value} batches` : 'clear'}</div>
      </div>

      {/* Batch Details Table */}
      {sortedBatches.length > 0 ? (
        <div className="speedometer-batch-table">
          <div className="batch-list">
            {sortedBatches.map((batch, index) => (
              <div 
                key={index} 
                className="batch-item"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the speedometer onClick
                  onBatchClick && onBatchClick(stageName, batch);
                }}
                style={{ cursor: onBatchClick ? 'pointer' : 'default' }}
              >
                <div className="batch-product">{batch.productName}</div>
                <div className="batch-details">
                  <span className="batch-number">{batch.batchNo}</span>
                  <span className="batch-days">{batch.daysInStage}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="speedometer-batch-table">
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px dashed #d1d5db'
          }}>
            <div style={{
              fontSize: '32px',
              marginBottom: '8px',
              opacity: 0.5
            }}>
              ✓
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              No Process in This Stage
            </div>
            <div style={{
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              All clear
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LinePN2Dashboard = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [currentView, setCurrentView] = useState('monthly'); // 'monthly' or 'daily'
  const [autoMode, setAutoMode] = useState(true); // Auto-switch between monthly/daily
  const [fadeClass, setFadeClass] = useState('fade-in');
  const [sidebarChartKey, setSidebarChartKey] = useState(0); // Key for sidebar-triggered re-render only
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [wipData, setWipData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forecastData, setForecastData] = useState([]);
  const [dailyProductionData, setDailyProductionData] = useState([]);
  const [productGroupDept, setProductGroupDept] = useState({});
  const [productCategories, setProductCategories] = useState({});
  const [productNames, setProductNames] = useState({});
  const [ofTargetData, setOfTargetData] = useState([]);
  const [ofActualData, setOfActualData] = useState([]);
  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const [outputModalData, setOutputModalData] = useState(null);
  const [of1ModalOpen, setOf1ModalOpen] = useState(false);
  const [of1ModalData, setOf1ModalData] = useState(null);
  const [error, setError] = useState(null);
  
  // WIP Stage Modal states
  const [wipStageModalOpen, setWipStageModalOpen] = useState(false);
  const [selectedWipStageData, setSelectedWipStageData] = useState(null);
  const [wipTaskModalOpen, setWipTaskModalOpen] = useState(false);
  const [selectedWipTaskData, setSelectedWipTaskData] = useState(null);

  // Helper function to parse SQL datetime without timezone conversion
  const parseSQLDateTime = (sqlDateTime) => {
    if (!sqlDateTime) return null;
    try {
      // SQL Server returns datetime as "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
      // Parse as local time (no timezone conversion)
      const dateStr = String(sqlDateTime).replace('T', ' ').replace('Z', '');
      const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
      
      if (parts) {
        // Create date using local timezone (no conversion)
        const [, year, month, day, hour, minute, second] = parts;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1, // month is 0-indexed
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Fallback: try standard parsing but treat as local time
      const date = new Date(sqlDateTime);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Fetch WIP data for PN1
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data
        const [
          wipResponse, 
          forecastResponse, 
          dailyProductionResponse, 
          groupDeptResponse, 
          productListResponse, 
          otcProductsResponse,
          ofTargetResponse,
          ofActualResponse
        ] = await Promise.all([
          fetch(apiUrl('/api/wipData')),
          fetch(apiUrl('/api/forecast')),
          fetch(apiUrl('/api/dailyProduction')),
          fetch(apiUrl('/api/productGroupDept')),
          fetch(apiUrl('/api/productList')),
          fetch(apiUrl('/api/otcProducts')),
          fetch(apiUrl('/api/ofsummary')),
          fetch(apiUrl('/api/releasedBatches'))
        ]);

        // Process WIP data
        if (wipResponse.ok) {
          const wipResult = await wipResponse.json();
          setWipData(wipResult.data || []);
        }

        // Process forecast data
        if (forecastResponse.ok) {
          const forecastResult = await forecastResponse.json();
          setForecastData(forecastResult.data || forecastResult || []);
        }

        // Process daily production data
        if (dailyProductionResponse.ok) {
          const dailyProductionResult = await dailyProductionResponse.json();
          setDailyProductionData(dailyProductionResult.data || []);
        }

        // Process OF target data (from sp_Dashboard_OF1)
        if (ofTargetResponse.ok) {
          const ofTargetResult = await ofTargetResponse.json();
          // This endpoint returns data directly, not wrapped in { data: ... }
          setOfTargetData(ofTargetResult || []);
        }

        // Process OF actual data (from t_dnc_product)
        if (ofActualResponse.ok) {
          const ofActualResult = await ofActualResponse.json();
          setOfActualData(ofActualResult.data || []);
        }

        // Process product group/dept mapping
        if (groupDeptResponse.ok) {
          const groupDeptResult = await groupDeptResponse.json();
          const groupDeptData = groupDeptResult.data || [];
          
          // Create mapping of Product_ID to Group_Dept
          const deptMap = {};
          groupDeptData.forEach(item => {
            deptMap[item.Group_ProductID] = item.Group_Dept;
          });
          setProductGroupDept(deptMap);
        }

        // Process product categories (ETH vs OTC) and names
        if (productListResponse.ok && otcProductsResponse.ok) {
          const productListData = await productListResponse.json();
          const otcProductsData = await otcProductsResponse.json();

          const productList = productListData.data || [];
          const otcProducts = otcProductsData.data || [];

          // Create a Set of OTC product IDs for quick lookup
          const otcProductIds = new Set(otcProducts.map(p => p.Product_ID));

          // Categorize products as Generik, OTC, or ETH and map product names
          const categories = {};
          const names = {};
          productList.forEach(product => {
            const productId = product.Product_ID;
            const productName = (product.Product_Name || '').toLowerCase();
            
            // Check for Generik products by name
            if (productName.includes('generik') || productName.includes('generic')) {
              categories[productId] = 'Generik';
            } else if (otcProductIds.has(productId)) {
              categories[productId] = 'OTC';
            } else {
              categories[productId] = 'ETH';
            }
            
            names[productId] = product.Product_Name || `Product ${productId}`;
          });
          setProductCategories(categories);
          setProductNames(names);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to load dashboard data. Please try again.');
        setLoading(false);
      }
      // Note: Don't set loading to false here - let the data validation effect handle it
    };

    fetchData();
  }, []);

  // Separate effect to check when all critical data is loaded and ready
  useEffect(() => {
    // Only set loading to false when all critical data dependencies are present
    // This ensures derived calculations have all the data they need
    const hasProductGroupDept = Object.keys(productGroupDept).length > 0;
    const hasProductCategories = Object.keys(productCategories).length > 0;
    const hasProductNames = Object.keys(productNames).length > 0;
    const hasOfTargetData = ofTargetData.length > 0;
    const hasOfActualData = ofActualData.length > 0;
    
    // All critical data must be present before we show the dashboard
    if (loading && !error && hasProductGroupDept && hasProductCategories && hasProductNames && hasOfTargetData && hasOfActualData) {
      // Add a small delay to ensure all derived calculations complete
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loading, error, productGroupDept, productCategories, productNames, ofTargetData, ofActualData]);

  // Process WIP data for PN1 Proses stages
  const processPN1WIPData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Filter for PN1 only and exclude completed batches
    const batchesWithTempelLabelRelease = new Set();
    rawData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const pn1ActiveBatches = rawData.filter(entry => 
      entry.Group_Dept === 'PN2' && 
      !batchesWithTempelLabelRelease.has(entry.Batch_No)
    );

    // Define the Proses sub-stages we want to track
    const prosesStages = [
      'Terima Bahan',
      'Filling',
      'Mixing',
      'Granulasi',
      'Cetak',
      'Coating',
      'Kemas Primer',
      'Kemas Sekunder'
    ];

    const stageData = {};
    prosesStages.forEach(stageName => {
      stageData[stageName] = {
        batches: new Map(), // Map of batchNo -> batch details (with all entries)
        totalCount: 0
      };
    });

    // First, group all entries by batch and stage
    pn1ActiveBatches.forEach(entry => {
      const tahapanGroup = entry.tahapan_group;
      const batchNo = entry.Batch_No;

      // Skip if not a Proses stage
      if (!prosesStages.includes(tahapanGroup)) {
        return;
      }

      // Initialize batch if not exists
      if (!stageData[tahapanGroup].batches.has(batchNo)) {
        stageData[tahapanGroup].batches.set(batchNo, {
          batchNo: batchNo,
          productName: entry.Produk_Nama || entry.Product_Name || 'Unknown Product',
          entries: []
        });
      }

      // Add this entry to the batch's entries array
      stageData[tahapanGroup].batches.get(batchNo).entries.push(entry);
    });

    // Now calculate days in stage for each batch using ALL its entries
    prosesStages.forEach(stageName => {
      stageData[stageName].batches.forEach((batch, batchNo) => {
        // Check if batch is in progress for this stage
        const hasStartDate = batch.entries.some(e => e.StartDate);
        const hasMissingEndDate = batch.entries.some(e => !e.EndDate);
        const hasDisplayFlag = batch.entries.some(e => e.Display === '1' || e.Display === 1);

        if ((hasStartDate && hasMissingEndDate) || hasDisplayFlag) {
          // Calculate days in stage using EARLIEST IdleStartDate from all entries
          // This matches Production Dashboard's calculateDaysInStage function
          let earliestIdleDate = null;
          batch.entries.forEach(entry => {
            if (entry.IdleStartDate) {
              const idleDate = new Date(entry.IdleStartDate);
              if (!isNaN(idleDate.getTime())) {
                if (!earliestIdleDate || idleDate < earliestIdleDate) {
                  earliestIdleDate = idleDate;
                }
              }
            }
          });

          let daysInStage = 0;
          if (earliestIdleDate) {
            // Normalize both dates to midnight to avoid time-of-day issues
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            earliestIdleDate.setHours(0, 0, 0, 0);
            
            // Calculate difference in days
            const diffTime = today - earliestIdleDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Ensure we never return negative values
            daysInStage = Math.max(0, diffDays);
          }

          // Update the batch with calculated days
          batch.daysInStage = daysInStage;
        } else {
          // Batch not in progress, remove it
          stageData[stageName].batches.delete(batchNo);
        }
      });
    });

    // Convert to array format and sort batches by days descending
    return prosesStages.map(stageName => {
      const batchArray = Array.from(stageData[stageName].batches.values())
        .sort((a, b) => b.daysInStage - a.daysInStage);

      return {
        name: stageName,
        value: batchArray.length,
        avgDays: batchArray.length > 0 
          ? Math.round(batchArray.reduce((sum, b) => sum + b.daysInStage, 0) / batchArray.length)
          : 0,
        batches: batchArray
      };
    });
  };

  // Process production data for PN1 only
  const processPN1ProductionData = () => {
    if (!forecastData || forecastData.length === 0 || Object.keys(productGroupDept).length === 0) {
      return { monthly: [], daily: [] };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Monthly production data
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const periode = `${currentYear}${month.toString().padStart(2, '0')}`;
      
      // Filter forecast data for this period and PN1 products only
      const monthData = forecastData.filter(item => {
        const isPN1 = productGroupDept[item.Product_ID] === 'PN2';
        const isPeriod = item.Periode === periode;
        return isPN1 && isPeriod;
      });

      // Calculate production by category
      const productionByCategory = { ETH: 0, OTC: 0, Generik: 0 };

      monthData.forEach(item => {
        const production = parseFloat(item.Produksi) || 0;
        const productId = item.Product_ID;
        const category = productCategories[productId] || 'ETH';
        
        if (category === 'ETH' || category === 'OTC' || category === 'Generik') {
          productionByCategory[category] += production;
        }
      });

      const totalProduction = productionByCategory.ETH + productionByCategory.OTC + productionByCategory.Generik;

      monthlyData.push({
        month: new Date(currentYear, month - 1).toLocaleString('en-US', { month: 'short' }),
        eth: month <= currentMonth ? Math.round(productionByCategory.ETH) : 0,
        otc: month <= currentMonth ? Math.round(productionByCategory.OTC) : 0,
        generik: month <= currentMonth ? Math.round(productionByCategory.Generik) : 0,
        total: month <= currentMonth ? Math.round(totalProduction) : 0,
        hasData: month <= currentMonth
      });
    }

    // Daily production data (last 30 days)
    const dailyData = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayNumber = i === 0 ? 30 : 30 - i;
      
      // For now, we'll estimate daily from monthly (since we don't have daily granularity)
      // This could be replaced with actual daily data if available
      const monthIndex = date.getMonth();
      const monthProduction = monthlyData[monthIndex];
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      
      dailyData.push({
        day: dayNumber,
        eth: monthProduction ? Math.round(monthProduction.eth / daysInMonth) : 0,
        otc: monthProduction ? Math.round(monthProduction.otc / daysInMonth) : 0,
        generik: monthProduction ? Math.round(monthProduction.generik / daysInMonth) : 0
      });
    }

    return { monthly: monthlyData, daily: dailyData };
  };

  // Get production data
  const productionData = processPN1ProductionData();

  // Process daily production data for PN1 only (actual daily data from API)
  const processPN1DailyProductionData = () => {
    if (!dailyProductionData || dailyProductionData.length === 0 || Object.keys(productGroupDept).length === 0) {
      // Return empty array for 30 days if no data
      return Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        eth: 0,
        otc: 0,
        generik: 0,
        total: 0
      }));
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Create a map for quick lookup: day -> {eth, otc, generik}
    const dailyMap = {};
    
    dailyProductionData.forEach(item => {
      const productionDate = new Date(item.ProductionDate);
      const day = productionDate.getDate();
      const productId = item.Product_ID;
      const production = parseFloat(item.DailyProduction) || 0;
      
      // Only include PN2 products
      if (productGroupDept[productId] !== 'PN2') {
        return;
      }
      
      const category = productCategories[productId] || 'ETH';
      
      if (!dailyMap[day]) {
        dailyMap[day] = { eth: 0, otc: 0, generik: 0 };
      }
      
      // Add production to the appropriate category
      if (category === 'OTC') {
        dailyMap[day].otc += production;
      } else if (category === 'Generik') {
        dailyMap[day].generik += production;
      } else {
        dailyMap[day].eth += production;
      }
    });

    // Build array for all days in the month
    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = dailyMap[day] || { eth: 0, otc: 0, generik: 0 };
      const total = dayData.eth + dayData.otc + dayData.generik;
      
      dailyData.push({
        day: day,
        eth: Math.round(dayData.eth),
        otc: Math.round(dayData.otc),
        generik: Math.round(dayData.generik),
        total: Math.round(total)
      });
    }

    return dailyData;
  };

  // Process OF1 data - MTD cumulative production vs monthly target
  const processOF1Data = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayDate = currentDate.getDate();

    // Calculate total monthly target for PN1 products
    let totalMonthlyTarget = 0;
    
    ofTargetData.forEach(item => {
      const productId = item.ProductID;
      const target = parseFloat(item.group_stdoutput) || 0;

      // Check if this product is PN1
      const dept = productGroupDept[productId];
      if (dept === 'PN2') {
        totalMonthlyTarget += target;
      }
    });

    // Aggregate actual production by day for PN1 products
    const dailyActualMap = {}; // { day: totalProduction }
    
    ofActualData.forEach(item => {
      const productId = item.DNc_ProductID;
      const actual = parseFloat(item.DNC_Diluluskan) || 0;
      const processDate = item.Process_Date;

      // Check if this product is PN1
      const dept = productGroupDept[productId];
      if (dept !== 'PN2') return;

      // Parse the process date to get the day
      if (processDate) {
        const date = new Date(processDate);
        const day = date.getDate();
        
        // Only include if it's in the current month
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          if (!dailyActualMap[day]) {
            dailyActualMap[day] = 0;
          }
          dailyActualMap[day] += actual;
        }
      }
    });

    // Build cumulative data for each day
    const labels = [];
    const targetData = [];
    const actualCumulativeData = [];
    const dailyProductionData = [];
    
    let cumulativeActual = 0;
    
    for (let day = 1; day <= todayDate; day++) {
      labels.push(`${day}`);
      
      // Target is always the monthly total (straight line)
      targetData.push(Math.round(totalMonthlyTarget));
      
      // Add daily actual to cumulative
      const dailyActual = dailyActualMap[day] || 0;
      cumulativeActual += dailyActual;
      actualCumulativeData.push(Math.round(cumulativeActual));
      dailyProductionData.push(Math.round(dailyActual));
    }

    return { 
      labels, 
      targetData, 
      actualCumulativeData,
      dailyProductionData,
      totalMonthlyTarget: Math.round(totalMonthlyTarget),
      currentCumulative: Math.round(cumulativeActual)
    };
  };

  // Get actual daily production data for PN1
  const actualDailyData = processPN1DailyProductionData();

  // Get OF1 comparison data for PN1
  const of1ComparisonData = processOF1Data();

  // Listen for sidebar state changes
  useEffect(() => {
    const checkSidebarState = () => {
      const isMinimized = document.body.classList.contains('sidebar-minimized');
      setSidebarMinimized(isMinimized);
      // Force all charts to re-render when sidebar state changes
      setSidebarChartKey(prev => prev + 1);
    };

    // Initial check
    checkSidebarState();

    // Create a MutationObserver to watch for class changes on body
    const observer = new MutationObserver(checkSidebarState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Auto-rotate between Monthly and Daily Output every 10 seconds
  useEffect(() => {
    if (!autoMode) return; // Don't auto-rotate if auto mode is off
    
    const interval = setInterval(() => {
      // Start fade out
      setFadeClass('fade-out');
      
      // After fade out completes (500ms), switch view and fade in
      setTimeout(() => {
        setCurrentView(prev => prev === 'monthly' ? 'daily' : 'monthly');
        setFadeClass('fade-in');
      }, 500);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoMode]);

  // Force chart resize when sidebar state changes
  useEffect(() => {
    // Trigger a window resize event to make charts recalculate their size
    window.dispatchEvent(new Event('resize'));
  }, [sidebarMinimized]);

  // Update current date/time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Format date and time
  const formatDateTime = () => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return currentDateTime.toLocaleDateString('en-US', options);
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Fetch fresh data
    try {
      const [
        wipResponse, 
        forecastResponse, 
        dailyProductionResponse,
        ofTargetResponse,
        ofActualResponse
      ] = await Promise.all([
        fetch(apiUrl('/api/wipData')),
        fetch(apiUrl('/api/forecast')),
        fetch(apiUrl('/api/dailyProduction')),
        fetch(apiUrl('/api/ofsummary')),
        fetch(apiUrl('/api/releasedBatches'))
      ]);
      
      if (wipResponse.ok) {
        const result = await wipResponse.json();
        setWipData(result.data || []);
      }
      
      if (forecastResponse.ok) {
        const result = await forecastResponse.json();
        setForecastData(result.data || result || []);
      }
      
      if (dailyProductionResponse.ok) {
        const result = await dailyProductionResponse.json();
        setDailyProductionData(result.data || []);
      }

      if (ofTargetResponse.ok) {
        const result = await ofTargetResponse.json();
        // This endpoint returns data directly, not wrapped in { data: ... }
        setOfTargetData(result || []);
      }

      if (ofActualResponse.ok) {
        const result = await ofActualResponse.json();
        setOfActualData(result.data || []);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    
    // Force all charts to re-render
    setSidebarChartKey(prev => prev + 1);
    
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Handle Output chart click
  const handleOutputChartClick = (event, elements, chart) => {
    if (!elements || elements.length === 0) {
      return;
    }

    const clickedElement = elements[0];
    const index = clickedElement.index;
    
    const isMonthly = currentView === 'monthly';
    
    let periodLabel, periodValue, fullDate;
    
    if (isMonthly) {
      // Monthly view - get the month
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabel = monthNames[index];
      periodValue = `${new Date().getFullYear()}${(index + 1).toString().padStart(2, '0')}`;
      fullDate = `${periodLabel} ${new Date().getFullYear()}`;
    } else {
      // Daily view - get the day
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const day = index + 1;
      const date = new Date(year, month, day);
      
      const dayWithSuffix = day + getDaySuffix(day);
      const monthName = date.toLocaleString('en-US', { month: 'long' });
      const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
      
      periodLabel = `${dayWithSuffix} ${monthName}`;
      periodValue = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      fullDate = `${dayOfWeek}, ${dayWithSuffix} ${monthName} ${year}`;
    }

    // Prepare product breakdown data by category
    const productsByCategory = {
      ETH: [],
      OTC: [],
      Generik: []
    };

    if (isMonthly) {
      // Monthly breakdown - use forecast data
      forecastData.forEach(item => {
        const isPN1 = productGroupDept[item.Product_ID] === 'PN2';
        const isPeriod = item.Periode === periodValue;

        if (isPN1 && isPeriod) {
          const production = parseFloat(item.Produksi) || 0;
          if (production > 0) {
            const itemCategory = productCategories[item.Product_ID] || 'ETH';
            productsByCategory[itemCategory].push({
              productId: item.Product_ID,
              productName: item.Product_NM || item.Product_Name || `Product ${item.Product_ID}`,
              units: Math.round(production)
            });
          }
        }
      });
    } else {
      // Daily breakdown - use daily production data
      dailyProductionData.forEach(item => {
        const itemDate = new Date(item.ProductionDate);
        const itemDay = itemDate.getDate();
        const isPN1 = productGroupDept[item.Product_ID] === 'PN2';
        const matchesDay = itemDay === (index + 1);

        if (isPN1 && matchesDay) {
          const production = parseFloat(item.DailyProduction) || 0;
          if (production > 0) {
            const itemCategory = productCategories[item.Product_ID] || 'ETH';
            productsByCategory[itemCategory].push({
              productId: item.Product_ID,
              productName: productNames[item.Product_ID] || `Product ${item.Product_ID}`,
              units: Math.round(production)
            });
          }
        }
      });
    }

    // Sort each category by units descending
    Object.keys(productsByCategory).forEach(category => {
      productsByCategory[category].sort((a, b) => b.units - a.units);
    });

    // Calculate totals per category
    const categoryTotals = {};
    let grandTotal = 0;
    Object.keys(productsByCategory).forEach(category => {
      const total = productsByCategory[category].reduce((sum, p) => sum + p.units, 0);
      categoryTotals[category] = total;
      grandTotal += total;
    });

    const modalData = {
      period: periodLabel,
      fullDate: fullDate,
      productsByCategory: productsByCategory,
      categoryTotals: categoryTotals,
      grandTotal: grandTotal,
      viewType: isMonthly ? 'Monthly' : 'Daily'
    };
    
    setOutputModalData(modalData);
    setOutputModalOpen(true);
  };

  // Handle OF1 chart click
  const handleOF1ChartClick = (event, elements, chart) => {
    if (!elements || elements.length === 0) {
      return;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
    const fullDate = `${monthName} ${currentYear}`;

    // Build product details for PN1 products
    const productDetailsMap = {}; // { productId: { ... } }

    // Track total target calculation
    let totalTargetSum = 0;

    // First, get target batches from ofTargetData (sp_Dashboard_OF1 'SummaryByProsesGroup')
    // Each row is a target batch with ProductID, Product_Name, ListBet (batch number), and group_stdoutput (batch size)
    ofTargetData.forEach(item => {
      const productId = item.ProductID;
      const dept = productGroupDept[productId];
      
      if (dept === 'PN2') {
        const batchNo = item.ListBet; // Batch number
        const batchSize = parseFloat(item.group_stdoutput) || 0; // Expected output for this batch
        
        if (!productDetailsMap[productId]) {
          productDetailsMap[productId] = {
            productId: productId,
            productName: item.Product_Name || productNames[productId] || `Product ${productId}`,
            standardOutput: 0,
            targetBatches: [],
            extraBatches: [],
            totalProduced: 0,
            category: productCategories[productId] || 'ETH'
          };
        }

        // Add target batch
        if (batchNo && batchSize > 0) {
          productDetailsMap[productId].targetBatches.push({
            batchNo: String(batchNo), // Ensure it's a string for comparison
            batchSize: Math.round(batchSize),
            produced: 0,
            percentage: 0,
            isProduced: false,
            date: null
          });
          productDetailsMap[productId].standardOutput += batchSize;
          totalTargetSum += batchSize;
        }
      }
    });

    // Create a map of target batch numbers for quick lookup
    const targetBatchMap = {}; // { batchNo: { productId, batchIndex } }
    Object.keys(productDetailsMap).forEach(productId => {
      productDetailsMap[productId].targetBatches.forEach((batch, index) => {
        // Store both with and without leading zeros for matching flexibility
        const batchKey = String(batch.batchNo);
        targetBatchMap[batchKey] = { productId, batchIndex: index };
      });
    });

    // Then, process produced batches from ofActualData
    ofActualData.forEach(item => {
      const productId = item.DNc_ProductID;
      const dept = productGroupDept[productId];
      
      if (dept !== 'PN2') return;

      const batchNo = String(item.DNc_BatchNo || ''); // Convert to string for comparison
      const quantity = parseFloat(item.DNC_Diluluskan) || 0;
      const processDate = item.Process_Date;

      // Parse date
      if (processDate) {
        const date = new Date(processDate);
        
        // Only include current month
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && quantity > 0) {
          if (!productDetailsMap[productId]) {
            // Product not in target data, create entry
            productDetailsMap[productId] = {
              productId: productId,
              productName: productNames[productId] || `Product ${productId}`,
              standardOutput: 0,
              targetBatches: [],
              extraBatches: [],
              totalProduced: 0,
              category: productCategories[productId] || 'ETH'
            };
          }

          const dateFormatted = date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          });

          // Check if this batch is in target batches
          const targetBatchInfo = targetBatchMap[batchNo];
          if (targetBatchInfo && targetBatchInfo.productId === productId) {
            // Update target batch with produced quantity
            const batchIndex = targetBatchInfo.batchIndex;
            const targetBatch = productDetailsMap[productId].targetBatches[batchIndex];
            targetBatch.produced += quantity;
            targetBatch.percentage = Math.round((targetBatch.produced / targetBatch.batchSize) * 100);
            targetBatch.isProduced = true;
            targetBatch.date = dateFormatted;
          } else {
            // This is an extra batch not in targets
            // Check if we already have this extra batch (could be multiple releases)
            const existingExtra = productDetailsMap[productId].extraBatches.find(b => b.batchNo === batchNo);
            if (existingExtra) {
              existingExtra.quantity += Math.round(quantity);
            } else {
              productDetailsMap[productId].extraBatches.push({
                batchNo: batchNo,
                quantity: Math.round(quantity),
                date: dateFormatted
              });
            }
          }

          productDetailsMap[productId].totalProduced += quantity;
        }
      }
    });

    // Round produced quantities and sort batches
    Object.keys(productDetailsMap).forEach(productId => {
      const product = productDetailsMap[productId];
      
      // Round values
      product.standardOutput = Math.round(product.standardOutput);
      product.totalProduced = Math.round(product.totalProduced);
      
      // Round produced quantities in target batches
      product.targetBatches.forEach(batch => {
        batch.produced = Math.round(batch.produced);
      });
      
      // Sort target batches: produced first, then by batch number
      product.targetBatches.sort((a, b) => {
        if (a.isProduced !== b.isProduced) return b.isProduced - a.isProduced;
        return a.batchNo.localeCompare(b.batchNo);
      });
    });

    // Convert to array and sort by standard output (highest first)
    const productsList = Object.values(productDetailsMap)
      .filter(product => product.standardOutput > 0 || product.totalProduced > 0)
      .sort((a, b) => b.standardOutput - a.standardOutput);

    // Calculate totals
    const totalTarget = Math.round(totalTargetSum);
    const totalProduced = productsList.reduce((sum, p) => sum + p.totalProduced, 0);

    const modalData = {
      period: fullDate,
      products: productsList,
      totalTarget: totalTarget,
      totalProduced: totalProduced,
      completionRate: totalTarget > 0 ? Math.round((totalProduced / totalTarget) * 100) : 0
    };

    setOf1ModalData(modalData);
    setOf1ModalOpen(true);
  };

  // Handle WIP Stage Speedometer click
  const handleWipStageClick = (stageName) => {
    // Filter raw data for PN1 and this specific stage
    const batchesWithTempelLabelRelease = new Set();
    wipData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const stageEntries = wipData.filter(entry => {
      const entryDept = entry.Group_Dept || 'Unknown';
      const entryTahapanGroup = entry.tahapan_group || 'Other';
      
      return entryDept === 'PN2' 
        && entryTahapanGroup === stageName
        && !batchesWithTempelLabelRelease.has(entry.Batch_No);
    });

    // Group by Batch_No
    const batchDetails = {};
    stageEntries.forEach(entry => {
      const batchNo = entry.Batch_No;
      if (!batchDetails[batchNo]) {
        batchDetails[batchNo] = {
          batchNo: batchNo,
          productId: entry.Product_ID,
          productName: entry.Product_Name || entry.Produk_Nama,
          batchDate: entry.Batch_Date,
          jenisSediaan: entry.Jenis_Sediaan,
          entries: [],
          hasStartDate: false,
          hasMissingEndDate: false,
          hasDisplayFlag: false,
          tasksCompleted: 0,
          totalTasks: 0,
        };
      }
      batchDetails[batchNo].entries.push(entry);
      batchDetails[batchNo].totalTasks++;
      if (entry.StartDate) batchDetails[batchNo].hasStartDate = true;
      if (!entry.EndDate) {
        batchDetails[batchNo].hasMissingEndDate = true;
      }
      if (entry.EndDate) {
        batchDetails[batchNo].tasksCompleted++;
      }
      if (entry.Display === '1' || entry.Display === 1) {
        batchDetails[batchNo].hasDisplayFlag = true;
      }
    });

    // Filter to only show batches in progress
    const activeBatches = Object.values(batchDetails).filter(batch => {
      if (!batch.hasMissingEndDate && !batch.hasDisplayFlag) {
        return false;
      }
      const isInProgress = (batch.hasStartDate && batch.hasMissingEndDate) || batch.hasDisplayFlag;
      return isInProgress;
    });

    // Calculate days in stage for each batch
    activeBatches.forEach(batch => {
      // Find earliest IdleStartDate
      let earliestIdleDate = null;
      batch.entries.forEach(entry => {
        if (entry.IdleStartDate) {
          const idleDate = new Date(entry.IdleStartDate);
          if (!isNaN(idleDate.getTime())) {
            if (!earliestIdleDate || idleDate < earliestIdleDate) {
              earliestIdleDate = idleDate;
            }
          }
        }
      });

      if (earliestIdleDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        earliestIdleDate.setHours(0, 0, 0, 0);
        const diffTime = today - earliestIdleDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        batch.daysInStage = Math.max(0, diffDays);
        batch.stageStart = earliestIdleDate.toLocaleDateString('en-GB');
      } else {
        batch.daysInStage = 0;
        batch.stageStart = 'N/A';
      }
    });

    // Sort by longest duration first
    activeBatches.sort((a, b) => b.daysInStage - a.daysInStage);

    setSelectedWipStageData({
      stageName: stageName,
      batches: activeBatches,
      color: '#4f8cff',
    });
    setWipStageModalOpen(true);
  };

  // Handle task details click
  const handleWipTaskDetailsClick = (batch, stageName, color) => {
    // Sort tasks: in progress first, then unstarted, then completed
    const sortedTasks = [...batch.entries].sort((a, b) => {
      const aInProgress = a.StartDate && !a.EndDate;
      const bInProgress = b.StartDate && !b.EndDate;
      const aUnstarted = !a.StartDate;
      const bUnstarted = !b.StartDate;

      // In progress first
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;

      // Then unstarted
      if (aInProgress === bInProgress) {
        if (aUnstarted && !bUnstarted) return -1;
        if (!aUnstarted && bUnstarted) return 1;
      }

      return 0;
    });

    setSelectedWipTaskData({
      batchNo: batch.batchNo,
      productName: batch.productName,
      productId: batch.productId,
      batchDate: batch.batchDate,
      stageName: stageName,
      tasks: sortedTasks,
      color: color,
    });
    setWipTaskModalOpen(true);
  };

  // Handle batch click from speedometer - opens stage modal then immediately opens task details
  const handleSpeedometerBatchClick = (stageName, clickedBatch) => {
    // First, fetch all batches for this stage (same as handleWipStageClick)
    const batchesWithTempelLabelRelease = new Set();
    wipData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const stageEntries = wipData.filter(entry => {
      const entryDept = entry.Group_Dept || 'Unknown';
      const entryTahapanGroup = entry.tahapan_group || 'Other';
      
      return entryDept === 'PN2' 
        && entryTahapanGroup === stageName
        && !batchesWithTempelLabelRelease.has(entry.Batch_No);
    });

    // Group by Batch_No and build full batch details
    const batchDetails = {};
    stageEntries.forEach(entry => {
      const batchNo = entry.Batch_No;
      if (!batchDetails[batchNo]) {
        batchDetails[batchNo] = {
          batchNo: batchNo,
          productId: entry.Product_ID,
          productName: entry.Product_Name || entry.Produk_Nama,
          batchDate: entry.Batch_Date,
          jenisSediaan: entry.Jenis_Sediaan,
          entries: [],
          hasStartDate: false,
          hasMissingEndDate: false,
          hasDisplayFlag: false,
          tasksCompleted: 0,
          totalTasks: 0,
        };
      }
      batchDetails[batchNo].entries.push(entry);
      batchDetails[batchNo].totalTasks++;
      if (entry.StartDate) batchDetails[batchNo].hasStartDate = true;
      if (!entry.EndDate) {
        batchDetails[batchNo].hasMissingEndDate = true;
      }
      if (entry.EndDate) {
        batchDetails[batchNo].tasksCompleted++;
      }
      if (entry.Display === '1' || entry.Display === 1) {
        batchDetails[batchNo].hasDisplayFlag = true;
      }
    });

    // Find the full batch data for the clicked batch
    const fullBatchData = batchDetails[clickedBatch.batchNo];
    
    if (!fullBatchData) {
      console.error('Batch data not found:', clickedBatch.batchNo);
      return;
    }

    // Calculate days in stage and stage start
    let earliestIdleDate = null;
    fullBatchData.entries.forEach(entry => {
      if (entry.IdleStartDate) {
        const idleDate = new Date(entry.IdleStartDate);
        if (!isNaN(idleDate.getTime())) {
          if (!earliestIdleDate || idleDate < earliestIdleDate) {
            earliestIdleDate = idleDate;
          }
        }
      }
    });

    if (earliestIdleDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      earliestIdleDate.setHours(0, 0, 0, 0);
      const diffTime = today - earliestIdleDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      fullBatchData.daysInStage = Math.max(0, diffDays);
      fullBatchData.stageStart = earliestIdleDate.toLocaleDateString('en-GB');
    } else {
      fullBatchData.daysInStage = 0;
      fullBatchData.stageStart = 'N/A';
    }

    // Get all active batches for the stage modal
    const activeBatches = Object.values(batchDetails).filter(batch => {
      if (!batch.hasMissingEndDate && !batch.hasDisplayFlag) {
        return false;
      }
      const isInProgress = (batch.hasStartDate && batch.hasMissingEndDate) || batch.hasDisplayFlag;
      return isInProgress;
    });

    // Calculate days for all batches
    activeBatches.forEach(batch => {
      if (batch.batchNo === fullBatchData.batchNo) {
        // Already calculated for the clicked batch
        batch.daysInStage = fullBatchData.daysInStage;
        batch.stageStart = fullBatchData.stageStart;
      } else {
        let earliestIdleDate = null;
        batch.entries.forEach(entry => {
          if (entry.IdleStartDate) {
            const idleDate = new Date(entry.IdleStartDate);
            if (!isNaN(idleDate.getTime())) {
              if (!earliestIdleDate || idleDate < earliestIdleDate) {
                earliestIdleDate = idleDate;
              }
            }
          }
        });

        if (earliestIdleDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          earliestIdleDate.setHours(0, 0, 0, 0);
          const diffTime = today - earliestIdleDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          batch.daysInStage = Math.max(0, diffDays);
          batch.stageStart = earliestIdleDate.toLocaleDateString('en-GB');
        } else {
          batch.daysInStage = 0;
          batch.stageStart = 'N/A';
        }
      }
    });

    // Sort by longest duration first
    activeBatches.sort((a, b) => b.daysInStage - a.daysInStage);

    // Open stage modal
    setSelectedWipStageData({
      stageName: stageName,
      batches: activeBatches,
      color: '#4f8cff',
    });
    setWipStageModalOpen(true);

    // Immediately open task details modal for the clicked batch
    handleWipTaskDetailsClick(fullBatchData, stageName, '#4f8cff');
  };

  // Helper to parse SQL datetime for display
  const parseSQLDateTimeForDisplay = (sqlDateTime) => {
    if (!sqlDateTime) return null;
    try {
      const date = new Date(sqlDateTime);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Get WIP stages data
  const wipStages = processPN1WIPData(wipData);
  // Monthly Output data (using real production data)
  const monthlyOutputData = {
    labels: productionData.monthly.map(d => d.month),
    datasets: [
      {
        label: 'ETH',
        data: productionData.monthly.map(d => d.hasData ? d.eth : null),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: '#9333ea',
        borderWidth: 1
      },
      {
        label: 'OTC',
        data: productionData.monthly.map(d => d.hasData ? d.otc : null),
        backgroundColor: 'rgba(79, 140, 255, 0.8)',
        borderColor: '#4f8cff',
        borderWidth: 1
      },
      {
        label: 'Generik',
        data: productionData.monthly.map(d => d.hasData ? d.generik : null),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: '#22c55e',
        borderWidth: 1
      }
    ]
  };

  const monthlyOutputOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleOutputChartClick,
    layout: {
      padding: {
        top: 5,
        bottom: 5,
        left: 5,
        right: 5
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          font: {
            size: 10
          },
          callback: function(value) {
            return (value / 1000) + 'K';
          }
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          font: {
            size: 10
          },
          padding: 8
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' units';
          }
        }
      }
    }
  };

  // Daily Output data (using real daily production data from API)
  const dailyOutputData = {
    labels: actualDailyData.map(d => `${d.day}`),
    datasets: [
      {
        label: 'ETH',
        data: actualDailyData.map(d => d.eth),
        borderColor: '#9333ea',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'OTC',
        data: actualDailyData.map(d => d.otc),
        borderColor: '#4f8cff',
        backgroundColor: 'rgba(79, 140, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Generik',
        data: actualDailyData.map(d => d.generik),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }
    ]
  };

  const dailyOutputOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleOutputChartClick,
    layout: {
      padding: {
        top: 5,
        bottom: 5,
        left: 5,
        right: 5
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          font: {
            size: 9
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 10
          },
          callback: function(value) {
            return (value / 1000) + 'K';
          }
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          font: {
            size: 10
          },
          padding: 8
        }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const day = parseInt(context[0].label);
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Create date for the specific day
            const date = new Date(year, month, day);
            
            // Format: "4th November 2025"
            const dayWithSuffix = day + getDaySuffix(day);
            const monthName = date.toLocaleString('en-US', { month: 'long' });
            const fullYear = date.getFullYear();
            
            // Format: "Monday"
            const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
            
            return [`${dayWithSuffix} ${monthName} ${fullYear}`, dayOfWeek];
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y.toLocaleString();
            return `${label}: ${value} units`;
          }
        }
      }
    }
  };

  // Helper function to get day suffix (1st, 2nd, 3rd, 4th, etc.)
  const getDaySuffix = (day) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Daily OF1 data (MTD Cumulative: Monthly Target vs Actual Production)
  const dailyOF1Data = {
    labels: of1ComparisonData.labels,
    datasets: [
      {
        label: 'Monthly Target',
        data: of1ComparisonData.targetData,
        borderColor: '#e57373',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4
      },
      {
        label: 'Cumulative Production',
        data: of1ComparisonData.actualCumulativeData,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  };

  const dailyOF1Options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleOF1ChartClick,
    layout: {
      padding: {
        top: 5,
        bottom: 5,
        left: 5,
        right: 5
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          font: {
            size: 9
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 10
          },
          callback: function(value) {
            return (value / 1000) + 'K';
          }
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          font: {
            size: 10
          },
          padding: 8
        }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const day = context[0].label;
            const currentDate = new Date();
            const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });
            const currentYear = currentDate.getFullYear();
            return `${currentMonth} ${day}, ${currentYear}`;
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y.toLocaleString();
            return `${label}: ${value} units`;
          },
          afterBody: function(context) {
            const dayIndex = context[0].dataIndex;
            const dailyProduction = of1ComparisonData.dailyProductionData[dayIndex] || 0;
            const actual = of1ComparisonData.actualCumulativeData[dayIndex] || 0;
            const target = of1ComparisonData.totalMonthlyTarget || 0;
            
            let info = `\nDaily Production: ${dailyProduction.toLocaleString()} units`;
            
            if (target > 0) {
              const percentage = ((actual / target) * 100).toFixed(1);
              info += `\nProgress: ${percentage}% of monthly target`;
            }
            
            return info;
          }
        }
      }
    }
  };

  // WIP Summary data for pointer-based donut - use real WIP stages data
  const wipSummaryStages = (() => {
    if (!wipData.length || wipStages.length === 0) {
      // Fallback to empty data if no real data
      return [];
    }

    // Use wipStages directly - filter out stages with 0 values
    return wipStages
      .filter(stage => stage.value > 0)
      .map(stage => ({
        name: stage.name,
        value: stage.value
      }));
  })();

  return (
    <div className="line-pn2-dashboard">
      <Sidebar />
      
      {/* Loading Screen */}
      <DashboardLoading 
        loading={loading && !error} 
        text="Loading Line PN2 Dashboard..." 
        subtext="Fetching WIP, production, and OF data..." 
        coverContentArea={true}
      />

      {/* Error Screen */}
      {error && !loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: '#fff',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '40px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ 
              fontSize: '24px', 
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              Oops! Something went wrong
            </h2>
            <p style={{ 
              color: '#94a3b8', 
              marginBottom: '8px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              We apologize for the inconvenience. The dashboard failed to load data.
            </p>
            <p style={{ 
              color: '#ef4444', 
              marginBottom: '24px',
              fontSize: '13px',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                // Re-trigger the useEffect by forcing a component update
                window.location.reload();
              }}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      )}

      <div className="line-pn2-main-content">
        <div className="line-pn2-content">
          <div className="line-pn2-header">
            <div className="line-pn2-header-left">
              <h1>Line PN2 Dashboard</h1>
              <div className="line-pn2-datetime">
                <span>📅</span>
                <span>{formatDateTime()}</span>
              </div>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className={`line-pn2-refresh-btn ${refreshing ? 'refreshing' : ''}`}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className={`line-pn2-charts-container ${sidebarMinimized ? 'sidebar-minimized' : ''}`}>
            {/* Combined Monthly/Daily Output - Auto-rotating */}
            <div className="line-pn2-chart-card">
              <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>{currentView === 'monthly' ? 'Monthly Output' : 'Daily Output'}</h3>
                  <span className="chart-card-subtitle">
                    {currentView === 'monthly' ? 'Total units produced per month' : 'Last 30 days production trend'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    onClick={() => setAutoMode(!autoMode)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: autoMode ? '#10b981' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      boxShadow: autoMode ? '0 2px 8px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = autoMode ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 4px 8px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = autoMode ? '0 2px 8px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    {autoMode ? '🔄 Auto' : '⏸️ Manual'}
                  </button>
                  <button
                    onClick={() => {
                      setAutoMode(false);
                      setFadeClass('fade-out');
                      setTimeout(() => {
                        setCurrentView(prev => prev === 'monthly' ? 'daily' : 'monthly');
                        setFadeClass('fade-in');
                      }, 500);
                    }}
                    disabled={autoMode}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: autoMode ? '#e5e7eb' : '#3b82f6',
                      color: autoMode ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: autoMode ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      boxShadow: autoMode ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
                      opacity: autoMode ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!autoMode) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!autoMode) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                      }
                    }}
                  >
                    {currentView === 'monthly' ? '📊 Daily' : '📅 Monthly'}
                  </button>
                </div>
              </div>
              <div style={{ position: 'relative', height: '250px', minHeight: '250px' }}>
                <div className={`chart-card-content ${currentView === 'monthly' ? 'fade-in' : 'fade-out'}`}>
                  <Bar data={monthlyOutputData} options={monthlyOutputOptions} key={`monthly-${sidebarMinimized}`} />
                </div>
                <div className={`chart-card-content ${currentView === 'daily' ? 'fade-in' : 'fade-out'}`}>
                  <Line data={dailyOutputData} options={dailyOutputOptions} key={`daily-${sidebarMinimized}`} />
                </div>
              </div>
            </div>

            {/* Daily OF1 */}
            <div className="line-pn2-chart-card">
              <div className="chart-card-header">
                <h3>Daily OF1</h3>
                <span className="chart-card-subtitle">Order fulfillment for current month batches</span>
              </div>
              <div className="chart-card-content" key={`of1-${sidebarChartKey}`}>
                <Line data={dailyOF1Data} options={dailyOF1Options} key={`of1-chart-${sidebarChartKey}`} />
              </div>
            </div>

            {/* WIP Summary - Only visible when sidebar is minimized */}
            {sidebarMinimized && (
              <div className="line-pn2-chart-card">
                <div className="chart-card-header">
                  <h3>WIP Summary</h3>
                  <span className="chart-card-subtitle">Batches by production stage</span>
                </div>
                <div className="chart-card-content" key={`wip-${sidebarChartKey}`}>
                  <WIPDonutWithPointers stages={wipSummaryStages} />
                </div>
              </div>
            )}
          </div>

          {/* WIP Speedometers Section */}
          <div className="line-pn2-wip-section">
            <h2 className="line-pn2-section-title">Work In Progress Stages</h2>
            {wipStages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                  No WIP Data Available
                </div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                  There are currently no batches in progress
                </div>
              </div>
            ) : (
              <div className="line-pn2-speedometers-grid">
                {wipStages.map((stage, index) => (
                  <Speedometer
                    key={index}
                    label={stage.name}
                    value={stage.value}
                    maxValue={50}
                    stageName={stage.name}
                    batches={stage.batches}
                    onClick={handleWipStageClick}
                    onBatchClick={handleSpeedometerBatchClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Output Modal */}
      {outputModalOpen && outputModalData && (
        <Modal
          open={outputModalOpen}
          title={`${outputModalData.viewType} Production Breakdown`}
          onClose={() => setOutputModalOpen(false)}
        >
          <div style={{ padding: '0 10px' }}>
            {/* Header Section */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                📅 {outputModalData.fullDate}
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700',
                marginBottom: '4px',
                letterSpacing: '-0.5px'
              }}>
                {outputModalData.grandTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Total Units Produced
              </div>
            </div>

            {/* Category Cards Container */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: (() => {
                const hasETH = outputModalData.productsByCategory.ETH?.length > 0;
                const hasOTC = outputModalData.productsByCategory.OTC?.length > 0;
                const hasGenerik = outputModalData.productsByCategory.Generik?.length > 0;
                const count = [hasETH, hasOTC, hasGenerik].filter(Boolean).length;
                
                if (count === 3) return '1fr 1fr 1fr';
                if (count === 2) return '1fr 1fr';
                return '1fr';
              })(),
              gap: '20px',
              marginBottom: '10px',
              alignItems: 'start'
            }}>
              {/* ETH Category Card */}
              {outputModalData.productsByCategory.ETH && outputModalData.productsByCategory.ETH.length > 0 && (
                <div style={{
                  border: '2px solid #10b981',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '500px'
                }}>
                  {/* Category Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    padding: '16px 20px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>💊</span>
                      <span style={{ fontSize: '18px', fontWeight: '600' }}>ETH Products</span>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {outputModalData.categoryTotals.ETH.toLocaleString()} units
                    </div>
                  </div>
                  
                  {/* Products Table */}
                  <div style={{ 
                    padding: '20px',
                    overflowY: 'auto',
                    flexGrow: 1
                  }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'separate',
                      borderSpacing: '0'
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: '#f0fdf4',
                          borderBottom: '2px solid #10b981'
                        }}>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#065f46',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Product Name</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#065f46',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outputModalData.productsByCategory.ETH.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{
                              padding: '40px 16px',
                              textAlign: 'center',
                              color: '#9ca3af',
                              fontSize: '14px'
                            }}>
                              No ETH products produced
                            </td>
                          </tr>
                        ) : (
                          outputModalData.productsByCategory.ETH.map((product, idx) => (
                            <tr key={idx} style={{
                              borderBottom: idx < outputModalData.productsByCategory.ETH.length - 1 ? '1px solid #e5e7eb' : 'none',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{
                                padding: '14px 16px',
                                fontSize: '14px',
                                color: '#1f2937'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    display: 'inline-block'
                                  }}></span>
                                  {product.productName}
                                </div>
                              </td>
                              <td style={{
                                padding: '14px 16px',
                                textAlign: 'right',
                                fontSize: '15px',
                                fontWeight: '600',
                                color: '#059669'
                              }}>
                                {product.units.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* OTC Category Card */}
              {outputModalData.productsByCategory.OTC && outputModalData.productsByCategory.OTC.length > 0 && (
                <div style={{
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '500px'
                }}>
                  {/* Category Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    padding: '16px 20px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>🏪</span>
                      <span style={{ fontSize: '18px', fontWeight: '600' }}>OTC Products</span>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {outputModalData.categoryTotals.OTC.toLocaleString()} units
                    </div>
                  </div>
                  
                  {/* Products Table */}
                  <div style={{ 
                    padding: '20px',
                    overflowY: 'auto',
                    flexGrow: 1
                  }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'separate',
                      borderSpacing: '0'
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: '#eff6ff',
                          borderBottom: '2px solid #3b82f6'
                        }}>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#1e40af',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Product Name</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#1e40af',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outputModalData.productsByCategory.OTC.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{
                              padding: '40px 16px',
                              textAlign: 'center',
                              color: '#9ca3af',
                              fontSize: '14px'
                            }}>
                              No OTC products produced
                            </td>
                          </tr>
                        ) : (
                          outputModalData.productsByCategory.OTC.map((product, idx) => (
                            <tr key={idx} style={{
                              borderBottom: idx < outputModalData.productsByCategory.OTC.length - 1 ? '1px solid #e5e7eb' : 'none',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{
                                padding: '14px 16px',
                                fontSize: '14px',
                                color: '#1f2937'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#3b82f6',
                                    display: 'inline-block'
                                  }}></span>
                                  {product.productName}
                                </div>
                              </td>
                              <td style={{
                                padding: '14px 16px',
                                textAlign: 'right',
                                fontSize: '15px',
                                fontWeight: '600',
                                color: '#2563eb'
                              }}>
                                {product.units.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Generik Category Card */}
              {outputModalData.productsByCategory.Generik && outputModalData.productsByCategory.Generik.length > 0 && (
                <div style={{
                  border: '2px solid #22c55e',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '500px'
                }}>
                  {/* Category Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    padding: '16px 20px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>🧪</span>
                      <span style={{ fontSize: '18px', fontWeight: '600' }}>Generik Products</span>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {outputModalData.categoryTotals.Generik.toLocaleString()} units
                    </div>
                  </div>
                  
                  {/* Products Table */}
                  <div style={{ 
                    padding: '20px',
                    overflowY: 'auto',
                    flexGrow: 1
                  }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'separate',
                      borderSpacing: '0'
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: '#f0fdf4',
                          borderBottom: '2px solid #22c55e'
                        }}>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#166534',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Product Name</th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#166534',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outputModalData.productsByCategory.Generik.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{
                              padding: '40px 16px',
                              textAlign: 'center',
                              color: '#9ca3af',
                              fontSize: '14px'
                            }}>
                              No Generik products produced
                            </td>
                          </tr>
                        ) : (
                          outputModalData.productsByCategory.Generik.map((product, idx) => (
                            <tr key={idx} style={{
                              borderBottom: idx < outputModalData.productsByCategory.Generik.length - 1 ? '1px solid #e5e7eb' : 'none',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{
                                padding: '14px 16px',
                                fontSize: '14px',
                                color: '#1f2937'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#22c55e',
                                    display: 'inline-block'
                                  }}></span>
                                  {product.productName}
                                </div>
                              </td>
                              <td style={{
                                padding: '14px 16px',
                                textAlign: 'right',
                                fontSize: '15px',
                                fontWeight: '600',
                                color: '#16a34a'
                              }}>
                                {product.units.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* No Data Message */}
            {(!outputModalData.productsByCategory.ETH || outputModalData.productsByCategory.ETH.length === 0) &&
             (!outputModalData.productsByCategory.OTC || outputModalData.productsByCategory.OTC.length === 0) &&
             (!outputModalData.productsByCategory.Generik || outputModalData.productsByCategory.Generik.length === 0) && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                No production data available for this period.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* OF1 Modal */}
      {of1ModalOpen && of1ModalData && (
        <Modal
          open={of1ModalOpen}
          title="Daily OF1 - Product Breakdown"
          onClose={() => setOf1ModalOpen(false)}
        >
          {/* Header Section */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '18px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>
              📅 {of1ModalData.period}
            </div>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                  {of1ModalData.totalProduced.toLocaleString()} / {of1ModalData.totalTarget.toLocaleString()}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  Total Produced / Monthly Target
                </div>
              </div>
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                padding: '10px 16px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '700' }}>
                  {of1ModalData.completionRate}%
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  Completion
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px'
          }}>
              {of1ModalData.products.map((product, idx) => (
                <div 
                  key={idx}
                  style={{
                    border: `2px solid ${product.category === 'OTC' ? '#3b82f6' : '#10b981'}`,
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  {/* Product Header */}
                  <div style={{
                    background: product.category === 'OTC' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    padding: '12px 14px',
                    color: 'white'
                  }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '600',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: 0
                    }}>
                      <span style={{ flexShrink: 0 }}>{product.category === 'OTC' ? '🏪' : '💊'}</span>
                      <span style={{ flexShrink: 0 }}>{product.productId}</span>
                      <span style={{ 
                        fontSize: '12px',
                        opacity: 0.95,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0
                      }}>
                        - {product.productName}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      opacity: 0.95
                    }}>
                      <span>Target: {product.standardOutput.toLocaleString()}</span>
                      <span>Produced: {product.totalProduced.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Batches Section */}
                  <div style={{ 
                    padding: '14px'
                  }}>
                    {/* Target Batches */}
                    {product.targetBatches.length > 0 && (
                      <>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '10px'
                        }}>
                          Target Batches ({product.targetBatches.length})
                        </div>
                        <div style={{
                          marginBottom: '16px'
                        }}>
                          {product.targetBatches.map((batch, batchIdx) => (
                            <div
                              key={batchIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                marginBottom: '6px',
                                backgroundColor: batch.isProduced ? '#f0fdf4' : '#fef3c7',
                                borderRadius: '6px',
                                border: `2px solid ${batch.isProduced ? '#10b981' : '#f59e0b'}`,
                                fontSize: '13px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flex: 1,
                                minWidth: 0
                              }}>
                                <span style={{ fontSize: '16px', flexShrink: 0 }}>
                                  {batch.isProduced ? '✅' : '⏳'}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ 
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {batch.batchNo}
                                  </div>
                                  {batch.date && (
                                    <div style={{ 
                                      fontSize: '10px',
                                      color: '#6b7280'
                                    }}>
                                      {batch.date}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ 
                                fontSize: '13px',
                                fontWeight: '600',
                                color: batch.isProduced ? '#059669' : '#d97706',
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                                marginLeft: '8px',
                                flexShrink: 0
                              }}>
                                {batch.produced.toLocaleString()} / {batch.batchSize.toLocaleString()}
                                {batch.isProduced && ` (${batch.percentage}%)`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Extra Batches */}
                    {product.extraBatches.length > 0 && (
                      <>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '10px'
                        }}>
                          Extra Batches ({product.extraBatches.length})
                        </div>
                        <div>
                          {product.extraBatches.map((batch, batchIdx) => (
                            <div
                              key={batchIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                marginBottom: '6px',
                                backgroundColor: '#eff6ff',
                                borderRadius: '6px',
                                border: '1px solid #3b82f6',
                                fontSize: '13px'
                              }}
                            >
                              <div style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flex: 1,
                                minWidth: 0
                              }}>
                                <span style={{ fontSize: '16px', flexShrink: 0 }}>➕</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ 
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {batch.batchNo}
                                  </div>
                                  <div style={{ 
                                    fontSize: '10px',
                                    color: '#6b7280'
                                  }}>
                                    {batch.date}
                                  </div>
                                </div>
                              </div>
                              <div style={{
                                fontWeight: '700',
                                color: '#2563eb',
                                fontSize: '13px',
                                whiteSpace: 'nowrap',
                                marginLeft: '8px',
                                flexShrink: 0
                              }}>
                                {batch.quantity.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* No Batches Message */}
                    {product.targetBatches.length === 0 && product.extraBatches.length === 0 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: '#9ca3af',
                        fontSize: '13px'
                      }}>
                        No batches data available
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* No Data Message */}
          {of1ModalData.products.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              No production data available for this period.
            </div>
          )}
        </Modal>
      )}

      {/* WIP Stage Modal */}
      {wipStageModalOpen && selectedWipStageData && (
        <Modal
          open={wipStageModalOpen}
          title={`${selectedWipStageData.stageName} - Batches in Progress`}
          onClose={() => setWipStageModalOpen(false)}
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              background: `linear-gradient(135deg, ${selectedWipStageData.color}15, ${selectedWipStageData.color}05)`,
              borderRadius: '8px',
              borderLeft: `4px solid ${selectedWipStageData.color}`,
            }}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '4px' }}>
                <strong>Department:</strong> PN1 | 
                <strong style={{ marginLeft: '8px' }}>Stage:</strong> {selectedWipStageData.stageName}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: selectedWipStageData.color }}>
                {selectedWipStageData.batches.length} Batch{selectedWipStageData.batches.length !== 1 ? 'es' : ''} in Progress
              </div>
            </div>

            {selectedWipStageData.batches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📦</div>
                <p>No batches in progress</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedWipStageData.batches.map((batch, index) => (
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
                        <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '4px' }}>
                          Stage Start: {batch.stageStart || 'N/A'}
                        </div>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#e67e22',
                          fontWeight: '600',
                        }}>
                          Days in Stage: {batch.daysInStage !== null ? `${batch.daysInStage} ${batch.daysInStage === 1 ? 'day' : 'days'}` : 'Not Started'}
                        </div>
                        {batch.jenisSediaan && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: selectedWipStageData.color,
                            fontWeight: '600',
                            marginTop: '4px',
                            padding: '2px 8px',
                            background: `${selectedWipStageData.color}15`,
                            borderRadius: '4px',
                            display: 'inline-block',
                          }}>
                            {batch.jenisSediaan}
                          </div>
                        )}
                      </div>
                      <div style={{
                        background: selectedWipStageData.color,
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
                        background: `linear-gradient(135deg, ${selectedWipStageData.color}10, ${selectedWipStageData.color}05)`,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: `1px solid ${selectedWipStageData.color}30`,
                      }}
                      onClick={() => handleWipTaskDetailsClick(batch, selectedWipStageData.stageName, selectedWipStageData.color)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${selectedWipStageData.color}20, ${selectedWipStageData.color}10)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${selectedWipStageData.color}10, ${selectedWipStageData.color}05)`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ color: '#6c757d' }}>
                          <strong style={{ color: selectedWipStageData.color }}>{batch.tasksCompleted}/{batch.totalTasks}</strong> task{batch.totalTasks > 1 ? 's' : ''} completed
                        </div>
                        <div style={{ fontSize: '0.9rem', color: selectedWipStageData.color }}>
                          👁️ View Details
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* WIP Task Details Modal */}
      {wipTaskModalOpen && selectedWipTaskData && (
        <Modal 
          open={wipTaskModalOpen} 
          onClose={() => setWipTaskModalOpen(false)} 
          title={`Task Details - Batch ${selectedWipTaskData.batchNo}`}
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              background: `linear-gradient(135deg, ${selectedWipTaskData.color}15, ${selectedWipTaskData.color}05)`,
              borderRadius: '8px',
              borderLeft: `4px solid ${selectedWipTaskData.color}`,
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>
                {selectedWipTaskData.productName}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <strong>Product ID:</strong> {selectedWipTaskData.productId}
                </div>
                <div>
                  <strong>Batch No:</strong> {selectedWipTaskData.batchNo}
                </div>
                <div>
                  <strong>Batch Date:</strong> {selectedWipTaskData.batchDate}
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.9rem', color: selectedWipTaskData.color, fontWeight: '600' }}>
                Stage: {selectedWipTaskData.stageName}
              </div>
            </div>

            {selectedWipTaskData.tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📋</div>
                <p>No tasks found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedWipTaskData.tasks.map((task, index) => {
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
                            {task.StartDate ? parseSQLDateTimeForDisplay(task.StartDate)?.toLocaleString('id-ID', {
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
                            {task.EndDate ? parseSQLDateTimeForDisplay(task.EndDate)?.toLocaleString('id-ID', {
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
        </Modal>
      )}
    </div>
  );
};

export default LinePN2Dashboard;

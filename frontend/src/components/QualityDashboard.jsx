import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Sidebar from './Sidebar';
import Modal from './Modal';
import DashboardLoading from './DashboardLoading';
import ContextualHelpModal from './ContextualHelpModal';
import { useHelp } from '../context/HelpContext';
import { loadQualityCache, saveQualityCache, clearQualityCache, isQualityCacheValid } from '../utils/dashboardCache';
import { apiUrl } from '../api';
import './QualityDashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

// Helper function to determine if a batch is in "Waiting" status for a stage
// Waiting = all steps with IdleStartDate are completed, remaining steps don't have IdleStartDate yet
// BUT if ALL tasks in the stage are complete, it's not waiting - the stage is done
const isBatchWaiting = (entries) => {
  if (!entries || entries.length === 0) return false;
  
  // First check: If ALL entries are complete (have EndDate), stage is finished - not waiting
  const allEntriesComplete = entries.every(e => e.EndDate);
  if (allEntriesComplete) {
    return false; // Stage is complete, not waiting
  }
  
  // Separate entries into two groups
  const entriesWithIdleDate = entries.filter(e => e.IdleStartDate);
  const entriesWithoutIdleDate = entries.filter(e => !e.IdleStartDate);
  
  // If there are no entries with IdleStartDate, it's not waiting (it's not started)
  if (entriesWithIdleDate.length === 0) {
    return false;
  }
  
  // Check if ALL entries with IdleStartDate are completed (have EndDate)
  const allIdleDateEntriesCompleted = entriesWithIdleDate.every(e => e.EndDate);
  
  // Check if there are remaining entries without IdleStartDate
  const hasRemainingSteps = entriesWithoutIdleDate.length > 0;
  
  // Waiting = all idle-assigned steps are done AND there are steps waiting for idle assignment
  return allIdleDateEntriesCompleted && hasRemainingSteps;
};

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
            padding: '120px 16px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px dashed #d1d5db',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
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

const QualityDashboard = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [currentView, setCurrentView] = useState('monthly'); // 'monthly' or 'daily'
  const [autoMode, setAutoMode] = useState(true); // Auto-switch between monthly/daily
  const [fadeClass, setFadeClass] = useState('fade-in');
  const [sidebarChartKey, setSidebarChartKey] = useState(0); // Key for sidebar-triggered re-render only
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null); // Track last data fetch time
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
  
  // Lead Time states
  const [leadTimeView, setLeadTimeView] = useState('qc'); // 'qc' or 'mikro'
  const [leadTimeAutoMode, setLeadTimeAutoMode] = useState(true);
  const [leadTimeData, setLeadTimeData] = useState([]); // Raw lead time data from API
  const [leadTimeModalOpen, setLeadTimeModalOpen] = useState(false);
  const [leadTimeModalData, setLeadTimeModalData] = useState(null);
  
  // WIP Stage Modal states
  const [wipStageModalOpen, setWipStageModalOpen] = useState(false);
  const [selectedWipStageData, setSelectedWipStageData] = useState(null);
  const [wipTaskModalOpen, setWipTaskModalOpen] = useState(false);
  const [selectedWipTaskData, setSelectedWipTaskData] = useState(null);

  // Help system
  const { helpMode, activeTopic, selectTopic, setCurrentDashboard } = useHelp();

  // Help system refs
  const sidebarRef = useRef(null);
  const releasedRef = useRef(null);
  const leadTimeRef = useRef(null);
  const of1Ref = useRef(null);
  const wipSectionRef = useRef(null);

  // Callback ref for sidebar - finds the actual aside.sidebar element
  const sidebarCallbackRef = useCallback((wrapperDiv) => {
    if (wrapperDiv) {
      const sidebarElement = wrapperDiv.querySelector('.sidebar');
      sidebarRef.current = sidebarElement;
    } else {
      sidebarRef.current = null;
    }
  }, []);

  // Register dashboard with help system
  useEffect(() => {
    setCurrentDashboard('quality');
    return () => setCurrentDashboard(null);
  }, [setCurrentDashboard]);

  // Handle help topic selection - scroll to section
  useEffect(() => {
    if (helpMode && activeTopic) {
      const refMap = {
        sidebar: sidebarRef,
        released: releasedRef,
        leadtime: leadTimeRef,
        of1: of1Ref,
        wip: wipSectionRef
      };
      
      const targetRef = refMap[activeTopic];
      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [helpMode, activeTopic]);

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

  // Fetch WIP data for Quality
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to load cached data first
        const cachedData = loadQualityCache();
        
        if (cachedData) {
          // Use cached data - no loading needed!
          setWipData(cachedData.wipData || []);
          setLeadTimeData(cachedData.leadTimeData || []);
          setForecastData(cachedData.forecastData || []);
          setDailyProductionData(cachedData.dailyProductionData || []);
          setProductGroupDept(cachedData.productGroupDept || {});
          setProductCategories(cachedData.productCategories || {});
          setProductNames(cachedData.productNames || {});
          setOfTargetData(cachedData.ofTargetData || []);
          setOfActualData(cachedData.ofActualData || []);
          setLastFetchTime(cachedData.fetchTime);
          
          // Data loaded from cache - set loading false immediately
          setLoading(false);
          return;
        }
        
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
          ofActualResponse,
          leadTimeResponse
        ] = await Promise.all([
          fetch(apiUrl('/api/wipData')),
          fetch(apiUrl('/api/forecast')),
          fetch(apiUrl('/api/dailyProduction')),
          fetch(apiUrl('/api/productGroupDept')),
          fetch(apiUrl('/api/productList')),
          fetch(apiUrl('/api/otcProducts')),
          fetch(apiUrl('/api/ofsummary')),
          fetch(apiUrl('/api/releasedBatchesYTD')),
          fetch(apiUrl('/api/leadTime?period=MTD'))
        ]);

        // Variables to store fetched data for caching
        let wipResult, leadTimeResult, forecastResult, dailyProductionResult, ofTargetResult, ofActualResult;
        let deptMap = {}, categories = {}, names = {};

        // Process WIP data
        if (wipResponse.ok) {
          wipResult = await wipResponse.json();
          setWipData(wipResult.data || []);
        }

        // Process lead time data
        if (leadTimeResponse.ok) {
          leadTimeResult = await leadTimeResponse.json();
          setLeadTimeData(leadTimeResult.data || []);
        }

        // Process forecast data
        if (forecastResponse.ok) {
          forecastResult = await forecastResponse.json();
          setForecastData(forecastResult.data || forecastResult || []);
        }

        // Process daily production data
        if (dailyProductionResponse.ok) {
          dailyProductionResult = await dailyProductionResponse.json();
          setDailyProductionData(dailyProductionResult.data || []);
        }

        // Process OF target data (from sp_Dashboard_OF1)
        if (ofTargetResponse.ok) {
          ofTargetResult = await ofTargetResponse.json();
          // This endpoint returns data directly, not wrapped in { data: ... }
          setOfTargetData(ofTargetResult || []);
        }

        // Process OF actual data (from t_dnc_product)
        if (ofActualResponse.ok) {
          ofActualResult = await ofActualResponse.json();
          setOfActualData(ofActualResult.data || []);
        }

        // Process product group/dept mapping
        if (groupDeptResponse.ok) {
          const groupDeptResult = await groupDeptResponse.json();
          const groupDeptData = groupDeptResult.data || [];
          
          // Create mapping of Product_ID to Group_Dept
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
        
        // Save all fetched data to cache
        const cacheData = {
          wipData: wipResult?.data || [],
          leadTimeData: leadTimeResult?.data || [],
          forecastData: forecastResult?.data || forecastResult || [],
          dailyProductionData: dailyProductionResult?.data || [],
          productGroupDept: deptMap,
          productCategories: categories,
          productNames: names,
          ofTargetData: ofTargetResult || [],
          ofActualData: ofActualResult?.data || []
        };
        saveQualityCache(cacheData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to load dashboard data. Please try again.');
        setLoading(false);
      }
      // Note: Don't set loading to false here - let the data validation effect handle it
    };

    fetchData();
    setLastFetchTime(new Date()); // Set initial fetch time
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

  // Process WIP data for Quality stages (QC, Mikro, QA) split by production line
  const processQualityWIPData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Filter out completed batches (those with Tempel Label Release completed)
    const batchesWithTempelLabelRelease = new Set();
    rawData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const activeBatches = rawData.filter(entry => 
      !batchesWithTempelLabelRelease.has(entry.Batch_No)
    );

    // Define the Quality stages we want to track (QC, Mikro, QA)
    const qualityStageNames = ['QC', 'Mikro', 'QA'];
    
    // Create stage data structure for PN1 and PN2
    const stageData = {
      'PN1 QC': { batches: new Map(), totalCount: 0 },
      'PN2 QC': { batches: new Map(), totalCount: 0 },
      'PN1 Mikro': { batches: new Map(), totalCount: 0 },
      'PN2 Mikro': { batches: new Map(), totalCount: 0 },
      'PN1 QA': { batches: new Map(), totalCount: 0 },
      'PN2 QA': { batches: new Map(), totalCount: 0 }
    };

    // Group all entries by batch, stage, and production line
    activeBatches.forEach(entry => {
      const tahapanGroup = entry.tahapan_group;
      const batchNo = entry.Batch_No;
      const groupDept = entry.Group_Dept; // 'PN1' or 'PN2'

      // Skip if not a Quality stage (QC, Mikro, QA)
      if (!qualityStageNames.includes(tahapanGroup)) {
        return;
      }

      // Skip if no valid Group_Dept
      if (groupDept !== 'PN1' && groupDept !== 'PN2') {
        return;
      }

      // Construct the stage key: "PN1 QC", "PN2 Mikro", etc.
      const stageKey = `${groupDept} ${tahapanGroup}`;

      // Initialize batch if not exists
      if (!stageData[stageKey].batches.has(batchNo)) {
        stageData[stageKey].batches.set(batchNo, {
          batchNo: batchNo,
          productName: entry.Produk_Nama || entry.Product_Name || 'Unknown Product',
          entries: []
        });
      }

      // Add this entry to the batch's entries array
      stageData[stageKey].batches.get(batchNo).entries.push(entry);
    });

    // Calculate days in stage for each batch using ALL its entries
    // Also separate into In Progress and Waiting
    Object.keys(stageData).forEach(stageKey => {
      const stageName = stageKey.split(' ')[1]; // Extract 'QC', 'Mikro', or 'QA'
      
      stageData[stageKey].batches.forEach((batch, batchNo) => {
        // Special logic for QA stage
        if (stageName === 'QA') {
          const requiredQASteps = [
            'Cek Dokumen PC oleh QA',
            'Cek Dokumen PN oleh QA',
            'Cek Dokumen MC oleh QA',
            'Cek Dokumen QC oleh QA'
          ];
          
          // Find all the required QA steps that have IdleStartDate
          const qaStepsWithIdleDate = batch.entries.filter(entry => 
            requiredQASteps.includes(entry.nama_tahapan) && entry.IdleStartDate
          );
          
          // Check if all 4 required steps have IdleStartDate
          const allRequiredStepsStarted = requiredQASteps.every(stepName =>
            qaStepsWithIdleDate.some(entry => entry.nama_tahapan === stepName)
          );
          
          // If not all 4 steps have started, exclude this batch from QA
          if (!allRequiredStepsStarted) {
            stageData[stageKey].batches.delete(batchNo);
            return; // Skip this batch
          }
          
          // Check if QA batch is actually in progress (same logic as Production Dashboard)
          const hasStartDate = batch.entries.some(e => e.StartDate);
          const hasMissingEndDate = batch.entries.some(e => !e.EndDate);
          const hasDisplayFlag = batch.entries.some(e => e.Display === '1' || e.Display === 1);
          
          // Check if batch is in waiting status
          const isWaiting = isBatchWaiting(batch.entries);
          
          // Batch must be either in progress, have display flag, or be waiting
          if (!isWaiting && !((hasStartDate && hasMissingEndDate) || hasDisplayFlag)) {
            stageData[stageKey].batches.delete(batchNo);
            return; // Skip this batch - not actually in progress
          }
          
          // For QA, use the LATEST IdleStartDate among the 4 required steps
          let latestIdleDate = null;
          qaStepsWithIdleDate.forEach(entry => {
            if (requiredQASteps.includes(entry.nama_tahapan)) {
              const idleDate = new Date(entry.IdleStartDate);
              if (!isNaN(idleDate.getTime())) {
                if (!latestIdleDate || idleDate > latestIdleDate) {
                  latestIdleDate = idleDate;
                }
              }
            }
          });
          
          let daysInStage = 0;
          if (latestIdleDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            latestIdleDate.setHours(0, 0, 0, 0);
            
            const diffTime = today - latestIdleDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            daysInStage = Math.max(0, diffDays);
          }
          
          batch.daysInStage = daysInStage;
          batch.isWaiting = isWaiting;
          return; // QA logic complete, continue to next batch
        }
        
        // Default logic for QC and Mikro stages
        const hasStartDate = batch.entries.some(e => e.StartDate);
        const hasMissingEndDate = batch.entries.some(e => !e.EndDate);
        const hasDisplayFlag = batch.entries.some(e => e.Display === '1' || e.Display === 1);

        // Check if batch is in waiting status
        const isWaiting = isBatchWaiting(batch.entries);

        if (isWaiting || (hasStartDate && hasMissingEndDate) || hasDisplayFlag) {
          // Calculate days in stage using EARLIEST IdleStartDate from all entries
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

          // Update the batch with calculated days and waiting status
          batch.daysInStage = daysInStage;
          batch.isWaiting = isWaiting;
        } else {
          // Batch not in progress or waiting, remove it
          stageData[stageKey].batches.delete(batchNo);
        }
      });
    });

    // Convert to array format in the desired order: PN1 QC, PN2 QC, PN1 Mikro, PN2 Mikro, PN1 QA, PN2 QA
    const stageOrder = ['PN1 QC', 'PN2 QC', 'PN1 Mikro', 'PN2 Mikro', 'PN1 QA', 'PN2 QA'];
    
    return stageOrder.map(stageKey => {
      const allBatches = Array.from(stageData[stageKey].batches.values());
      
      // Separate batches into in-progress and waiting
      const inProgressBatches = allBatches.filter(b => !b.isWaiting);
      const waitingBatches = allBatches.filter(b => b.isWaiting);
      
      // Sort in-progress batches by days descending
      inProgressBatches.sort((a, b) => b.daysInStage - a.daysInStage);
      
      // Combine: in-progress first, waiting after
      const sortedBatches = [...inProgressBatches, ...waitingBatches];

      return {
        name: stageKey,
        value: inProgressBatches.length, // Only count in-progress batches in the speedometer value
        waitingCount: waitingBatches.length, // Track waiting batches separately
        totalCount: allBatches.length, // Total of both in-progress and waiting
        avgDays: inProgressBatches.length > 0 
          ? Math.round(inProgressBatches.reduce((sum, b) => sum + b.daysInStage, 0) / inProgressBatches.length)
          : 0,
        batches: sortedBatches // All batches: in-progress first, then waiting
      };
    });
  };

  // Process production data for PN1 only
  // Process batch release data for Quality Dashboard (monthly)
  const processMonthlyBatchReleases = () => {
    if (!ofActualData || ofActualData.length === 0 || Object.keys(productCategories).length === 0) {
      return [];
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Monthly batch release data
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const monthBatches = { ETH: new Set(), OTC: new Set(), Generik: new Set() };
      
      // Filter ofActualData for this month and year
      ofActualData.forEach(item => {
        const releaseDate = new Date(item.Process_Date);
        if (isNaN(releaseDate.getTime())) return;
        
        if (releaseDate.getFullYear() === currentYear && releaseDate.getMonth() + 1 === month) {
          const productId = item.DNc_ProductID;
          const batchNo = item.DNc_BatchNo;
          const batchKey = `${productId}_${batchNo}`;
          
          // Get category (includes all products from both PN1 and PN2)
          const category = productCategories[productId] || 'ETH';
          
          if (category === 'ETH' || category === 'OTC' || category === 'Generik') {
            monthBatches[category].add(batchKey);
          }
        }
      });

      monthlyData.push({
        month: new Date(currentYear, month - 1).toLocaleString('en-US', { month: 'short' }),
        eth: month <= currentMonth ? monthBatches.ETH.size : 0,
        otc: month <= currentMonth ? monthBatches.OTC.size : 0,
        generik: month <= currentMonth ? monthBatches.Generik.size : 0,
        total: month <= currentMonth ? (monthBatches.ETH.size + monthBatches.OTC.size + monthBatches.Generik.size) : 0,
        hasData: month <= currentMonth
      });
    }

    return monthlyData;
  };

  // Get monthly batch release data
  const monthlyBatchData = processMonthlyBatchReleases();

  // Process daily batch release data for Quality Dashboard (current month MTD)
  const processDailyBatchReleases = () => {
    if (!ofActualData || ofActualData.length === 0 || Object.keys(productCategories).length === 0) {
      // Return empty array for current month days if no data
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        eth: 0,
        otc: 0,
        generik: 0,
        total: 0
      }));
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyData = [];
    
    // Build data for each day of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      date.setHours(0, 0, 0, 0);
      
      const dayBatches = { ETH: new Set(), OTC: new Set(), Generik: new Set() };
      
      // Count unique batches released on this specific day
      ofActualData.forEach(item => {
        const releaseDate = new Date(item.Process_Date);
        if (isNaN(releaseDate.getTime())) return;
        
        releaseDate.setHours(0, 0, 0, 0);
        
        if (releaseDate.getTime() === date.getTime()) {
          const productId = item.DNc_ProductID;
          const batchNo = item.DNc_BatchNo;
          const batchKey = `${productId}_${batchNo}`;
          
          // Get category (includes all products from both PN1 and PN2)
          const category = productCategories[productId] || 'ETH';
          
          if (category === 'ETH' || category === 'OTC' || category === 'Generik') {
            dayBatches[category].add(batchKey);
          }
        }
      });
      
      dailyData.push({
        day: day,
        actualDate: date, // Store actual date for tooltip
        eth: dayBatches.ETH.size,
        otc: dayBatches.OTC.size,
        generik: dayBatches.Generik.size,
        total: dayBatches.ETH.size + dayBatches.OTC.size + dayBatches.Generik.size
      });
    }

    return dailyData;
  };

  // Get daily batch release data
  const dailyBatchData = processDailyBatchReleases();

  // Process Lead Time data for a specific stage (QC or Mikro)
  const processLeadTimeData = (stageName) => {
    if (!leadTimeData || leadTimeData.length === 0) {
      return { daily: [], averageLeadTime: 0 };
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Filter data for the specific stage
    const stageData = leadTimeData.filter(item => item.Stage_Name === stageName);

    // Calculate average lead time for all batches in the current month
    let totalLeadTime = 0;
    let batchCount = 0;
    
    stageData.forEach(item => {
      if (item.Stage_Duration_Days != null) {
        totalLeadTime += item.Stage_Duration_Days;
        batchCount++;
      }
    });
    
    const averageLeadTime = batchCount > 0 ? (totalLeadTime / batchCount).toFixed(1) : 0;

    // Build daily data (MTD)
    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      date.setHours(0, 0, 0, 0);
      
      // Find batches completed on this day
      const batchesOnThisDay = stageData.filter(item => {
        const completionDate = new Date(item.Stage_Completion_Date);
        return completionDate.getDate() === day &&
               completionDate.getMonth() === currentMonth &&
               completionDate.getFullYear() === currentYear;
      });
      
      dailyData.push({
        day: day,
        actualDate: date,
        count: batchesOnThisDay.length,
        batches: batchesOnThisDay.map(b => ({
          productId: b.Product_ID,
          batchNo: b.Batch_No,
          productName: b.Product_Name,
          completionDate: new Date(b.Stage_Completion_Date),
          durationDays: b.Stage_Duration_Days
        }))
      });
    }

    return { daily: dailyData, averageLeadTime: averageLeadTime };
  };

  // Get lead time data for QC and Mikro
  const leadTimeQCData = processLeadTimeData('QC');
  const leadTimeMikroData = processLeadTimeData('Mikro');

  // Process OF1 data - MTD cumulative production vs monthly target
  const processOF1Data = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayDate = currentDate.getDate();

    // Build product-level target batch tracking
    const productTargets = {}; // { productId: { targetBatches: Set, releasedBatches: Set } }
    
    // First, collect all target batches per product (both PN1 and PN2)
    ofTargetData.forEach(item => {
      const productId = item.ProductID;
      const batchNo = String(item.ListBet || '');

      if (batchNo) {
        if (!productTargets[productId]) {
          productTargets[productId] = {
            targetBatches: new Set(),
            releasedBatches: new Set(),
            dailyReleasedBatches: {} // { day: Set of batch keys }
          };
        }
        const batchKey = `${productId}-${batchNo}`;
        productTargets[productId].targetBatches.add(batchKey);
      }
    });

    // Create a map of target batch numbers for verification
    const targetBatchMap = new Set();
    ofTargetData.forEach(item => {
      const productId = item.ProductID;
      const batchNo = String(item.ListBet || '');
      
      if (batchNo) {
        targetBatchMap.add(`${productId}-${batchNo}`);
      }
    });

    // Track released batches by day for each product (all products)
    ofActualData.forEach(item => {
      const productId = item.DNc_ProductID;
      const batchNo = String(item.DNc_BatchNo || '');
      const processDate = item.Process_Date;
      const batchKey = `${productId}-${batchNo}`;

      // Only count batches that are in the target OF list
      if (!targetBatchMap.has(batchKey)) return;

      if (processDate && batchNo) {
        const date = new Date(processDate);
        const day = date.getDate();
        
        // Only include if it's in the current month
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          if (productTargets[productId]) {
            if (!productTargets[productId].dailyReleasedBatches[day]) {
              productTargets[productId].dailyReleasedBatches[day] = new Set();
            }
            productTargets[productId].dailyReleasedBatches[day].add(batchKey);
            productTargets[productId].releasedBatches.add(batchKey);
          }
        }
      }
    });

    // Calculate total target batches across all products
    let totalTargetBatches = 0;
    Object.values(productTargets).forEach(product => {
      totalTargetBatches += product.targetBatches.size;
    });

    // Build daily average completion percentages
    const labels = [];
    const targetData = [];
    const actualCumulativeData = [];
    const dailyBatchCounts = [];
    const dailyCompletionPercentages = [];
    
    let cumulativeBatches = 0;
    const processedBatches = new Set();
    
    for (let day = 1; day <= todayDate; day++) {
      labels.push(`${day}`);
      
      // Target is always 100% (all products at 100%)
      targetData.push(100);
      
      // Calculate average completion percentage for this day (cumulative)
      let totalProductPercentage = 0;
      let productCount = 0;
      let dailyNewBatches = 0;
      
      Object.values(productTargets).forEach(product => {
        const targetCount = product.targetBatches.size;
        if (targetCount === 0) return;
        
        productCount++;
        
        // Count cumulative released batches up to this day
        let releasedCount = 0;
        for (let d = 1; d <= day; d++) {
          const dayBatches = product.dailyReleasedBatches[d] || new Set();
          dayBatches.forEach(batchKey => {
            if (product.targetBatches.has(batchKey) && !processedBatches.has(batchKey)) {
              processedBatches.add(batchKey);
              cumulativeBatches++;
              if (d === day) dailyNewBatches++;
            }
            if (product.targetBatches.has(batchKey)) {
              releasedCount++;
            }
          });
        }
        
        // Calculate this product's completion percentage
        const productPercentage = (releasedCount / targetCount) * 100;
        totalProductPercentage += productPercentage;
      });
      
      // Average completion percentage across all products
      const avgCompletionPercentage = productCount > 0 ? totalProductPercentage / productCount : 0;
      
      actualCumulativeData.push(Math.round(avgCompletionPercentage * 10) / 10); // Round to 1 decimal
      dailyBatchCounts.push(dailyNewBatches);
      dailyCompletionPercentages.push(Math.round(avgCompletionPercentage * 10) / 10);
    }

    return { 
      labels, 
      targetData, 
      actualCumulativeData,
      dailyProductionData: dailyBatchCounts,
      totalMonthlyTarget: totalTargetBatches,
      currentCumulative: cumulativeBatches,
      dailyCompletionPercentages: dailyCompletionPercentages
    };
  };

  // Get OF1 comparison data (all products)
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

  // Auto-rotate between QC and Mikro Lead Time every 10 seconds
  useEffect(() => {
    if (!leadTimeAutoMode) return;
    
    const interval = setInterval(() => {
      setLeadTimeView(prev => prev === 'qc' ? 'mikro' : 'qc');
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [leadTimeAutoMode]);

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

  // Auto-refresh data every hour (3600000 ms)
  useEffect(() => {
    const checkAndRefresh = () => {
      if (!lastFetchTime || refreshing) return;
      
      const now = new Date();
      const timeSinceLastFetch = now - lastFetchTime;
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      // If more than 1 hour has passed, trigger a silent refresh
      if (timeSinceLastFetch >= oneHour) {
        console.log('Auto-refreshing data (1 hour elapsed)...');
        handleRefresh();
      }
    };

    // Check every minute if we need to refresh
    const interval = setInterval(checkAndRefresh, 60000);

    return () => clearInterval(interval);
  }, [lastFetchTime, refreshing]);

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

  // Format last fetch time for display
  const formatLastFetchTime = () => {
    if (!lastFetchTime) return 'Loading...';
    
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return lastFetchTime.toLocaleDateString('en-US', options);
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
        ofActualResponse,
        leadTimeResponse
      ] = await Promise.all([
        fetch(apiUrl('/api/wipData')),
        fetch(apiUrl('/api/forecast')),
        fetch(apiUrl('/api/dailyProduction')),
        fetch(apiUrl('/api/ofsummary')),
        fetch(apiUrl('/api/releasedBatchesYTD')),
        fetch(apiUrl('/api/leadTime?period=MTD'))
      ]);
      
      // Variables to store fetched data for caching
      let wipResult, forecastResult, dailyProductionResult, ofTargetResult, ofActualResult, leadTimeResult;
      
      if (wipResponse.ok) {
        wipResult = await wipResponse.json();
        setWipData(wipResult.data || []);
      }

      if (leadTimeResponse.ok) {
        leadTimeResult = await leadTimeResponse.json();
        setLeadTimeData(leadTimeResult.data || []);
      }
      
      if (forecastResponse.ok) {
        forecastResult = await forecastResponse.json();
        setForecastData(forecastResult.data || forecastResult || []);
      }
      
      if (dailyProductionResponse.ok) {
        dailyProductionResult = await dailyProductionResponse.json();
        setDailyProductionData(dailyProductionResult.data || []);
      }

      if (ofTargetResponse.ok) {
        ofTargetResult = await ofTargetResponse.json();
        // This endpoint returns data directly, not wrapped in { data: ... }
        setOfTargetData(ofTargetResult || []);
      }

      if (ofActualResponse.ok) {
        ofActualResult = await ofActualResponse.json();
        setOfActualData(ofActualResult.data || []);
      }
      
      // Save refreshed data to cache
      const cacheData = {
        wipData: wipResult?.data || [],
        forecastData: forecastResult?.data || forecastResult || [],
        dailyProductionData: dailyProductionResult?.data || [],
        productGroupDept: productGroupDept,
        productCategories: productCategories,
        productNames: productNames,
        ofTargetData: ofTargetResult || [],
        ofActualData: ofActualResult?.data || [],
        leadTimeData: leadTimeResult?.data || []
      };
      saveQualityCache(cacheData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    
    // Update last fetch time
    setLastFetchTime(new Date());
    
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
    
    let periodLabel, fullDate, targetDate;
    
    if (isMonthly) {
      // Monthly view - get the month
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabel = monthNames[index];
      fullDate = `${periodLabel} ${new Date().getFullYear()}`;
      targetDate = { year: new Date().getFullYear(), month: index + 1 };
    } else {
      // Daily view - get the day (last 30 days)
      const today = new Date();
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - index));
      
      const day = date.getDate();
      const dayWithSuffix = day + getDaySuffix(day);
      const monthName = date.toLocaleString('en-US', { month: 'long' });
      const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
      const year = date.getFullYear();
      
      periodLabel = `${dayWithSuffix} ${monthName}`;
      fullDate = `${dayOfWeek}, ${dayWithSuffix} ${monthName} ${year}`;
      targetDate = date;
    }

    // Prepare product breakdown data by category (counting batches)
    const productsByCategory = {
      ETH: [],
      OTC: [],
      Generik: []
    };

    // Count batches released in the target period
    const batchesByProduct = {}; // { productId: Set of batch keys }

    ofActualData.forEach(item => {
      const releaseDate = new Date(item.Process_Date);
      if (isNaN(releaseDate.getTime())) return;
      
      let matchesPeriod = false;
      
      if (isMonthly) {
        matchesPeriod = releaseDate.getFullYear() === targetDate.year && 
                       (releaseDate.getMonth() + 1) === targetDate.month;
      } else {
        releaseDate.setHours(0, 0, 0, 0);
        const targetDateMidnight = new Date(targetDate);
        targetDateMidnight.setHours(0, 0, 0, 0);
        matchesPeriod = releaseDate.getTime() === targetDateMidnight.getTime();
      }
      
      if (matchesPeriod) {
        const productId = item.DNc_ProductID;
        const batchNo = item.DNc_BatchNo;
        const batchKey = `${productId}_${batchNo}`;
        
        if (!batchesByProduct[productId]) {
          batchesByProduct[productId] = new Set();
        }
        batchesByProduct[productId].add(batchKey);
      }
    });

    // Convert to array format grouped by category
    Object.keys(batchesByProduct).forEach(productId => {
      const batchCount = batchesByProduct[productId].size;
      if (batchCount > 0) {
        const itemCategory = productCategories[productId] || 'ETH';
        productsByCategory[itemCategory].push({
          productId: productId,
          productName: productNames[productId] || `Product ${productId}`,
          batches: batchCount
        });
      }
    });

    // Sort each category by batch count descending
    Object.keys(productsByCategory).forEach(category => {
      productsByCategory[category].sort((a, b) => b.batches - a.batches);
    });

    // Calculate totals per category
    const categoryTotals = {};
    let grandTotal = 0;
    Object.keys(productsByCategory).forEach(category => {
      const total = productsByCategory[category].reduce((sum, p) => sum + p.batches, 0);
      categoryTotals[category] = total;
      grandTotal += total;
    });

    const modalData = {
      period: periodLabel,
      fullDate: fullDate,
      productsByCategory: productsByCategory,
      categoryTotals: categoryTotals,
      grandTotal: grandTotal,
      viewType: isMonthly ? 'Monthly' : 'Daily',
      isBatchData: true // Flag to indicate this is batch data, not units
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

    // Build product details for all products (PN1 and PN2)
    const productDetailsMap = {}; // { productId: { ... } }

    // Track total target calculation
    let totalTargetSum = 0;

    // First, get target batches from ofTargetData (sp_Dashboard_OF1 'SummaryByProsesGroup')
    // Each row is a target batch with ProductID, Product_Name, ListBet (batch number), and group_stdoutput (batch size)
    ofTargetData.forEach(item => {
      const productId = item.ProductID;
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

    // Then, process produced batches from ofActualData (all products)
    ofActualData.forEach(item => {
      const productId = item.DNc_ProductID;
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

    // Round produced quantities, sort batches, and calculate product completion percentages
    Object.keys(productDetailsMap).forEach(productId => {
      const product = productDetailsMap[productId];
      
      // Round values
      product.standardOutput = Math.round(product.standardOutput);
      product.totalProduced = Math.round(product.totalProduced);
      
      // Round produced quantities in target batches
      product.targetBatches.forEach(batch => {
        batch.produced = Math.round(batch.produced);
      });
      
      // Calculate product completion percentage
      const targetBatchCount = product.targetBatches.length;
      const producedBatchCount = product.targetBatches.filter(batch => batch.isProduced).length;
      product.completionPercentage = targetBatchCount > 0 
        ? Math.round((producedBatchCount / targetBatchCount) * 100) 
        : 0;
      
      // Sort target batches: produced first, then by batch number
      product.targetBatches.sort((a, b) => {
        if (a.isProduced !== b.isProduced) return b.isProduced - a.isProduced;
        return a.batchNo.localeCompare(b.batchNo);
      });
    });

    // Convert to array and sort by unfilled target batches (most unfilled first)
    const productsList = Object.values(productDetailsMap)
      .filter(product => product.standardOutput > 0 || product.totalProduced > 0)
      .sort((a, b) => {
        // Calculate unfilled batches for each product
        const unfilledA = a.targetBatches.filter(batch => !batch.isProduced).length;
        const unfilledB = b.targetBatches.filter(batch => !batch.isProduced).length;
        
        // If both have unfilled batches, sort by most unfilled first
        if (unfilledA > 0 && unfilledB > 0) {
          return unfilledB - unfilledA;
        }
        
        // Products with unfilled batches come before fully completed products
        if (unfilledA > 0 && unfilledB === 0) return -1;
        if (unfilledA === 0 && unfilledB > 0) return 1;
        
        // If both fully completed or both have no targets, sort by total target batches
        const targetCountA = a.targetBatches.length;
        const targetCountB = b.targetBatches.length;
        
        if (targetCountA > 0 && targetCountB > 0) {
          return targetCountB - targetCountA;
        }
        
        // Products with targets come before products with only extra batches
        if (targetCountA > 0 && targetCountB === 0) return -1;
        if (targetCountA === 0 && targetCountB > 0) return 1;
        
        // Both have no targets (only extra batches), sort by extra batch count
        return b.extraBatches.length - a.extraBatches.length;
      });

    // Calculate totals based on batch counts
    const totalTargetBatches = productsList.reduce((sum, p) => sum + p.targetBatches.length, 0);
    const totalProducedBatches = productsList.reduce((sum, p) => {
      return sum + p.targetBatches.filter(batch => batch.isProduced).length;
    }, 0);

    // Calculate average completion percentage across all products
    const totalProductPercentage = productsList.reduce((sum, p) => sum + p.completionPercentage, 0);
    const avgCompletionRate = productsList.length > 0 
      ? Math.round(totalProductPercentage / productsList.length) 
      : 0;

    const modalData = {
      period: fullDate,
      products: productsList,
      totalTarget: totalTargetBatches,
      totalProduced: totalProducedBatches,
      completionRate: avgCompletionRate
    };

    setOf1ModalData(modalData);
    setOf1ModalOpen(true);
  };

  // Handle Lead Time chart click
  const handleLeadTimeChartClick = (event, elements, chart) => {
    if (!elements || elements.length === 0) {
      return;
    }

    const clickedIndex = elements[0].index;
    const currentStage = leadTimeView === 'qc' ? 'QC' : 'Mikro';
    const currentStageName = currentStage === 'QC' ? 'QC' : 'Mikro';
    
    // Process lead time data for the current stage
    const processedData = processLeadTimeData(currentStage);
    
    if (!processedData || !processedData.daily || clickedIndex >= processedData.daily.length) {
      return;
    }

    const clickedDayData = processedData.daily[clickedIndex];
    const clickedDate = clickedDayData.actualDate;
    
    // Get batches that completed on this day
    const completedBatches = leadTimeData.filter(item => {
      if (item.Stage_Name !== currentStage) return false;
      
      const completionDate = new Date(item.Stage_Completion_Date);
      completionDate.setHours(0, 0, 0, 0);
      
      return completionDate.getTime() === clickedDate.getTime();
    });

    // Prepare modal data
    const modalData = {
      stageName: currentStageName,
      date: clickedDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      totalBatches: completedBatches.length,
      batches: completedBatches.map(batch => ({
        productId: batch.Product_ID,
        productName: productNames[batch.Product_ID] || `Product ${batch.Product_ID}`,
        batchNo: batch.Batch_No,
        leadTimeDays: batch.Stage_Duration_Days,
        completionDate: new Date(batch.Stage_Completion_Date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      })).sort((a, b) => b.leadTimeDays - a.leadTimeDays) // Sort by lead time descending
    };

    setLeadTimeModalData(modalData);
    setLeadTimeModalOpen(true);
  };

  // Handle WIP Stage Speedometer click
  const handleWipStageClick = (stageName) => {
    // Parse stageName to extract department and actual stage
    // stageName format: "PN1 QC", "PN2 Mikro", etc.
    const [department, actualStageName] = stageName.split(' ');
    
    // Filter raw data for this department and specific stage
    const batchesWithTempelLabelRelease = new Set();
    wipData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const stageEntries = wipData.filter(entry => {
      const entryDept = entry.Group_Dept || 'Unknown';
      const entryTahapanGroup = entry.tahapan_group || 'Other';
      
      return entryDept === department 
        && entryTahapanGroup === actualStageName
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

    // Filter to only show batches in progress or waiting
    const activeBatches = Object.values(batchDetails).filter(batch => {
      if (!batch.hasMissingEndDate && !batch.hasDisplayFlag) {
        return false;
      }
      
      // Special check for QA stage - only include if all 4 required steps have started
      if (actualStageName === 'QA') {
        const requiredQASteps = [
          'Cek Dokumen PC oleh QA',
          'Cek Dokumen PN oleh QA',
          'Cek Dokumen MC oleh QA',
          'Cek Dokumen QC oleh QA'
        ];
        
        const qaStepsWithIdleDate = batch.entries.filter(entry => 
          requiredQASteps.includes(entry.nama_tahapan) && entry.IdleStartDate
        );
        
        const allRequiredStepsStarted = requiredQASteps.every(stepName =>
          qaStepsWithIdleDate.some(entry => entry.nama_tahapan === stepName)
        );
        
        // If not all 4 steps have started, exclude this batch from QA modal
        if (!allRequiredStepsStarted) {
          return false;
        }
      }
      
      const isWaiting = isBatchWaiting(batch.entries);
      const isInProgress = (batch.hasStartDate && batch.hasMissingEndDate) || batch.hasDisplayFlag;
      return isInProgress || isWaiting;
    });

    // Separate batches into In Progress and Waiting
    const inProgressBatches = [];
    const waitingBatches = [];

    // Calculate days in stage for each batch and categorize
    activeBatches.forEach(batch => {
      let idleDate = null;
      
      // Special logic for QA stage - use LATEST IdleStartDate
      if (actualStageName === 'QA') {
        const requiredQASteps = [
          'Cek Dokumen PC oleh QA',
          'Cek Dokumen PN oleh QA',
          'Cek Dokumen MC oleh QA',
          'Cek Dokumen QC oleh QA'
        ];
        
        const qaStepsWithIdleDate = batch.entries.filter(entry => 
          requiredQASteps.includes(entry.nama_tahapan) && entry.IdleStartDate
        );
        
        // Find the LATEST IdleStartDate among the 4 required steps
        let latestIdleDate = null;
        qaStepsWithIdleDate.forEach(entry => {
          if (requiredQASteps.includes(entry.nama_tahapan)) {
            const entryIdleDate = new Date(entry.IdleStartDate);
            if (!isNaN(entryIdleDate.getTime())) {
              if (!latestIdleDate || entryIdleDate > latestIdleDate) {
                latestIdleDate = entryIdleDate;
              }
            }
          }
        });
        
        idleDate = latestIdleDate;
      } else {
        // Default logic for other stages - use EARLIEST IdleStartDate
        let earliestIdleDate = null;
        batch.entries.forEach(entry => {
          if (entry.IdleStartDate) {
            const entryIdleDate = new Date(entry.IdleStartDate);
            if (!isNaN(entryIdleDate.getTime())) {
              if (!earliestIdleDate || entryIdleDate < earliestIdleDate) {
                earliestIdleDate = entryIdleDate;
              }
            }
          }
        });
        
        idleDate = earliestIdleDate;
      }

      if (idleDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        idleDate.setHours(0, 0, 0, 0);
        const diffTime = today - idleDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        batch.daysInStage = Math.max(0, diffDays);
        batch.stageStart = idleDate.toLocaleDateString('en-GB');
      } else {
        batch.daysInStage = 0;
        batch.stageStart = 'N/A';
      }

      // Check if batch is waiting
      const isWaiting = isBatchWaiting(batch.entries);
      batch.isWaiting = isWaiting;

      if (isWaiting) {
        waitingBatches.push(batch);
      } else {
        inProgressBatches.push(batch);
      }
    });

    // Sort in-progress batches by longest duration first
    inProgressBatches.sort((a, b) => b.daysInStage - a.daysInStage);

    // Combine: in-progress first, waiting after
    const allBatches = [...inProgressBatches, ...waitingBatches];

    setSelectedWipStageData({
      stageName: stageName,
      batches: allBatches,
      inProgressCount: inProgressBatches.length,
      waitingCount: waitingBatches.length,
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
    // Parse stageName to extract department and actual stage
    // stageName format: "PN1 QC", "PN2 Mikro", etc.
    const [department, actualStageName] = stageName.split(' ');
    
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
      
      return entryDept === department 
        && entryTahapanGroup === actualStageName
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
      // Remove the 'Z' to treat it as local time, not UTC
      // This prevents automatic timezone conversion (GMT+7)
      const localDateString = sqlDateTime.replace('Z', '');
      const date = new Date(localDateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Get WIP stages data for Quality dashboard (QC, Mikro, QA for both PN1 and PN2)
  const wipStages = processQualityWIPData(wipData);
  // Monthly Output data (batch releases per month)
  const monthlyOutputData = {
    labels: monthlyBatchData.map(d => d.month),
    datasets: [
      {
        label: 'ETH',
        data: monthlyBatchData.map(d => d.hasData ? d.eth : null),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: '#9333ea',
        borderWidth: 1
      },
      {
        label: 'OTC',
        data: monthlyBatchData.map(d => d.hasData ? d.otc : null),
        backgroundColor: 'rgba(79, 140, 255, 0.8)',
        borderColor: '#4f8cff',
        borderWidth: 1
      },
      {
        label: 'Generik',
        data: monthlyBatchData.map(d => d.hasData ? d.generik : null),
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
            return value; // Show actual batch count
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
        mode: 'index',
        callbacks: {
          afterTitle: function(tooltipItems) {
            let total = 0;
            tooltipItems.forEach(item => {
              total += item.parsed.y;
            });
            return 'Total: ' + total + ' batch' + (total !== 1 ? 'es' : '');
          },
          label: function(context) {
            const count = context.parsed.y;
            return context.dataset.label + ': ' + count + ' batch' + (count !== 1 ? 'es' : '');
          }
        }
      }
    }
  };

  // Daily Output data (batch releases per day - last 30 days)
  const dailyOutputData = {
    labels: dailyBatchData.map(d => `${d.day}`),
    datasets: [
      {
        label: 'ETH',
        data: dailyBatchData.map(d => d.eth),
        borderColor: '#9333ea',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'OTC',
        data: dailyBatchData.map(d => d.otc),
        borderColor: '#4f8cff',
        backgroundColor: 'rgba(79, 140, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Generik',
        data: dailyBatchData.map(d => d.generik),
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
            return value; // Show actual batch count
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
            const day = context[0].label; // Day of month (1-31)
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();
            
            // Create date for the specific day of current month
            const date = new Date(currentYear, currentMonth, parseInt(day));
            
            // Format: "4th November 2025"
            const dayWithSuffix = day + getDaySuffix(parseInt(day));
            const monthName = date.toLocaleString('en-US', { month: 'long' });
            const year = date.getFullYear();
            
            return `${dayWithSuffix} ${monthName} ${year}`;
          },
          label: function(context) {
            const count = context.parsed.y;
            return context.dataset.label + ': ' + count + ' batch' + (count !== 1 ? 'es' : '');
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

  // Daily OF1 data (MTD Cumulative: Target 100% vs Average Product Completion %)
  const dailyOF1Data = {
    labels: of1ComparisonData.labels,
    datasets: [
      {
        label: 'Target Completion',
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
        label: 'Achievement MTD',
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
        max: 100,
        ticks: {
          font: {
            size: 10
          },
          callback: function(value) {
            return value + '%';
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
            const value = context.parsed.y;
            return `${label}: ${value}%`;
          },
          afterBody: function(context) {
            const dayIndex = context[0].dataIndex;
            const dailyProduction = of1ComparisonData.dailyProductionData[dayIndex] || 0;
            const batchText = dailyProduction === 1 ? 'batch' : 'batches';
            
            let info = `\nDaily Released: ${dailyProduction} ${batchText}`;
            
            return info;
          }
        }
      }
    }
  };

  // Lead Time Chart Data and Options
  const currentLeadTimeData = leadTimeView === 'qc' ? leadTimeQCData : leadTimeMikroData;
  const leadTimeStageName = leadTimeView === 'qc' ? 'QC' : 'Mikro';
  const averageLeadTime = currentLeadTimeData?.averageLeadTime || 0;

  // Ensure data exists with defaults
  const safeLeadTimeData = {
    daily: currentLeadTimeData?.daily || []
  };

  // Daily Lead Time Data
  const leadTimeDailyData = {
    labels: safeLeadTimeData.daily.map(d => d.day.toString()),
    datasets: [
      {
        label: `${leadTimeStageName} Lead Time: ${averageLeadTime} days`,
        data: safeLeadTimeData.daily.map(d => d.count || 0),
        borderColor: leadTimeView === 'qc' ? '#2196f3' : '#9c27b0',
        backgroundColor: leadTimeView === 'qc' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(156, 39, 176, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: leadTimeView === 'qc' ? '#2196f3' : '#9c27b0'
      }
    ]
  };

  const leadTimeDailyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleLeadTimeChartClick,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
        grid: {
          display: false
        },
        ticks: {
          autoSkip: true,
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
          stepSize: 1,
          callback: function(value) {
            if (Number.isInteger(value)) {
              return value;
            }
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
        enabled: true,
        callbacks: {
          title: function(context) {
            if (!context || !context[0] || !context[0].label) return '';
            const day = context[0].label;
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();
            const date = new Date(currentYear, currentMonth, parseInt(day));
            const dayWithSuffix = day + getDaySuffix(parseInt(day));
            const monthName = date.toLocaleString('en-US', { month: 'long' });
            const year = date.getFullYear();
            return `${dayWithSuffix} ${monthName} ${year}`;
          },
          label: function(context) {
            if (!context || context.parsed === undefined || context.parsed.y === undefined) return '';
            const count = context.parsed.y;
            return `${context.dataset.label}: ${count} batch${count !== 1 ? 'es' : ''}`;
          }
        }
      }
    }
  };

  return (
    <div className="quality-dashboard">
      <div ref={sidebarCallbackRef} className="sidebar-wrapper">
        <Sidebar />
      </div>
      
      {/* Loading Screen */}
      <DashboardLoading 
        loading={loading && !error} 
        text="Loading Quality Dashboard..." 
        subtext="Fetching quality control data..." 
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

      <div className="quality-main-content">
        <div className="quality-content">
          <div className="quality-header">
            <div className="quality-header-left">
              <h1>Quality Dashboard</h1>
              <div className="quality-datetime">
                <span>📅</span>
                <span>Last updated: {formatLastFetchTime()}</span>
              </div>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className={`quality-refresh-btn ${refreshing ? 'refreshing' : ''}`}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className={`quality-charts-container ${sidebarMinimized ? 'sidebar-minimized' : ''}`}>
            {/* Combined Monthly/Daily Output - Auto-rotating */}
            <div ref={releasedRef} className="quality-chart-card">
              <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>{currentView === 'monthly' ? 'Monthly Released' : 'Daily Released'}</h3>
                  <span className="chart-card-subtitle">
                    {currentView === 'monthly' ? 'Total batches released per month' : 'MTD batch release trend (current month)'}
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

            {/* Lead Time - Always visible, takes Daily OF1 position when sidebar minimized */}
            <div ref={leadTimeRef} className="quality-chart-card">
              <div className="chart-card-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <h3>Lead Time {leadTimeStageName}</h3>
                    <span className="chart-card-subtitle">MTD batch completion trend</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Auto/Manual Toggle */}
                    <button
                      onClick={() => setLeadTimeAutoMode(!leadTimeAutoMode)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: leadTimeAutoMode ? '#10b981' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {leadTimeAutoMode ? '⏯️ Auto' : '⏸️ Manual'}
                    </button>
                    
                    {/* QC/Mikro Toggle */}
                    <button
                      onClick={() => {
                        if (leadTimeAutoMode) {
                          setLeadTimeAutoMode(false);
                        }
                        setLeadTimeView(prev => prev === 'qc' ? 'mikro' : 'qc');
                      }}
                      disabled={leadTimeAutoMode}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: leadTimeAutoMode ? '#d1d5db' : '#f59e0b',
                        color: leadTimeAutoMode ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: leadTimeAutoMode ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        opacity: leadTimeAutoMode ? 0.5 : 1
                      }}
                    >
                      {leadTimeView === 'qc' ? '🔬 Mikro' : '🧪 QC'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="chart-card-content" key={`leadtime-${leadTimeView}-${sidebarChartKey}`}>
                <Line data={leadTimeDailyData} options={leadTimeDailyOptions} key={`leadtime-chart-${leadTimeView}-${sidebarMinimized}`} />
              </div>
            </div>

            {/* Daily OF1 - Only visible when sidebar is minimized */}
            {sidebarMinimized && (
              <div ref={of1Ref} className="quality-chart-card">
                <div className="chart-card-header">
                  <h3>Daily OF1</h3>
                  <span className="chart-card-subtitle">Order fulfillment for current month batches</span>
                </div>
                <div className="chart-card-content" key={`of1-${sidebarChartKey}`}>
                  <Line data={dailyOF1Data} options={dailyOF1Options} key={`of1-chart-${sidebarChartKey}`} />
                </div>
              </div>
            )}
          </div>

          {/* WIP Speedometers Section */}
          <div ref={wipSectionRef} className="quality-wip-section">
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
              <div className="quality-speedometers-grid">
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
                {outputModalData.isBatchData ? 'Total Batches Released' : 'Total Units Produced'}
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
                          }}>{outputModalData.isBatchData ? 'Batches' : 'Units'}</th>
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
                                {(product.batches || product.units).toLocaleString()}
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
                          }}>{outputModalData.isBatchData ? 'Batches' : 'Units'}</th>
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
                                {(product.batches || product.units).toLocaleString()}
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
                          }}>{outputModalData.isBatchData ? 'Batches' : 'Units'}</th>
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
                                {(product.batches || product.units).toLocaleString()}
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
                  Released Batches / Target Batches
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
                        minWidth: 0,
                        flex: 1
                      }}>
                        - {product.productName}
                      </span>
                      <span style={{ 
                        fontSize: '14px',
                        fontWeight: '700',
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        flexShrink: 0
                      }}>
                        {product.completionPercentage}%
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
                {selectedWipStageData.inProgressCount !== undefined ? (
                  <>
                    {selectedWipStageData.inProgressCount} Batch{selectedWipStageData.inProgressCount !== 1 ? 'es' : ''} in Progress
                    {selectedWipStageData.waitingCount > 0 && (
                      <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
                        ({selectedWipStageData.waitingCount} Waiting)
                      </span>
                    )}
                  </>
                ) : (
                  `${selectedWipStageData.batches.length} Batch${selectedWipStageData.batches.length !== 1 ? 'es' : ''} in Progress`
                )}
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
                          color: batch.isWaiting ? '#f59e0b' : '#e67e22',
                          fontWeight: '600',
                        }}>
                          {batch.isWaiting ? (
                            <>
                              Status: <span style={{ 
                                backgroundColor: '#fef3c7', 
                                color: '#92400e',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: '700'
                              }}>In Waiting</span>
                            </>
                          ) : (
                            <>Days in Stage: {batch.daysInStage !== null ? `${batch.daysInStage} ${batch.daysInStage === 1 ? 'day' : 'days'}` : 'Not Started'}</>
                          )}
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
                  const isCompleted = task.StartDate && task.EndDate;
                  
                  // Check if batch has started (at least one step has IdleStartDate)
                  const batchHasStarted = selectedWipTaskData.tasks.some(t => t.IdleStartDate);
                  
                  // A step is "Waiting" if:
                  // - The batch has started (at least one step has IdleStartDate)
                  // - This specific step does NOT have IdleStartDate yet
                  const isWaiting = batchHasStarted && !task.IdleStartDate && !isCompleted;
                  
                  // A step is "Not Started" only if:
                  // - The batch has NOT started (no steps have IdleStartDate)
                  // - This step doesn't have a StartDate
                  const isUnstarted = !batchHasStarted && !task.StartDate && !isCompleted;

                  let statusBadge = '';
                  let statusColor = '';
                  let bgColor = '';
                  
                  if (isCompleted) {
                    statusBadge = '✅ Completed';
                    statusColor = '#10b981';
                    bgColor = '#f0fdf4';
                  } else if (isInProgress) {
                    statusBadge = '🔄 In Progress';
                    statusColor = '#f59e0b';
                    bgColor = '#fffbeb';
                  } else if (isWaiting) {
                    statusBadge = '⏳ Waiting';
                    statusColor = '#8b5cf6';
                    bgColor = '#faf5ff';
                  } else if (isUnstarted) {
                    statusBadge = '⏸️ Not Started';
                    statusColor = '#6b7280';
                    bgColor = '#f9fafb';
                  } else {
                    // Fallback for any edge cases
                    statusBadge = '⏸️ Not Started';
                    statusColor = '#6b7280';
                    bgColor = '#f9fafb';
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

      {/* Lead Time Modal */}
      {leadTimeModalOpen && leadTimeModalData && (
        <Modal
          open={leadTimeModalOpen}
          title={`${leadTimeModalData.stageName} Lead Time - Batch Details`}
          onClose={() => setLeadTimeModalOpen(false)}
        >
          <div style={{ padding: '0 10px' }}>
            {/* Header Section */}
            <div style={{
              background: leadTimeModalData.stageName === 'QC' 
                ? 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)'
                : 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              color: 'white',
              boxShadow: leadTimeModalData.stageName === 'QC'
                ? '0 4px 15px rgba(33, 150, 243, 0.3)'
                : '0 4px 15px rgba(156, 39, 176, 0.3)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                📅 {leadTimeModalData.date}
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700',
                marginBottom: '4px',
                letterSpacing: '-0.5px'
              }}>
                {leadTimeModalData.totalBatches}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {leadTimeModalData.totalBatches === 1 ? 'Batch Completed' : 'Batches Completed'}
              </div>
            </div>

            {/* Batches Table */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid #f3f4f6'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: leadTimeModalData.stageName === 'QC' ? '#2196f3' : '#9c27b0',
                    color: 'white'
                  }}>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      Product
                    </th>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      Batch No
                    </th>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      Lead Time
                    </th>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      Completion Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leadTimeModalData.batches.map((batch, index) => (
                    <tr 
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = leadTimeModalData.stageName === 'QC' 
                          ? '#e3f2fd' 
                          : '#f3e5f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
                      }}
                    >
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: '#374151',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                          {batch.productName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          ID: {batch.productId}
                        </div>
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: '#374151',
                        fontFamily: 'monospace',
                        fontWeight: '500',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        {batch.batchNo}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          display: 'inline-block',
                          backgroundColor: leadTimeModalData.stageName === 'QC' 
                            ? '#e3f2fd' 
                            : '#f3e5f5',
                          color: leadTimeModalData.stageName === 'QC' 
                            ? '#1976d2' 
                            : '#7b1fa2',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: '700'
                        }}>
                          {batch.leadTimeDays} {batch.leadTimeDays === 1 ? 'day' : 'days'}
                        </div>
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: '#6b7280',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        {batch.completionDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Contextual Help Modal */}
      {helpMode && activeTopic && (
        <ContextualHelpModal
          topic={activeTopic}
          dashboardType="quality"
          onClose={() => selectTopic(null)}
          targetRef={{
            sidebar: sidebarRef,
            released: releasedRef,
            leadtime: leadTimeRef,
            of1: of1Ref,
            wip: wipSectionRef
          }[activeTopic]}
        />
      )}
    </div>
  );
};

export default QualityDashboard;

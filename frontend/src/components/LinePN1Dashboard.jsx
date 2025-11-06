import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Sidebar from './Sidebar';
import { apiUrl } from '../api';
import './LinePN1Dashboard.css';

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
const Speedometer = ({ label, value, maxValue = 50, stageName, batches = [] }) => {
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
    <div className="speedometer-container">
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
      {sortedBatches.length > 0 && (
        <div className="speedometer-batch-table">
          <div className="batch-list">
            {sortedBatches.map((batch, index) => (
              <div key={index} className="batch-item">
                <div className="batch-product">{batch.productName}</div>
                <div className="batch-details">
                  <span className="batch-number">{batch.batchNo}</span>
                  <span className="batch-days">{batch.daysInStage}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const LinePN1Dashboard = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [currentView, setCurrentView] = useState('monthly'); // 'monthly' or 'daily'
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
  const [ofTargetData, setOfTargetData] = useState([]);
  const [ofActualData, setOfActualData] = useState([]);

  // Helper function to parse SQL datetime
  const parseSQLDateTime = (sqlDateTime) => {
    if (!sqlDateTime) return null;
    try {
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
          setOfTargetData(ofTargetResult.data || []);
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

        // Process product categories (ETH vs OTC)
        if (productListResponse.ok && otcProductsResponse.ok) {
          const productListData = await productListResponse.json();
          const otcProductsData = await otcProductsResponse.json();

          const productList = productListData.data || [];
          const otcProducts = otcProductsData.data || [];

          // Create a Set of OTC product IDs for quick lookup
          const otcProductIds = new Set(otcProducts.map(p => p.Product_ID));

          // Categorize products as ETH or OTC
          const categories = {};
          productList.forEach(product => {
            const productId = product.Product_ID;
            categories[productId] = otcProductIds.has(productId) ? 'OTC' : 'ETH';
          });
          setProductCategories(categories);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setWipData([]);
        setForecastData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      entry.Group_Dept === 'PN1' && 
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
        batches: new Map(), // Map of batchNo -> batch details
        totalCount: 0
      };
    });

    // Group batches by stage
    pn1ActiveBatches.forEach(entry => {
      const tahapanGroup = entry.tahapan_group;
      const batchNo = entry.Batch_No;
      const productName = entry.Produk_Nama || entry.Product_Name || 'Unknown Product';

      // Skip if not a Proses stage
      if (!prosesStages.includes(tahapanGroup)) {
        return;
      }

      // Check if batch is in progress for this stage
      const hasStartDate = entry.StartDate;
      const hasMissingEndDate = !entry.EndDate;
      const hasDisplayFlag = entry.Display === '1' || entry.Display === 1;

      if ((hasStartDate && hasMissingEndDate) || hasDisplayFlag) {
        if (!stageData[tahapanGroup].batches.has(batchNo)) {
          // Calculate days in stage
          let daysInStage = 0;
          if (hasStartDate) {
            const startDate = parseSQLDateTime(entry.StartDate);
            if (startDate) {
              const currentDate = new Date();
              daysInStage = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
            }
          }

          stageData[tahapanGroup].batches.set(batchNo, {
            batchNo,
            productName,
            daysInStage
          });
        }
      }
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
        const isPN1 = productGroupDept[item.Product_ID] === 'PN1';
        const isPeriod = item.Periode === periode;
        return isPN1 && isPeriod;
      });

      // Calculate production by category
      const productionByCategory = { ETH: 0, OTC: 0 };

      monthData.forEach(item => {
        const production = parseFloat(item.Produksi) || 0;
        const productId = item.Product_ID;
        const category = productCategories[productId] || 'ETH';
        
        if (category === 'ETH' || category === 'OTC') {
          productionByCategory[category] += production;
        }
      });

      const totalProduction = productionByCategory.ETH + productionByCategory.OTC;

      monthlyData.push({
        month: new Date(currentYear, month - 1).toLocaleString('en-US', { month: 'short' }),
        eth: month <= currentMonth ? Math.round(productionByCategory.ETH) : 0,
        otc: month <= currentMonth ? Math.round(productionByCategory.OTC) : 0,
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
        otc: monthProduction ? Math.round(monthProduction.otc / daysInMonth) : 0
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
        total: 0
      }));
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Create a map for quick lookup: day -> {eth, otc}
    const dailyMap = {};
    
    dailyProductionData.forEach(item => {
      const productionDate = new Date(item.ProductionDate);
      const day = productionDate.getDate();
      const productId = item.Product_ID;
      const production = parseFloat(item.DailyProduction) || 0;
      
      // Only include PN1 products
      if (productGroupDept[productId] !== 'PN1') {
        return;
      }
      
      const category = productCategories[productId] || 'ETH';
      
      if (!dailyMap[day]) {
        dailyMap[day] = { eth: 0, otc: 0 };
      }
      
      // Add production to the appropriate category (only ETH or OTC for PN1)
      if (category === 'OTC') {
        dailyMap[day].otc += production;
      } else {
        dailyMap[day].eth += production;
      }
    });

    // Build array for all days in the month
    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = dailyMap[day] || { eth: 0, otc: 0 };
      const total = dayData.eth + dayData.otc;
      
      dailyData.push({
        day: day,
        eth: Math.round(dayData.eth),
        otc: Math.round(dayData.otc),
        total: Math.round(total)
      });
    }

    return dailyData;
  };

  // Process OF1 data - compare target vs actual production per product
  const processOF1Data = () => {
    if (!ofTargetData.length && !ofActualData.length) {
      return { labels: [], targetData: [], actualData: [], products: [] };
    }

    // Aggregate targets by ProductID
    const targetMap = {};
    ofTargetData.forEach(item => {
      const productId = item.ProductID;
      const productName = item.Product_Name || productId;
      const target = parseFloat(item.group_stdoutput) || 0;

      // Check if this product is PN1
      const dept = productGroupDept[productId];
      if (dept !== 'PN1') return; // Only include PN1 products

      if (!targetMap[productId]) {
        targetMap[productId] = {
          productId: productId,
          productName: productName,
          target: 0
        };
      }
      targetMap[productId].target += target;
    });

    // Aggregate actuals by DNc_ProductID (only for current month)
    const actualMap = {};
    ofActualData.forEach(item => {
      const productId = item.DNc_ProductID;
      const actual = parseFloat(item.DNC_Diluluskan) || 0;

      // Check if this product is PN1
      const dept = productGroupDept[productId];
      if (dept !== 'PN1') return; // Only include PN1 products

      if (!actualMap[productId]) {
        actualMap[productId] = {
          productId: productId,
          actual: 0
        };
      }
      actualMap[productId].actual += actual;
    });

    // Combine targets and actuals
    const productIds = new Set([
      ...Object.keys(targetMap),
      ...Object.keys(actualMap)
    ]);

    const products = [];
    productIds.forEach(productId => {
      const target = targetMap[productId]?.target || 0;
      const actual = actualMap[productId]?.actual || 0;
      const productName = targetMap[productId]?.productName || productId;

      products.push({
        productId,
        productName,
        target: Math.round(target),
        actual: Math.round(actual)
      });
    });

    // Sort by target descending
    products.sort((a, b) => b.target - a.target);

    // Extract arrays for chart
    const labels = products.map(p => p.productName);
    const targetData = products.map(p => p.target);
    const actualData = products.map(p => p.actual);

    return { labels, targetData, actualData, products };
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
  }, []);

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
        setOfTargetData(result.data || []);
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

  // Get WIP stages data (use real data if available, otherwise fallback to mock)
  const wipStages = wipData.length > 0 ? processPN1WIPData(wipData) : [
    { 
      name: 'Terima Bahan', 
      value: 3, 
      avgDays: 2,
      batches: [
        { batchNo: 'TB-2024-001', productName: 'Paracetamol 500mg', daysInStage: 3 },
        { batchNo: 'TB-2024-002', productName: 'Amoxicillin 250mg', daysInStage: 2 },
        { batchNo: 'TB-2024-003', productName: 'Vitamin C 1000mg', daysInStage: 1 },
      ]
    },
    { 
      name: 'Filling', 
      value: 8, 
      avgDays: 5,
      batches: [
        { batchNo: 'FL-2024-012', productName: 'Ibuprofen 400mg', daysInStage: 8 },
        { batchNo: 'FL-2024-013', productName: 'Aspirin 100mg', daysInStage: 7 },
        { batchNo: 'FL-2024-014', productName: 'Cetirizine 10mg', daysInStage: 6 },
        { batchNo: 'FL-2024-015', productName: 'Omeprazole 20mg', daysInStage: 5 },
        { batchNo: 'FL-2024-016', productName: 'Metformin 500mg', daysInStage: 4 },
        { batchNo: 'FL-2024-017', productName: 'Losartan 50mg', daysInStage: 3 },
        { batchNo: 'FL-2024-018', productName: 'Simvastatin 20mg', daysInStage: 2 },
        { batchNo: 'FL-2024-019', productName: 'Amlodipine 5mg', daysInStage: 1 },
      ]
    },
    { 
      name: 'Mixing', 
      value: 12, 
      avgDays: 7,
      batches: [
        { batchNo: 'MX-2024-023', productName: 'Paracetamol 500mg', daysInStage: 12 },
        { batchNo: 'MX-2024-024', productName: 'Amoxicillin 500mg', daysInStage: 10 },
        { batchNo: 'MX-2024-025', productName: 'Dexamethasone 0.5mg', daysInStage: 9 },
        { batchNo: 'MX-2024-026', productName: 'Prednisone 5mg', daysInStage: 8 },
        { batchNo: 'MX-2024-027', productName: 'Ranitidine 150mg', daysInStage: 7 },
        { batchNo: 'MX-2024-028', productName: 'Captopril 25mg', daysInStage: 6 },
        { batchNo: 'MX-2024-029', productName: 'Atenolol 50mg', daysInStage: 5 },
        { batchNo: 'MX-2024-030', productName: 'Glibenclamide 5mg', daysInStage: 4 },
        { batchNo: 'MX-2024-031', productName: 'Furosemide 40mg', daysInStage: 3 },
        { batchNo: 'MX-2024-032', productName: 'Spironolactone 25mg', daysInStage: 2 },
        { batchNo: 'MX-2024-033', productName: 'Hydrochlorothiazide 25mg', daysInStage: 1 },
        { batchNo: 'MX-2024-034', productName: 'Lisinopril 10mg', daysInStage: 1 },
      ]
    },
    { 
      name: 'Granulasi', 
      value: 15, 
      avgDays: 9,
      batches: [
        { batchNo: 'GR-2024-045', productName: 'Ciprofloxacin 500mg', daysInStage: 15 },
        { batchNo: 'GR-2024-046', productName: 'Azithromycin 500mg', daysInStage: 14 },
        { batchNo: 'GR-2024-047', productName: 'Cefixime 200mg', daysInStage: 13 },
        { batchNo: 'GR-2024-048', productName: 'Levofloxacin 500mg', daysInStage: 12 },
        { batchNo: 'GR-2024-049', productName: 'Clarithromycin 500mg', daysInStage: 11 },
        { batchNo: 'GR-2024-050', productName: 'Metronidazole 500mg', daysInStage: 10 },
        { batchNo: 'GR-2024-051', productName: 'Doxycycline 100mg', daysInStage: 9 },
        { batchNo: 'GR-2024-052', productName: 'Tetracycline 500mg', daysInStage: 8 },
        { batchNo: 'GR-2024-053', productName: 'Erythromycin 500mg', daysInStage: 7 },
        { batchNo: 'GR-2024-054', productName: 'Clindamycin 300mg', daysInStage: 6 },
        { batchNo: 'GR-2024-055', productName: 'Trimethoprim 200mg', daysInStage: 5 },
        { batchNo: 'GR-2024-056', productName: 'Sulfamethoxazole 400mg', daysInStage: 4 },
        { batchNo: 'GR-2024-057', productName: 'Nitrofurantoin 100mg', daysInStage: 3 },
        { batchNo: 'GR-2024-058', productName: 'Cephalexin 500mg', daysInStage: 2 },
        { batchNo: 'GR-2024-059', productName: 'Penicillin V 500mg', daysInStage: 1 },
      ]
    },
    { 
      name: 'Cetak', 
      value: 10, 
      avgDays: 6,
      batches: [
        { batchNo: 'CT-2024-067', productName: 'Diclofenac 50mg', daysInStage: 10 },
        { batchNo: 'CT-2024-068', productName: 'Meloxicam 15mg', daysInStage: 9 },
        { batchNo: 'CT-2024-069', productName: 'Piroxicam 20mg', daysInStage: 8 },
        { batchNo: 'CT-2024-070', productName: 'Naproxen 500mg', daysInStage: 7 },
        { batchNo: 'CT-2024-071', productName: 'Ketorolac 10mg', daysInStage: 6 },
        { batchNo: 'CT-2024-072', productName: 'Celecoxib 200mg', daysInStage: 5 },
        { batchNo: 'CT-2024-073', productName: 'Etoricoxib 90mg', daysInStage: 4 },
        { batchNo: 'CT-2024-074', productName: 'Indomethacin 25mg', daysInStage: 3 },
        { batchNo: 'CT-2024-075', productName: 'Ketoprofen 100mg', daysInStage: 2 },
        { batchNo: 'CT-2024-076', productName: 'Mefenamic Acid 500mg', daysInStage: 1 },
      ]
    },
    { 
      name: 'Coating', 
      value: 6, 
      avgDays: 4,
      batches: [
        { batchNo: 'CO-2024-082', productName: 'Pantoprazole 40mg', daysInStage: 6 },
        { batchNo: 'CO-2024-083', productName: 'Lansoprazole 30mg', daysInStage: 5 },
        { batchNo: 'CO-2024-084', productName: 'Esomeprazole 20mg', daysInStage: 4 },
        { batchNo: 'CO-2024-085', productName: 'Rabeprazole 20mg', daysInStage: 3 },
        { batchNo: 'CO-2024-086', productName: 'Domperidone 10mg', daysInStage: 2 },
        { batchNo: 'CO-2024-087', productName: 'Metoclopramide 10mg', daysInStage: 1 },
      ]
    },
    { 
      name: 'Kemas Primer', 
      value: 4, 
      avgDays: 2,
      batches: [
        { batchNo: 'KP-2024-091', productName: 'Loratadine 10mg', daysInStage: 4 },
        { batchNo: 'KP-2024-092', productName: 'Fexofenadine 120mg', daysInStage: 3 },
        { batchNo: 'KP-2024-093', productName: 'Chlorpheniramine 4mg', daysInStage: 2 },
        { batchNo: 'KP-2024-094', productName: 'Diphenhydramine 25mg', daysInStage: 1 },
      ]
    },
    { 
      name: 'Kemas Sekunder', 
      value: 2, 
      avgDays: 1,
      batches: [
        { batchNo: 'KS-2024-098', productName: 'Multivitamin', daysInStage: 2 },
        { batchNo: 'KS-2024-099', productName: 'Calcium 500mg', daysInStage: 1 },
      ]
    },
  ];  // End of fallback mock data

  // Mock data for Monthly Output
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
      }
    ]
  };

  const monthlyOutputOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
      }
    ]
  };

  const dailyOutputOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
      }
    }
  };

  // Daily OF1 data (Target vs Actual Production per Product)
  const dailyOF1Data = {
    labels: of1ComparisonData.labels,
    datasets: [
      {
        label: 'Target Production',
        data: of1ComparisonData.targetData,
        borderColor: '#e57373',
        backgroundColor: 'rgba(229, 115, 115, 0.2)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Actual Production',
        data: of1ComparisonData.actualData,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const dailyOF1Options = {
    responsive: true,
    maintainAspectRatio: false,
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
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' units';
          }
        }
      }
    }
  };

  // Mock data for WIP Summary (only shown when sidebar is minimized)
  // WIP Summary data for pointer-based donut
  const wipSummaryStages = [
    { name: 'Timbang', value: 12 },
    { name: 'Proses', value: 28 },
    { name: 'Primer', value: 15 },
    { name: 'Sekunder', value: 18 },
    { name: 'QC', value: 8 },
    { name: 'Mikro', value: 6 },
    { name: 'QA', value: 5 }
  ];

  return (
    <div className="line-pn1-dashboard">
      <Sidebar />
      <div className="line-pn1-main-content">
        <div className="line-pn1-content">
          <div className="line-pn1-header">
            <div className="line-pn1-header-left">
              <h1>Line PN1 Dashboard</h1>
              <div className="line-pn1-datetime">
                <span>📅</span>
                <span>{formatDateTime()}</span>
              </div>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className={`line-pn1-refresh-btn ${refreshing ? 'refreshing' : ''}`}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className={`line-pn1-charts-container ${sidebarMinimized ? 'sidebar-minimized' : ''}`}>
            {/* Combined Monthly/Daily Output - Auto-rotating */}
            <div className="line-pn1-chart-card">
              <div className="chart-card-header">
                <h3>{currentView === 'monthly' ? 'Monthly Output' : 'Daily Output'}</h3>
                <span className="chart-card-subtitle">
                  {currentView === 'monthly' ? 'Total units produced per month' : 'Last 30 days production trend'}
                </span>
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
            <div className="line-pn1-chart-card">
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
              <div className="line-pn1-chart-card">
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
          <div className="line-pn1-wip-section">
            <h2 className="line-pn1-section-title">Work In Progress Stages</h2>
            <div className="line-pn1-speedometers-grid">
              {wipStages.map((stage, index) => (
                <Speedometer
                  key={index}
                  label={stage.name}
                  value={stage.value}
                  maxValue={50}
                  stageName={stage.name}
                  batches={stage.batches}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinePN1Dashboard;

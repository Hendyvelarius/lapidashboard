import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { apiUrl } from '../api';
import Sidebar from './Sidebar';
import DashboardLoading from './DashboardLoading';
import './SummaryDashboard.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

// Helper function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
};

// Circular Progress Chart Component
const CircularProgress = ({ percentage, size = 120, strokeWidth = 12, color = '#4f8cff', backgroundColor = '#e5e7eb' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="circular-progress" style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937'
        }}
      >
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, children, className = '' }) => (
  <div className={`summary-kpi-card ${className}`}>
    <div className="summary-kpi-title">{title}</div>
    <div className="summary-kpi-content">
      {children}
    </div>
  </div>
);

// Metric Box Component (for smaller metrics)
const MetricBox = ({ label, value, color = '#4f8cff' }) => (
  <div className="summary-metric-box" style={{ borderColor: color }}>
    <div className="summary-metric-value" style={{ color }}>{value}</div>
    <div className="summary-metric-label">{label}</div>
  </div>
);

function SummaryDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    sales: null,
    inventory: null,
    stockOut: null,
    coverage: null,
    whOccupancy: null,
    orderFulfillment: null,
    materialAvailability: null
  });

  useEffect(() => {
    
    const fetchAllData = async () => {
      try {
        setLoading(true);      
        const [wipRes, ofRes, pctRes, stockRes, bbbkRes, dailySalesRes] = await Promise.all([
          fetch(apiUrl('/api/wip')),
          fetch(apiUrl('/api/ofsummary')),
          fetch(apiUrl('/api/pctAverage')),
          fetch(apiUrl('/api/forecast')),
          fetch(apiUrl('/api/bbbk')),
          fetch(apiUrl('/api/dailySales'))
        ]);

        const wipData = await wipRes.json();
        const ofData = await ofRes.json();
        const pctData = await pctRes.json();
        const stockData = await stockRes.json();
        const bbbkData = await bbbkRes.json();
        const dailySalesData = await dailySalesRes.json();
        
        // Process and set data
        const processedData = {
          sales: processSalesData(stockData || [], dailySalesData || []),
          inventory: processInventoryData(stockData || []),
          stockOut: processStockOutData(stockData || []),
          coverage: processCoverageData(stockData || []),
          whOccupancy: processWHOccupancyData(wipData.data || []),
          orderFulfillment: processOrderFulfillmentData(ofData || []),
          materialAvailability: processMaterialAvailabilityData(stockData || []),
          inventoryOJ: processInventoryOJData(stockData || []),
          inventoryBBBK: processInventoryBBBKData(bbbkData || [])
        };

        setData(processedData);
      } catch (error) {
        console.error('❌ Error fetching summary data:', error);
        // Fallback to mock data on error
        setData({
          sales: processSalesData([], []),
          inventory: processInventoryData([]),
          stockOut: processStockOutData([]),
          coverage: processCoverageData([]),
          whOccupancy: processWHOccupancyData([]),
          orderFulfillment: {
            turunPpi: 78,
            potongStock: 65,
            proses: 88,
            kemas: 92,
            dokumen: 76,
            rilisQc: 89,
            rilisQa: 84
          },
          materialAvailability: processMaterialAvailabilityData([]),
          inventoryOJ: processInventoryOJData([]),
          inventoryBBBK: processInventoryBBBKData([])
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Data processing functions
  const processSalesData = (stockData, dailySalesData) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const todayDateString = today.toISOString().split('T')[0];

    // Calculate today's total sales from daily sales data
    const todaysSales = dailySalesData
      .filter(item => {
        const itemDate = new Date(item.SalesDate).toISOString().split('T')[0];
        return itemDate === todayDateString;
      })
      .reduce((sum, item) => sum + (item.DailySales || 0), 0);

    // Calculate cumulative monthly sales from daily sales data
    const cumulativeMonthlySales = dailySalesData
      .filter(item => {
        const itemDate = new Date(item.SalesDate);
        const itemMonth = itemDate.getMonth() + 1;
        const itemYear = itemDate.getFullYear();
        return itemMonth === currentMonth && itemYear === currentYear;
      })
      .reduce((sum, item) => sum + (item.DailySales || 0), 0);

    // Calculate monthly forecast from stock data
    const currentPeriod = currentYear * 100 + currentMonth;
    const monthlyForecast = stockData
      .filter(item => parseInt(item.Periode) === currentPeriod)
      .reduce((sum, item) => sum + (item.Forecast || 0), 0);

    // Calculate achievement percentage (cumulative monthly sales vs monthly forecast)
    const achievement = monthlyForecast > 0 ? (cumulativeMonthlySales / monthlyForecast) * 100 : 0;

    // Calculate weekly cumulative sales data for chart
    const weeklyData = {};
    const cumulativeWeeklyData = [];
    
    // Group sales by week for current month
    dailySalesData.forEach(item => {
      const itemDate = new Date(item.SalesDate);
      const itemMonth = itemDate.getMonth() + 1;
      const itemYear = itemDate.getFullYear();
      
      // Only include current month data
      if (itemMonth === currentMonth && itemYear === currentYear) {
        const week = item.WeekOfMonth;
        if (!weeklyData[week]) {
          weeklyData[week] = 0;
        }
        weeklyData[week] += item.DailySales || 0;
      }
    });

    // Convert to cumulative chart data
    let cumulativeTotal = 0;
    for (let week = 1; week <= 5; week++) {
      const weeklyAmount = weeklyData[week] || 0;
      cumulativeTotal += weeklyAmount;
      
      cumulativeWeeklyData.push(cumulativeTotal);
    }
    
    return {
      dailySales: todaysSales,
      achievement: achievement,
      weeklyData: cumulativeWeeklyData,
      monthlyForecast: monthlyForecast
    };
  };

  const processInventoryData = (stockData) => {
    // Mock inventory calculations
    const totalProducts = stockData.length;
    const slowMoving = Math.floor(totalProducts * 0.15);
    const deadStock = Math.floor(totalProducts * 0.08);
    const returnItems = Math.floor(totalProducts * 0.05);
    
    return {
      slowMoving: (slowMoving / totalProducts) * 100,
      deadStock: (deadStock / totalProducts) * 100,
      returnItems: (returnItems / totalProducts) * 100
    };
  };

  const processStockOutData = (stockData) => {
    const totalProducts = stockData.length;
    const stockOutProducts = stockData.filter(item => (item.Release || 0) === 0).length;
    const focusProducts = Math.floor(stockOutProducts * 0.3);
    const nonFocusProducts = stockOutProducts - focusProducts;
    
    return {
      total: stockOutProducts,
      percentage: (stockOutProducts / totalProducts) * 100,
      focus: focusProducts,
      nonFocus: nonFocusProducts
    };
  };

  const processCoverageData = (stockData) => {
    // Mock coverage calculations
    const underCoverage = stockData.filter(item => (item.Release || 0) < (item.Forecast || 0) * 0.5).length;
    const overCoverage = stockData.filter(item => (item.Release || 0) > (item.Forecast || 0) * 1.5).length;
    
    return {
      percentage: 65.5, // Mock percentage
      under: underCoverage,
      over: overCoverage
    };
  };

  const processWHOccupancyData = (wipData) => {
    // Mock warehouse occupancy data
    return {
      oj: 45,
      bb: 72,
      bk: 38,
      doiOj: 85,
      doiBb: 67,
      doiBk: 92
    };
  };

  const processOrderFulfillmentData = (ofData) => {
    if (!ofData || ofData.length === 0) {
      return {
        turunPpi: 0,
        potongStock: 0,
        proses: 0,
        kemas: 0,
        dokumen: 0,
        rilisQc: 0,
        rilisQa: 0
      };
    }

    const total = ofData.length;
    
    // Calculate percentages for each OF stage
    const turunPpiTrue = ofData.filter(item => item.TurunPPI === 1).length;
    const potongStockTrue = ofData.filter(item => item.PotongStock === 1).length;
    const prosesTrue = ofData.filter(item => item.Proses === 1).length;
    const kemasTrue = ofData.filter(item => item.Kemas === 1).length;
    const dokumenTrue = ofData.filter(item => item.Dok === 1).length;
    const qcTrue = ofData.filter(item => item.QC === 1).length;
    const qaTrue = ofData.filter(item => item.QA === 1).length;


    const result = {
      turunPpi: Math.round((turunPpiTrue / total) * 100),
      potongStock: Math.round((potongStockTrue / total) * 100),
      proses: Math.round((prosesTrue / total) * 100),
      kemas: Math.round((kemasTrue / total) * 100),
      dokumen: Math.round((dokumenTrue / total) * 100),
      rilisQc: Math.round((qcTrue / total) * 100),
      rilisQa: Math.round((qaTrue / total) * 100)
    };

    return result;
  };

  const processMaterialAvailabilityData = (stockData) => {
    // Mock material availability
    return {
      bahanBaku: 78,
      bahanKemas: 85,
      ota: 67
    };
  };

  const processInventoryOJData = (stockData) => {
    if (!stockData || stockData.length === 0) {
      return {
        slowMoving: 0,
        deadStock: 0,
        return: 0
      };
    }

    // Calculate current period dynamically based on actual date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    const currentPeriod = currentYear * 100 + currentMonth;
    
    // Calculate period ranges dynamically
    const last6MonthsPeriods = [];
    const last3MonthsPeriods = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const period = date.getFullYear() * 100 + (date.getMonth() + 1);
      last6MonthsPeriods.push(period);
      
      if (i < 3) {
        last3MonthsPeriods.push(period);
      }
    }
    
    // Group data by Product_ID to analyze each product's sales and release history
    const productHistory = {};
    
    stockData.forEach(item => {
      const productId = item.Product_ID;
      const period = parseInt(item.Periode);
      const sales = item.Sales || 0;
      const release = item.Release || 0;
      
      if (!productHistory[productId]) {
        productHistory[productId] = {};
      }
      productHistory[productId][period] = { sales, release };
    });
    
    const productIds = Object.keys(productHistory);
    const totalProducts = productIds.length;
    
    let deadStockCount = 0;
    let slowMovingCount = 0;
    
    productIds.forEach(productId => {
      const history = productHistory[productId];
      
      // Check for dead stock (0 sales for last 6 months AND stock available in earliest and current periods)
      const hasSalesInLast6Months = last6MonthsPeriods.some(period => 
        (history[period]?.sales || 0) > 0
      );
      
      // Check if stock was available in earliest (6 months ago) and current periods
      const earliestPeriod = last6MonthsPeriods[0]; // First period in the 6-month range
      const currentPeriod = last6MonthsPeriods[last6MonthsPeriods.length - 1]; // Last period (current)
      
      const hasStockInEarliestPeriod = (history[earliestPeriod]?.release || 0) > 0;
      const hasStockInCurrentPeriod = (history[currentPeriod]?.release || 0) > 0;
      
      const isDeadStock = !hasSalesInLast6Months && hasStockInEarliestPeriod && hasStockInCurrentPeriod;
      
      if (isDeadStock) {
        deadStockCount++;
      } else {
        // Only check for slow moving if not dead stock
        // Check for slow moving (0 sales for last 3 months AND stock available in earliest and current periods)
        const hasSalesInLast3Months = last3MonthsPeriods.some(period => 
          (history[period]?.sales || 0) > 0
        );
        
        // Check if stock was available in earliest (3 months ago) and current periods for slow moving
        const earliestPeriod3M = last3MonthsPeriods[0]; // First period in the 3-month range
        const currentPeriod3M = last3MonthsPeriods[last3MonthsPeriods.length - 1]; // Last period (current)
        
        const hasStockInEarliestPeriod3M = (history[earliestPeriod3M]?.release || 0) > 0;
        const hasStockInCurrentPeriod3M = (history[currentPeriod3M]?.release || 0) > 0;
        
        const isSlowMoving = !hasSalesInLast3Months && hasStockInEarliestPeriod3M && hasStockInCurrentPeriod3M;
        
        if (isSlowMoving) {
          slowMovingCount++;
        }
      }
    });
    
    const deadStockPercentage = totalProducts > 0 ? (deadStockCount / totalProducts) * 100 : 0;
    const slowMovingPercentage = totalProducts > 0 ? (slowMovingCount / totalProducts) * 100 : 0;
    
    // For return percentage, we'll use a mock calculation for now
    // as the return logic wasn't specified for OJ inventory
    const returnPercentage = 8; // Mock value
    
    const result = {
      slowMoving: Math.round(slowMovingPercentage),
      deadStock: Math.round(deadStockPercentage),
      return: returnPercentage
    };
    
    return result;
  };

  const processInventoryBBBKData = (bbbkData) => {
    if (!bbbkData || bbbkData.length === 0) {
      return {
        slowMoving: 0,
        deadStock: 0,
        return: 0
      };
    }

    const totalItems = bbbkData.length;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1); // 3 months ago
    const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
    
    // Calculate Dead Stock (null last_transaction_period)
    const deadStockItems = bbbkData.filter(item => 
      item.last_transaction_period === null || item.last_transaction_period === ''
    );
    
    // Calculate Slow Moving (last_transaction_period older than 3 months)
    const slowMovingItems = bbbkData.filter(item => {
      if (!item.last_transaction_period || item.last_transaction_period === null) {
        return false; // Already counted as dead stock
      }
      const transactionPeriod = parseInt(item.last_transaction_period);
      return transactionPeriod <= threeMonthsAgoYYYYMM;
    });
    
    // Calculate Return Percentage
    let totalReturnPercentages = 0;
    let validItemsCount = 0;
    
    bbbkData.forEach(item => {
      const totalRetur = item.totalRetur || 0;
      const totalPO = item.totalPO || 0;
      const totalClose = item.totalClose || 0;
      const denominator = totalPO - totalClose;
      
      if (denominator > 0) {
        const itemReturnPercentage = (totalRetur / denominator) * 100;
        totalReturnPercentages += itemReturnPercentage;
        validItemsCount++;
      }
    });
    
    const returnPercentage = validItemsCount > 0 ? (totalReturnPercentages / validItemsCount) : 0;
    const slowMovingPercentage = (slowMovingItems.length / totalItems) * 100;
    const deadStockPercentage = (deadStockItems.length / totalItems) * 100;
    
    const result = {
      slowMoving: Math.round(slowMovingPercentage),
      deadStock: Math.round(deadStockPercentage),
      return: Math.round(returnPercentage)
    };
    
    return result;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area">
          <DashboardLoading 
            loading={true} 
            text="Loading Summary Dashboard..." 
            subtext="Sedang memuat data ringkasan..." 
            coverContentArea={true}
          />
        </main>
      </div>
    );
  }

  // Chart configurations
  const salesLineData = {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
    datasets: [
      {
        label: 'Cumulative Sales',
        data: data.sales?.weeklyData || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Monthly Forecast',
        data: new Array(5).fill(data.sales?.monthlyForecast || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0,
        borderDash: [5, 5]
      }
    ]
  };

  const salesLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 10 } } },
      tooltip: { 
        enabled: true,
        callbacks: {
          label: function(context) {
            const datasetLabel = context.dataset.label;
            const value = formatNumber(context.parsed.y);
            
            if (datasetLabel === 'Cumulative Sales') {
              // Calculate weekly sales (difference from previous week)
              const weekIndex = context.dataIndex;
              const weeklyData = data.sales?.weeklyData || [];
              const currentWeekTotal = weeklyData[weekIndex] || 0;
              const previousWeekTotal = weekIndex > 0 ? (weeklyData[weekIndex - 1] || 0) : 0;
              const weeklySales = currentWeekTotal - previousWeekTotal;
              
              return [
                `Weekly Sales: ${formatNumber(weeklySales)}`,
                `Monthly Sales: ${value}`
              ];
            }
            return `${datasetLabel}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: { display: true, ticks: { font: { size: 10 } } },
      y: { display: true, ticks: { font: { size: 10 } } }
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area">
        <div className="summary-dashboard">
          {/* Grid Layout */}
          <div className="summary-grid">
            {/* Sales Section */}
            <KPICard title="SALES" className="sales-card">
              <div className="sales-content">
                <div className="sales-left">
                  <CircularProgress 
                    percentage={data.sales?.achievement || 0} 
                    color="#1f2937"
                    size={100}
                  />
                </div>
                <div className="sales-middle">
                  <div className="sales-daily">
                    <div className="sales-label">Daily sales</div>
                    <div className="sales-value">{formatNumber(data.sales?.dailySales || 0)}</div>
                    <div className="sales-achievement">Ach {(data.sales?.achievement || 0).toFixed(1)}% 📈</div>
                  </div>
                </div>
                <div className="sales-right">
                  <div className="sales-chart-title">Weekly Sales</div>
                  <div className="sales-chart">
                    <Line data={salesLineData} options={salesLineOptions} />
                  </div>
                </div>
              </div>
            </KPICard>

            {/* OF1 */}
            <KPICard title="OF1" className="of1-card">
              <div className="of1-content">
                <div className="of1-grid">
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.turunPpi || 0} 
                      color="#f59e0b"
                      size={80}
                    />
                    <div className="of1-label">Turun PPI</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.potongStock || 0} 
                      color="#10b981"
                      size={80}
                    />
                    <div className="of1-label">Potong Stock</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.proses || 0} 
                      color="#6b7280"
                      size={80}
                    />
                    <div className="of1-label">Proses</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.kemas || 0} 
                      color="#8b5cf6"
                      size={80}
                    />
                    <div className="of1-label">Kemas</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.dokumen || 0} 
                      color="#06b6d4"
                      size={80}
                    />
                    <div className="of1-label">Dokumen</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.rilisQc || 0} 
                      color="#f97316"
                      size={80}
                    />
                    <div className="of1-label">Rilis QC</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.rilisQa || 0} 
                      color="#ef4444"
                      size={80}
                    />
                    <div className="of1-label">Rilis QA</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Material Availability */}
            <KPICard title="MATERIAL AVAILABILITY" className="material-availability-card">
              <div className="material-availability-content">
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanBaku || 0} 
                    color="#10b981"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Baku</div>
                </div>
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanKemas || 0} 
                    color="#f59e0b"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Kemas</div>
                </div>
              </div>
            </KPICard>

            {/* OTA */}
            <KPICard title="OTA" className="ota-card">
              <div className="ota-content">
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanBaku || 0} 
                    color="#10b981"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Baku</div>
                </div>
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanKemas || 0} 
                    color="#f59e0b"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Kemas</div>
                </div>
              </div>
            </KPICard>

            {/* Stock Out */}
            <KPICard title="STOCK OUT" className="stock-out-card">
              <div className="stock-out-content">
                <div className="stock-out-main">
                  <CircularProgress 
                    percentage={data.stockOut?.percentage || 0} 
                    color="#1f2937"
                    size={70}
                  />
                </div>
                <div className="stock-out-info-cards">
                  <div className="stock-out-info-card">
                    <div className="stock-out-info-value">{data.stockOut?.focus || 0}</div>
                    <div className="stock-out-info-label">Stockout - Fokus</div>
                  </div>
                  <div className="stock-out-info-card">
                    <div className="stock-out-info-value">{data.stockOut?.nonFocus || 0}</div>
                    <div className="stock-out-info-label">Stockout - Non Fokus</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Coverage Stock FG */}
            <KPICard title="COVERAGE STOCK FG" className="coverage-card">
              <div className="coverage-content">
                <div className="coverage-main">
                  <CircularProgress 
                    percentage={data.coverage?.percentage || 0} 
                    color="#1f2937"
                    size={70}
                  />
                </div>
                <div className="coverage-info-cards">
                  <div className="coverage-info-card">
                    <div className="coverage-info-value">{data.coverage?.under || 0}</div>
                    <div className="coverage-info-label">SKU Under</div>
                  </div>
                  <div className="coverage-info-card">
                    <div className="coverage-info-value">{data.coverage?.over || 0}</div>
                    <div className="coverage-info-label">SKU Over</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* WH Occupancy */}
            <KPICard title="WH OCCUPANCY" className="wh-occupancy-card">
              <div className="wh-occupancy-content">
                <div className="wh-occupancy-top">
                  <div className="wh-item">
                    <CircularProgress 
                      percentage={data.whOccupancy?.oj || 0} 
                      color="#f59e0b"
                      size={80}
                    />
                    <div className="wh-label">OJ</div>
                  </div>
                  <div className="wh-item">
                    <CircularProgress 
                      percentage={data.whOccupancy?.bb || 0} 
                      color="#10b981"
                      size={80}
                    />
                    <div className="wh-label">BB</div>
                  </div>
                  <div className="wh-item">
                    <CircularProgress 
                      percentage={data.whOccupancy?.bk || 0} 
                      color="#6b7280"
                      size={80}
                    />
                    <div className="wh-label">BK</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Inventory OJ */}
            <KPICard title="INVENTORY OJ" className="inventory-oj-card">
              <div className="inventory-oj-content">
                <div className="inventory-grid">
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.slowMoving || 0} 
                      color="#f59e0b"
                      size={60}
                    />
                    <div className="inventory-label">Slow Moving</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.deadStock || 0} 
                      color="#ef4444"
                      size={60}
                    />
                    <div className="inventory-label">Dead Stock</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.return || 0} 
                      color="#8b5cf6"
                      size={60}
                    />
                    <div className="inventory-label">Return</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Inventory BB-BK */}
            <KPICard title="INVENTORY BB-BK" className="inventory-bb-bk-card">
              <div className="inventory-bb-bk-content">
                <div className="inventory-grid">
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBBBK?.slowMoving || 0} 
                      color="#f59e0b"
                      size={60}
                    />
                    <div className="inventory-label">Slow Moving</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBBBK?.deadStock || 0} 
                      color="#ef4444"
                      size={60}
                    />
                    <div className="inventory-label">Dead Stock</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBBBK?.return || 0} 
                      color="#8b5cf6"
                      size={60}
                    />
                    <div className="inventory-label">Return</div>
                  </div>
                </div>
              </div>
            </KPICard>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SummaryDashboard;

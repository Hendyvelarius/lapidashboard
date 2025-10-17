import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import DashboardLoading from './DashboardLoading';
import Sidebar from './Sidebar';
import { apiUrl } from '../api';
import './ProductionDashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Mock data generator for WIP stages (temporary fallback)
const generateMockWIPData = (stages) => {
  return stages.map(stage => Math.floor(Math.random() * 11)); // 0-10 batches
};

// Product type configurations
const productTypes = [
  {
    name: 'Tablet',
    stages: ['Granulasi', 'Cetak', 'Kemas Primer', 'Kemas Sekunder', 'Released QC', 'Released Mikro', 'Released QA'],
    color: '#4f8cff',
  },
  {
    name: 'Tablet Salut',
    stages: ['Granulasi', 'Cetak', 'Coating', 'Kemas Primer', 'Kemas Sekunder', 'Released QC', 'Released Mikro', 'Released QA'],
    color: '#9333ea',
  },
  {
    name: 'Kapsul',
    stages: ['Mixing', 'Filling', 'Kemas Primer', 'Kemas Sekunder', 'Released QC', 'Released Mikro', 'Released QA'],
    color: '#38e6c5',
  },
  {
    name: 'Liquid Non Steril',
    stages: ['Mixing', 'Filling', 'Kemas Primer', 'Kemas Sekunder', 'Released QC', 'Released Mikro', 'Released QA'],
    color: '#ffb347',
  },
  {
    name: 'Steril',
    stages: ['Mixing', 'Filling', 'Kemas Primer', 'Kemas Sekunder', 'Released QC', 'Released Mikro', 'Released QA'],
    color: '#e57373',
  },
  {
    name: 'Dry Syrup dan Serbuk Sachet',
    stages: ['Mixing', 'Filling', 'Kemas Primer', 'Kemas Sekunder', 'Released QC', 'Released Mikro', 'Released QA'],
    color: '#43a047',
  },
];

// Color palette for donut charts
const stageColors = [
  '#4f8cff',
  '#9333ea',
  '#38e6c5',
  '#ffb347',
  '#e57373',
  '#43a047',
  '#6a5acd',
  '#ff6b9d',
];

const ProductionDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [wipData, setWipData] = useState({});
  const [pctData, setPctData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch real PCT Breakdown data
    const fetchPCTBreakdown = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(apiUrl('/api/pctBreakdown'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const data = result.data && result.data.length > 0 ? result.data[0] : null;
        
        if (data) {
          // Transform API data to match our frontend structure
          const pctBreakdown = {
            Timbang: Math.round(data.Avg_Timbang_Days || 0),
            Proses: Math.round(data.Avg_Proses_Days || 0),
            QC: Math.round(data.Avg_QC_Days || 0),
            Mikro: Math.round(data.Avg_Mikro_Days || 0),
            QA: Math.round(data.Avg_QA_Days || 0),
          };
          setPctData(pctBreakdown);
          console.log('PCT Breakdown Data:', pctBreakdown);
          console.log('Total Batches:', data.Total_Batches);
        } else {
          console.warn('No PCT data available');
          setPctData({
            Timbang: 0,
            Proses: 0,
            QC: 0,
            Mikro: 0,
            QA: 0,
          });
        }
        
        // Generate mock WIP data for now
        const mockWIP = {};
        productTypes.forEach(product => {
          mockWIP[product.name] = generateMockWIPData(product.stages);
        });
        setWipData(mockWIP);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching PCT breakdown:', err);
        setError(err.message);
        
        // Fallback to empty data on error
        setPctData({
          Timbang: 0,
          Proses: 0,
          QC: 0,
          Mikro: 0,
          QA: 0,
        });
        
        const mockWIP = {};
        productTypes.forEach(product => {
          mockWIP[product.name] = generateMockWIPData(product.stages);
        });
        setWipData(mockWIP);
        
        setLoading(false);
      }
    };

    fetchPCTBreakdown();
  }, []);

  // Create grouped bar chart data for WIP
  const createWIPBarChartData = () => {
    // Get all unique stages across all product types
    const allStages = new Set();
    productTypes.forEach(product => {
      product.stages.forEach(stage => allStages.add(stage));
    });
    const stageList = Array.from(allStages);

    // Create datasets - one for each stage
    const datasets = stageList.map((stage, index) => {
      return {
        label: stage,
        data: productTypes.map(product => {
          const stageIndex = product.stages.indexOf(stage);
          if (stageIndex === -1) return 0;
          const productData = wipData[product.name] || [];
          return productData[stageIndex] || 0;
        }),
        backgroundColor: stageColors[index % stageColors.length],
        borderColor: stageColors[index % stageColors.length],
        borderWidth: 1,
      };
    });

    return {
      labels: productTypes.map(p => p.name),
      datasets: datasets,
    };
  };

  // WIP Bar chart options
  const wipBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 10,
          },
          padding: 8,
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value} batches`;
          },
        },
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value) => value > 0 ? value : '',
        font: {
          size: 9,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 10,
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
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
  };

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
          <h2 className="section-title">Work In Progress (WIP) by Product Type</h2>
          <div className="wip-stepper-grid">
            {productTypes.map((product, index) => {
              const data = wipData[product.name] || [];
              const totalBatches = data.reduce((sum, val) => sum + val, 0);
              
              return (
                <div key={`wip-stepper-${index}-${product.name}`} className="wip-stepper-card">
                  <div className="wip-stepper-header" style={{ borderLeftColor: product.color }}>
                    <h3 className="wip-stepper-title">{product.name}</h3>
                    <div className="wip-stepper-total">
                      <span className="stepper-total-label">Total:</span>
                      <span className="stepper-total-value" style={{ color: product.color }}>
                        {totalBatches}
                      </span>
                    </div>
                  </div>
                  <div className="wip-stepper-body">
                    <div className="stepper-container">
                      {product.stages.map((stage, stageIndex) => {
                        const batchCount = data[stageIndex] || 0;
                        const isLast = stageIndex === product.stages.length - 1;
                        
                        return (
                          <div key={`stage-${stageIndex}`} className="stepper-item">
                            <div className="stepper-circle-wrapper">
                              <div 
                                className="stepper-circle" 
                                style={{ 
                                  backgroundColor: stageColors[stageIndex % stageColors.length],
                                  opacity: batchCount > 0 ? 1 : 0.3
                                }}
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
    </div>
  );
};

export default ProductionDashboard;

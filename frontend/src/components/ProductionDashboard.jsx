import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import DashboardLoading from './DashboardLoading';
import Sidebar from './Sidebar';
import './ProductionDashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Mock data generator for WIP stages
const generateMockWIPData = (stages) => {
  return stages.map(stage => Math.floor(Math.random() * 11)); // 0-10 batches
};

// Mock data for PCT (average days for each stage)
const generateMockPCTData = () => {
  return {
    Timbang: Math.floor(Math.random() * 5) + 1,
    Proses: Math.floor(Math.random() * 10) + 5,
    QC: Math.floor(Math.random() * 7) + 2,
    Mikro: Math.floor(Math.random() * 5) + 3,
    QA: Math.floor(Math.random() * 4) + 2,
  };
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

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      const mockWIP = {};
      productTypes.forEach(product => {
        mockWIP[product.name] = generateMockWIPData(product.stages);
      });
      
      setWipData(mockWIP);
      setPctData(generateMockPCTData());
      setLoading(false);
    }, 1000);
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
          <div className="wip-bar-card">
            <div className="wip-bar-chart-container">
              <Bar data={createWIPBarChartData()} options={wipBarOptions} plugins={[ChartDataLabels]} />
            </div>
          </div>
        </section>

        {/* PCT Breakdown Section */}
        <section className="production-section">
          <h2 className="section-title">Product Cycle Time (PCT) Breakdown</h2>
          <div className="pct-row">
            <div className="pct-card">
              <div className="pct-description">
                <p>Average days for each stage in the production process</p>
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

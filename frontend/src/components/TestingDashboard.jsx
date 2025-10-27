import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import DashboardLoading from './DashboardLoading';
import Sidebar from './Sidebar';
import Modal from './Modal';
import { apiUrl } from '../api';
import './ProductionDashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, ChartDataLabels);

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

// Speedometer Component
const Speedometer = ({ label, value, maxValue = 50, color = '#4f8cff', animated = false, avgDays = 0 }) => {
  // Calculate needle angle based on value
  const needleAngle = Math.min((value / maxValue) * 180, 180) - 90; // -90 to 90 degrees
  
  // Define color thresholds matching the getQueueColor function
  const colorThresholds = [
    { max: 5, color: '#22c55e', label: '0-5' },      // Light green
    { max: 10, color: '#84cc16', label: '6-10' },    // Yellow-green
    { max: 15, color: '#eab308', label: '11-15' },   // Yellow
    { max: 20, color: '#f59e0b', label: '16-20' },   // Orange
    { max: 25, color: '#f97316', label: '21-25' },   // Deep orange
    { max: 30, color: '#ef4444', label: '26-30' },   // Red
    { max: 50, color: '#dc2626', label: '31+' },     // Deep red
  ];
  
  // Build segments for the gauge based on color thresholds
  const segments = [];
  const segmentLabels = [];
  const segmentColors = [];
  const segmentBorders = [];
  
  colorThresholds.forEach((threshold, index) => {
    const prevMax = index === 0 ? 0 : colorThresholds[index - 1].max;
    const segmentSize = threshold.max - prevMax;
    
    segments.push(segmentSize);
    segmentLabels.push(threshold.label);
    segmentColors.push(threshold.color);
    segmentBorders.push(threshold.color);
  });
  
  // Add empty/remaining segment
  const totalSegments = segments.reduce((sum, val) => sum + val, 0);
  const emptySegment = Math.max(0, maxValue - totalSegments);
  if (emptySegment > 0) {
    segments.push(emptySegment);
    segmentLabels.push('Empty');
    segmentColors.push('rgba(229, 231, 235, 0.2)');
    segmentBorders.push('#e5e7eb');
  }
  
  // Create gauge data
  const gaugeData = {
    labels: segmentLabels,
    datasets: [
      {
        data: segments,
        backgroundColor: segmentColors,
        borderColor: segmentBorders,
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
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context) {
            if (context.label === 'Empty') {
              return 'Available capacity';
            }
            return `${context.label} batches range`;
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
    animation: animated ? {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutCubic',
    } : false,
    layout: {
      padding: 0
    },
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      padding: '12px',
      background: value > 0 ? `${color}05` : '#fafafa',
      borderRadius: '8px',
      border: value > 0 ? `1px solid ${color}20` : '1px solid #e5e7eb',
      transition: 'all 0.3s ease',
      width: '100%',
    }}>
      <div style={{ 
        position: 'relative', 
        width: '100%',
        maxWidth: '140px',
        margin: '0 auto',
      }}>
        <div style={{ 
          position: 'relative',
          width: '100%',
          paddingBottom: '50%', // Creates a half-circle space
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}>
            <Doughnut data={gaugeData} options={gaugeOptions} />
          </div>
          
          {/* Needle */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              width: '3px',
              height: '48px',
              backgroundColor: value > 0 ? color : '#9ca3af',
              transformOrigin: 'bottom center',
              transform: animated 
                ? `translateX(-50%) rotate(${needleAngle}deg)`
                : 'translateX(-50%) rotate(-90deg)',
              transition: animated ? 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              borderRadius: '2px 2px 0 0',
              zIndex: 10,
              boxShadow: value > 0 ? `0 0 6px ${color}` : 'none',
            }}
          />
          
          {/* Center dot */}
          <div 
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              width: '12px',
              height: '12px',
              backgroundColor: value > 0 ? color : '#9ca3af',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
              zIndex: 11,
              border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          />
          
          {/* Value display - positioned inside speedometer */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            zIndex: 5,
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: value > 0 ? color : '#9ca3af',
              lineHeight: '1',
            }}>
              {value}
            </div>
          </div>
        </div>
      </div>
      
      {/* Label and average display */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '8px',
        width: '100%',
      }}>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#374151',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '0.65rem',
          color: value > 0 ? '#6b7280' : '#9ca3af',
          fontWeight: '600',
          marginTop: '2px',
        }}>
          {avgDays > 0 ? `${avgDays}d avg` : 'clear'}
        </div>
      </div>
    </div>
  );
};

const TestingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [rawWipData, setRawWipData] = useState([]);
  const [processedWipData, setProcessedWipData] = useState([]);
  const [overallDeptData, setOverallDeptData] = useState([]); // Overall dept-level data
  const [pctData, setPctData] = useState({});
  const [pctRawData, setPctRawData] = useState([]); // Store raw batch-level PCT data
  const [forecastData, setForecastData] = useState([]); // Store forecast vs production data
  const [forecastRawData, setForecastRawData] = useState([]); // Store raw forecast data for detailed view
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStageData, setSelectedStageData] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState(null);
  const [pctModalOpen, setPctModalOpen] = useState(false); // PCT chart click modal
  const [selectedPctStage, setSelectedPctStage] = useState(null); // Selected PCT stage data
  const [targetModalOpen, setTargetModalOpen] = useState(false); // Production target detail modal
  const [selectedTargetData, setSelectedTargetData] = useState(null); // Selected month target data
  const [isExpanded, setIsExpanded] = useState(false); // Single expansion state for both PN1 and PN2
  const [speedometerAnimated, setSpeedometerAnimated] = useState({}); // Track animation state for speedometers

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

  // Process overall department-level data with condensed stages
  const processOverallDeptData = (rawData) => {
    if (!rawData || rawData.length === 0) return [];

    // Define condensed stage mappings
    const stageMapping = {
      'Timbang': 'Timbang',
      'Mixing': 'Proses',
      'Filling': 'Proses',
      'Granulasi': 'Proses',
      'Cetak': 'Proses',
      'Coating': 'Proses',
      'Kemas Primer': 'Kemas Primer',
      'Kemas Sekunder': 'Kemas Sekunder',
      'QC': 'QC',
      'Mikro': 'Mikro',
      'QA': 'QA',
    };

    const condensedStageOrder = ['Timbang', 'Proses', 'Kemas Primer', 'Kemas Sekunder', 'QC', 'Mikro', 'QA'];

    // Filter out completed batches
    const batchesWithApproveRelease = new Set();
    rawData.forEach(entry => {
      if (entry.nama_tahapan === 'Approve Realese' && entry.EndDate) {
        batchesWithApproveRelease.add(entry.Batch_No);
      }
    });

    const activeBatches = rawData.filter(entry => 
      !batchesWithApproveRelease.has(entry.Batch_No)
    );

    // Group by department only
    const deptGroups = {};
    
    activeBatches.forEach(entry => {
      const dept = entry.Group_Dept || 'Unknown';
      const tahapanGroup = entry.tahapan_group || 'Other';
      const batchNo = entry.Batch_No;

      // Skip entries with "Other" tahapan_group
      if (tahapanGroup === 'Other') {
        return;
      }

      // Map to condensed stage
      const condensedStage = stageMapping[tahapanGroup];
      if (!condensedStage) {
        return; // Skip unmapped stages
      }

      if (!deptGroups[dept]) {
        deptGroups[dept] = {
          dept,
          stages: {},
          batches: new Set(),
        };
      }

      if (!deptGroups[dept].stages[condensedStage]) {
        deptGroups[dept].stages[condensedStage] = {
          batchesInProgress: new Set(),
          entries: [],
        };
      }

      deptGroups[dept].stages[condensedStage].entries.push(entry);
      deptGroups[dept].batches.add(batchNo);
    });

    // Calculate batches in progress and average days for each condensed stage
    Object.keys(deptGroups).forEach(dept => {
      const group = deptGroups[dept];
      
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

        const batchDurations = [];
        const currentDate = new Date();

        // Check each batch
        Object.keys(batchEntries).forEach(batchNo => {
          const entries = batchEntries[batchNo];
          const hasStartDate = entries.some(e => e.StartDate);
          const hasMissingEndDate = entries.some(e => !e.EndDate);

          if (hasStartDate && hasMissingEndDate) {
            stage.batchesInProgress.add(batchNo);
            
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

    // Convert to array with ordered stages
    const result = [];
    
    Object.keys(deptGroups).forEach(dept => {
      const group = deptGroups[dept];
      
      const stageCounts = condensedStageOrder.map(stageName => 
        group.stages[stageName] ? group.stages[stageName].batchesInProgress.size : 0
      );

      const stageAverageDays = condensedStageOrder.map(stageName =>
        group.stages[stageName] ? (group.stages[stageName].averageDays || 0) : 0
      );

      result.push({
        dept: dept,
        stages: condensedStageOrder,
        stageCounts: stageCounts,
        stageAverageDays: stageAverageDays,
        totalBatches: Array.from(group.batches).length,
      });
    });

    // Sort by dept (PN1 first, then PN2)
    result.sort((a, b) => a.dept.localeCompare(b.dept));

    return result;
  };

  // Handle stage circle click to show batch details (for overall dept stepper)
  const handleOverallStageClick = (dept, condensedStageName) => {
    // Map condensed stage back to original stages
    const stageMapping = {
      'Timbang': ['Timbang'],
      'Proses': ['Mixing', 'Filling', 'Granulasi', 'Cetak', 'Coating'],
      'Kemas Primer': ['Kemas Primer'],
      'Kemas Sekunder': ['Kemas Sekunder'],
      'QC': ['QC'],
      'Mikro': ['Mikro'],
      'QA': ['QA'],
    };

    const originalStages = stageMapping[condensedStageName] || [];

    // Filter raw data for this dept and any of the original stages
    const batchesWithApproveRelease = new Set();
    rawWipData.forEach(entry => {
      if (entry.nama_tahapan === 'Approve Realese' && entry.EndDate) {
        batchesWithApproveRelease.add(entry.Batch_No);
      }
    });

    const stageEntries = rawWipData.filter(entry => {
      const entryDept = entry.Group_Dept || 'Unknown';
      const entryTahapanGroup = entry.tahapan_group || 'Other';
      
      return entryDept === dept 
        && originalStages.includes(entryTahapanGroup)
        && entryTahapanGroup !== 'Other'
        && !batchesWithApproveRelease.has(entry.Batch_No);
    });

    // Group by Batch_No
    const batchDetails = {};
    stageEntries.forEach(entry => {
      const batchNo = entry.Batch_No;
      if (!batchDetails[batchNo]) {
        batchDetails[batchNo] = {
          batchNo: batchNo,
          productId: entry.Product_ID,
          productName: entry.Product_Name,
          batchDate: entry.Batch_Date,
          jenisSediaan: entry.Jenis_Sediaan,
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

    // Filter to only show batches in progress
    const activeBatches = Object.values(batchDetails).filter(
      batch => batch.hasStartDate && batch.hasMissingEndDate
    );

    setSelectedStageData({
      dept,
      jenisSediaan: 'All Products', // Indicate this is for all products
      stageName: condensedStageName,
      batches: activeBatches,
      color: deptColors[dept] || '#4f8cff',
    });
    setModalOpen(true);
  };

  // Toggle expansion (both PN1 and PN2 together)
  const toggleExpansion = () => {
    setIsExpanded(prev => !prev);
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

  // Handle PCT bar chart click
  const handlePctBarClick = (stageName) => {
    const stageKey = `${stageName}_Days`;
    
    // Filter batches that have data for this stage
    const stageBatches = pctRawData
      .filter(batch => batch[stageKey] !== null && batch[stageKey] !== undefined && !isNaN(batch[stageKey]))
      .map(batch => ({
        ...batch,
        stageDays: batch[stageKey]
      }))
      .sort((a, b) => b.stageDays - a.stageDays); // Sort by days descending
    
    setSelectedPctStage({
      stageName: stageName,
      batches: stageBatches,
      averageDays: pctData[stageName] || 0,
    });
    setPctModalOpen(true);
  };

  // Handle click on Production Target chart bar
  const handleTargetBarClick = (monthIndex) => {
    if (!forecastData[monthIndex] || !forecastData[monthIndex].hasData) return;
    
    const monthData = forecastData[monthIndex];
    const periode = monthData.periode;
    
    // Get all products for this periode with their target and production details
    const productDetails = forecastRawData
      .filter(item => item.Periode === periode)
      .map(item => {
        const forecast = parseFloat(item.Forecast) || 0;
        const stockRelease = parseFloat(item.StockReleaseAwalBulan) || 0;
        const targetValue = (forecast * 1.3) - stockRelease;
        const target = Math.max(0, targetValue);
        const production = parseFloat(item.Produksi) || 0;
        const achievement = target > 0 ? Math.round((production / target) * 100) : 0;
        
        return {
          productId: item.Product_ID || 'N/A',
          productName: item.Product_NM || 'Unknown Product',
          forecast: Math.round(forecast),
          stockRelease: Math.round(stockRelease),
          target: Math.round(target),
          production: Math.round(production),
          achievement: achievement,
          hasTarget: target > 0, // Flag to show if production was needed
        };
      })
      .filter(item => item.hasTarget) // Only show products that needed production
      .sort((a, b) => b.target - a.target); // Sort by target descending
    
    setSelectedTargetData({
      monthName: monthData.monthName,
      periode: periode,
      products: productDetails,
      totalTarget: monthData.forecast,
      totalProduction: monthData.production,
      overallAchievement: monthData.achievement,
    });
    setTargetModalOpen(true);
  };

  // Process forecast data to get monthly totals for current year
  const processForecastData = (rawForecastData) => {
    if (!rawForecastData || rawForecastData.length === 0) return [];

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 0-indexed, so add 1

    // Initialize monthly data for the year
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const periode = `${currentYear}${month.toString().padStart(2, '0')}`; // e.g., "202501"
      
      // Filter data for this periode
      const monthData = rawForecastData.filter(item => item.Periode === periode);
      
      // Calculate target using new formula:
      // Target = sum of max(0, (Forecast * 1.3) - StockReleaseAwalBulan) for each product
      const totalTarget = monthData.reduce((sum, item) => {
        const forecast = parseFloat(item.Forecast) || 0;
        const stockRelease = parseFloat(item.StockReleaseAwalBulan) || 0;
        const targetValue = (forecast * 1.3) - stockRelease;
        // Only count positive values (don't count if there's enough stock)
        return sum + Math.max(0, targetValue);
      }, 0);
      
      const totalProduction = monthData.reduce((sum, item) => sum + (parseFloat(item.Produksi) || 0), 0);
      
      monthlyData.push({
        month: month,
        monthName: new Date(currentYear, month - 1).toLocaleString('en-US', { month: 'short' }),
        periode: periode,
        forecast: Math.round(totalTarget), // This is now "Target" instead of "Forecast"
        production: Math.round(totalProduction),
        hasData: month <= currentMonth, // Only show data for past/current months
        achievement: totalTarget > 0 ? Math.round((totalProduction / totalTarget) * 100) : 0
      });
    }

    return monthlyData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch PCT Breakdown data (now batch-level details)
        const pctResponse = await fetch(apiUrl('/api/pctBreakdown'));
        if (!pctResponse.ok) {
          throw new Error(`PCT API error! status: ${pctResponse.status}`);
        }
        
        const pctResult = await pctResponse.json();
        const pctBatchData = pctResult.data || [];
        
        // Store raw batch data
        setPctRawData(pctBatchData);
        
        // Calculate averages for the chart
        if (pctBatchData.length > 0) {
          const stages = ['Timbang', 'Proses', 'QC', 'Mikro', 'QA'];
          const pctBreakdown = {};
          
          stages.forEach(stage => {
            const stageKey = `${stage}_Days`;
            const values = pctBatchData
              .map(batch => batch[stageKey])
              .filter(val => val !== null && val !== undefined && !isNaN(val));
            
            if (values.length > 0) {
              const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
              pctBreakdown[stage] = Math.round(avg);
            } else {
              pctBreakdown[stage] = 0;
            }
          });
          
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

        // Process overall department data
        const overallDept = processOverallDeptData(wipRawData);
        console.log('Overall Dept Data:', overallDept);
        setOverallDeptData(overallDept);

        // Fetch Forecast data
        const forecastResponse = await fetch(apiUrl('/api/forecast'));
        if (!forecastResponse.ok) {
          throw new Error(`Forecast API error! status: ${forecastResponse.status}`);
        }

        const forecastResult = await forecastResponse.json();
        const forecastRawData = forecastResult || [];
        
        console.log('Raw Forecast Data:', forecastRawData);
        
        // Store raw forecast data for detailed modal view
        setForecastRawData(forecastRawData);
        
        // Process forecast data to monthly totals
        const processedForecast = processForecastData(forecastRawData);
        console.log('Processed Forecast Data:', processedForecast);
        setForecastData(processedForecast);
        
        setLoading(false);
        
        // Trigger speedometer animation after a short delay
        setTimeout(() => {
          const animState = {};
          overallDept.forEach(dept => {
            animState[dept.dept] = true;
          });
          setSpeedometerAnimated(animState);
        }, 100);
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

  if (loading) {
    return <DashboardLoading loading={true} text="Loading Testing Dashboard..." subtext="Fetching WIP and PCT data..." />;
  }

  // Create bar chart data for PCT (after loading check)
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
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        const stageNames = Object.keys(pctData);
        const clickedStage = stageNames[elementIndex];
        handlePctBarClick(clickedStage);
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const batchCount = pctRawData.filter(batch => {
              const stageKey = `${context.label}_Days`;
              return batch[stageKey] !== null && batch[stageKey] !== undefined;
            }).length;
            return `${context.parsed.y} days avg (${batchCount} batches)`;
          },
        },
      },
      datalabels: {
        display: true,
        anchor: 'end',
        align: 'top',
        formatter: function(value) {
          return value ? `${Math.round(value)} Days` : '';
        },
        color: '#374151',
        font: {
          weight: 'bold',
          size: 11,
        },
        offset: 4,
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

  // Create forecast vs production chart data
  const forecastChartData = {
    labels: forecastData.map(d => d.monthName),
    datasets: [
      {
        type: 'bar',
        label: 'Target',
        data: forecastData.map(d => d.hasData ? d.forecast : null),
        backgroundColor: 'rgba(79, 140, 255, 0.7)',
        borderColor: '#4f8cff',
        borderWidth: 2,
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'bar',
        label: 'Production',
        data: forecastData.map(d => d.hasData ? d.production : null),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: '#10b981',
        borderWidth: 2,
        borderRadius: 6,
        order: 3,
      },
      {
        type: 'line',
        label: 'Achievement %',
        data: forecastData.map(d => d.hasData ? d.achievement : null),
        borderColor: '#9333ea',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#9333ea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: true,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  };

  const forecastChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        handleTargetBarClick(elementIndex);
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
            weight: '600',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.yAxisID === 'y1') {
                label += context.parsed.y + '%';
              } else {
                label += context.parsed.y.toLocaleString() + ' units';
              }
            }
            return label;
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Units',
          font: {
            weight: 'bold',
            size: 11,
          },
        },
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        max: 120,
        title: {
          display: true,
          text: 'Achievement %',
          font: {
            weight: 'bold',
            size: 11,
          },
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="production-dashboard">
      <Sidebar />
      <div className="production-main-content">
        <div className="production-content">
        {/* WIP Section */}
        <section className="production-section">
          
          {overallDeptData.length === 0 ? (
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
              {/* Overall Department Steppers */}
              {overallDeptData.map(deptData => {
                const deptColor = deptColors[deptData.dept] || '#4f8cff';
                const totalQueues = deptData.stageCounts.reduce((sum, val) => sum + val, 0);
                const deptDetailData = processedWipData.filter(item => item.dept === deptData.dept);
                
                return (
                  <div key={deptData.dept}>
                    {/* Speedometer Card with Integrated Title and Expandable Details */}
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
                      padding: '20px',
                      marginBottom: '16px',
                    }}>
                      {/* Clickable Title Header */}
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          padding: '8px 12px',
                          background: `linear-gradient(135deg, ${deptColor}10, ${deptColor}05)`,
                          borderRadius: '8px',
                          border: `2px solid ${deptColor}30`,
                          transition: 'all 0.2s ease',
                        }}
                        onClick={toggleExpansion}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${deptColor}20, ${deptColor}10)`;
                          e.currentTarget.style.borderColor = `${deptColor}50`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${deptColor}10, ${deptColor}05)`;
                          e.currentTarget.style.borderColor = `${deptColor}30`;
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            fontSize: '1rem', 
                            transition: 'transform 0.3s ease',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            display: 'inline-block',
                            color: deptColor,
                          }}>
                            ▶
                          </span>
                          <h2 style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: deptColor,
                            margin: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            WIP Status {deptData.dept}
                          </h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600' }}>
                              TOTAL QUEUES
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: deptColor }}>
                              {totalQueues}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600' }}>
                              TOTAL BATCHES
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: deptColor }}>
                              {deptData.totalBatches}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Grid of 7 speedometers - 2 rows */}
                      <div>
                        {/* First row - 4 speedometers */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '12px',
                          marginBottom: '12px',
                        }}>
                          {deptData.stages.slice(0, 4).map((stage, index) => (
                            <div 
                              key={stage}
                              onClick={() => {
                                if (deptData.stageCounts[index] > 0) {
                                  handleOverallStageClick(deptData.dept, stage);
                                }
                              }}
                              style={{ cursor: deptData.stageCounts[index] > 0 ? 'pointer' : 'default' }}
                            >
                              <Speedometer
                                label={stage}
                                value={deptData.stageCounts[index]}
                                maxValue={50}
                                color={deptColor}
                                animated={speedometerAnimated[deptData.dept] || false}
                                avgDays={deptData.stageAverageDays[index]}
                              />
                            </div>
                          ))}
                        </div>
                        
                        {/* Second row - 3 speedometers (centered) */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '12px',
                        }}>
                          {deptData.stages.slice(4).map((stage, index) => {
                            const actualIndex = index + 4;
                            return (
                              <div 
                                key={stage} 
                                style={{ width: 'calc(25% - 9px)' }}
                                onClick={() => {
                                  if (deptData.stageCounts[actualIndex] > 0) {
                                    handleOverallStageClick(deptData.dept, stage);
                                  }
                                }}
                              >
                                <div style={{ cursor: deptData.stageCounts[actualIndex] > 0 ? 'pointer' : 'default' }}>
                                  <Speedometer
                                    label={stage}
                                    value={deptData.stageCounts[actualIndex]}
                                    maxValue={50}
                                    color={deptColor}
                                    animated={speedometerAnimated[deptData.dept] || false}
                                    avgDays={deptData.stageAverageDays[actualIndex]}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Detailed View by Product Type */}
                    <div 
                      style={{
                        maxHeight: isExpanded ? `${deptDetailData.length * 200}px` : '0px',
                        opacity: isExpanded ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                      }}
                    >
                      {deptDetailData.length === 0 ? (
                        <div style={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '24px',
                          textAlign: 'center',
                          color: '#9ca3af',
                          fontSize: '0.9rem',
                          marginBottom: '16px',
                        }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                          <p>No active batches</p>
                        </div>
                      ) : (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: '600', 
                            color: '#6b7280',
                            marginBottom: '8px',
                            paddingLeft: '8px',
                          }}>
                            📊 Breakdown by Product Type:
                          </div>
                          <div className="wip-stepper-card">
                            {deptDetailData.map((product, index) => {
                              const totalBatches = product.stageCounts.reduce((sum, val) => sum + val, 0);
                              const isLast = index === deptDetailData.length - 1;
                              
                              return (
                                <div key={product.key}>
                                  <div className="wip-stepper-header" style={{ borderLeftColor: deptColor }}>
                                    <h3 className="wip-stepper-title">{product.jenisSediaan}</h3>
                                    <div className="wip-stepper-total">
                                      <span className="stepper-total-label">Queues:</span>
                                      <span className="stepper-total-value" style={{ color: deptColor }}>
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
                                        const isLastStage = stageIndex === product.stages.length - 1;
                                        
                                        return (
                                          <div key={`stage-${stageIndex}`} className="stepper-item">
                                            <div style={{
                                              fontSize: '0.75rem',
                                              color: batchCount > 0 ? '#6b7280' : '#9ca3af',
                                              fontWeight: '600',
                                              marginBottom: '4px',
                                              textAlign: 'center',
                                              minHeight: '16px',
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
                                              {!isLastStage && <div className="stepper-line"></div>}
                                            </div>
                                            <div className="stepper-label">{stage}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  {!isLast && (
                                    <div style={{
                                      borderBottom: '1px solid #e5e7eb',
                                      margin: '0 12px',
                                    }}></div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PCT Breakdown Section */}
        <section className="production-section">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px', 
            marginBottom: '16px' 
          }}>
            <h2 className="section-title" style={{ margin: 0 }}>Product Cycle Time (PCT) Breakdown</h2>
            <h2 className="section-title" style={{ margin: 0 }}>Production Target</h2>
          </div>
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
                {Object.keys(pctData).length > 0 ? (
                  <Bar data={pctChartData} options={pctOptions} />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    color: '#9ca3af',
                    fontSize: '0.9rem'
                  }}>
                    Loading PCT data...
                  </div>
                )}
              </div>
            </div>
            <div className="pct-placeholder-card">
              <div style={{ width: '100%' }}>
                <div className="pct-description">
                  <p>Monthly achievement tracking with dual-axis visualization</p>
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    📈 Comparing actual production against forecasted targets
                  </small>
                </div>
                
                {forecastData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
                    <p style={{ fontSize: '0.9rem' }}>Loading forecast data...</p>
                  </div>
                ) : (
                  <div className="pct-chart-container">
                    <Bar data={forecastChartData} options={forecastChartOptions} />
                  </div>
                )}
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
                        {batch.jenisSediaan && selectedStageData.jenisSediaan === 'All Products' && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: selectedStageData.color,
                            fontWeight: '600',
                            marginTop: '4px',
                            padding: '2px 8px',
                            background: `${selectedStageData.color}15`,
                            borderRadius: '4px',
                            display: 'inline-block',
                          }}>
                            {batch.jenisSediaan}
                          </div>
                        )}
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

      {/* PCT Stage Details Modal */}
      <Modal
        open={pctModalOpen}
        onClose={() => setPctModalOpen(false)}
        title={selectedPctStage ? `${selectedPctStage.stageName} Stage Details` : ''}
      >
        {selectedPctStage && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Summary Card */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>
                    AVERAGE DURATION
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2563eb' }}>
                    {selectedPctStage.averageDays} days
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>
                    TOTAL BATCHES
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2563eb' }}>
                    {selectedPctStage.batches.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Batch List */}
            <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#6b7280' }}>
              BATCHES (sorted by duration)
            </div>
            
            {selectedPctStage.batches.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: '#9ca3af',
                fontSize: '0.9rem',
              }}>
                No batch data available for this stage
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedPctStage.batches.map((batch, index) => {
                  // Color coding based on duration vs average
                  const isAboveAverage = batch.stageDays > selectedPctStage.averageDays;
                  const borderColor = isAboveAverage ? '#ef4444' : '#10b981';
                  const bgColor = isAboveAverage ? '#fef2f2' : '#f0fdf4';
                  
                  return (
                    <div
                      key={`${batch.Batch_No}-${index}`}
                      style={{
                        backgroundColor: bgColor,
                        border: `1px solid ${borderColor}40`,
                        borderLeft: `4px solid ${borderColor}`,
                        borderRadius: '8px',
                        padding: '12px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2c3e50' }}>
                            Batch: {batch.Batch_No}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                            Product: {batch.Product_Name}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: borderColor,
                        }}>
                          {batch.stageDays} days
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '8px',
                        fontSize: '0.75rem',
                        paddingTop: '8px',
                        borderTop: '1px solid #e5e7eb',
                      }}>
                        <div>
                          <span style={{ color: '#9ca3af' }}>Product ID:</span>
                          <span style={{ marginLeft: '6px', color: '#374151', fontWeight: '500' }}>
                            {batch.Product_ID}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>Batch Date:</span>
                          <span style={{ marginLeft: '6px', color: '#374151', fontWeight: '500' }}>
                            {batch.Batch_Date}
                          </span>
                        </div>
                      </div>
                      
                      {/* Difference from average indicator */}
                      <div style={{ 
                        marginTop: '8px', 
                        fontSize: '0.7rem', 
                        color: borderColor,
                        fontWeight: '600',
                      }}>
                        {isAboveAverage 
                          ? `+${batch.stageDays - selectedPctStage.averageDays} days above average`
                          : batch.stageDays === selectedPctStage.averageDays
                          ? 'At average duration'
                          : `${selectedPctStage.averageDays - batch.stageDays} days below average`
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Production Target Details Modal */}
      <Modal
        open={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        title={selectedTargetData ? `Production Target - ${selectedTargetData.monthName} (${selectedTargetData.periode})` : ''}
      >
        {selectedTargetData && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Summary Card */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Total Target
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4f8cff' }}>
                    {selectedTargetData.totalTarget.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>units</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Total Production
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                    {selectedTargetData.totalProduction.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>units</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Achievement
                  </div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: selectedTargetData.overallAchievement >= 100 ? '#10b981' : 
                           selectedTargetData.overallAchievement >= 80 ? '#f59e0b' : '#ef4444'
                  }}>
                    {selectedTargetData.overallAchievement}%
                  </div>
                </div>
              </div>
            </div>

            {/* Product List */}
            <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#6b7280' }}>
              PRODUCTS WITH PRODUCTION TARGET ({selectedTargetData.products.length} items)
            </div>
            
            {selectedTargetData.products.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: '#9ca3af',
                fontSize: '0.9rem',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                <p>All products have sufficient stock. No production needed.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedTargetData.products.map((product, index) => {
                  const achievementColor = product.achievement >= 100 ? '#10b981' : 
                                          product.achievement >= 80 ? '#f59e0b' : '#ef4444';
                  const achievementBg = product.achievement >= 100 ? '#f0fdf4' : 
                                       product.achievement >= 80 ? '#fffbeb' : '#fef2f2';
                  
                  return (
                    <div
                      key={`${product.productId}-${index}`}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${achievementColor}`,
                        borderRadius: '8px',
                        padding: '12px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                          {product.productId} - {product.productName}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          backgroundColor: achievementBg,
                          color: achievementColor,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}>
                          {product.achievement}% Achievement
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '12px',
                        fontSize: '0.75rem',
                        paddingTop: '12px',
                        borderTop: '1px solid #e5e7eb',
                      }}>
                        <div>
                          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Forecast</div>
                          <div style={{ fontWeight: '600', color: '#374151' }}>
                            {product.forecast.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Stock</div>
                          <div style={{ fontWeight: '600', color: '#374151' }}>
                            {product.stockRelease.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Target</div>
                          <div style={{ fontWeight: '700', color: '#4f8cff' }}>
                            {product.target.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Production</div>
                          <div style={{ fontWeight: '700', color: achievementColor }}>
                            {product.production.toLocaleString()}
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

export default TestingDashboard;

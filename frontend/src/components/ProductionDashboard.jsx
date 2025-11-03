import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import html2canvas from 'html2canvas';
import DashboardLoading from './DashboardLoading';
import Sidebar from './Sidebar';
import Modal from './Modal';
import { apiUrl } from '../api';
import './ProductionDashboard.css';

// Don't register ChartDataLabels globally - it will be added per-chart basis
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

// Animated Donut Chart with Callout Labels Component
const AnimatedDonutWithCallouts = ({ data, onSliceClick, batchCount, averageTotalDays }) => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#9ca3af',
        fontSize: '0.9rem'
      }}>
        Loading PCT stage data...
      </div>
    );
  }

  const stageNames = Object.keys(data);
  const stageValues = Object.values(data);
  const total = stageValues.reduce((sum, val) => sum + val, 0);
  
  // Colors for each stage
  const colors = [
    { bg: 'rgba(79, 140, 255, 0.8)', border: '#4f8cff' },     // Timbang - Blue
    { bg: 'rgba(147, 51, 234, 0.8)', border: '#9333ea' },      // Proses - Purple
    { bg: 'rgba(56, 230, 197, 0.8)', border: '#38e6c5' },      // QC - Teal
    { bg: 'rgba(255, 179, 71, 0.8)', border: '#ffb347' },      // Mikro - Orange
    { bg: 'rgba(229, 115, 115, 0.8)', border: '#e57373' },     // QA - Red
  ];

  // Calculate slice data
  let currentAngle = -90; // Start at top
  const slices = stageNames.map((name, index) => {
    const value = stageValues[index];
    const percentage = (value / total) * 100;
    const sweepAngle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    
    currentAngle = endAngle;
    
    return {
      name,
      value,
      percentage,
      startAngle,
      endAngle,
      midAngle,
      color: colors[index] || colors[0]
    };
  });

  // Chart dimensions
  const size = 300; // Compact size
  const center = size / 2;
  const outerRadius = 70;
  const innerRadius = 49; // 70% cutout
  const labelRadius = outerRadius + 35; // Closer to donut

  // Helper to convert polar to cartesian
  const polarToCartesian = (angle, radius) => {
    const rads = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rads),
      y: center + radius * Math.sin(rads)
    };
  };

  // Smart label positioning - avoid far right extensions
  const getSmartLabelPosition = (midAngle) => {
    // Since we start at -90° (top), normalize the angle
    // -90° to 90° is right side, 90° to 270° (or -90° to -270°) is left side
    
    // Right side: angles from -90° to 90°
    if (midAngle >= -90 && midAngle <= 90) {
      // Far right (near horizontal): 30° to 60° - use compact
      if (midAngle >= 30 && midAngle <= 60) {
        return {
          side: 'right-compact',
          textAnchor: 'start',
          lineExtension: 15
        };
      }
      // Normal right side
      return {
        side: 'right',
        textAnchor: 'start',
        lineExtension: 20
      };
    }
    // Left side: angles from 90° to 270° or -270° to -90°
    else {
      // Far left (near horizontal): 120° to 150° or -240° to -210°
      if ((midAngle >= 120 && midAngle <= 150) || (midAngle >= -240 && midAngle <= -210)) {
        return {
          side: 'left-compact',
          textAnchor: 'end',
          lineExtension: 15
        };
      }
      // Normal left side
      return {
        side: 'left',
        textAnchor: 'end',
        lineExtension: 20
      };
    }
  };

  // Create SVG path for donut slice
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
    <div style={{ position: 'relative', width: '100%', height: '300px', overflow: 'visible' }}>
      <svg 
        width={size} 
        height={size} 
        style={{ 
          position: 'absolute', 
          left: 'calc(50% - 20px)', // Shifted 20px to the left
          top: '50%',
          transform: 'translate(-50%, -50%)',
          overflow: 'visible'
        }}
      >
        {/* Draw donut slices */}
        {slices.map((slice, index) => (
          <g key={index}>
            {/* Slice */}
            <path
              d={createSlicePath(slice)}
              fill={slice.color.bg}
              stroke={slice.color.border}
              strokeWidth="2"
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                opacity: animated ? 1 : 0,
                transform: animated ? 'scale(1)' : 'scale(0)',
                transformOrigin: `${center}px ${center}px`,
                transitionDelay: `${index * 0.1}s`
              }}
              onMouseEnter={(e) => {
                e.target.style.filter = 'brightness(1.1)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.filter = 'brightness(1)';
                e.target.style.transform = 'scale(1)';
              }}
              onClick={() => onSliceClick && onSliceClick(slice.name)}
            />
            
            {/* Leader line */}
            {(() => {
              const midPoint = polarToCartesian(slice.midAngle, outerRadius + 5);
              const labelPoint = polarToCartesian(slice.midAngle, labelRadius);
              const labelPos = getSmartLabelPosition(slice.midAngle);
              
              const horizontalEnd = {
                x: labelPoint.x + (labelPos.textAnchor === 'start' ? labelPos.lineExtension : -labelPos.lineExtension),
                y: labelPoint.y
              };
              
              return (
                <>
                  {/* Curved line from slice to label */}
                  <path
                    d={`M ${midPoint.x} ${midPoint.y} L ${labelPoint.x} ${labelPoint.y} L ${horizontalEnd.x} ${horizontalEnd.y}`}
                    stroke={slice.color.border}
                    strokeWidth="1.5"
                    fill="none"
                    style={{
                      strokeDasharray: animated ? 'none' : '1000',
                      strokeDashoffset: animated ? '0' : '1000',
                      transition: 'stroke-dashoffset 0.8s ease',
                      transitionDelay: `${0.5 + index * 0.1}s`
                    }}
                  />
                  
                  {/* End point circle */}
                  <circle
                    cx={horizontalEnd.x}
                    cy={horizontalEnd.y}
                    r="3"
                    fill={slice.color.border}
                    style={{
                      opacity: animated ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                      transitionDelay: `${0.8 + index * 0.1}s`
                    }}
                  />
                  
                  {/* Label text */}
                  <text
                    x={horizontalEnd.x + (labelPos.textAnchor === 'start' ? 8 : -8)}
                    y={horizontalEnd.y - 8}
                    textAnchor={labelPos.textAnchor}
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      fill: '#374151',
                      opacity: animated ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                      transitionDelay: `${0.8 + index * 0.1}s`
                    }}
                  >
                    {slice.name}
                  </text>
                  
                  {/* Value text */}
                  <text
                    x={horizontalEnd.x + (labelPos.textAnchor === 'start' ? 8 : -8)}
                    y={horizontalEnd.y + 5}
                    textAnchor={labelPos.textAnchor}
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      fill: slice.color.border,
                      opacity: animated ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                      transitionDelay: `${0.8 + index * 0.1}s`
                    }}
                  >
                    {slice.value}d
                  </text>
                  
                  {/* Percentage text */}
                  <text
                    x={horizontalEnd.x + (labelPos.textAnchor === 'start' ? 8 : -8)}
                    y={horizontalEnd.y + 18}
                    textAnchor={labelPos.textAnchor}
                    style={{
                      fontSize: '11px',
                      fill: '#9ca3af',
                      opacity: animated ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                      transitionDelay: `${0.8 + index * 0.1}s`
                    }}
                  >
                    ({slice.percentage.toFixed(1)}%)
                  </text>
                </>
              );
            })()}
          </g>
        ))}
      </svg>
      
      {/* Center text */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 'calc(50% - 20px)', // Shifted 20px to the left to match donut
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        opacity: animated ? 1 : 0,
        transition: 'opacity 0.5s ease',
        transitionDelay: '0.3s'
      }}>
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: 'bold', 
          color: '#374151',
          lineHeight: '1'
        }}>
          {averageTotalDays !== undefined ? averageTotalDays : total}
        </div>
        <div style={{ 
          fontSize: '0.7rem', 
          color: '#6b7280',
          marginTop: '4px'
        }}>
          Total Days
        </div>
        {batchCount !== undefined && (
          <div style={{ 
            fontSize: '0.65rem', 
            color: '#9ca3af',
            marginTop: '4px',
            fontWeight: '500'
          }}>
            {batchCount} batches
          </div>
        )}
      </div>
    </div>
  );
};

// Department colors for headers
const deptColors = {
  'PN1': '#4f8cff',
  'PN2': '#9333ea',
};

// Stage priority order (lower number = displayed first)
const stagePriority = {
  'Timbang': 1,
  'Terima Bahan': 2,
  'Mixing': 3,
  'Granulasi': 4,
  'Cetak': 5,
  'Filling': 6,
  'Coating': 7,
  'Kemas Primer': 8,
  'Kemas Sekunder': 9,
  'QC': 10,
  'Mikro': 11,
  'QA': 12,
};

// Helper function to get stage priority (default to 999 for unknown stages)
const getStagePriority = (stageName) => {
  return stagePriority[stageName] || 999;
};

// Helper function to get stage thresholds based on department and stage
const getStageThresholds = (dept, stageName) => {
  const thresholds = {
    'PN1': {
      'Timbang': { min: 6, med: 11, max: 14 },
      'Proses': { min: 5, med: 10, max: 15 },
      'Kemas Primer': { min: 2, med: 4, max: 6 },
      'Kemas Sekunder': { min: 3, med: 5, max: 7 },
      'QC': { min: 2, med: 6, max: 14 },
      'Mikro': { min: 4, med: 13, max: 27 },
      'QA': { min: 5, med: 10, max: 15 },
    },
    'PN2': {
      'Timbang': { min: 6, med: 11, max: 14 },
      'Proses': { min: 36, med: 46, max: 56 },
      'Kemas Primer': { min: 12, med: 16, max: 20 },
      'Kemas Sekunder': { min: 9, med: 14, max: 19 },
      'QC': { min: 2, med: 6, max: 14 },
      'Mikro': { min: 4, med: 13, max: 27 },
      'QA': { min: 5, med: 10, max: 15 },
    }
  };
  
  // Return thresholds for the specific dept and stage, or default values
  return thresholds[dept]?.[stageName] || { min: 5, med: 10, max: 15 };
};

// Helper function to get color based on batch count with custom thresholds
const getQueueColor = (batchCount, dept, stageName) => {
  if (batchCount === 0) {
    return '#10b981'; // Dark green - no queue
  }
  
  const thresholds = getStageThresholds(dept, stageName);
  const { min, med, max } = thresholds;
  
  // Calculate midpoints for color transitions
  const minMidpoint = min / 2; // Midpoint between 0 and min (dark green to lime green)
  const medMidpoint = (min + med) / 2; // Midpoint between min and med (lime to yellow)
  const maxMidpoint = (med + max) / 2; // Midpoint between med and max (yellow to light red)
  
  if (batchCount <= minMidpoint) {
    return '#22c55e'; // Light green - minimal queue
  } else if (batchCount <= min) {
    return '#84cc16'; // Lime green - approaching min threshold
  } else if (batchCount <= medMidpoint) {
    return '#eab308'; // Yellow - between min and med
  } else if (batchCount <= med) {
    return '#f59e0b'; // Orange - approaching med threshold
  } else if (batchCount <= maxMidpoint) {
    return '#f97316'; // Deep orange - between med and max
  } else if (batchCount <= max) {
    return '#ef4444'; // Light red - approaching max threshold
  } else {
    return '#dc2626'; // Deep red - exceeds max threshold (critical)
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

// Helper function to calculate days in stage from batch date
const calculateDaysInStage = (entries, stageName = '') => {
  if (!entries || entries.length === 0) return 0;
  
  // Special logic for QA stage
  if (stageName === 'QA') {
    const requiredQASteps = [
      'Cek Dokumen PC oleh QA',
      'Cek Dokumen PN oleh QA',
      'Cek Dokumen MC oleh QA',
      'Cek Dokumen QC oleh QA'
    ];
    
    // Find all the required QA steps that have IdleStartDate
    const qaStepsWithIdleDate = entries.filter(entry => 
      requiredQASteps.includes(entry.nama_tahapan) && entry.IdleStartDate
    );
    
    // Check if all 4 required steps have IdleStartDate
    const allRequiredStepsStarted = requiredQASteps.every(stepName =>
      qaStepsWithIdleDate.some(entry => entry.nama_tahapan === stepName)
    );
    
    // If not all 4 steps have started, return null (will show "Not Started")
    if (!allRequiredStepsStarted) {
      return null;
    }
    
    // Find the LATEST IdleStartDate among the 4 required steps
    let latestIdleDate = null;
    qaStepsWithIdleDate.forEach(entry => {
      if (requiredQASteps.includes(entry.nama_tahapan)) {
        const idleDate = new Date(entry.IdleStartDate);
        if (!latestIdleDate || idleDate > latestIdleDate) {
          latestIdleDate = idleDate;
        }
      }
    });
    
    if (!latestIdleDate) return null;
    
    // Calculate days from the latest IdleStartDate to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    latestIdleDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - latestIdleDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
  
  // Default logic for all other stages - use earliest IdleStartDate
  let earliestIdleDate = null;
  entries.forEach(entry => {
    if (entry.IdleStartDate) {
      const idleDate = new Date(entry.IdleStartDate);
      if (!earliestIdleDate || idleDate < earliestIdleDate) {
        earliestIdleDate = idleDate;
      }
    }
  });
  
  if (!earliestIdleDate) return 0;
  
  // Normalize both dates to start of day (midnight) to avoid time-of-day issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  earliestIdleDate.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const diffTime = today - earliestIdleDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Ensure we never return negative values (if start date is today or in future, return 0)
  return Math.max(0, diffDays);
};

// Get earliest IdleStartDate from entries and format it
const getEarliestIdleStartDate = (entries) => {
  if (!entries || entries.length === 0) return '';
  
  let earliestIdleDate = null;
  entries.forEach(entry => {
    if (entry.IdleStartDate) {
      const idleDate = new Date(entry.IdleStartDate);
      if (!earliestIdleDate || idleDate < earliestIdleDate) {
        earliestIdleDate = idleDate;
      }
    }
  });
  
  if (!earliestIdleDate) return '';
  
  // Format as DD/MM/YYYY
  return earliestIdleDate.toLocaleDateString('en-GB');
};

// Speedometer Component
const Speedometer = ({ label, value, maxValue = 50, color = '#4f8cff', animated = false, avgDays = 0, dept = 'PN1', stageName = 'Timbang' }) => {
  // Get custom thresholds for this dept and stage (for determining the needle color)
  const thresholds = getStageThresholds(dept, stageName);
  const { min, med, max } = thresholds;
  
  // Determine needle color based on actual value and custom thresholds
  const needleColor = value > 0 ? getQueueColor(value, dept, stageName) : '#9ca3af';
  
  // Calculate needle position to align with the fixed visual zones
  // Visual zones: 0-20% green, 20-40% yellow, 40-60% orange, 60-100% red
  // Map thresholds to visual positions:
  // - min maps to ~20% of gauge (36° on 180° scale = -90 + 36 = -54°)
  // - med maps to ~40% of gauge (72° on 180° scale = -90 + 72 = -18°)  
  // - max maps to ~60% of gauge (108° on 180° scale = -90 + 108 = 18°)
  
  let needleAngle;
  if (value === 0) {
    needleAngle = -90; // Start position
  } else if (value <= min) {
    // Map 0 to min across first 20% of gauge (green zone: -90° to -54°)
    needleAngle = -90 + (value / min) * 36;
  } else if (value <= med) {
    // Map min to med across next 20% of gauge (yellow zone: -54° to -18°)
    const ratio = (value - min) / (med - min);
    needleAngle = -54 + ratio * 36;
  } else if (value <= max) {
    // Map med to max across next 20% of gauge (orange zone: -18° to 18°)
    const ratio = (value - med) / (max - med);
    needleAngle = -18 + ratio * 36;
  } else {
    // Beyond max: map across remaining 40% (red zone: 18° to 90°)
    // Cap at 2x max to prevent needle going off-scale
    const excess = Math.min(value - max, max);
    const ratio = excess / max;
    needleAngle = 18 + ratio * 72;
  }
  
  // Fixed visual segments - evenly distributed for consistent appearance
  // Greenish zone: 20% (0-10 on a 50 scale)
  // Yellowish zone: 20% (10-20 on a 50 scale)
  // Orange zone: 20% (20-30 on a 50 scale)
  // Red/Critical zone: 40% (30-50 on a 50 scale)
  const fixedSegments = [
    { size: maxValue * 0.10, color: '#22c55e', label: 'Optimal' },           // 10% - Light green
    { size: maxValue * 0.10, color: '#84cc16', label: 'Good' },              // 10% - Lime green
    { size: maxValue * 0.10, color: '#eab308', label: 'Moderate' },          // 10% - Yellow
    { size: maxValue * 0.10, color: '#f59e0b', label: 'Elevated' },          // 10% - Orange
    { size: maxValue * 0.10, color: '#f97316', label: 'High' },              // 10% - Deep orange
    { size: maxValue * 0.10, color: '#ef4444', label: 'Very High' },         // 10% - Light red
    { size: maxValue * 0.40, color: '#dc2626', label: 'Critical' },          // 40% - Deep red
  ];
  
  // Build segments for the gauge
  const segments = [];
  const segmentLabels = [];
  const segmentColors = [];
  const segmentBorders = [];
  
  fixedSegments.forEach((segment) => {
    segments.push(segment.size);
    segmentLabels.push(segment.label);
    segmentColors.push(segment.color);
    segmentBorders.push(segment.color);
  });
  
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
            return `${context.label} range`;
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
              backgroundColor: needleColor,
              transformOrigin: 'bottom center',
              transform: animated 
                ? `translateX(-50%) rotate(${needleAngle}deg)`
                : 'translateX(-50%) rotate(-90deg)',
              transition: animated ? 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              borderRadius: '2px 2px 0 0',
              zIndex: 10,
              boxShadow: value > 0 ? `0 0 6px ${needleColor}` : 'none',
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
              backgroundColor: needleColor,
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
              color: needleColor,
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
          fontSize: '1rem',
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

const ProductionDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [rawWipData, setRawWipData] = useState([]);
  const [processedWipData, setProcessedWipData] = useState([]);
  const [overallDeptData, setOverallDeptData] = useState([]); // Overall dept-level data
  const [pctData, setPctData] = useState({});
  const [pctRawData, setPctRawData] = useState([]); // Store raw batch-level PCT data
  const [pctDeptData, setPctDeptData] = useState({}); // Store PCT department distribution
  const [avgTotalDays, setAvgTotalDays] = useState(0); // Average total days from start to finish (for display only)
  const [pctPeriod, setPctPeriod] = useState('MTD'); // 'MTD' or 'YTD' for PCT breakdown
  const [showPctVignette, setShowPctVignette] = useState(false); // Show vignette when switching from empty MTD to YTD
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if this is the first load
  const [forecastData, setForecastData] = useState([]); // Store forecast vs production data
  const [forecastRawData, setForecastRawData] = useState([]); // Store raw forecast data for detailed view
  const [productCategories, setProductCategories] = useState({}); // Store product categories (Generik, OTC, ETH)
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
  const [lastRefreshTime, setLastRefreshTime] = useState(null); // Track last data refresh time
  const [exportModalOpen, setExportModalOpen] = useState(false); // WIP Excel export modal
  const [exportSettings, setExportSettings] = useState({
    line: 'both', // 'PN1', 'PN2', or 'both'
    stage: 'All' // 'Timbang', 'Proses', 'Kemas Primer', 'Kemas Sekunder', 'QC', 'Mikro', 'QA', or 'All'
  });

  // Chart refs for PowerPoint export
  const forecastChartRef = useRef(null);
  const pctBarChartRef = useRef(null);
  const pctDonutRef = useRef(null);
  const wipPN1ChartRef = useRef(null);
  const wipPN2ChartRef = useRef(null);

  // Process raw WIP data according to business rules
  const processWIPData = (rawData) => {
    if (!rawData || rawData.length === 0) return [];

    // Step 1: Filter out batches that have completed "Tempel Label Realese"
    const batchesWithTempelLabelRelease = new Set();
    rawData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const activeBatches = rawData.filter(entry => 
      !batchesWithTempelLabelRelease.has(entry.Batch_No)
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

          // Special check for QA stage - only include if all 4 required steps have started
          if (stageName === 'QA') {
            const requiredQASteps = [
              'Cek Dokumen PC oleh QA',
              'Cek Dokumen PN oleh QA',
              'Cek Dokumen MC oleh QA',
              'Cek Dokumen QC oleh QA'
            ];
            
            // Check if all 4 required steps have IdleStartDate
            const qaStepsWithIdleDate = entries.filter(entry => 
              requiredQASteps.includes(entry.nama_tahapan) && entry.IdleStartDate
            );
            
            const allRequiredStepsStarted = requiredQASteps.every(stepName =>
              qaStepsWithIdleDate.some(entry => entry.nama_tahapan === stepName)
            );
            
            // Only include in QA stage if all 4 steps have started
            if (!allRequiredStepsStarted) {
              return; // Skip this batch for QA count
            }
          }

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
      'Terima Bahan': 'Proses',
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
    const batchesWithTempelLabelRelease = new Set();
    rawData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const activeBatches = rawData.filter(entry => 
      !batchesWithTempelLabelRelease.has(entry.Batch_No)
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
          const hasDisplayFlag = entries.some(e => e.Display === '1' || e.Display === 1);

          // Special check for QA stage - only include if all 4 required steps have started
          if (stageName === 'QA') {
            const requiredQASteps = [
              'Cek Dokumen PC oleh QA',
              'Cek Dokumen PN oleh QA',
              'Cek Dokumen MC oleh QA',
              'Cek Dokumen QC oleh QA'
            ];
            
            // Check if all 4 required steps have IdleStartDate
            const qaStepsWithIdleDate = entries.filter(entry => 
              requiredQASteps.includes(entry.nama_tahapan) && entry.IdleStartDate
            );
            
            const allRequiredStepsStarted = requiredQASteps.every(stepName =>
              qaStepsWithIdleDate.some(entry => entry.nama_tahapan === stepName)
            );
            
            // Only include in QA stage if all 4 steps have started
            if (!allRequiredStepsStarted) {
              return; // Skip this batch for QA count
            }
          }

          // Include batch if:
          // 1. It has StartDate AND missing EndDate (traditional in-progress), OR
          // 2. It has Display = '1' (scheduled/planned)
          if ((hasStartDate && hasMissingEndDate) || hasDisplayFlag) {
            stage.batchesInProgress.add(batchNo);
            
            // Only calculate duration if there's an actual StartDate
            if (hasStartDate) {
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
            // If Display = '1' but no StartDate, we don't add to batchDurations
            // This will show "Not Started" in the UI
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
      'Proses': ['Terima Bahan', 'Mixing', 'Filling', 'Granulasi', 'Cetak', 'Coating'],
      'Kemas Primer': ['Kemas Primer'],
      'Kemas Sekunder': ['Kemas Sekunder'],
      'QC': ['QC'],
      'Mikro': ['Mikro'],
      'QA': ['QA'],
    };

    const originalStages = stageMapping[condensedStageName] || [];

    // Filter raw data for this dept and any of the original stages
    const batchesWithTempelLabelRelease = new Set();
    rawWipData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const stageEntries = rawWipData.filter(entry => {
      const entryDept = entry.Group_Dept || 'Unknown';
      const entryTahapanGroup = entry.tahapan_group || 'Other';
      
      return entryDept === dept 
        && originalStages.includes(entryTahapanGroup)
        && entryTahapanGroup !== 'Other'
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
          productName: entry.Product_Name,
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

    // Filter to only show batches in progress or scheduled (Display = '1')
    const activeBatches = Object.values(batchDetails).filter(
      batch => (batch.hasStartDate && batch.hasMissingEndDate) || batch.hasDisplayFlag
    );

    // Add daysInStage to each batch and sort by longest duration first
    // For Display='1' batches, days will be calculated from IdleStartDate
    const batchesWithDays = activeBatches.map(batch => ({
      ...batch,
      daysInStage: calculateDaysInStage(batch.entries, condensedStageName),
      stageStart: getEarliestIdleStartDate(batch.entries)
    })).sort((a, b) => {
      // Handle null values (Not Started) - sort them to the end
      if (a.daysInStage === null && b.daysInStage === null) return 0;
      if (a.daysInStage === null) return 1;
      if (b.daysInStage === null) return -1;
      return b.daysInStage - a.daysInStage;
    });

    setSelectedStageData({
      dept,
      jenisSediaan: 'All Products', // Indicate this is for all products
      stageName: condensedStageName,
      batches: batchesWithDays,
      color: deptColors[dept] || '#4f8cff',
    });
    setModalOpen(true);
  };

  // Toggle expansion (both PN1 and PN2 together)
  const toggleExpansion = () => {
    setIsExpanded(prev => !prev);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Product List and OTC Products for categorization
      const [productListResponse, otcProductsResponse] = await Promise.all([
        fetch(apiUrl('/api/productList')),
        fetch(apiUrl('/api/otcProducts'))
      ]);

      if (!productListResponse.ok || !otcProductsResponse.ok) {
        throw new Error('Error fetching product category data');
      }

      const productListData = await productListResponse.json();
      const otcProductsData = await otcProductsResponse.json();

      const productList = productListData.data || [];
      const otcProducts = otcProductsData.data || [];

      // Create a Set of OTC product IDs for quick lookup
      const otcProductIds = new Set(otcProducts.map(p => p.Product_ID));

      // Categorize products
      const categories = {};
      productList.forEach(product => {
        const productId = product.Product_ID;
        const productName = (product.Product_Name || '').toLowerCase();

        if (otcProductIds.has(productId)) {
          categories[productId] = 'OTC';
        } else if (productName.includes('generik') || productName.includes('generic')) {
          categories[productId] = 'Generik';
        } else {
          categories[productId] = 'ETH';
        }
      });

      setProductCategories(categories);

      // Fetch Product Group Dept data
      const groupDeptResponse = await fetch(apiUrl('/api/productGroupDept'));
      if (!groupDeptResponse.ok) {
        throw new Error(`Group Dept API error! status: ${groupDeptResponse.status}`);
      }
      
      const groupDeptResult = await groupDeptResponse.json();
      const groupDeptData = groupDeptResult.data || [];
      
      // Create a mapping of Product_ID to Group_Dept
      const productDeptMap = {};
      groupDeptData.forEach(item => {
        productDeptMap[item.Group_ProductID] = item.Group_Dept;
      });

      // Fetch PCT Breakdown data with period parameter
      const pctResponse = await fetch(apiUrl(`/api/pctBreakdown?period=${pctPeriod}`));
      if (!pctResponse.ok) {
        throw new Error(`PCT API error! status: ${pctResponse.status}`);
      }
      
      const pctResult = await pctResponse.json();
      const pctBatchData = pctResult.data || [];
      
      setPctRawData(pctBatchData);
      
      // Calculate average total days from Total_Days field
      const totalDaysValues = pctBatchData
        .map(batch => batch.Total_Days)
        .filter(val => val !== null && val !== undefined && !isNaN(val));
      
      const calculatedAvgTotalDays = totalDaysValues.length > 0
        ? Math.round(totalDaysValues.reduce((sum, val) => sum + val, 0) / totalDaysValues.length)
        : 0;
      
      setAvgTotalDays(calculatedAvgTotalDays);
      
      // Calculate PCT stage averages
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
        
        // Calculate department distribution
        const deptCounts = {};
        let totalBatches = 0;
        let totalPctDays = 0;
        
        pctBatchData.forEach(batch => {
          const dept = productDeptMap[batch.Product_ID] || 'Unknown';
          
          if (!deptCounts[dept]) {
            deptCounts[dept] = 0;
          }
          deptCounts[dept]++;
          totalBatches++;
          
          const batchTotal = (batch.Timbang_Days || 0) + 
                           (batch.Proses_Days || 0) + 
                           (batch.QC_Days || 0) + 
                           (batch.Mikro_Days || 0) + 
                           (batch.QA_Days || 0);
          totalPctDays += batchTotal;
        });
        
        const avgTotalPct = totalBatches > 0 ? Math.round(totalPctDays / totalBatches) : 0;
        
        setPctDeptData({
          departments: deptCounts,
          totalBatches,
          avgTotalPct
        });
      } else {
        setPctData({
          Timbang: 0,
          Proses: 0,
          QC: 0,
          Mikro: 0,
          QA: 0,
        });
        setPctDeptData({
          departments: {},
          totalBatches: 0,
          avgTotalPct: 0
        });
      }

      // Fetch WIP data
      const wipResponse = await fetch(apiUrl('/api/wipData'));
      if (!wipResponse.ok) {
        throw new Error(`WIP API error! status: ${wipResponse.status}`);
      }

      const wipResult = await wipResponse.json();
      let wipRawData = wipResult.data || [];
      
      // Fetch released batches from t_dnc_product
      const releasedBatchesResponse = await fetch(apiUrl('/api/releasedBatches'));
      if (!releasedBatchesResponse.ok) {
        throw new Error(`Released Batches API error! status: ${releasedBatchesResponse.status}`);
      }
      
      const releasedBatchesResult = await releasedBatchesResponse.json();
      const releasedBatches = releasedBatchesResult.data || [];
      
      const releasedBatchSet = new Set(releasedBatches.map(rb => rb.DNc_BatchNo));
      
      // Filter out released batches
      wipRawData = wipRawData.filter(entry => !releasedBatchSet.has(entry.Batch_No));
      
      setRawWipData(wipRawData);

      // Process WIP data
      const processed = processWIPData(wipRawData);
      setProcessedWipData(processed);

      // Process overall department data
      const overallDept = processOverallDeptData(wipRawData);
      setOverallDeptData(overallDept);

      // Fetch Forecast data
      const forecastResponse = await fetch(apiUrl('/api/forecast'));
      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error! status: ${forecastResponse.status}`);
      }

      const forecastResult = await forecastResponse.json();
      const forecastRawData = forecastResult || [];
      
      setForecastRawData(forecastRawData);
      
      // Process forecast data
      const processedForecast = processForecastData(forecastRawData, categories);
      setForecastData(processedForecast);
      
      setLoading(false);
      setLastRefreshTime(new Date());
      
      // Trigger speedometer animation
      setTimeout(() => {
        const animState = {};
        overallDept.forEach(dept => {
          animState[dept.dept] = true;
        });
        setSpeedometerAnimated(animState);
      }, 100);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle WIP Excel Export
  const handleExportWIP = () => {
    const { line, stage } = exportSettings;
    
    // Define stage mappings matching the WIP speedometer logic
    const stageMapping = {
      'Timbang': 'Timbang',
      'Terima Bahan': 'Proses',
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
    
    // Proses stages - all stages that map to "Proses"
    const prosesStages = Object.keys(stageMapping).filter(key => stageMapping[key] === 'Proses');
    const validStages = Object.keys(stageMapping); // All mapped stages are valid
    
    // Step 1: Filter out batches that have completed "Tempel Label Realese"
    const batchesWithTempelLabelRelease = new Set();
    rawWipData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
      }
    });

    const activeBatches = rawWipData.filter(entry => {
      const tahapanGroup = entry.tahapan_group || 'Other';
      return !batchesWithTempelLabelRelease.has(entry.Batch_No) && 
             tahapanGroup !== 'Other' && // Skip "Other" stages
             validStages.includes(tahapanGroup); // Only include mapped stages
    });

    // Step 2: Group entries by batch and stage to determine current stages
    const batchStageMap = {};
    
    activeBatches.forEach(entry => {
      const batchNo = entry.Batch_No;
      const dept = entry.Group_Dept;
      const tahapanGroup = entry.tahapan_group;
      
      // Map to condensed stage for grouping (matching speedometer logic)
      const condensedStage = stageMapping[tahapanGroup];
      if (!condensedStage) {
        return; // Skip if not in mapping
      }
      
      // Use condensed stage in key to group Proses substages together
      const key = `${batchNo}|${condensedStage}`;
      
      if (!batchStageMap[key]) {
        batchStageMap[key] = {
          batchNo: batchNo,
          productName: entry.Product_Name,
          dept: dept,
          stage: condensedStage, // Use condensed stage name
          originalStage: tahapanGroup, // Keep original for display
          batchDate: entry.Batch_Date,
          steps: [],
          originalStages: new Set(), // Track which substages are involved
          hasDisplayFlag: false,
        };
      }
      
      batchStageMap[key].steps.push({
        startDate: entry.StartDate,
        endDate: entry.EndDate,
        display: entry.Display,
        idleStartDate: entry.IdleStartDate,
        nama_tahapan: entry.nama_tahapan, // Include task name for QA logic
      });
      
      batchStageMap[key].originalStages.add(tahapanGroup);
      
      // Track if any entry has Display = '1'
      if (entry.Display === '1' || entry.Display === 1) {
        batchStageMap[key].hasDisplayFlag = true;
      }
    });
    
    // Step 3: Determine which batch-stage combinations are "in progress"
    const batchesInProgress = [];
    const currentDate = new Date();
    
    Object.values(batchStageMap).forEach(batchStage => {
      const { steps, hasDisplayFlag, stage } = batchStage;
      
      // Check if at least one step has StartDate
      const hasStartedStep = steps.some(step => step.startDate);
      
      // Check if ALL steps have EndDate (all completed)
      const allStepsCompleted = steps.every(step => step.endDate);
      
      // Batch is in this stage if:
      // 1. (at least one step started AND not all steps completed), OR
      // 2. Has Display = '1'
      if ((hasStartedStep && !allStepsCompleted) || hasDisplayFlag) {
        // Convert steps to entries format for calculateDaysInStage
        const entries = steps.map(step => ({
          IdleStartDate: step.idleStartDate,
          nama_tahapan: step.nama_tahapan,
        }));
        
        // Use the calculateDaysInStage function (handles QA special logic)
        const daysInStage = calculateDaysInStage(entries, stage);
        
        // Get the earliest IdleStartDate for start date display
        let startDateFormatted = '';
        const idleDates = steps
          .filter(step => step.idleStartDate)
          .map(step => parseSQLDateTime(step.idleStartDate))
          .filter(date => date !== null);
        
        if (idleDates.length > 0) {
          const earliestIdleDate = new Date(Math.min(...idleDates));
          startDateFormatted = earliestIdleDate.toLocaleDateString('en-GB');
        }
        
        batchesInProgress.push({
          batchNo: batchStage.batchNo,
          productName: batchStage.productName,
          dept: batchStage.dept,
          currentStage: batchStage.stage, // This is now the condensed stage (e.g., "Proses")
          originalStages: Array.from(batchStage.originalStages).join(', '), // Show all substages involved
          startDate: startDateFormatted,
          daysInStage: daysInStage,
          batchDate: batchStage.batchDate,
        });
      }
    });
    
    // Step 4: Filter by line (department)
    let excelData = [...batchesInProgress];
    if (line !== 'both') {
      excelData = excelData.filter(item => item.dept === line);
    }
    
    // Step 5: Filter by stage
    if (stage !== 'All') {
      // Now currentStage is already condensed (Proses, Timbang, etc.)
      excelData = excelData.filter(item => item.currentStage === stage);
    }
    
    // Step 6: Sort by Days in Stage (descending - highest first)
    excelData.sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0));
    
    // Step 7: Prepare final Excel data with reordered columns
    const finalExcelData = excelData.map(item => {
      const row = {
        'Product Name': item.productName || '',
        'Batch No': item.batchNo || '',
        'Stage': item.currentStage || '',
      };
      
      // Only add Substages column for Proses-only export
      if (stage === 'Proses') {
        row['Substages'] = item.originalStages || '';
      }
      
      row['Start Date'] = item.startDate || '';
      row['Days in Stage'] = item.daysInStage !== null ? item.daysInStage : 'Not Started';
      row['Batch Date'] = item.batchDate || '';
      
      // Only add Line column if both lines are selected
      if (line === 'both') {
        row['Line'] = item.dept || '';
      }
      
      return row;
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(finalExcelData);
    
    // Set column widths dynamically based on whether Substages column is included
    const colWidths = [
      { wch: 35 }, // Product Name (moved first)
      { wch: 15 }, // Batch No
      { wch: 18 }, // Stage
    ];
    
    // Add Substages column width only if showing Proses exclusively
    if (stage === 'Proses') {
      colWidths.push({ wch: 30 }); // Substages
    }
    
    colWidths.push({ wch: 15 }); // Start Date
    colWidths.push({ wch: 15 }); // Days in Stage
    colWidths.push({ wch: 15 }); // Batch Date
    
    if (line === 'both') {
      colWidths.push({ wch: 10 }); // Line
    }
    
    ws['!cols'] = colWidths;
    
    // Add AutoFilter to enable sorting and filtering
    if (finalExcelData.length > 0) {
      // Calculate last column based on what's included
      let lastColIndex = 6; // Base: Product Name, Batch No, Stage, Start Date, Days, Batch Date (6 columns)
      if (stage === 'Proses') lastColIndex++; // Add Substages
      if (line === 'both') lastColIndex++; // Add Line
      
      const lastCol = String.fromCharCode(64 + lastColIndex); // Convert to letter (A=1, B=2, etc.)
      ws['!autofilter'] = { ref: `A1:${lastCol}${finalExcelData.length + 1}` };
    }
    
    // Style the header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F8CFF" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "WIP Data");
    
    // Generate filename
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY
    const lineName = line === 'both' ? 'PN1 & PN2' : line;
    const stageName = stage;
    const filename = `Data WIP ${lineName} ${stageName} ${dateStr}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
    
    // Close modal
    setExportModalOpen(false);
  };

  // Handle PowerPoint Export
  const handleExportPowerPoint = async () => {
    const pptx = new pptxgen();
    
    // Set presentation properties
    pptx.author = 'LAPI Dashboard';
    pptx.company = 'LAPI';
    pptx.subject = 'Production Dashboard Report';
    pptx.title = 'Production Dashboard';
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    // Slide 1: Title Slide
    const slide1 = pptx.addSlide();
    slide1.background = { color: '4F8CFF' };
    slide1.addText('Production Dashboard Report', {
      x: 0.5, y: 2.0, w: 9, h: 1.5,
      fontSize: 44, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle'
    });
    slide1.addText(dateStr, {
      x: 0.5, y: 3.8, w: 9, h: 0.5,
      fontSize: 24, color: 'FFFFFF',
      align: 'center', valign: 'middle'
    });
    
    // Slide 2: Production Output
    const slide2 = pptx.addSlide();
    slide2.addText('Production Output', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: '2C3E50'
    });
    slide2.addText('Monthly production tracking on yearly basis', {
      x: 0.5, y: 0.85, w: 9, h: 0.3,
      fontSize: 12, color: '666666'
    });
    
    // Add forecast chart if available - 3:1 ratio, positioned higher
    if (forecastChartRef.current) {
      const chartImage = forecastChartRef.current.toBase64Image();
      slide2.addImage({
        data: chartImage,
        x: 1.25, y: 1.2, w: 7.5, h: 2.5
      });
    }
    
    // Add production breakdown table by category - split into two tables
    const forecastTableData1 = [
      [
        { text: 'Month', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'Total', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'OTC', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'Generik', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'ETH', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
      ]
    ];
    
    const forecastTableData2 = [
      [
        { text: 'Month', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'Total', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'OTC', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'Generik', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
        { text: 'ETH', options: { bold: true, fill: '4F8CFF', color: 'FFFFFF', fontSize: 9 } },
      ]
    ];
    
    forecastData.forEach((item, index) => {
      if (item.hasData) {
        // Calculate total production for this month
        const total = item.production;
        
        // Calculate percentages
        const otcPercentage = total > 0 ? ((item.productionOTC / total) * 100).toFixed(1) : 0;
        const generikPercentage = total > 0 ? ((item.productionGenerik / total) * 100).toFixed(1) : 0;
        const ethPercentage = total > 0 ? ((item.productionETH / total) * 100).toFixed(1) : 0;
        
        // Format numbers with thousand separators (dot separator for international format)
        const formatNumber = (num) => num.toLocaleString('id-ID');
        
        const rowData = [
          { text: item.monthName, options: { fontSize: 8 } },
          { text: formatNumber(item.production), options: { fontSize: 8 } },
          { text: `${formatNumber(item.productionOTC)} (${otcPercentage}%)`, options: { fontSize: 8 } },
          { text: `${formatNumber(item.productionGenerik)} (${generikPercentage}%)`, options: { fontSize: 8 } },
          { text: `${formatNumber(item.productionETH)} (${ethPercentage}%)`, options: { fontSize: 8 } },
        ];
        
        // Split: Jan-Jun (months 1-6) and Jul-Dec (months 7-12)
        if (item.month <= 6) {
          forecastTableData1.push(rowData);
        } else {
          forecastTableData2.push(rowData);
        }
      }
    });
    
    // First table (Jan-Jun) - left side
    slide2.addTable(forecastTableData1, {
      x: 0.7, y: 3.9, w: 4.5, h: 1.3,
      fontSize: 8,
      border: { pt: 1, color: 'CCCCCC' },
      align: 'center',
      valign: 'middle',
      rowH: 0.18,
      colW: [0.65, 0.65, 1.05, 1.05, 1.1]
    });
    
    // Second table (Jul-Dec) - right side
    slide2.addTable(forecastTableData2, {
      x: 5.3, y: 3.9, w: 4.5, h: 1.3,
      fontSize: 8,
      border: { pt: 1, color: 'CCCCCC' },
      align: 'center',
      valign: 'middle',
      rowH: 0.18,
      colW: [0.65, 0.65, 1.05, 1.05, 1.1]
    });
    
    // Slide 3: PCT Breakdown
    const slide3 = pptx.addSlide();
    slide3.addText('PCT Breakdown', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: '2C3E50'
    });
    slide3.addText('Average days for each stage in the production process (Month-to-date)', {
      x: 0.5, y: 0.85, w: 9, h: 0.3,
      fontSize: 12, color: '666666'
    });
    
    // Add PCT donut chart - create a Chart.js donut for export
    if (Object.keys(pctData).length > 0) {
      try {
        // Create a temporary canvas for donut chart
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        const stageNames = Object.keys(pctData);
        const stageValues = Object.values(pctData);
        const total = stageValues.reduce((sum, val) => sum + val, 0);
        
        // Colors matching the dashboard
        const colors = [
          'rgba(79, 140, 255, 0.8)',   // Timbang - Blue
          'rgba(147, 51, 234, 0.8)',    // Proses - Purple
          'rgba(56, 230, 197, 0.8)',    // QC - Teal
          'rgba(255, 179, 71, 0.8)',    // Mikro - Orange
          'rgba(229, 115, 115, 0.8)',   // QA - Red
        ];
        
        const chartData = {
          labels: stageNames.map((name, idx) => {
            const value = stageValues[idx];
            const percentage = ((value / total) * 100).toFixed(1);
            return `${name}: ${value} Days AVG - ${percentage}%`;
          }),
          datasets: [{
            data: stageValues,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        };
        
        const tempChart = new ChartJS(ctx, {
          type: 'doughnut',
          data: chartData,
          options: {
            responsive: false,
            maintainAspectRatio: true,
            aspectRatio: 1.3,
            layout: {
              padding: {
                left: 20,
                right: 20,
                top: 40,
                bottom: 20
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'right',
                labels: {
                  font: { size: 14 },
                  padding: 15,
                  boxWidth: 20,
                  boxHeight: 20
                }
              },
              title: {
                display: true,
                text: `${pctRawData.length} batches`,
                font: { size: 18, weight: 'bold' },
                padding: { bottom: 20 }
              }
            },
            cutout: '65%',
            circumference: 360,
            rotation: 0
          }
        });
        
        // Wait for chart to fully render
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Convert to image
        const chartImage = canvas.toDataURL('image/png');
        slide3.addImage({
          data: chartImage,
          x: 2.0, y: 1.3, w: 5.5, h: 4.0
        });
        
        // Cleanup
        tempChart.destroy();
      } catch (error) {
        console.error('Error creating donut chart for PowerPoint:', error);
      }
    }
    
    // Slide 4: WIP Status PN1
    const slide4 = pptx.addSlide();
    slide4.addText('WIP Status - PN1', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: '2C3E50'
    });
    
    const pn1Data = overallDeptData.find(dept => dept.dept === 'PN1');
    if (pn1Data) {
      // Create a professional table with stage widgets
      const tableData = [
        [
          { text: 'Stage', options: { bold: true, fill: '10b981', color: 'FFFFFF', fontSize: 14, valign: 'middle', align: 'center' } },
          { text: 'Batches', options: { bold: true, fill: '10b981', color: 'FFFFFF', fontSize: 14, valign: 'middle', align: 'center' } },
          { text: 'Average Days', options: { bold: true, fill: '10b981', color: 'FFFFFF', fontSize: 14, valign: 'middle', align: 'center' } },
        ]
      ];
      
      pn1Data.stages.forEach((stage, idx) => {
        tableData.push([
          { text: stage, options: { fontSize: 13, bold: true, color: '374151', valign: 'middle' } },
          { text: pn1Data.stageCounts[idx].toString(), options: { fontSize: 24, bold: true, color: '10b981', valign: 'middle', align: 'center' } },
          { text: `${pn1Data.stageAverageDays[idx]} days`, options: { fontSize: 13, color: '6b7280', valign: 'middle', align: 'center' } },
        ]);
      });
      
      // Add total row
      const totalBatches = pn1Data.stageCounts.reduce((sum, count) => sum + count, 0);
      tableData.push([
        { text: 'TOTAL', options: { fontSize: 14, bold: true, color: 'FFFFFF', fill: '059669', valign: 'middle' } },
        { text: totalBatches.toString(), options: { fontSize: 24, bold: true, color: 'FFFFFF', fill: '059669', valign: 'middle', align: 'center' } },
        { text: '', options: { fill: '059669' } },
      ]);
      
      slide4.addTable(tableData, {
        x: 1.5, y: 1.0, w: 7.0, h: 3.2,
        border: { pt: 1, color: 'CCCCCC' },
        fill: { color: 'FFFFFF' },
        rowH: [0.4, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.42],
        colW: [3.0, 2.0, 2.0]
      });
    } else {
      slide4.addText('No WIP data available for PN1', {
        x: 2.5, y: 2.5, w: 5, h: 1,
        fontSize: 18, color: '999999',
        align: 'center', valign: 'middle'
      });
    }
    
    // Slide 5: WIP Status PN2
    const slide5 = pptx.addSlide();
    slide5.addText('WIP Status - PN2', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: '2C3E50'
    });
    
    const pn2Data = overallDeptData.find(dept => dept.dept === 'PN2');
    if (pn2Data) {
      // Create a professional table with stage widgets
      const tableData = [
        [
          { text: 'Stage', options: { bold: true, fill: 'f59e0b', color: 'FFFFFF', fontSize: 14, valign: 'middle', align: 'center' } },
          { text: 'Batches', options: { bold: true, fill: 'f59e0b', color: 'FFFFFF', fontSize: 14, valign: 'middle', align: 'center' } },
          { text: 'Average Days', options: { bold: true, fill: 'f59e0b', color: 'FFFFFF', fontSize: 14, valign: 'middle', align: 'center' } },
        ]
      ];
      
      pn2Data.stages.forEach((stage, idx) => {
        tableData.push([
          { text: stage, options: { fontSize: 13, bold: true, color: '374151', valign: 'middle' } },
          { text: pn2Data.stageCounts[idx].toString(), options: { fontSize: 24, bold: true, color: 'f59e0b', valign: 'middle', align: 'center' } },
          { text: `${pn2Data.stageAverageDays[idx]} days`, options: { fontSize: 13, color: '6b7280', valign: 'middle', align: 'center' } },
        ]);
      });
      
      // Add total row
      const totalBatches = pn2Data.stageCounts.reduce((sum, count) => sum + count, 0);
      tableData.push([
        { text: 'TOTAL', options: { fontSize: 14, bold: true, color: 'FFFFFF', fill: 'd97706', valign: 'middle' } },
        { text: totalBatches.toString(), options: { fontSize: 24, bold: true, color: 'FFFFFF', fill: 'd97706', valign: 'middle', align: 'center' } },
        { text: '', options: { fill: 'd97706' } },
      ]);
      
      slide5.addTable(tableData, {
        x: 1.5, y: 1.0, w: 7.0, h: 3.2,
        border: { pt: 1, color: 'CCCCCC' },
        fill: { color: 'FFFFFF' },
        rowH: [0.4, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.42],
        colW: [3.0, 2.0, 2.0]
      });
    } else {
      slide5.addText('No WIP data available for PN2', {
        x: 2.5, y: 2.5, w: 5, h: 1,
        fontSize: 18, color: '999999',
        align: 'center', valign: 'middle'
      });
    }
    
    // Generate filename and save
    const pptDateStr = today.toLocaleDateString('en-GB').replace(/\//g, '-');
    const filename = `Production Dashboard ${pptDateStr}.pptx`;
    
    await pptx.writeFile({ fileName: filename });
  };

  // Handle stage circle click to show batch details
  const handleStageClick = (dept, jenisSediaan, stageName) => {
    // Filter raw data for this specific dept, jenisSediaan, and stage
    const batchesWithTempelLabelRelease = new Set();
    rawWipData.forEach(entry => {
      if (entry.nama_tahapan === 'Tempel Label Realese' && entry.EndDate) {
        batchesWithTempelLabelRelease.add(entry.Batch_No);
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
        && !batchesWithTempelLabelRelease.has(entry.Batch_No);
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
      // Track if any entry has Display = '1'
      if (entry.Display === '1' || entry.Display === 1) {
        batchDetails[batchNo].hasDisplayFlag = true;
      }
    });

    // Filter to show batches that are in progress OR have Display='1'
    const activeBatches = Object.values(batchDetails).filter(
      batch => (batch.hasStartDate && batch.hasMissingEndDate) || batch.hasDisplayFlag
    );

    // Add daysInStage to each batch and sort by longest duration first
    // For Display='1' batches, days will be calculated from IdleStartDate
    const batchesWithDays = activeBatches.map(batch => ({
      ...batch,
      daysInStage: calculateDaysInStage(batch.entries, stageName),
      stageStart: getEarliestIdleStartDate(batch.entries)
    })).sort((a, b) => {
      // Handle null values (Not Started) - sort them to the end
      if (a.daysInStage === null && b.daysInStage === null) return 0;
      if (a.daysInStage === null) return 1;
      if (b.daysInStage === null) return -1;
      return b.daysInStage - a.daysInStage;
    });

    setSelectedStageData({
      dept,
      jenisSediaan,
      stageName,
      batches: batchesWithDays,
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
        const productId = item.Product_ID || 'N/A';
        const category = productCategories[productId] || 'ETH';
        
        return {
          productId: productId,
          productName: item.Product_NM || 'Unknown Product',
          category: category,
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
  const processForecastData = (rawForecastData, categories = {}) => {
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
      
      // Calculate production by category
      const productionByCategory = {
        Generik: 0,
        OTC: 0,
        ETH: 0
      };

      monthData.forEach(item => {
        const production = parseFloat(item.Produksi) || 0;
        const productId = item.Product_ID;
        const category = categories[productId] || 'ETH'; // Default to ETH if not found
        productionByCategory[category] += production;
      });

      const totalProduction = productionByCategory.Generik + productionByCategory.OTC + productionByCategory.ETH;
      
      monthlyData.push({
        month: month,
        monthName: new Date(currentYear, month - 1).toLocaleString('en-US', { month: 'short' }),
        periode: periode,
        forecast: Math.round(totalTarget), // This is now "Target" instead of "Forecast"
        production: Math.round(totalProduction),
        productionGenerik: Math.round(productionByCategory.Generik),
        productionOTC: Math.round(productionByCategory.OTC),
        productionETH: Math.round(productionByCategory.ETH),
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

        // Fetch Product List and OTC Products for categorization
        const [productListResponse, otcProductsResponse] = await Promise.all([
          fetch(apiUrl('/api/productList')),
          fetch(apiUrl('/api/otcProducts'))
        ]);

        if (!productListResponse.ok || !otcProductsResponse.ok) {
          throw new Error('Error fetching product category data');
        }

        const productListData = await productListResponse.json();
        const otcProductsData = await otcProductsResponse.json();

        const productList = productListData.data || [];
        const otcProducts = otcProductsData.data || [];

        // Create a Set of OTC product IDs for quick lookup
        const otcProductIds = new Set(otcProducts.map(p => p.Product_ID));

        // Categorize products
        const categories = {};
        productList.forEach(product => {
          const productId = product.Product_ID;
          const productName = (product.Product_Name || '').toLowerCase();

          if (otcProductIds.has(productId)) {
            categories[productId] = 'OTC';
          } else if (productName.includes('generik') || productName.includes('generic')) {
            categories[productId] = 'Generik';
          } else {
            categories[productId] = 'ETH';
          }
        });

        console.log('Product Categories:', categories);
        setProductCategories(categories);

        // Fetch Product Group Dept data
        const groupDeptResponse = await fetch(apiUrl('/api/productGroupDept'));
        if (!groupDeptResponse.ok) {
          throw new Error(`Group Dept API error! status: ${groupDeptResponse.status}`);
        }
        
        const groupDeptResult = await groupDeptResponse.json();
        const groupDeptData = groupDeptResult.data || [];
        
        // Create a mapping of Product_ID to Group_Dept
        const productDeptMap = {};
        groupDeptData.forEach(item => {
          productDeptMap[item.Group_ProductID] = item.Group_Dept;
        });
        
        console.log('Product Dept Mapping:', productDeptMap);

        // Fetch PCT Breakdown data (now batch-level details)
        const pctResponse = await fetch(apiUrl(`/api/pctBreakdown?period=${pctPeriod}`));
        if (!pctResponse.ok) {
          throw new Error(`PCT API error! status: ${pctResponse.status}`);
        }
        
        const pctResult = await pctResponse.json();
        const pctBatchData = pctResult.data || [];
        
        // Store raw batch data
        setPctRawData(pctBatchData);
        
        // Calculate average total days from Total_Days field (for center display)
        const totalDaysValues = pctBatchData
          .map(batch => batch.Total_Days)
          .filter(val => val !== null && val !== undefined && !isNaN(val));
        
        const calculatedAvgTotalDays = totalDaysValues.length > 0
          ? Math.round(totalDaysValues.reduce((sum, val) => sum + val, 0) / totalDaysValues.length)
          : 0;
        
        setAvgTotalDays(calculatedAvgTotalDays);
        
        // Calculate averages for the chart AND department distribution
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
          
          // Calculate department distribution
          const deptCounts = {};
          let totalBatches = 0;
          let totalPctDays = 0;
          
          pctBatchData.forEach(batch => {
            const dept = productDeptMap[batch.Product_ID] || 'Unknown';
            
            // Count batches per department
            if (!deptCounts[dept]) {
              deptCounts[dept] = 0;
            }
            deptCounts[dept]++;
            totalBatches++;
            
            // Sum all days for this batch
            const batchTotal = (batch.Timbang_Days || 0) + 
                             (batch.Proses_Days || 0) + 
                             (batch.QC_Days || 0) + 
                             (batch.Mikro_Days || 0) + 
                             (batch.QA_Days || 0);
            totalPctDays += batchTotal;
          });
          
          // Calculate average total PCT
          const avgTotalPct = totalBatches > 0 ? Math.round(totalPctDays / totalBatches) : 0;
          
          setPctDeptData({
            departments: deptCounts,
            totalBatches,
            avgTotalPct
          });
          
          console.log('PCT Dept Data:', { deptCounts, totalBatches, avgTotalPct });
        } else {
          setPctData({
            Timbang: 0,
            Proses: 0,
            QC: 0,
            Mikro: 0,
            QA: 0,
          });
          setPctDeptData({
            departments: {},
            totalBatches: 0,
            avgTotalPct: 0
          });
        }

        // Fetch WIP data
        const wipResponse = await fetch(apiUrl('/api/wipData'));
        if (!wipResponse.ok) {
          throw new Error(`WIP API error! status: ${wipResponse.status}`);
        }

        const wipResult = await wipResponse.json();
        let wipRawData = wipResult.data || [];
        
        // Fetch released batches from t_dnc_product
        const releasedBatchesResponse = await fetch(apiUrl('/api/releasedBatches'));
        if (!releasedBatchesResponse.ok) {
          throw new Error(`Released Batches API error! status: ${releasedBatchesResponse.status}`);
        }
        
        const releasedBatchesResult = await releasedBatchesResponse.json();
        const releasedBatches = releasedBatchesResult.data || [];
        
        // Create a Set of released batch numbers for quick lookup
        const releasedBatchSet = new Set(releasedBatches.map(rb => rb.DNc_BatchNo));
        
        console.log('Released Batches Count:', releasedBatchSet.size);
        
        // Filter out batches that exist in t_dnc_product (already released)
        wipRawData = wipRawData.filter(entry => !releasedBatchSet.has(entry.Batch_No));
        
        console.log('Raw WIP Data (after filtering released):', wipRawData);
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
        
        // Process forecast data to monthly totals with categories
        const processedForecast = processForecastData(forecastRawData, categories);
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
        setLastRefreshTime(new Date()); // Set refresh time after data is loaded
      }
    };

    fetchData();

    // Set up auto-refresh every 1 hour (3600000 ms)
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 3600000);

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Separate effect for PCT period changes (manual toggle only)
  useEffect(() => {
    const fetchPCTData = async () => {
      try {
        // Fetch PCT Breakdown data with period parameter
        const pctResponse = await fetch(apiUrl(`/api/pctBreakdown?period=${pctPeriod}`));
        if (!pctResponse.ok) {
          throw new Error(`PCT API error! status: ${pctResponse.status}`);
        }
        
        const pctResult = await pctResponse.json();
        const pctBatchData = pctResult.data || [];
        
        // Only check for empty MTD on manual toggle (not initial load)
        if (pctBatchData.length === 0 && pctPeriod === 'MTD' && !isInitialLoad) {
          // Show vignette notification
          setShowPctVignette(true);
          
          // Wait 3 seconds, then switch to YTD
          setTimeout(() => {
            setShowPctVignette(false);
            setPctPeriod('YTD');
          }, 3000);
          
          return; // Don't update data yet, wait for YTD fetch
        }
        
        setPctRawData(pctBatchData);
        
        // Calculate average total days from Total_Days field
        const totalDaysValues = pctBatchData
          .map(batch => batch.Total_Days)
          .filter(val => val !== null && val !== undefined && !isNaN(val));
        
        const calculatedAvgTotalDays = totalDaysValues.length > 0
          ? Math.round(totalDaysValues.reduce((sum, val) => sum + val, 0) / totalDaysValues.length)
          : 0;
        
        setAvgTotalDays(calculatedAvgTotalDays);
        
        // Calculate PCT stage averages
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
      } catch (error) {
        console.error('Error fetching PCT data:', error);
      }
    };

    // Only fetch if pctPeriod has been initialized (not on initial load)
    if (pctPeriod) {
      fetchPCTData();
    }
  }, [pctPeriod]);

  // Check for empty MTD after initial load completes
  useEffect(() => {
    // Only run on initial load when loading becomes false
    if (!loading && isInitialLoad && pctPeriod === 'MTD' && pctRawData.length === 0) {
      // Show vignette notification
      setShowPctVignette(true);
      
      // Wait 3 seconds, then switch to YTD
      setTimeout(() => {
        setShowPctVignette(false);
        setPctPeriod('YTD');
      }, 3000);
      
      // Mark that we've done the initial check
      setIsInitialLoad(false);
    } else if (!loading && isInitialLoad) {
      // If loading complete but MTD has data, just mark initial load as done
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad, pctPeriod, pctRawData]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area">
          <DashboardLoading 
            loading={true} 
            text="Loading Production Dashboard..." 
            subtext="Fetching WIP and PCT data..." 
            coverContentArea={true}
          />
        </main>
      </div>
    );
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

  // Create donut chart data for PCT stage breakdown (average days per stage)
  const pctStageChartData = {
    labels: Object.keys(pctData),
    datasets: [
      {
        data: Object.values(pctData),
        backgroundColor: [
          'rgba(79, 140, 255, 0.8)',   // Timbang - Blue
          'rgba(147, 51, 234, 0.8)',    // Proses - Purple
          'rgba(56, 230, 197, 0.8)',    // QC - Teal
          'rgba(255, 179, 71, 0.8)',    // Mikro - Orange
          'rgba(229, 115, 115, 0.8)',   // QA - Red
        ],
        borderColor: [
          '#4f8cff',
          '#9333ea',
          '#38e6c5',
          '#ffb347',
          '#e57373',
        ],
        borderWidth: 2,
      },
    ],
  };

  const pctStageOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
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
        display: true,
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return {
                  text: `${label}: ${value}d (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            const batchCount = pctRawData.filter(batch => {
              const stageKey = `${label}_Days`;
              return batch[stageKey] !== null && batch[stageKey] !== undefined;
            }).length;
            return `${label}: ${value} days avg (${percentage}% of total, ${batchCount} batches)`;
          },
        },
      },
      datalabels: {
        display: false, // Don't show labels on the donut itself
      },
    },
  };

  // Create forecast vs production chart data - Stacked by category
  const forecastChartData = {
    labels: forecastData.map(d => d.monthName),
    datasets: [
      {
        type: 'bar',
        label: 'ETH',
        data: forecastData.map(d => d.hasData ? d.productionETH : null),
        backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
        borderColor: '#10b981',
        borderWidth: 1,
        stack: 'production',
        order: 3, // Bottom
      },
      {
        type: 'bar',
        label: 'Generik',
        data: forecastData.map(d => d.hasData ? d.productionGenerik : null),
        backgroundColor: 'rgba(234, 179, 8, 0.8)', // Yellow
        borderColor: '#eab308',
        borderWidth: 1,
        stack: 'production',
        order: 2, // Middle
      },
      {
        type: 'bar',
        label: 'OTC',
        data: forecastData.map(d => d.hasData ? d.productionOTC : null),
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
        borderColor: '#3b82f6',
        borderWidth: 1,
        stack: 'production',
        order: 1, // Top
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
              // Calculate total for this month (sum of all datasets at this index)
              let monthTotal = 0;
              context.chart.data.datasets.forEach(dataset => {
                const value = dataset.data[context.dataIndex];
                if (value !== null && value !== undefined) {
                  monthTotal += value;
                }
              });
              
              // Calculate percentage contribution
              const percentage = monthTotal > 0 ? ((context.parsed.y / monthTotal) * 100).toFixed(1) : 0;
              
              label += context.parsed.y.toLocaleString() + ' units (' + percentage + '%)';
            }
            return label;
          },
          footer: function(tooltipItems) {
            let total = 0;
            tooltipItems.forEach(item => {
              total += item.parsed.y;
            });
            return 'Total: ' + total.toLocaleString() + ' units';
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
          text: 'Production Units',
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
        {/* PCT Breakdown Section */}
        <section className="production-section">
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '3px solid #3b82f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Production Dashboard</h2>
              {/* Date and Time Widget */}
              <div style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#4b5563',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <span>📅</span>
                <span>{new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</span>
                <span style={{ color: '#d1d5db' }}>|</span>
                <span>🕐</span>
                <span>{new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}</span>
              </div>
              
              {/* Manual Refresh Button */}
              <button
                onClick={handleManualRefresh}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                <span>🔄</span>
                Refresh
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* WIP Excel Button */}
              <button
                onClick={() => setExportModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                <span>📊</span>
                WIP Excel
              </button>

              {/* PowerPoint Button */}
              <button
                onClick={handleExportPowerPoint}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#ea580c'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f97316'}
              >
                <span>📑</span>
                PowerPoint
              </button>
            </div>
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
            <div className="pct-placeholder-card">
              <div style={{ width: '100%' }}>
                <div className="pct-description">
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#2c3e50' }}>Production Output</h3>
                  <p style={{ margin: '4px 0' }}>Monthly production tracking on yearly basis.</p>
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    � Click to see individual production for each product.
                  </small>
                </div>
                
                {forecastData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
                    <p style={{ fontSize: '0.9rem' }}>Loading forecast data...</p>
                  </div>
                ) : (
                  <div className="pct-chart-container">
                    <Bar ref={forecastChartRef} data={forecastChartData} options={forecastChartOptions} />
                  </div>
                )}
              </div>
            </div>
            <div className="pct-card" style={{ position: 'relative' }}>
              {/* Vignette overlay when switching from empty MTD to YTD */}
              {showPctVignette && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  animation: 'fadeIn 0.3s ease-in',
                }}>
                  <div style={{
                    color: '#fff',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    padding: '0 40px',
                    lineHeight: '1.6'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                    <div>PCT MTD is currently empty.</div>
                    <div style={{ fontSize: '1rem', fontWeight: '400', marginTop: '12px', color: '#e5e7eb' }}>
                      Switching to YTD data...
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pct-description">
                <p style={{ margin: '0 0 4px 0' }}>Average days for each stage in the production process ({pctPeriod === 'MTD' ? 'Month-to-date' : 'Year-to-date'})</p>
                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                  📊 Batches completed with "Approve Release" this {pctPeriod === 'MTD' ? 'month' : 'year'}
                </small>
                {/* PCT Breakdown title with period toggle - positioned absolutely to not affect height */}
                <div style={{ 
                  position: 'absolute',
                  right: '50px',
                  top: '0',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <h3 style={{ 
                    margin: '0', 
                    fontSize: '1.1rem', 
                    color: '#2c3e50',
                    fontWeight: '600'
                  }}>
                    PCT Breakdown
                  </h3>
                  <button
                    onClick={() => setPctPeriod(pctPeriod === 'MTD' ? 'YTD' : 'MTD')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      color: '#fff',
                      backgroundColor: pctPeriod === 'MTD' ? '#3b82f6' : '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    {pctPeriod === 'MTD' ? 'Switch to YTD' : 'Switch to MTD'}
                  </button>
                </div>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1.1fr 1fr', 
                gap: '20px',
                height: 'calc(100% - 70px)' // Account for description height
              }}>
                {/* Bar Chart - Average Days */}
                <div className="pct-chart-container" style={{ height: '100%' }}>
                  {Object.keys(pctData).length > 0 ? (
                    <Bar ref={pctBarChartRef} data={pctChartData} options={pctOptions} plugins={[ChartDataLabels]} />
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
                
                {/* Donut Chart - PCT Stage Breakdown with Animated Callouts */}
                <div 
                  ref={pctDonutRef}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    height: '100%'
                  }}
                >
                  <AnimatedDonutWithCallouts 
                    data={pctData}
                    batchCount={pctRawData.length}
                    averageTotalDays={avgTotalDays}
                    onSliceClick={(stageName) => {
                      // When clicking a stage, show all batches for that stage
                      handlePctBarClick(stageName);
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

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
                                dept={deptData.dept}
                                stageName={stage}
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
                                    dept={deptData.dept}
                                    stageName={stage}
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
                                              fontSize: '0.85rem',
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
                                                  backgroundColor: getQueueColor(batchCount, product.dept, stage),
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
                          <strong style={{ color: selectedStageData.color }}>{batch.tasksCompleted}/{batch.totalTasks}</strong> task{batch.totalTasks > 1 ? 's' : ''} completed
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#2c3e50' }}>
                            {product.productId} - {product.productName}
                          </div>
                          <div style={{
                            display: 'inline-block',
                            backgroundColor: product.category === 'ETH' ? '#d1fae5' : 
                                           product.category === 'Generik' ? '#fef3c7' : '#dbeafe',
                            color: product.category === 'ETH' ? '#065f46' : 
                                   product.category === 'Generik' ? '#92400e' : '#1e40af',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                          }}>
                            {product.category}
                          </div>
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

      {/* WIP Excel Export Modal */}
      <Modal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export WIP Data to Excel"
      >
        <div style={{ padding: '8px' }}>
          <p style={{ marginBottom: '20px', color: '#6b7280', fontSize: '0.9rem' }}>
            Select the production line and stage to export
          </p>
          
          {/* Production Line Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#374151',
              fontSize: '0.9rem'
            }}>
              Production Line
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['PN1', 'PN2', 'both'].map((option) => (
                <button
                  key={option}
                  onClick={() => setExportSettings({ ...exportSettings, line: option })}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: exportSettings.line === option ? '#3b82f6' : '#f3f4f6',
                    color: exportSettings.line === option ? 'white' : '#374151',
                    border: exportSettings.line === option ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (exportSettings.line !== option) {
                      e.target.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (exportSettings.line !== option) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                >
                  {option === 'both' ? 'PN1 & PN2' : option}
                </button>
              ))}
            </div>
          </div>
          
          {/* Stage Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#374151',
              fontSize: '0.9rem'
            }}>
              Stage
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {['Timbang', 'Proses', 'Kemas Primer', 'Kemas Sekunder', 'QC', 'Mikro', 'QA', 'All'].map((stageOption) => (
                <button
                  key={stageOption}
                  onClick={() => setExportSettings({ ...exportSettings, stage: stageOption })}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: exportSettings.stage === stageOption ? '#10b981' : '#f3f4f6',
                    color: exportSettings.stage === stageOption ? 'white' : '#374151',
                    border: exportSettings.stage === stageOption ? '2px solid #059669' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (exportSettings.stage !== stageOption) {
                      e.target.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (exportSettings.stage !== stageOption) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                >
                  {stageOption}
                </button>
              ))}
            </div>
          </div>
          
          {/* Export Button */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              onClick={() => setExportModalOpen(false)}
              style={{
                padding: '10px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            >
              Cancel
            </button>
            <button
              onClick={handleExportWIP}
              style={{
                padding: '10px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
            >
              <span>📊</span>
              Export to Excel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionDashboard;

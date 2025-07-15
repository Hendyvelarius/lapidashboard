const express = require('express');
const router = express.Router();
const { chatWithOpenAI } = require('../utils/openai');
const { handleFunctionCall } = require('../utils/dataFetcher');

// POST /api/openai/chat
router.post('/chat', async (req, res) => {
  const { prompt, history } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  // Build messages array for OpenAI chat
  const messages = [
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: prompt },
  ];

  try {
    let response = await chatWithOpenAI(messages);
    let finalMessage = response.choices[0].message;
    let rawData = null;

    // Handle function calls if the AI wants to fetch data
    if (finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
      const toolCall = finalMessage.tool_calls[0];
      const functionResult = await handleFunctionCall({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      });
      
      rawData = functionResult;
      
      // Send only summary to AI to avoid token limits, but preserve full data for frontend
      let aiContextData = functionResult;
      if (functionResult && functionResult.summary && functionResult.fullData) {
        // Send only summary to AI to save tokens
        aiContextData = {
          summary: functionResult.summary,
          note: functionResult.note
        };
      }
      
      // Add the function call and result to the conversation
      messages.push(finalMessage);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(aiContextData)
      });

      // Get the AI's response after processing the data
      response = await chatWithOpenAI(messages);
      finalMessage = response.choices[0].message;
    }

    // Parse the AI response for chart and table data
    const responseData = parseAIResponse(finalMessage.content, rawData, prompt);

    res.json({ 
      message: responseData.message,
      chartConfig: responseData.chartConfig,
      tableData: responseData.tableData,
      functionCalled: !!(finalMessage.tool_calls && finalMessage.tool_calls.length > 0),
      usage: response.usage
    });
  } catch (err) {
    console.error('OpenAI API Error:', err);
    res.status(500).json({ error: err.message || 'OpenAI error.' });
  }
});

// Function to parse AI response and extract chart/table data
function parseAIResponse(aiMessage, rawData, userPrompt) {
  const result = {
    message: aiMessage,
    chartConfig: null,
    tableData: null
  };

  // Enhanced JSON parsing with better error handling
  const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
  let match;
  let cleanedMessage = aiMessage;

  // Parse all JSON blocks in the message
  while ((match = jsonBlockRegex.exec(aiMessage)) !== null) {
    try {
      const jsonText = match[1].trim();
      console.log('Attempting to parse JSON:', jsonText);
      
      const parsedConfig = JSON.parse(jsonText);
      
      if (parsedConfig.chartConfig) {
        result.chartConfig = parsedConfig.chartConfig;
        console.log('Found chart config');
      }
      
      if (parsedConfig.tableData && Array.isArray(parsedConfig.tableData)) {
        // Validate that table data contains real data, not fake examples
        const hasRealData = parsedConfig.tableData.every(row => {
          return typeof row === 'object' && row !== null && 
                 !Object.values(row).some(val => 
                   typeof val === 'string' && (
                     val.includes('PRODUCT') || 
                     val.includes('ABC-') || 
                     val.includes('DEF-') ||
                     val.includes('EXAMPLE') ||
                     val.match(/^[A-Z]{3}-\d{3}$/) // Pattern like ABC-123
                   )
                 );
        });
        
        if (hasRealData && parsedConfig.tableData.length > 0) {
          result.tableData = parsedConfig.tableData;
          console.log('Found valid table data with', parsedConfig.tableData.length, 'rows');
        } else {
          console.log('Rejected table data - appears to contain fake/example data');
        }
      }
      
      // Remove the processed JSON block from the message
      cleanedMessage = cleanedMessage.replace(match[0], '').trim();
      
    } catch (error) {
      console.error('Error parsing JSON block:', error);
      console.error('JSON text was:', match[1]);
      // Don't remove malformed JSON blocks from message
    }
  }
  
  result.message = cleanedMessage;

  if (!rawData) {
    // Check if the AI message contains ASCII table data and parse it
    const asciiTableData = parseASCIITable(aiMessage);
    if (asciiTableData) {
      result.tableData = asciiTableData;
      result.message = aiMessage.split('|').length > 10 ? 
        "Here is the table showing the data you requested:" : 
        aiMessage;
    }
    return result;
  }

  const prompt = userPrompt.toLowerCase();
  const isTableRequest = prompt.includes('table') || prompt.includes('show data') || prompt.includes('list') || 
                         prompt.includes('tabel') || prompt.includes('tampilkan data') || 
                         prompt.includes('show') || prompt.includes('display');
  const isChartRequest = prompt.includes('chart') || prompt.includes('graph') || prompt.includes('plot') || 
                        prompt.includes('visual') || prompt.includes('grafik') || prompt.includes('buat');

  // Extract data from different API responses
  let dataArray = [];
  if (rawData.fullData && Array.isArray(rawData.fullData)) {
    // Use full data for table rendering when available
    dataArray = rawData.fullData;
  } else if (rawData.data && Array.isArray(rawData.data)) {
    // Raw API data (aggregated or individual items)
    dataArray = rawData.data;
  } else if (rawData.summary && rawData.summary.recent_items) {
    // Fallback to summary data if full data not available
    dataArray = rawData.summary.recent_items;
  } else if (Array.isArray(rawData)) {
    dataArray = rawData;
  }

  // Only show default table if:
  // 1. AI didn't provide custom table data, AND
  // 2. User asked for general table (not specific criteria), AND  
  // 3. We have data to show
  const isGeneralTableRequest = (prompt.includes('show wip table') || prompt.includes('tampilkan tabel wip') || 
                                prompt === 'table' || prompt === 'tabel') && 
                               !prompt.includes(' in ') && !prompt.includes(' yang ') && 
                               !prompt.includes(' where ') && !prompt.includes(' dengan ');
  
  if (!result.tableData && isGeneralTableRequest && dataArray.length > 0) {
    result.tableData = formatTableData(dataArray);
  }

  // Only use fallback chart generation if AI didn't provide chart config and chart was requested
  if (isChartRequest && !result.chartConfig && dataArray.length > 0) {
    console.log('AI did not provide chart config, using fallback generation');
    result.chartConfig = generateChartConfig(dataArray, prompt);
  }

  return result;
}

// Function to parse ASCII table from AI response
function parseASCIITable(text) {
  if (!text || typeof text !== 'string') return null;
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Find lines that look like table rows (contain multiple | characters)
  const tableLines = lines.filter(line => (line.match(/\|/g) || []).length >= 3);
  
  if (tableLines.length < 2) return null; // Need at least header and one data row
  
  try {
    // Parse header row
    const headerLine = tableLines[0];
    const headers = headerLine.split('|')
      .map(h => h.trim())
      .filter(h => h.length > 0 && !h.match(/^[-\s]*$/));
    
    if (headers.length === 0) return null;
    
    // Parse data rows (skip separator lines that contain only dashes and spaces)
    const dataRows = tableLines.slice(1)
      .filter(line => !line.match(/^[\|\-\s]*$/))
      .map(line => {
        const cells = line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
        
        // Create object with header keys
        const row = {};
        headers.forEach((header, index) => {
          if (cells[index] !== undefined) {
            row[header] = cells[index];
          }
        });
        
        return row;
      })
      .filter(row => Object.keys(row).length > 0);
    
    return dataRows.length > 0 ? dataRows : null;
  } catch (error) {
    console.error('Error parsing ASCII table:', error);
    return null;
  }
}

// Format data for table display
function formatTableData(dataArray) {
  if (!dataArray || dataArray.length === 0) return null;
  
  return dataArray.map(item => {
    const formatted = {};
    Object.keys(item).forEach(key => {
      // Format key names for better display
      const displayKey = key.replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/Id/g, 'ID');
      
      // Format values
      let value = item[key];
      if (Array.isArray(value)) {
        value = value.join(', ');
      } else if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      
      formatted[displayKey] = value;
    });
    return formatted;
  });
}

// Generate chart configuration
function generateChartConfig(dataArray, prompt) {
  if (!dataArray || dataArray.length === 0) return null;

  console.log('=== CHART GENERATION DEBUG ===');
  console.log('Generating chart for prompt:', prompt);
  console.log('Data array length:', dataArray.length);
  console.log('First few items with all fields:', JSON.stringify(dataArray.slice(0, 3), null, 2));
  console.log('Sample item keys:', dataArray.length > 0 ? Object.keys(dataArray[0]) : 'No data');

  // Determine chart type based on user request
  let chartType = 'bar';
  if (prompt.includes('line') || prompt.includes('trend')) chartType = 'line';
  if (prompt.includes('pie') || prompt.includes('doughnut')) chartType = 'doughnut';

  // Enhanced keyword detection for department charts
  if (prompt.includes('department') || prompt.includes('dept') || prompt.includes('by department')) {
    console.log('Creating department chart');
    return generateDepartmentChart(dataArray, chartType);
  }
  
  // Category-based charts
  if (prompt.includes('category') || prompt.includes('kelompok') || prompt.includes('by category')) {
    console.log('Creating category chart');
    return generateCategoryChart(dataArray, chartType);
  }
  
  // Duration-based charts
  if (prompt.includes('duration') || prompt.includes('time')) {
    console.log('Creating duration chart');
    return generateDurationChart(dataArray, chartType);
  }

  // Default: try department first, then category
  console.log('Using default chart logic');
  
  // Check if we have department data in raw format
  const hasDeptData = dataArray.some(item => 
    item.dept || item.Dept || item.department || item.Department || item.Group_Dept || item.group_dept
  );
  
  if (hasDeptData) {
    console.log('Found department data in raw format, creating department chart');
    return generateDepartmentChart(dataArray, chartType);
  }
  
  // Fall back to category chart
  console.log('Creating default category chart');
  return generateCategoryChart(dataArray, chartType);
}

function generateCategoryChart(dataArray, type = 'bar') {
  const categoryCount = {};
  
  dataArray.forEach(item => {
    // Process raw WIP data: check for various category field names
    const category = item.kelompok || item.Kelompok || item.category || item.Category || 'Unknown';
    
    // If we have a Total field (aggregated data), use it; otherwise count as 1 (individual items)
    const count = item.Total !== undefined ? parseInt(item.Total) || 0 : 1;
    
    categoryCount[category] = (categoryCount[category] || 0) + count;
  });

  const labels = Object.keys(categoryCount);
  const data = Object.values(categoryCount);

  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
  ];

  return {
    type,
    data: {
      labels,
      datasets: [{
        label: 'Items by Category',
        data,
        backgroundColor: type === 'doughnut' ? colors.slice(0, labels.length) : colors.slice(0, labels.length),
        borderColor: type === 'doughnut' ? colors.slice(0, labels.length) : '#ffffff',
        borderWidth: type === 'doughnut' ? 2 : 1
      }]
    },
    options: {
      title: 'WIP Items by Category',
      responsive: true,
      scales: type !== 'doughnut' ? {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Items'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Category'
          }
        }
      } : undefined
    }
  };
}

function generateDepartmentChart(dataArray, type = 'bar') {
  const deptCount = {};
  
  console.log('Processing department chart with data:', dataArray.slice(0, 5));
  
  dataArray.forEach(item => {
    // Check all possible department field names from raw queries
    const dept = item.dept || item.Dept || item.department || item.Department || 
                 item.Group_Dept || item.group_dept || 'Unknown';
    
    // Convert null/undefined to 'Unknown'
    const deptName = dept || 'Unknown';
    
    // If we have a Total field (aggregated data), use it; otherwise count as 1 (individual items)
    const count = item.Total !== undefined ? parseInt(item.Total) || 0 : 1;
    
    deptCount[deptName] = (deptCount[deptName] || 0) + count;
  });

  console.log('Department chart data:', deptCount);

  const labels = Object.keys(deptCount);
  const data = Object.values(deptCount);

  console.log('Chart labels:', labels);
  console.log('Chart data:', data);

  const colors = [
    '#4facfe', '#667eea', '#f093fb', '#43e97b', 
    '#ffecd2', '#a8edea', '#764ba2', '#f5576c'
  ];

  return {
    type,
    data: {
      labels,
      datasets: [{
        label: 'Items by Department',
        data,
        backgroundColor: type === 'doughnut' ? colors.slice(0, labels.length) : colors.slice(0, labels.length),
        borderColor: type === 'doughnut' ? colors.slice(0, labels.length) : '#ffffff',
        borderWidth: type === 'doughnut' ? 2 : 1
      }]
    },
    options: {
      title: 'WIP Items by Department',
      responsive: true,
      scales: type !== 'doughnut' ? {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Items'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Department'
          }
        }
      } : undefined
    }
  };
}

function generateDurationChart(dataArray, type = 'bar') {
  const durationRanges = {
    '0-7 days': 0,
    '8-14 days': 0,
    '15-21 days': 0,
    '22-30 days': 0,
    '30+ days': 0
  };

  dataArray.forEach(item => {
    const duration = item.duration || 0;
    if (duration <= 7) durationRanges['0-7 days']++;
    else if (duration <= 14) durationRanges['8-14 days']++;
    else if (duration <= 21) durationRanges['15-21 days']++;
    else if (duration <= 30) durationRanges['22-30 days']++;
    else durationRanges['30+ days']++;
  });

  return {
    type,
    data: {
      labels: Object.keys(durationRanges),
      datasets: [{
        label: 'Duration Distribution',
        data: Object.values(durationRanges),
        backgroundColor: '#43e97b',
        borderColor: '#38f9d7',
        borderWidth: 1
      }]
    },
    options: {
      title: 'Duration Distribution'
    }
  };
}

// GET /api/openai/test - Test endpoint to verify AI integration
router.get('/test', async (req, res) => {
  try {
    const testMessages = [
      { role: 'user', content: 'Hello, can you tell me about the dashboard capabilities?' }
    ];
    
    const response = await chatWithOpenAI(testMessages);
    res.json({ 
      message: response.choices[0].message.content,
      status: 'AI integration working'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI test failed' });
  }
});

module.exports = router;

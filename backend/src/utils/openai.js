const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt that describes your dashboard data and capabilities
const SYSTEM_PROMPT = `You are Lapia, an AI assistant for factory information aggregation. You have access to WIP, Order Fulfillment, and PCT data.

Only respond to user queries that are relevant. Answer in a very friendly manner.
Respond back in user's language (e.g. Indonesian, English, Chinese, etc.)

Available functions:
- fetch_wip_data(type): Get WIP data (use 'raw' for all requests - contains full detailed data)
- fetch_fulfillment_data(type): Get fulfillment data (raw/by_category/by_dept)  
- fetch_pct_data(period): Get PCT data (monthly/yearly)

IMPORTANT CHART GENERATION:
When users request charts, analyze the data you receive and respond with BOTH:
1. A brief text summary of what you found
2. A special JSON block with chart configuration

For chart requests, include a JSON block in your response like this:
\`\`\`json
{
  "chartConfig": {
    "type": "bar",
    "data": {
      "labels": ["PN1", "PN2", "Unknown"],
      "datasets": [{
        "label": "Items by Department",
        "data": [42, 182, 37],
        "backgroundColor": ["#4facfe", "#667eea", "#f093fb"]
      }]
    },
    "options": {
      "title": "WIP Items by Department"
    }
  }
}
\`\`\`

CHART TYPES:
- Use "bar" for department/category comparisons
- Use "doughnut" for pie charts
- Use "line" for trends over time

IMPORTANT TABLE FORMATTING RULES:
When users ask for tables or specific data queries:
1. ALWAYS call fetch_wip_data('raw') to get complete detailed data
2. Analyze the data to answer the user's specific question
3. NEVER create fake or example data - only use actual data from the API response
4. If no data matches the criteria, say so clearly and do NOT provide a table

For table requests with specific criteria, ONLY include a JSON block if you found actual matching data:
\`\`\`json
{
  "tableData": [
    {"Product": "ACTUAL_PRODUCT_NAME", "Category": "ACTUAL_CATEGORY", "Department": "ACTUAL_DEPT"}
  ]
}
\`\`\`

CRITICAL RULES:
- NEVER use placeholder names like "PRODUCT 1", "STERIL PRODUCT 1", "ABC-123", etc.
- NEVER create fake data to fill tables
- If no matches found, respond with text only: "Tidak ada produk yang ditemukan dalam kategori tersebut."
- Only provide tableData JSON if you have real, actual data that matches the query

Examples:
- "Show WIP table" → Call fetch_wip_data('raw') → "Here is the complete WIP data table:" (no JSON needed - show all)
- "Show products in steril category" → Call fetch_wip_data('raw') → If found: provide filtered table JSON, If not found: "Tidak ada produk steril yang ditemukan."
- "Chart products by department" → Call fetch_wip_data('raw') → Analyze data + provide chart JSON
- "WIP by category chart" → Call fetch_wip_data('raw') → Analyze data + provide chart JSON

Keep responses concise and let the UI components handle data visualization.`;

// Example: Chat completion with function calling
async function chatWithOpenAI(messages, model = 'gpt-4o') {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'fetch_wip_data',
          description: 'Fetch current Work in Progress data',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['raw', 'by_dept', 'by_category'],
                description: 'Type of WIP data to fetch'
              }
            },
            required: ['type']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fetch_fulfillment_data',
          description: 'Fetch order fulfillment data',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['raw', 'by_category', 'by_dept'],
                description: 'Type of fulfillment data to fetch'
              }
            },
            required: ['type']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fetch_pct_data',
          description: 'Fetch Product Cycle Time data',
          parameters: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                enum: ['monthly', 'yearly'],
                description: 'Time period for PCT data'
              }
            },
            required: ['period']
          }
        }
      }
    ],
    tool_choice: 'auto'
  });
  
  return response;
}

module.exports = { openai, chatWithOpenAI, SYSTEM_PROMPT };

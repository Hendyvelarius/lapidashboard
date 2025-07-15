const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt that describes your dashboard data and capabilities
const SYSTEM_PROMPT = `You are an AI assistant for a manufacturing dashboard. You have access to WIP, Order Fulfillment, and PCT data.

Available functions:
- fetch_wip_data(type): Get WIP data (raw/by_dept/by_category)
- fetch_fulfillment_data(type): Get fulfillment data (raw/by_category/by_dept)  
- fetch_pct_data(period): Get PCT data (monthly/yearly)

Provide concise, data-driven insights when analyzing manufacturing metrics.`;

// Example: Chat completion with function calling
async function chatWithOpenAI(messages, model = 'gpt-3.5-turbo') {
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

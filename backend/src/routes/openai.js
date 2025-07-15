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

    // Handle function calls if the AI wants to fetch data
    if (finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
      const toolCall = finalMessage.tool_calls[0];
      const functionResult = await handleFunctionCall({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      });
      
      // Add the function call and result to the conversation
      messages.push(finalMessage);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult)
      });

      // Get the AI's response after processing the data
      response = await chatWithOpenAI(messages);
      finalMessage = response.choices[0].message;
    }

    res.json({ 
      message: finalMessage.content,
      functionCalled: !!(finalMessage.tool_calls && finalMessage.tool_calls.length > 0),
      usage: response.usage
    });
  } catch (err) {
    console.error('OpenAI API Error:', err);
    res.status(500).json({ error: err.message || 'OpenAI error.' });
  }
});

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

const express = require('express');
const Route = require('./routes/routes');
const cors = require('cors');
const { startScheduler, getSchedulerStatus, triggerManualMonthEnd } = require('./utils/monthEndScheduler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', Route);

// Scheduler status endpoint
app.get('/api/scheduler/status', (req, res) => {
  res.json(getSchedulerStatus());
});

// Manual trigger endpoint (for testing or manual month-end save)
app.post('/api/scheduler/trigger-month-end', async (req, res) => {
  try {
    await triggerManualMonthEnd();
    res.json({ success: true, message: 'Month-end snapshot triggered' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Manager Dashboard Backend API is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start the month-end snapshot scheduler
  startScheduler();
});

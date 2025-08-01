const express = require('express');
const Route = require('./routes/routes');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', Route);

// Health check
app.get('/', (req, res) => {
  res.send('Manager Dashboard Backend API is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const path = require('path');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || config.dashboard.port || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/', dashboardRoutes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`${config.agent.emoji} ${config.agent.name}'s Dashboard running on http://localhost:${PORT}`);
});

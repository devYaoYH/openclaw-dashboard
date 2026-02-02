const express = require('express');
const path = require('path');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/', dashboardRoutes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Ethan's Dashboard running on http://localhost:${PORT}`);
});

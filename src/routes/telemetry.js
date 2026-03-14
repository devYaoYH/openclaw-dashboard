const express = require('express');
const router = express.Router();
const { getTelemetryStats, getRecentTelemetry } = require('../db');

// Telemetry stats API
router.get('/api/telemetry/stats', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const agent_id = req.query.agent || 'ethan';
  
  try {
    const stats = getTelemetryStats(agent_id, hours);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent telemetry events API
router.get('/api/telemetry/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const agent_id = req.query.agent || 'ethan';
  
  try {
    const events = getRecentTelemetry(agent_id, limit);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry dashboard view
router.get('/telemetry', (req, res) => {
  const path = require('path');
  res.sendFile(path.join(__dirname, '../views/telemetry.html'));
});

// Legacy inline HTML version (kept for reference)
router.get('/telemetry/legacy', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  
  try {
    const stats = getTelemetryStats('ethan', hours);
    const recent = getRecentTelemetry('ethan', 20);
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AOS Telemetry - Ethan</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header h1 {
      font-size: 2rem;
      color: #1a202c;
      margin-bottom: 0.5rem;
    }
    .header p {
      color: #718096;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .card h2 {
      font-size: 1.25rem;
      color: #2d3748;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      color: #4a5568;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      color: #2d3748;
    }
    .success-rate {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    .success-rate.high { background: #c6f6d5; color: #22543d; }
    .success-rate.medium { background: #fefcbf; color: #744210; }
    .success-rate.low { background: #fed7d7; color: #742a2a; }
    .event {
      padding: 0.75rem;
      border-left: 3px solid #667eea;
      background: #f7fafc;
      margin-bottom: 0.5rem;
      border-radius: 4px;
    }
    .event-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }
    .event-type {
      font-weight: 600;
      color: #2d3748;
    }
    .event-time {
      color: #718096;
      font-size: 0.875rem;
    }
    .event-details {
      color: #4a5568;
      font-size: 0.875rem;
    }
    .outcome-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    .outcome-success { background: #c6f6d5; color: #22543d; }
    .outcome-failure { background: #fed7d7; color: #742a2a; }
    .no-data {
      text-align: center;
      color: #a0aec0;
      padding: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 AOS Telemetry Dashboard</h1>
      <p>Agent: Ethan | Window: Last ${hours} hours | Updated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="stats-grid">
      <!-- Success Rates -->
      <div class="card">
        <h2>✅ Success Rate by Tool</h2>
        ${stats.successRate.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Calls</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              ${stats.successRate.map(row => {
                const rate = row.success_rate;
                const rateClass = rate >= 90 ? 'high' : rate >= 70 ? 'medium' : 'low';
                return `
                  <tr>
                    <td>${row.tool_name || 'unknown'}</td>
                    <td>${row.total}</td>
                    <td><span class="success-rate ${rateClass}">${rate.toFixed(1)}%</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : '<p class="no-data">No data yet</p>'}
      </div>

      <!-- Costs -->
      <div class="card">
        <h2>💰 Cost Breakdown</h2>
        ${stats.costs.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Calls</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${stats.costs.map(row => `
                <tr>
                  <td>${row.tool_name || 'unknown'}</td>
                  <td>${row.calls}</td>
                  <td>$${row.total_cost.toFixed(4)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: 600; border-top: 2px solid #cbd5e0;">
                <td>TOTAL</td>
                <td>${stats.costs.reduce((sum, r) => sum + r.calls, 0)}</td>
                <td>$${stats.costs.reduce((sum, r) => sum + r.total_cost, 0).toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        ` : '<p class="no-data">No cost data yet</p>'}
      </div>

      <!-- Latency -->
      <div class="card">
        <h2>⏱️ Latency by Tool</h2>
        ${stats.latency.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Avg (ms)</th>
                <th>Max (ms)</th>
              </tr>
            </thead>
            <tbody>
              ${stats.latency.map(row => `
                <tr>
                  <td>${row.tool_name || 'unknown'}</td>
                  <td>${row.avg_ms ? row.avg_ms.toFixed(0) : 'N/A'}</td>
                  <td>${row.max_ms || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="no-data">No latency data yet</p>'}
      </div>
    </div>

    <!-- Recent Events -->
    <div class="card">
      <h2>📝 Recent Events</h2>
      ${recent.length > 0 ? recent.map(evt => {
        const time = new Date(evt.timestamp).toLocaleString();
        const outcomeClass = evt.outcome === 'success' ? 'outcome-success' : 'outcome-failure';
        return `
          <div class="event">
            <div class="event-header">
              <span class="event-type">
                ${evt.event_type} 
                ${evt.tool_name ? `→ ${evt.tool_name}` : ''}
                <span class="outcome-badge ${outcomeClass}">${evt.outcome || 'N/A'}</span>
              </span>
              <span class="event-time">${time}</span>
            </div>
            <div class="event-details">
              ${evt.input_summary || ''}
              ${evt.latency_ms ? ` | ${evt.latency_ms}ms` : ''}
              ${evt.cost_estimate ? ` | $${evt.cost_estimate.toFixed(4)}` : ''}
              ${evt.error_message ? ` | ❌ ${evt.error_message}` : ''}
            </div>
          </div>
        `;
      }).join('') : '<p class="no-data">No events yet</p>'}
    </div>
  </div>
</body>
</html>
    `);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

module.exports = router;

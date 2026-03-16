/**
 * Telemetry Analytics - Phase 1 Observability
 * 
 * Queries for success rates, cost breakdowns, latency analysis, error trends
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'dashboard.db');

/**
 * Get success rate by tool
 * @param {string} window - Time window: '1h', '24h', '7d', '30d', 'all'
 * @returns {Array} Array of {tool_name, total_calls, success_calls, success_rate}
 */
function getSuccessRateByTool(window = '24h') {
  const db = new Database(DB_PATH, { readonly: true });
  
  const windowClause = getWindowClause(window);
  
  const query = `
    SELECT 
      tool_name,
      COUNT(*) as total_calls,
      SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as success_calls,
      ROUND(100.0 * SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
    FROM telemetry_events
    WHERE event_type = 'tool_call'
      ${windowClause}
    GROUP BY tool_name
    ORDER BY total_calls DESC;
  `;
  
  const results = db.prepare(query).all();
  db.close();
  
  return results;
}

/**
 * Get cost breakdown by tool
 * @param {string} window - Time window
 * @returns {Array} Array of {tool_name, total_calls, total_cost, avg_cost}
 */
function getCostBreakdown(window = '24h') {
  const db = new Database(DB_PATH, { readonly: true });
  
  const windowClause = getWindowClause(window);
  
  const query = `
    SELECT 
      tool_name,
      COUNT(*) as total_calls,
      SUM(cost_estimate) as total_cost,
      AVG(cost_estimate) as avg_cost,
      SUM(tokens_used) as total_tokens
    FROM telemetry_events
    WHERE event_type = 'tool_call'
      ${windowClause}
    GROUP BY tool_name
    ORDER BY total_cost DESC;
  `;
  
  const results = db.prepare(query).all();
  db.close();
  
  return results;
}

/**
 * Get latency statistics
 * @param {string} toolName - Optional: filter by specific tool
 * @param {string} window - Time window
 * @returns {object} {p50, p95, p99, avg, min, max}
 */
function getLatencyStats(toolName = null, window = '24h') {
  const db = new Database(DB_PATH, { readonly: true });
  
  const windowClause = getWindowClause(window);
  const toolClause = toolName ? `AND tool_name = '${toolName}'` : '';
  
  // Get percentiles using SQLite window functions
  const query = `
    WITH ordered AS (
      SELECT 
        latency_ms,
        ROW_NUMBER() OVER (ORDER BY latency_ms) as row_num,
        COUNT(*) OVER () as total_count
      FROM telemetry_events
      WHERE event_type = 'tool_call'
        AND latency_ms IS NOT NULL
        ${windowClause}
        ${toolClause}
    )
    SELECT 
      (SELECT latency_ms FROM ordered WHERE row_num = CAST(0.50 * total_count AS INTEGER)) as p50,
      (SELECT latency_ms FROM ordered WHERE row_num = CAST(0.95 * total_count AS INTEGER)) as p95,
      (SELECT latency_ms FROM ordered WHERE row_num = CAST(0.99 * total_count AS INTEGER)) as p99,
      (SELECT AVG(latency_ms) FROM telemetry_events WHERE event_type = 'tool_call' ${windowClause} ${toolClause}) as avg,
      (SELECT MIN(latency_ms) FROM telemetry_events WHERE event_type = 'tool_call' ${windowClause} ${toolClause}) as min,
      (SELECT MAX(latency_ms) FROM telemetry_events WHERE event_type = 'tool_call' ${windowClause} ${toolClause}) as max
    FROM ordered
    LIMIT 1;
  `;
  
  const result = db.prepare(query).get() || {};
  db.close();
  
  return result;
}

/**
 * Get error rate trends (by hour or day)
 * @param {string} window - Time window
 * @param {string} groupBy - 'hour' or 'day'
 * @returns {Array} Array of {period, total_calls, error_calls, error_rate}
 */
function getErrorTrends(window = '7d', groupBy = 'day') {
  const db = new Database(DB_PATH, { readonly: true });
  
  const windowClause = getWindowClause(window);
  const groupFormat = groupBy === 'hour' 
    ? "strftime('%Y-%m-%d %H:00', timestamp)" 
    : "strftime('%Y-%m-%d', timestamp)";
  
  const query = `
    SELECT 
      ${groupFormat} as period,
      COUNT(*) as total_calls,
      SUM(CASE WHEN outcome != 'success' THEN 1 ELSE 0 END) as error_calls,
      ROUND(100.0 * SUM(CASE WHEN outcome != 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate
    FROM telemetry_events
    WHERE event_type = 'tool_call'
      ${windowClause}
    GROUP BY ${groupFormat}
    ORDER BY period DESC;
  `;
  
  const results = db.prepare(query).all();
  db.close();
  
  return results;
}

/**
 * Get recent errors
 * @param {number} limit - Max errors to return
 * @returns {Array} Recent error events
 */
function getRecentErrors(limit = 20) {
  const db = new Database(DB_PATH, { readonly: true });
  
  const query = `
    SELECT 
      timestamp,
      tool_name,
      input_summary,
      error_message,
      latency_ms,
      context
    FROM telemetry_events
    WHERE event_type = 'tool_call'
      AND outcome != 'success'
    ORDER BY timestamp DESC
    LIMIT ?;
  `;
  
  const results = db.prepare(query).all(limit);
  db.close();
  
  return results;
}

/**
 * Get overall summary stats
 * @param {string} window - Time window
 * @returns {object} Summary stats
 */
function getSummaryStats(window = '24h') {
  const db = new Database(DB_PATH, { readonly: true });
  
  const windowClause = getWindowClause(window);
  
  const query = `
    SELECT 
      COUNT(*) as total_calls,
      SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as success_calls,
      ROUND(100.0 * SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
      SUM(cost_estimate) as total_cost,
      AVG(cost_estimate) as avg_cost,
      SUM(tokens_used) as total_tokens,
      AVG(latency_ms) as avg_latency
    FROM telemetry_events
    WHERE event_type = 'tool_call'
      ${windowClause};
  `;
  
  const result = db.prepare(query).get() || {};
  db.close();
  
  return result;
}

/**
 * Helper: Generate WHERE clause for time window
 */
function getWindowClause(window) {
  if (window === 'all') return '';
  
  const intervals = {
    '1h': '-1 hour',
    '24h': '-24 hours',
    '7d': '-7 days',
    '30d': '-30 days',
  };
  
  const interval = intervals[window] || '-24 hours';
  return `AND timestamp > datetime('now', '${interval}')`;
}

module.exports = {
  getSuccessRateByTool,
  getCostBreakdown,
  getLatencyStats,
  getErrorTrends,
  getRecentErrors,
  getSummaryStats,
};

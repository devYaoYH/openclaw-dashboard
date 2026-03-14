/**
 * AOS Telemetry Logger
 * 
 * Structured telemetry logging for OpenClaw agents.
 * Logs tool calls, decisions, state changes, and errors.
 * 
 * Usage:
 *   const telemetry = require('./telemetry-logger');
 *   
 *   // Log a tool call
 *   const start = Date.now();
 *   try {
 *     const result = await someToolCall();
 *     telemetry.logToolCall({
 *       tool_name: 'web_search',
 *       input_summary: 'AI news 2026',
 *       outcome: 'success',
 *       latency_ms: Date.now() - start,
 *       context: { task: 'news monitoring' }
 *     });
 *   } catch (err) {
 *     telemetry.logToolCall({
 *       tool_name: 'web_search',
 *       outcome: 'failure',
 *       error_message: err.message,
 *       latency_ms: Date.now() - start
 *     });
 *   }
 */

const { db, logTelemetry } = require('./db');

// Agent configuration
const AGENT_ID = process.env.AGENT_ID || 'ethan';
const SESSION_ID = process.env.SESSION_ID || null;

// Cost estimates (rough, per-tool averages)
const TOOL_COSTS = {
  'web_search': 0.002,
  'web_fetch': 0.001,
  'exec': 0.0005,
  'memory_search': 0.003,
  'message': 0.001,
  'browser': 0.005,
  'image': 0.01
};

function logToolCall({
  tool_name,
  input_summary = null,
  outcome = 'success',
  latency_ms = null,
  tokens_used = null,
  cost_estimate = null,
  error_message = null,
  context = null,
  metadata = null
}) {
  // Auto-estimate cost if not provided
  if (cost_estimate === null && tool_name in TOOL_COSTS) {
    cost_estimate = TOOL_COSTS[tool_name];
  }

  // Truncate input summary for privacy
  if (input_summary && input_summary.length > 200) {
    input_summary = input_summary.substring(0, 197) + '...';
  }

  return logTelemetry({
    agent_id: AGENT_ID,
    session_id: SESSION_ID,
    event_type: 'tool_call',
    tool_name,
    input_summary,
    outcome,
    latency_ms,
    tokens_used,
    cost_estimate,
    error_message,
    context,
    metadata
  });
}

function logDecision({
  decision_type,
  description,
  outcome = 'success',
  confidence = null,
  context = null
}) {
  return logTelemetry({
    agent_id: AGENT_ID,
    session_id: SESSION_ID,
    event_type: 'decision',
    tool_name: decision_type,
    input_summary: description,
    outcome,
    metadata: { confidence },
    context
  });
}

function logStateChange({
  state_from,
  state_to,
  reason = null,
  context = null
}) {
  return logTelemetry({
    agent_id: AGENT_ID,
    session_id: SESSION_ID,
    event_type: 'state_change',
    input_summary: `${state_from} → ${state_to}`,
    outcome: 'success',
    metadata: { state_from, state_to, reason },
    context
  });
}

function logError({
  error_source,
  error_message,
  severity = 'medium',
  context = null
}) {
  return logTelemetry({
    agent_id: AGENT_ID,
    session_id: SESSION_ID,
    event_type: 'error',
    tool_name: error_source,
    outcome: 'failure',
    error_message,
    metadata: { severity },
    context
  });
}

// Wrapper for timing tool calls
async function instrumentToolCall(tool_name, fn, options = {}) {
  const start = Date.now();
  const { input_summary, context } = options;
  
  try {
    const result = await fn();
    
    logToolCall({
      tool_name,
      input_summary,
      outcome: 'success',
      latency_ms: Date.now() - start,
      context
    });
    
    return result;
  } catch (err) {
    logToolCall({
      tool_name,
      input_summary,
      outcome: 'failure',
      error_message: err.message,
      latency_ms: Date.now() - start,
      context
    });
    
    throw err;
  }
}

module.exports = {
  logToolCall,
  logDecision,
  logStateChange,
  logError,
  instrumentToolCall,
  
  // Re-export for convenience
  getTelemetryStats: require('./db').getTelemetryStats,
  getRecentTelemetry: require('./db').getRecentTelemetry
};

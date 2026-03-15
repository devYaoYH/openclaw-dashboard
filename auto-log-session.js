#!/usr/bin/env node
/**
 * Auto-log session tool calls from OpenClaw session transcripts
 * 
 * This script can be called at the end of activities to log tool usage
 * without manual intervention.
 */

const telemetry = require('./src/telemetry-logger');

// Map OpenClaw tool names to our telemetry tool names
const TOOL_MAPPING = {
  'Read': 'Read',
  'Write': 'Write',
  'Edit': 'Edit',
  'exec': 'exec',
  'web_search': 'web_search',
  'web_fetch': 'web_fetch',
  'memory_search': 'memory_search',
  'memory_get': 'memory_get',
  'message': 'message',
  'browser': 'browser',
  'image': 'image',
  'process': 'process',
  'gateway': 'gateway',
  'cron': 'cron',
  'nodes': 'nodes'
};

/**
 * Log a batch of tool calls from session activity
 * @param {Array} calls - Array of {tool, summary, latency, outcome, error}
 * @param {Object} context - Session context
 */
function logSessionCalls(calls, context = {}) {
  let logged = 0;
  
  calls.forEach(call => {
    try {
      telemetry.logToolCall({
        tool_name: TOOL_MAPPING[call.tool] || call.tool,
        input_summary: call.summary,
        outcome: call.outcome || 'success',
        latency_ms: call.latency || null,
        error_message: call.error || null,
        context: { ...context, auto_logged: true }
      });
      logged++;
    } catch (err) {
      console.error(`Failed to log ${call.tool}:`, err.message);
    }
  });
  
  console.log(`✅ Auto-logged ${logged} tool calls`);
  return logged;
}

/**
 * Quick log for a single tool call (called from shell)
 */
function quickLog(tool, summary, outcome = 'success', latency = null, error = null) {
  telemetry.logToolCall({
    tool_name: TOOL_MAPPING[tool] || tool,
    input_summary: summary,
    outcome,
    latency_ms: latency ? parseInt(latency) : null,
    error_message: error,
    context: { auto_logged: true, timestamp: new Date().toISOString() }
  });
  console.log(`✅ Logged: ${tool} → ${outcome}`);
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  ./auto-log-session.js <tool> <summary> [outcome] [latency] [error]');
    console.log('');
    console.log('Examples:');
    console.log('  ./auto-log-session.js web_search "AI news 2026" success 856');
    console.log('  ./auto-log-session.js exec "git push" success 1200');
    console.log('  ./auto-log-session.js web_fetch "docs.openclaw.ai" failure 0 "Timeout"');
    process.exit(0);
  }
  
  const [tool, summary, outcome, latency, error] = args;
  quickLog(tool, summary, outcome, latency, error);
}

module.exports = { logSessionCalls, quickLog, TOOL_MAPPING };

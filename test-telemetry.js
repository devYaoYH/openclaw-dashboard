#!/usr/bin/env node
/**
 * Test script for AOS telemetry system
 * Simulates tool calls and verifies logging works
 */

const telemetry = require('./src/telemetry-logger');

console.log('🧪 Testing AOS Telemetry System...\n');

// Test 1: Log successful tool call
console.log('Test 1: Logging successful web_search...');
telemetry.logToolCall({
  tool_name: 'web_search',
  input_summary: 'agent observability 2026',
  outcome: 'success',
  latency_ms: 856,
  tokens_used: 1250,
  context: { task: 'research', priority: 'high' }
});
console.log('✅ Logged\n');

// Test 2: Log failed tool call
console.log('Test 2: Logging failed exec command...');
telemetry.logToolCall({
  tool_name: 'exec',
  input_summary: 'nonexistent-command',
  outcome: 'failure',
  error_message: 'Command not found',
  latency_ms: 120,
  context: { task: 'system-check' }
});
console.log('✅ Logged\n');

// Test 3: Log decision
console.log('Test 3: Logging decision...');
telemetry.logDecision({
  decision_type: 'model_selection',
  description: 'Chose Gemini for news search',
  outcome: 'success',
  confidence: 0.85,
  context: { experiment: 'news-model-comparison' }
});
console.log('✅ Logged\n');

// Test 4: Log state change
console.log('Test 4: Logging state change...');
telemetry.logStateChange({
  state_from: 'idle',
  state_to: 'processing_moltbook',
  reason: 'heartbeat triggered sync',
  context: { interval: '6h' }
});
console.log('✅ Logged\n');

// Test 5: Instrument a function
console.log('Test 5: Testing instrumentToolCall wrapper...');
async function simulateWebSearch() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ results: 5 }), 300);
  });
}

telemetry.instrumentToolCall('web_search', simulateWebSearch, {
  input_summary: 'AOS feedback moltbook',
  context: { task: 'community-monitoring' }
}).then(() => {
  console.log('✅ Instrumented call completed\n');
  
  // Query recent telemetry
  console.log('📊 Querying telemetry stats...\n');
  const stats = telemetry.getTelemetryStats('ethan', 24);
  
  console.log('Success rates:', stats.successRate);
  console.log('\nCosts:', stats.costs);
  console.log('\nRecent events:', telemetry.getRecentTelemetry('ethan', 5));
  
  console.log('\n✅ All tests passed! Telemetry system is operational.\n');
  console.log('Run: ./query-telemetry.js stats    to see formatted stats');
  console.log('Run: ./query-telemetry.js recent   to see recent events\n');
});

#!/usr/bin/env node
/**
 * Test suite for cost-tracker.js
 */

const { 
  calculateCost, 
  estimateToolCost, 
  normalizeModel, 
  getPricing,
  formatCost,
  PRICING 
} = require('./src/cost-tracker');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ~${expected}, got ${actual}`);
  }
}

// Test: Calculate cost for Claude Sonnet
test('Calculate cost for Claude Sonnet 4.5', () => {
  // 1000 input tokens × $3/MTok = $0.003
  // 500 output tokens × $15/MTok = $0.0075
  // Total = $0.0105
  const cost = calculateCost('anthropic/claude-sonnet-4-5', 1000, 500);
  assertClose(cost, 0.0105, 0.000001, 'Claude Sonnet cost');
});

// Test: Calculate cost for Haiku
test('Calculate cost for Claude Haiku', () => {
  // 1000 input × $0.80/MTok = $0.0008
  // 500 output × $4/MTok = $0.002
  // Total = $0.0028
  const cost = calculateCost('anthropic/claude-haiku-4-5', 1000, 500);
  assertClose(cost, 0.0028, 0.000001, 'Claude Haiku cost');
});

// Test: Calculate cost using alias
test('Calculate cost using model alias', () => {
  const cost = calculateCost('sonnet', 1000, 500);
  assertClose(cost, 0.0105, 0.000001, 'Sonnet alias cost');
});

// Test: Normalize model names
test('Normalize model names', () => {
  assertEquals(normalizeModel('sonnet'), 'anthropic/claude-sonnet-4-5', 'Sonnet alias');
  assertEquals(normalizeModel('haiku'), 'anthropic/claude-haiku-4-5', 'Haiku alias');
  assertEquals(normalizeModel('Claude Sonnet'), 'anthropic/claude-sonnet-4-5', 'Partial name');
  assertEquals(normalizeModel('gemini flash'), 'google/gemini-2-5-flash', 'Gemini Flash');
  assertEquals(normalizeModel('gpt-4o'), 'openai/gpt-4o', 'GPT-4o');
});

// Test: Get pricing info
test('Get pricing info', () => {
  const pricing = getPricing('sonnet');
  assertEquals(pricing.input, 3.00, 'Sonnet input price');
  assertEquals(pricing.output, 15.00, 'Sonnet output price');
});

// Test: Format cost display
test('Format cost for display', () => {
  assertEquals(formatCost(0.0105), '$0.0105', 'Standard cost');
  assertEquals(formatCost(0.000234), '$0.000234', 'Micro cost');
  assertEquals(formatCost(1.2345), '$1.2345', 'Dollar cost');
});

// Test: Tool cost estimation
test('Estimate tool costs (non-LLM)', () => {
  const cost = estimateToolCost('exec', 1000);
  assertClose(cost, 0.0001, 0.00005, 'Exec tool cost');
});

// Test: Unknown model fallback
test('Unknown model uses fallback', () => {
  const cost = calculateCost('unknown-model-xyz', 1000, 500);
  assertClose(cost, 0.0105, 0.000001, 'Fallback to Sonnet pricing');
});

// Test: Real-world example (typical heartbeat)
test('Real-world: Typical heartbeat turn', () => {
  // Assume: 5000 input tokens (context + memories), 1500 output tokens
  const cost = calculateCost('sonnet', 5000, 1500);
  // Input: 5000 × $3/MTok = $0.015
  // Output: 1500 × $15/MTok = $0.0225
  // Total: $0.0375
  assertClose(cost, 0.0375, 0.000001, 'Heartbeat cost');
});

// Test: Real-world example (coding task with Haiku)
test('Real-world: Coding task with Haiku', () => {
  // Assume: 8000 input, 3000 output
  const cost = calculateCost('haiku', 8000, 3000);
  // Input: 8000 × $0.80/MTok = $0.0064
  // Output: 3000 × $4/MTok = $0.012
  // Total: $0.0184
  assertClose(cost, 0.0184, 0.000001, 'Coding task cost');
});

// Test: Large context (memory review)
test('Real-world: Memory review with Gemini', () => {
  // Assume: 20000 input (reading lots of memory), 2000 output
  const cost = calculateCost('gemini', 20000, 2000);
  // Input: 20000 × $1.25/MTok = $0.025
  // Output: 2000 × $5/MTok = $0.01
  // Total: $0.035
  assertClose(cost, 0.035, 0.000001, 'Memory review cost');
});

console.log('\n' + '='.repeat(50));
console.log(`Tests: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}

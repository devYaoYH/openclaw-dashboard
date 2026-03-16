/**
 * Cost Tracker - Accurate token-based cost calculation for AOS
 * 
 * Pricing data from provider APIs (as of March 2026)
 * Usage:
 *   const { calculateCost, PRICING } = require('./cost-tracker');
 *   const cost = calculateCost('anthropic/claude-sonnet-4-5', 1000, 500);
 */

// Pricing per million tokens (MTok)
const PRICING = {
  'anthropic/claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'anthropic/claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'anthropic/claude-opus-4': { input: 15.00, output: 75.00 },
  'google/gemini-2-5-flash': { input: 0.075, output: 0.30 },
  'google/gemini-3-pro': { input: 1.25, output: 5.00 },
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'openai/o1': { input: 15.00, output: 60.00 },
  'openai/o1-mini': { input: 3.00, output: 12.00 },
};

// Model aliases (from OpenClaw config)
const MODEL_ALIASES = {
  'sonnet': 'anthropic/claude-sonnet-4-5',
  'haiku': 'anthropic/claude-haiku-4-5',
  'opus': 'anthropic/claude-opus-4',
  'gemini-flash': 'google/gemini-2-5-flash',
  'gemini': 'google/gemini-3-pro',
  'gpt4o': 'openai/gpt-4o',
  'gpt4o-mini': 'openai/gpt-4o-mini',
};

/**
 * Calculate cost for a single API call
 * @param {string} model - Model name (full or alias)
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @returns {number} Cost in USD (rounded to 6 decimal places)
 */
function calculateCost(model, inputTokens, outputTokens) {
  // Resolve alias
  const resolvedModel = MODEL_ALIASES[model] || model;
  
  // Get pricing
  const pricing = PRICING[resolvedModel];
  if (!pricing) {
    console.warn(`Unknown model: ${model}, using fallback estimate`);
    // Fallback: assume mid-tier pricing (Sonnet-like)
    return ((inputTokens * 3.00) + (outputTokens * 15.00)) / 1_000_000;
  }
  
  // Calculate: (tokens × price_per_MTok) / 1M
  const inputCost = (inputTokens * pricing.input) / 1_000_000;
  const outputCost = (outputTokens * pricing.output) / 1_000_000;
  const totalCost = inputCost + outputCost;
  
  return Math.round(totalCost * 1_000_000) / 1_000_000; // Round to 6 decimals
}

/**
 * Estimate cost for tools that don't use LLM APIs
 * @param {string} toolName - Tool name (exec, read, write, etc.)
 * @param {number} latencyMs - Execution time in milliseconds
 * @returns {number} Cost estimate in USD
 */
function estimateToolCost(toolName, latencyMs = 0) {
  // Non-LLM tools have negligible cost (compute only)
  const costPerSecond = 0.0001; // Rough estimate for compute
  return Math.max(0.00001, (latencyMs / 1000) * costPerSecond);
}

/**
 * Parse model string from various formats
 * @param {string} modelStr - Model string (can include provider, alias, or full name)
 * @returns {string} Normalized model name
 */
function normalizeModel(modelStr) {
  if (!modelStr) return 'anthropic/claude-sonnet-4-5'; // Default
  
  // Check if it's an alias
  if (MODEL_ALIASES[modelStr]) {
    return MODEL_ALIASES[modelStr];
  }
  
  // Check if it's already a full provider/model format
  if (modelStr.includes('/')) {
    return modelStr;
  }
  
  // Try to match partial names
  const lower = modelStr.toLowerCase();
  if (lower.includes('sonnet')) return 'anthropic/claude-sonnet-4-5';
  if (lower.includes('haiku')) return 'anthropic/claude-haiku-4-5';
  if (lower.includes('opus')) return 'anthropic/claude-opus-4';
  if (lower.includes('gemini') && lower.includes('flash')) return 'google/gemini-2-5-flash';
  if (lower.includes('gemini')) return 'google/gemini-3-pro';
  if (lower.includes('gpt-4o-mini')) return 'openai/gpt-4o-mini';
  if (lower.includes('gpt-4o')) return 'openai/gpt-4o';
  if (lower.includes('o1-mini')) return 'openai/o1-mini';
  if (lower.includes('o1')) return 'openai/o1';
  
  return 'anthropic/claude-sonnet-4-5'; // Default fallback
}

/**
 * Get pricing info for a model
 * @param {string} model - Model name
 * @returns {object} Pricing object or null
 */
function getPricing(model) {
  const resolved = normalizeModel(model);
  return PRICING[resolved] || null;
}

/**
 * Format cost for display
 * @param {number} cost - Cost in USD
 * @returns {string} Formatted string (e.g., "$0.0023" or "$0.00")
 */
function formatCost(cost) {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`; // Show micro-costs with precision
  }
  return `$${cost.toFixed(4)}`;
}

module.exports = {
  PRICING,
  MODEL_ALIASES,
  calculateCost,
  estimateToolCost,
  normalizeModel,
  getPricing,
  formatCost,
};

#!/usr/bin/env node
/**
 * Query Telemetry Analytics - CLI for Phase 1 observability
 * 
 * Usage:
 *   ./query-analytics.js summary [window]
 *   ./query-analytics.js success [window]
 *   ./query-analytics.js cost [window]
 *   ./query-analytics.js latency [tool] [window]
 *   ./query-analytics.js errors [window]
 *   ./query-analytics.js recent-errors [limit]
 */

const {
  getSuccessRateByTool,
  getCostBreakdown,
  getLatencyStats,
  getErrorTrends,
  getRecentErrors,
  getSummaryStats,
} = require('./src/telemetry-analytics');

const { formatCost } = require('./src/cost-tracker');

const args = process.argv.slice(2);
const command = args[0] || 'summary';

function printTable(rows, columns) {
  if (rows.length === 0) {
    console.log('(no data)');
    return;
  }
  
  // Print header
  console.log(columns.map(c => c.label).join(' | '));
  console.log(columns.map(c => '-'.repeat(c.label.length)).join('-+-'));
  
  // Print rows
  rows.forEach(row => {
    const cells = columns.map(c => {
      const value = row[c.key];
      if (c.format === 'cost') return formatCost(value || 0);
      if (c.format === 'percent') return `${(value || 0).toFixed(2)}%`;
      if (c.format === 'number') return (value || 0).toLocaleString();
      if (c.format === 'ms') return `${Math.round(value || 0)}ms`;
      return value || '-';
    });
    console.log(cells.join(' | '));
  });
}

switch (command) {
  case 'summary': {
    const window = args[1] || '24h';
    console.log(`\n📊 Summary Stats (${window})\n`);
    
    const stats = getSummaryStats(window);
    console.log(`Total Calls:    ${stats.total_calls || 0}`);
    console.log(`Success Calls:  ${stats.success_calls || 0}`);
    console.log(`Success Rate:   ${stats.success_rate || 0}%`);
    console.log(`Total Cost:     ${formatCost(stats.total_cost || 0)}`);
    console.log(`Avg Cost:       ${formatCost(stats.avg_cost || 0)}`);
    console.log(`Total Tokens:   ${(stats.total_tokens || 0).toLocaleString()}`);
    console.log(`Avg Latency:    ${Math.round(stats.avg_latency || 0)}ms`);
    console.log('');
    break;
  }
  
  case 'success': {
    const window = args[1] || '24h';
    console.log(`\n✅ Success Rate by Tool (${window})\n`);
    
    const results = getSuccessRateByTool(window);
    printTable(results, [
      { key: 'tool_name', label: 'Tool', format: 'string' },
      { key: 'total_calls', label: 'Calls', format: 'number' },
      { key: 'success_calls', label: 'Success', format: 'number' },
      { key: 'success_rate', label: 'Rate', format: 'percent' },
    ]);
    console.log('');
    break;
  }
  
  case 'cost': {
    const window = args[1] || '24h';
    console.log(`\n💰 Cost Breakdown (${window})\n`);
    
    const results = getCostBreakdown(window);
    printTable(results, [
      { key: 'tool_name', label: 'Tool', format: 'string' },
      { key: 'total_calls', label: 'Calls', format: 'number' },
      { key: 'total_cost', label: 'Total Cost', format: 'cost' },
      { key: 'avg_cost', label: 'Avg Cost', format: 'cost' },
      { key: 'total_tokens', label: 'Tokens', format: 'number' },
    ]);
    console.log('');
    break;
  }
  
  case 'latency': {
    const tool = args[1] && args[1] !== 'all' ? args[1] : null;
    const window = args[2] || '24h';
    console.log(`\n⏱️  Latency Stats${tool ? ` (${tool})` : ''} (${window})\n`);
    
    const stats = getLatencyStats(tool, window);
    console.log(`p50 (median):  ${Math.round(stats.p50 || 0)}ms`);
    console.log(`p95:           ${Math.round(stats.p95 || 0)}ms`);
    console.log(`p99:           ${Math.round(stats.p99 || 0)}ms`);
    console.log(`Average:       ${Math.round(stats.avg || 0)}ms`);
    console.log(`Min:           ${Math.round(stats.min || 0)}ms`);
    console.log(`Max:           ${Math.round(stats.max || 0)}ms`);
    console.log('');
    break;
  }
  
  case 'errors': {
    const window = args[1] || '7d';
    console.log(`\n❌ Error Trends (${window})\n`);
    
    const results = getErrorTrends(window, 'day');
    printTable(results, [
      { key: 'period', label: 'Period', format: 'string' },
      { key: 'total_calls', label: 'Calls', format: 'number' },
      { key: 'error_calls', label: 'Errors', format: 'number' },
      { key: 'error_rate', label: 'Error Rate', format: 'percent' },
    ]);
    console.log('');
    break;
  }
  
  case 'recent-errors': {
    const limit = parseInt(args[1]) || 10;
    console.log(`\n🔴 Recent Errors (last ${limit})\n`);
    
    const results = getRecentErrors(limit);
    results.forEach((err, i) => {
      console.log(`${i + 1}. [${err.timestamp}] ${err.tool_name}`);
      console.log(`   Input: ${err.input_summary}`);
      console.log(`   Error: ${err.error_message || '(no message)'}`);
      console.log(`   Latency: ${err.latency_ms}ms`);
      console.log('');
    });
    break;
  }
  
  default:
    console.log('Usage:');
    console.log('  ./query-analytics.js summary [window]');
    console.log('  ./query-analytics.js success [window]');
    console.log('  ./query-analytics.js cost [window]');
    console.log('  ./query-analytics.js latency [tool] [window]');
    console.log('  ./query-analytics.js errors [window]');
    console.log('  ./query-analytics.js recent-errors [limit]');
    console.log('');
    console.log('Windows: 1h, 24h, 7d, 30d, all');
    process.exit(1);
}

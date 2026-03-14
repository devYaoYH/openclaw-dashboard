#!/usr/bin/env node
/**
 * AOS Telemetry Query Tool
 * 
 * Quick CLI for querying agent telemetry data.
 * 
 * Usage:
 *   ./query-telemetry.js stats [hours]      - Show success rates, costs, latency
 *   ./query-telemetry.js recent [limit]     - Show recent telemetry events
 *   ./query-telemetry.js errors [hours]     - Show recent errors
 *   ./query-telemetry.js cost [hours]       - Cost breakdown by tool
 */

const { getTelemetryStats, getRecentTelemetry } = require('./src/db');

const command = process.argv[2] || 'stats';
const arg = parseInt(process.argv[3]) || null;

function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return 'N/A';
  return num.toFixed(decimals);
}

function printStats(hours = 24) {
  console.log(`\n📊 Telemetry Stats (last ${hours} hours)\n`);
  
  const stats = getTelemetryStats('ethan', hours);
  
  // Success rates
  if (stats.successRate.length > 0) {
    console.log('✅ Success Rate by Tool:');
    console.log('─'.repeat(60));
    console.log('Tool'.padEnd(20) + 'Calls'.padEnd(10) + 'Success'.padEnd(15) + 'Rate');
    console.log('─'.repeat(60));
    
    stats.successRate.forEach(row => {
      console.log(
        (row.tool_name || 'unknown').padEnd(20) +
        row.total.toString().padEnd(10) +
        row.successes.toString().padEnd(15) +
        row.success_rate.toFixed(1) + '%'
      );
    });
    console.log();
  }
  
  // Costs
  if (stats.costs.length > 0) {
    console.log('💰 Cost Breakdown:');
    console.log('─'.repeat(60));
    console.log('Tool'.padEnd(20) + 'Calls'.padEnd(10) + 'Total Cost'.padEnd(15) + 'Avg Cost');
    console.log('─'.repeat(60));
    
    stats.costs.forEach(row => {
      console.log(
        (row.tool_name || 'unknown').padEnd(20) +
        row.calls.toString().padEnd(10) +
        ('$' + formatNumber(row.total_cost, 4)).padEnd(15) +
        '$' + formatNumber(row.avg_cost, 4)
      );
    });
    
    const totalCost = stats.costs.reduce((sum, row) => sum + (row.total_cost || 0), 0);
    console.log('─'.repeat(60));
    console.log('TOTAL'.padEnd(30) + ('$' + formatNumber(totalCost, 4)));
    console.log();
  }
  
  // Latency
  if (stats.latency.length > 0) {
    console.log('⏱️  Latency by Tool:');
    console.log('─'.repeat(60));
    console.log('Tool'.padEnd(20) + 'Avg (ms)'.padEnd(12) + 'Min (ms)'.padEnd(12) + 'Max (ms)');
    console.log('─'.repeat(60));
    
    stats.latency.forEach(row => {
      console.log(
        (row.tool_name || 'unknown').padEnd(20) +
        formatNumber(row.avg_ms, 0).padEnd(12) +
        (row.min_ms || 'N/A').toString().padEnd(12) +
        (row.max_ms || 'N/A').toString()
      );
    });
    console.log();
  }
  
  // Recent errors
  if (stats.errors.length > 0) {
    console.log('❌ Recent Errors:');
    console.log('─'.repeat(80));
    stats.errors.forEach(err => {
      console.log(`[${err.timestamp}] ${err.tool_name || 'unknown'}`);
      console.log(`  ${err.error_message || 'No message'}`);
      if (err.context) {
        try {
          const ctx = JSON.parse(err.context);
          console.log(`  Context: ${JSON.stringify(ctx)}`);
        } catch (e) {}
      }
      console.log();
    });
  } else {
    console.log('✨ No errors in last ' + hours + ' hours!\n');
  }
}

function printRecent(limit = 20) {
  console.log(`\n📝 Recent Telemetry Events (last ${limit})\n`);
  
  const events = getRecentTelemetry('ethan', limit);
  
  if (events.length === 0) {
    console.log('No telemetry events found.\n');
    return;
  }
  
  console.log('Time'.padEnd(20) + 'Event'.padEnd(15) + 'Tool'.padEnd(20) + 'Outcome'.padEnd(10) + 'Latency');
  console.log('─'.repeat(80));
  
  events.forEach(evt => {
    const time = new Date(evt.timestamp).toLocaleTimeString();
    console.log(
      time.padEnd(20) +
      evt.event_type.padEnd(15) +
      (evt.tool_name || 'N/A').padEnd(20) +
      (evt.outcome || 'N/A').padEnd(10) +
      (evt.latency_ms ? evt.latency_ms + 'ms' : 'N/A')
    );
  });
  console.log();
}

function printCosts(hours = 24) {
  console.log(`\n💰 Cost Analysis (last ${hours} hours)\n`);
  
  const stats = getTelemetryStats('ethan', hours);
  
  if (stats.costs.length === 0) {
    console.log('No cost data available.\n');
    return;
  }
  
  const totalCost = stats.costs.reduce((sum, row) => sum + (row.total_cost || 0), 0);
  const totalCalls = stats.costs.reduce((sum, row) => sum + (row.calls || 0), 0);
  
  console.log(`Total Cost: $${formatNumber(totalCost, 4)}`);
  console.log(`Total Calls: ${totalCalls}`);
  console.log(`Avg Cost/Call: $${formatNumber(totalCost / totalCalls, 4)}\n`);
  
  console.log('Tool'.padEnd(25) + 'Calls'.padEnd(10) + 'Total'.padEnd(15) + '% of Total');
  console.log('─'.repeat(70));
  
  stats.costs.forEach(row => {
    const percentage = (row.total_cost / totalCost * 100).toFixed(1);
    console.log(
      (row.tool_name || 'unknown').padEnd(25) +
      row.calls.toString().padEnd(10) +
      ('$' + formatNumber(row.total_cost, 4)).padEnd(15) +
      percentage + '%'
    );
  });
  console.log();
}

// Main
switch (command) {
  case 'stats':
    printStats(arg || 24);
    break;
  case 'recent':
    printRecent(arg || 20);
    break;
  case 'errors':
    const hours = arg || 24;
    const stats = getTelemetryStats('ethan', hours);
    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors (last ${hours} hours):\n`);
      stats.errors.forEach(err => {
        console.log(`[${err.timestamp}] ${err.tool_name || 'unknown'}`);
        console.log(`  ${err.error_message || 'No message'}\n`);
      });
    } else {
      console.log(`\n✨ No errors in last ${hours} hours!\n`);
    }
    break;
  case 'cost':
    printCosts(arg || 24);
    break;
  default:
    console.log('Unknown command. Available: stats, recent, errors, cost');
    process.exit(1);
}

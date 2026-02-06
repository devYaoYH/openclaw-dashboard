/**
 * Configuration loader for Agent Activity Dashboard
 * Reads from config.json in project root
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');

let config = {
  agent: { name: 'Agent', role: 'AI Assistant', emoji: '🤖' },
  dashboard: { title: 'Activity Stream', port: 3000, refreshInterval: 5000 },
  categories: []
};

try {
  const data = fs.readFileSync(CONFIG_PATH, 'utf8');
  config = { ...config, ...JSON.parse(data) };
} catch (err) {
  console.warn('⚠️ Could not load config.json, using defaults:', err.message);
}

module.exports = config;

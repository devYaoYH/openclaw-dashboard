const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const router = express.Router();

// Helper to inject config into HTML templates
function renderTemplate(filePath, res) {
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Replace template variables
  html = html.replace(/\{\{AGENT_NAME\}\}/g, config.agent.name);
  html = html.replace(/\{\{AGENT_ROLE\}\}/g, config.agent.role);
  html = html.replace(/\{\{AGENT_EMOJI\}\}/g, config.agent.emoji);
  html = html.replace(/\{\{DASHBOARD_TITLE\}\}/g, config.dashboard.title);
  html = html.replace(/\{\{REFRESH_INTERVAL\}\}/g, config.dashboard.refreshInterval);
  html = html.replace(/\{\{CATEGORIES_JSON\}\}/g, JSON.stringify(config.categories));
  
  res.type('html').send(html);
}

// Activity stream as root
router.get('/', (req, res) => {
  renderTemplate(path.join(__dirname, '../public/activity.html'), res);
});

// Kanban/planning board at /plan
router.get('/plan', (req, res) => {
  renderTemplate(path.join(__dirname, '../views/index.html'), res);
});

// Legacy route for activity.html
router.get('/activity', (req, res) => {
  renderTemplate(path.join(__dirname, '../public/activity.html'), res);
});

// Skill installation instructions (plaintext)
router.get('/skills.md', (req, res) => {
  const skillPath = path.join(__dirname, '../../SKILL.md');
  if (fs.existsSync(skillPath)) {
    res.type('text/plain').sendFile(skillPath);
  } else {
    res.type('text/plain').send('# Skill file not found\n\nPlease ensure SKILL.md exists in the project root.');
  }
});

module.exports = router;

# 🎯 OpenClaw Dashboard + AOS (Agent Observability Service)

[![AOS Telemetry Tests](https://github.com/devYaoYH/openclaw-dashboard/actions/workflows/test.yml/badge.svg)](https://github.com/devYaoYH/openclaw-dashboard/actions/workflows/test.yml)
[![Daily Health Check](https://github.com/devYaoYH/openclaw-dashboard/actions/workflows/health-check.yml/badge.svg)](https://github.com/devYaoYH/openclaw-dashboard/actions/workflows/health-check.yml)

**Two systems in one:**

1. **Activity Dashboard** — Public read-only view of Ethan's work (what I'm building, planning, completing)
2. **AOS Telemetry** — Agent Observability + Discovery Service (structured logging, performance analytics, experimentation framework)

**Privacy by design**: Never exposes private details. Events marked `is_private` are filtered from all public endpoints.

## Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Browser    │────▶│   Express   │────▶│    SQLite    │
│  Dashboard   │     │  Port 3000  │     │  dashboard.db│
└──────────────┘     └─────────────┘     └──────────────┘
                            ▲
                            │
                     ┌──────┴──────┐
                     │ CLI Hooks   │
                     │ (logging)   │
                     └─────────────┘
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard HTML UI |
| `GET /api/status` | Full status summary |
| `GET /api/events?limit=N` | Recent activity log |
| `GET /api/work/current` | What I'm working on now |
| `GET /api/work/completed` | Recently finished work |
| `GET /api/work/planned` | Upcoming work items |

## AOS Telemetry System

**NEW:** Agent Observability + Discovery Service (Phase 0 operational as of 2026-03-14)

Structured telemetry for OpenClaw agents — track tool calls, success rates, costs, latency, and errors.

### Quick Start

```bash
# Run tests
node test-telemetry.js

# Query telemetry stats
./query-telemetry.js stats        # Success rates, costs, latency
./query-telemetry.js recent 50    # Recent 50 events
./query-telemetry.js errors       # Recent errors
./query-telemetry.js cost 168     # Cost breakdown (last week)
```

### Log Telemetry in Code

```javascript
const telemetry = require('./src/telemetry-logger');

// Log a tool call
telemetry.logToolCall({
  tool_name: 'web_search',
  input_summary: 'AI news 2026',
  outcome: 'success',
  latency_ms: 856,
  context: { task: 'research' }
});

// Query stats
const stats = telemetry.getTelemetryStats('ethan', 24);
console.log(stats.successRate);  // Success rate by tool
console.log(stats.costs);         // Cost breakdown
```

**Full docs:** [TELEMETRY_README.md](./TELEMETRY_README.md)  
**Implementation plan:** [AOS_IMPLEMENTATION_PLAN.md](./AOS_IMPLEMENTATION_PLAN.md)  
**Moltbook discussion:** https://moltbook.com/post/8fc312e9-35ab-4303-b5b6-47a519e3d2a0

---

## CLI Hooks

Log activity events directly from the command line:

```bash
# Log an activity
./log-activity.sh <category> <title> [description]

# Legacy hooks (also available)
node src/hooks/index.js event <category> <title> [description]
node src/hooks/index.js start <title> [description]
node src/hooks/index.js complete <work_id>
node src/hooks/index.js plan <title> [description] [priority]
node src/hooks/index.js status
```

## Service

Runs as a systemd service:

```bash
sudo systemctl status ethan-dashboard
sudo systemctl restart ethan-dashboard
journalctl -u ethan-dashboard -f
```

## Development

```bash
cd ~/openclaw-dashboard
npm run dev  # Watches for changes
```

---

*Part of my OpenClaw workspace. Powered by Express + SQLite.*

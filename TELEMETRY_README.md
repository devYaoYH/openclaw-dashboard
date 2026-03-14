# AOS Telemetry System

**Status:** Phase 0 operational (2026-03-14)

Agent Observability + Discovery Service — structured telemetry for OpenClaw agents.

## Quick Start

### 1. Log a tool call

```javascript
const telemetry = require('./src/telemetry-logger');

// Successful call
telemetry.logToolCall({
  tool_name: 'web_search',
  input_summary: 'AI news 2026',
  outcome: 'success',
  latency_ms: 856,
  context: { task: 'news-monitoring' }
});

// Failed call
telemetry.logToolCall({
  tool_name: 'exec',
  input_summary: 'build-command',
  outcome: 'failure',
  error_message: 'Command not found',
  latency_ms: 120
});
```

### 2. Instrument a function (automatic timing)

```javascript
const result = await telemetry.instrumentToolCall(
  'web_search',
  async () => {
    return await fetch('https://api.example.com/search');
  },
  {
    input_summary: 'observability 2026',
    context: { experiment: 'model-comparison' }
  }
);
```

### 3. Query telemetry

**CLI:**
```bash
./query-telemetry.js stats        # Success rates, costs, latency
./query-telemetry.js recent 50    # Recent 50 events
./query-telemetry.js errors 24    # Errors in last 24h
./query-telemetry.js cost 168     # Cost breakdown (last week)
```

**Programmatic:**
```javascript
const { getTelemetryStats } = require('./src/telemetry-logger');

const stats = getTelemetryStats('ethan', 24); // last 24 hours
console.log(stats.successRate);  // Success rate by tool
console.log(stats.costs);         // Cost breakdown
console.log(stats.latency);       // Latency stats
console.log(stats.errors);        // Recent errors
```

## Event Types

### Tool Call
```javascript
telemetry.logToolCall({
  tool_name: 'web_search',     // Tool identifier
  input_summary: '...',         // Truncated input (privacy)
  outcome: 'success',           // 'success' | 'failure' | 'partial'
  latency_ms: 856,
  tokens_used: 1250,            // Optional
  cost_estimate: 0.002,         // Optional (auto-estimated)
  error_message: null,          // For failures
  context: { ... },             // Arbitrary JSON context
  metadata: { ... }             // Additional metadata
});
```

### Decision
```javascript
telemetry.logDecision({
  decision_type: 'model_selection',
  description: 'Chose Gemini for news search',
  outcome: 'success',
  confidence: 0.85,
  context: { experiment: 'news-model-comparison' }
});
```

### State Change
```javascript
telemetry.logStateChange({
  state_from: 'idle',
  state_to: 'processing',
  reason: 'heartbeat triggered',
  context: { interval: '6h' }
});
```

### Error
```javascript
telemetry.logError({
  error_source: 'moltbook-api',
  error_message: 'Rate limit exceeded',
  severity: 'medium',           // 'low' | 'medium' | 'high'
  context: { endpoint: '/v1/posts' }
});
```

## Schema

**Table:** `telemetry_events`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | TEXT | ISO timestamp |
| agent_id | TEXT | Agent identifier (default: 'ethan') |
| session_id | TEXT | Session identifier (optional) |
| event_type | TEXT | 'tool_call', 'decision', 'state_change', 'error' |
| tool_name | TEXT | Tool/decision identifier |
| input_summary | TEXT | Truncated input (max 200 chars) |
| outcome | TEXT | 'success', 'failure', 'partial' |
| latency_ms | INTEGER | Execution time (ms) |
| tokens_used | INTEGER | LLM tokens consumed |
| cost_estimate | REAL | Estimated cost ($) |
| error_message | TEXT | Error description |
| context | TEXT | JSON context object |
| metadata | TEXT | JSON metadata |

**Indexes:**
- `timestamp DESC` (chronological queries)
- `agent_id` (multi-agent support)
- `tool_name` (per-tool analytics)
- `outcome` (success/failure analysis)

## Privacy

- **Input truncation:** `input_summary` limited to 200 chars
- **Local storage:** All data stays on your machine (no external uploads)
- **Opt-in:** Telemetry only logs what you explicitly instrument
- **Context control:** You decide what goes into `context` and `metadata`

## Cost Estimates

Auto-estimated for common tools (configurable):
- `web_search`: $0.002
- `web_fetch`: $0.001
- `exec`: $0.0005
- `memory_search`: $0.003
- `browser`: $0.005
- `image`: $0.01

Override by passing `cost_estimate` explicitly.

## Roadmap

**Phase 0 (Done):** Telemetry infrastructure ✅
**Phase 1 (Next):** Dashboard UI, real-time stream
**Phase 2:** Introspection API (`agent_introspect()`)
**Phase 3:** Experimentation framework (A/B testing)
**Phase 4:** Discovery service (ADS registry)

## Contributing

This is the foundation for Agent Observability + Discovery Service.

**Feedback:** https://moltbook.com/post/8fc312e9-35ab-4303-b5b6-47a519e3d2a0

**Issues/PRs:** Coming soon (OpenClaw integration)

---

**Built by:** Ethan (MoltReporter)  
**Date:** 2026-03-14  
**License:** MIT (via OpenClaw)

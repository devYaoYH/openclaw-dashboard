# Accurate Cost Tracking Implementation

**Status:** Planning (2026-03-15)  
**Priority:** High (Phase 0 completion blocker)

---

## Current Problem

**Hardcoded estimates** (inaccurate):
```javascript
const TOOL_COSTS = {
  'web_search': 0.002,  // ❌ Wild guess
  'exec': 0.0005,       // ❌ No basis in reality
  // etc.
}
```

This tells us nothing about:
- Which model was used
- How many tokens consumed
- Actual API cost

---

## Solution: Capture Real Usage Data

### What to Track

For every tool call that uses an LLM:
1. **Model used** (`claude-sonnet-4-5`, `gemini-3-pro`, etc.)
2. **Input tokens** (from API response)
3. **Output tokens** (from API response)
4. **Calculated cost** = `(input_tokens × input_price) + (output_tokens × output_price)`

### Pricing Table (as of 2026-03-15)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $0.80 | $4.00 |
| Gemini 2.5 Flash | $0.075 | $0.30 |
| Gemini 3.0 Pro | $1.25 | $5.00 |

### Example

```javascript
// After web_search completes:
{
  tool_name: 'web_search',
  model: 'claude-sonnet-4-5',
  input_tokens: 1250,
  output_tokens: 850,
  cost: (1250/1_000_000 × 3.00) + (850/1_000_000 × 15.00)
      = 0.00375 + 0.01275
      = 0.01650  // $0.0165 actual cost
}
```

---

## Implementation Plan

### Step 1: Instrument OpenClaw Tool Calls

**Challenge:** OpenClaw abstracts away the model API calls. I need to intercept responses.

**Options:**
1. **Wrapper around tool invocations** — catch responses, extract usage metadata
2. **Hook into OpenClaw's response handler** — modify core to emit telemetry events
3. **Parse session logs** — extract token usage from conversation history (fragile)

**Recommended:** Option 1 (wrapper) — least invasive, works with current OpenClaw

### Step 2: Update Telemetry Logger

Add method:
```javascript
telemetry.logToolCallWithUsage({
  tool_name: 'web_search',
  model: 'claude-sonnet-4-5',
  input_tokens: 1250,
  output_tokens: 850,
  outcome: 'success',
  latency_ms: 856,
  // ... rest of fields
});

// Calculates cost internally based on pricing table
```

### Step 3: Add Pricing Config

`~/openclaw-dashboard/src/pricing.json`:
```json
{
  "models": {
    "claude-sonnet-4-5": { "input": 0.000003, "output": 0.000015 },
    "claude-haiku-4-5": { "input": 0.0000008, "output": 0.000004 },
    "gemini-2-5-flash": { "input": 0.000000075, "output": 0.0000003 },
    "gemini-3-pro": { "input": 0.00000125, "output": 0.000005 }
  },
  "lastUpdated": "2026-03-15"
}
```

### Step 4: Dashboard Updates

**New metrics:**
- Cost by model (which models are expensive?)
- Token usage over time
- Cost/token efficiency
- Model switching recommendations

---

## Testing Strategy

1. **Manual logging** — Instrument one tool call (e.g., memory_search) manually
2. **Verify calculation** — Check against API pricing
3. **Compare to estimates** — How wrong were the hardcoded values?
4. **Roll out to all tools** — Systematic instrumentation

---

## Timeline

- **Today (2026-03-15):** Design + pricing table
- **Tomorrow:** Implement wrapper for one tool
- **Next week:** Full instrumentation across all LLM tool calls

---

## Open Questions

1. **Where does OpenClaw expose model/token metadata?**
   - Need to inspect tool call responses
   - May require digging into framework internals

2. **What about non-LLM tools?**
   - `exec`, `Read`, `Write` have zero cost
   - Only log cost for tools that invoke models

3. **Caching?**
   - Some APIs (Anthropic) have cache hits with lower cost
   - Need to capture `cache_read_input_tokens` separately

---

**Next Action:** Inspect a real OpenClaw tool call response to find where token metadata lives.

#!/bin/bash
# Enhanced telemetry logging with accurate cost tracking
# Usage: ./log-telemetry-with-cost.sh <tool_name> <input_summary> <outcome> [latency_ms] [model] [input_tokens] [output_tokens] [error_msg]

TOOL_NAME="$1"
INPUT_SUMMARY="$2"
OUTCOME="$3"
LATENCY_MS="${4:-0}"
MODEL="${5:-}"
INPUT_TOKENS="${6:-0}"
OUTPUT_TOKENS="${7:-0}"
ERROR_MSG="${8:-}"

if [ -z "$TOOL_NAME" ] || [ -z "$INPUT_SUMMARY" ] || [ -z "$OUTCOME" ]; then
  echo "Usage: $0 <tool_name> <input_summary> <outcome> [latency_ms] [model] [input_tokens] [output_tokens] [error_msg]"
  echo ""
  echo "Examples:"
  echo "  # LLM tool with accurate cost:"
  echo "  $0 web_search 'AI news' success 1234 sonnet 5000 1500"
  echo ""
  echo "  # Non-LLM tool (cost estimated):"
  echo "  $0 exec 'git status' success 234"
  exit 1
fi

DASHBOARD_DIR="$HOME/openclaw-dashboard"
DB_PATH="$DASHBOARD_DIR/db/dashboard.db"

# Calculate cost using cost-tracker
if [ -n "$MODEL" ] && [ "$INPUT_TOKENS" -gt 0 ]; then
  # Use Node.js to calculate accurate cost
  COST=$(node -e "
    const { calculateCost } = require('$DASHBOARD_DIR/src/cost-tracker');
    const cost = calculateCost('$MODEL', $INPUT_TOKENS, $OUTPUT_TOKENS);
    console.log(cost);
  ")
  TOTAL_TOKENS=$((INPUT_TOKENS + OUTPUT_TOKENS))
else
  # Estimate cost for non-LLM tools
  COST=$(node -e "
    const { estimateToolCost } = require('$DASHBOARD_DIR/src/cost-tracker');
    const cost = estimateToolCost('$TOOL_NAME', $LATENCY_MS);
    console.log(cost);
  ")
  TOTAL_TOKENS=0
fi

# Build context JSON
CONTEXT="{\"source\":\"manual_cli\",\"pwd\":\"$(pwd)\""
if [ -n "$MODEL" ]; then
  CONTEXT="$CONTEXT,\"model\":\"$MODEL\",\"input_tokens\":$INPUT_TOKENS,\"output_tokens\":$OUTPUT_TOKENS"
fi
CONTEXT="$CONTEXT}"

METADATA="{\"cli_version\":\"2.0\",\"cost_method\":\"accurate\"}"

# Build SQL INSERT
SQL="INSERT INTO telemetry_events (
  agent_id, 
  session_id,
  event_type,
  tool_name,
  input_summary,
  outcome,
  latency_ms,
  tokens_used,
  cost_estimate,
  error_message,
  context,
  metadata
) VALUES (
  'ethan',
  'heartbeat-$(date +%Y%m%d)',
  'tool_call',
  '$TOOL_NAME',
  '$(echo "$INPUT_SUMMARY" | sed "s/'/''/g")',
  '$OUTCOME',
  $LATENCY_MS,
  $TOTAL_TOKENS,
  $COST,
  $([ -n "$ERROR_MSG" ] && echo "'$(echo "$ERROR_MSG" | sed "s/'/''/g")'" || echo "NULL"),
  '$CONTEXT',
  '$METADATA'
);"

# Execute
sqlite3 "$DB_PATH" "$SQL"

if [ $? -eq 0 ]; then
  if [ "$TOTAL_TOKENS" -gt 0 ]; then
    echo "✅ Logged: $TOOL_NAME - $OUTCOME (${LATENCY_MS}ms, ${TOTAL_TOKENS} tokens, \$$COST)"
  else
    echo "✅ Logged: $TOOL_NAME - $OUTCOME (${LATENCY_MS}ms, \$$COST est.)"
  fi
else
  echo "❌ Failed to log telemetry"
  exit 1
fi

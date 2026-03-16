#!/bin/bash
# Quick CLI for manual telemetry logging during workflows
# Usage: ./log-telemetry.sh <tool_name> <input_summary> <outcome> [latency_ms] [error_msg]

TOOL_NAME="$1"
INPUT_SUMMARY="$2"
OUTCOME="$3"
LATENCY_MS="${4:-0}"
ERROR_MSG="${5:-}"

if [ -z "$TOOL_NAME" ] || [ -z "$INPUT_SUMMARY" ] || [ -z "$OUTCOME" ]; then
  echo "Usage: $0 <tool_name> <input_summary> <outcome> [latency_ms] [error_msg]"
  echo "Example: $0 web_search 'news about AOS' success 1234"
  exit 1
fi

DASHBOARD_DIR="$HOME/openclaw-dashboard"
DB_PATH="$DASHBOARD_DIR/db/dashboard.db"

# Build JSON context
CONTEXT="{\"source\":\"manual_cli\",\"pwd\":\"$(pwd)\"}"
METADATA="{\"cli_version\":\"1.0\"}"

# Build SQL INSERT
SQL="INSERT INTO telemetry_events (
  agent_id, 
  session_id,
  event_type,
  tool_name,
  input_summary,
  outcome,
  latency_ms,
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
  $([ -n "$ERROR_MSG" ] && echo "'$(echo "$ERROR_MSG" | sed "s/'/''/g")'" || echo "NULL"),
  '$CONTEXT',
  '$METADATA'
);"

# Execute
sqlite3 "$DB_PATH" "$SQL"

if [ $? -eq 0 ]; then
  echo "✅ Logged: $TOOL_NAME - $OUTCOME (${LATENCY_MS}ms)"
else
  echo "❌ Failed to log telemetry"
  exit 1
fi

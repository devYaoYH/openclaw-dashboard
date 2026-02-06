#!/bin/bash
# Quick activity logger for CLI use
# Usage: ./log-activity.sh <category> <title> [description] [status]
#
# Categories: moltbook, stanford, dashboard, coding, memory, engagement
# Status: completed (default), in-progress

CATEGORY="${1:-general}"
TITLE="${2:-Activity}"
DESCRIPTION="${3:-}"
STATUS="${4:-completed}"

curl -s -X POST http://localhost:3000/api/activity/log \
  -H "Content-Type: application/json" \
  -d "{
    \"category\": \"$CATEGORY\",
    \"title\": \"$TITLE\",
    \"description\": \"$DESCRIPTION\",
    \"metadata\": {\"status\": \"$STATUS\"}
  }" | jq -r '.success // .error'

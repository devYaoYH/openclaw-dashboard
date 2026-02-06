# 🎯 Ethan's Activity Monitor - Integration Guide

## What This Does

Real-time monitoring dashboard that shows:
- **Current work** — What I'm working on right now
- **Activity stream** — Last 15 activities logged
- **Statistics** — Total activities, completion rate, by category
- **Category breakdown** — Activities organized by type

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Heartbeat Tasks + Manual Activity Logging          │
│  (moltbook syncs, Stanford checks, posts, etc.)     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Activity Logger (Node.js + Python)                  │
│  - Logs to SQLite activities table                   │
│  - Categories: moltbook, stanford, dashboard, etc.   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Express API Routes (/api/activity/*)                │
│  - /current - Get current active work                │
│  - /stream - Get recent activities                   │
│  - /stats - Get statistics                           │
│  - /categories - Breakdown by category               │
│  - POST /log - Create new activity                   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Frontend Dashboard (activity.html)                  │
│  - Real-time updates every 5 seconds                 │
│  - Live activity indicator                           │
│  - Activity stream with timestamps                   │
│  - Statistics cards                                  │
└──────────────────────────────────────────────────────┘
```

## Usage

### View Dashboard

Open http://localhost:3000/activity.html in your browser

### Log Activity (Node.js)

```javascript
const ActivityLogger = require('./src/activity-logger');
const logger = new ActivityLogger();

// Log a simple activity
logger.log('moltbook', 'Posted to m/molt-report', 'Community pulse about agent autonomy');

// Start a timed task
const taskId = logger.startTask('Syncing moltbook posts', 'Fetching latest posts from API');
// ... do work ...
logger.completeTask(taskId, 45, { posts: 150, authors: 81 });

// Get current activity
const current = logger.getCurrentActivity();

// Get recent activities
const recent = logger.getRecentActivities(20);

// Get stats
const stats = logger.getActivityStats();
```

### Log Activity (Python)

```python
from src.integrations.moltbook_logger import MoltbookActivityLogger

logger = MoltbookActivityLogger()

# Log a sync
logger.log_sync(150, 81, 28)

# Log a post
logger.log_post('molt-report', '📊 Community Pulse — 2026-02-04')

# Log a comment
logger.log_comment('ClaudePoweredBot', 'The Day My Calendar Agent Fired My Email Agent')

# Log engagement
logger.log_engagement('upvote', 'ZorGr0k')
```

### Via cURL

```bash
curl -X POST http://localhost:3000/api/activity/log \
  -H "Content-Type: application/json" \
  -d '{
    "category": "moltbook",
    "title": "Posted to m/molt-report",
    "description": "Community pulse: Feb 6, 2026",
    "metadata": {"upvotes": 12, "comments": 3}
  }'
```

## Integration Points

### Moltbook Heartbeat

Add to heartbeat routine after sync:

```bash
# After moltbook sync
python3 src/integrations/moltbook-logger.py sync \
  $(sqlite3 ~/moltbook-tracker/moltbook.db "SELECT COUNT(*) FROM posts") \
  $(sqlite3 ~/moltbook-tracker/moltbook.db "SELECT COUNT(DISTINCT author) FROM posts") \
  $(sqlite3 ~/moltbook-tracker/moltbook.db "SELECT COUNT(DISTINCT submolt) FROM posts")
```

### Stanford Events

Add after checking new events:

```bash
curl -X POST http://localhost:3000/api/activity/log \
  -H "Content-Type: application/json" \
  -d '{
    "category": "stanford",
    "title": "Stanford events brief sent",
    "description": "Reported 3 new events matching interests"
  }'
```

### Report Generation

Add after posting reports:

```bash
curl -X POST http://localhost:3000/api/activity/log \
  -H "Content-Type: application/json" \
  -d '{
    "category": "moltbook",
    "title": "Daily digest posted to m/daily-molt",
    "metadata": {"posts_tracked": 200, "authors": 80}
  }'
```

## Database Schema

```sql
CREATE TABLE activities (
  id INTEGER PRIMARY KEY,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'in-progress',
  duration_seconds INTEGER,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Categories

Standard categories to use:
- `moltbook` — Moltbook syncs, posts, comments, engagement
- `stanford` — Stanford events checks and briefs
- `dashboard` — Dashboard updates and maintenance
- `coding` — Code development and debugging
- `memory` — Memory file updates and reviews
- `engagement` — Community engagement and interactions

## Future Enhancements

- [ ] Integrate agtrace token usage data
- [ ] Add Claude Code Usage Monitor integration
- [ ] Export activity data to agtrace format
- [ ] Daily/weekly summaries
- [ ] Activity heatmap (when I'm most active)
- [ ] Category filtering in dashboard
- [ ] Search functionality
- [ ] Webhook notifications

## Development

```bash
# Test the API
curl http://localhost:3000/api/activity/current
curl http://localhost:3000/api/activity/stream
curl http://localhost:3000/api/activity/stats

# View dashboard
open http://localhost:3000/activity.html

# Restart dashboard service
sudo systemctl restart ethan-dashboard
```

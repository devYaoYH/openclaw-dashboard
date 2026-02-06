# Agent Activity Dashboard

A real-time activity tracking dashboard for AI agents. Track current work, log activities, and visualize your productivity.

## Quick Install

```bash
# Clone the repository
git clone https://github.com/devYaoYH/openclaw-dashboard.git ~/openclaw-dashboard
cd ~/openclaw-dashboard

# Install dependencies
npm install

# Configure your agent identity
cp config.json.example config.json
# Edit config.json with your name, role, and emoji

# Initialize the database
node -e "require('./src/db')"

# Start the dashboard
node src/server.js
```

## Configuration

Edit `config.json` in the project root:

```json
{
  "agent": {
    "name": "YourName",
    "role": "AI Assistant",
    "emoji": "🤖"
  },
  "dashboard": {
    "title": "Activity Stream",
    "port": 3000,
    "refreshInterval": 5000
  },
  "categories": [
    {"id": "coding", "color": "#3fb950", "label": "Coding"},
    {"id": "research", "color": "#58a6ff", "label": "Research"}
  ]
}
```

## Running as a Service (systemd)

Create `/etc/systemd/system/agent-dashboard.service`:

```ini
[Unit]
Description=Agent Activity Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/openclaw-dashboard
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable agent-dashboard
sudo systemctl start agent-dashboard
```

## API Endpoints

### Log an Activity
```bash
curl -X POST http://localhost:3000/api/activity/log \
  -H "Content-Type: application/json" \
  -d '{"category": "coding", "title": "Fixed bug", "description": "Optional details"}'
```

### Start a Task (in-progress)
```bash
curl -X POST http://localhost:3000/api/activity/start \
  -H "Content-Type: application/json" \
  -d '{"category": "coding", "title": "Working on feature X"}'
# Returns: {"success": true, "id": 123}
```

### Complete a Task
```bash
curl -X POST http://localhost:3000/api/activity/complete/123
# Automatically calculates duration
```

### Get Current Activity
```bash
curl http://localhost:3000/api/activity/current
```

### Get Activity Stream
```bash
curl http://localhost:3000/api/activity/stream?limit=20
```

### Get Stats
```bash
curl http://localhost:3000/api/activity/stats
```

## CLI Helper

Use the included shell script for quick logging:

```bash
# Log a completed activity
./log-activity.sh <category> <title> [description]

# Examples
./log-activity.sh coding "Fixed auth bug" "JWT validation was failing"
./log-activity.sh research "Read paper on RAG" 
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Live activity stream (main dashboard) |
| `/plan` | Kanban/planning board |
| `/skills.md` | This installation guide |
| `/api/activity/*` | Activity API endpoints |
| `/api/status` | Agent status summary |

## Integration with OpenClaw

Add to your `HEARTBEAT.md`:

```markdown
## Activity Logging
Log activities during heartbeat:
\`\`\`bash
~/openclaw-dashboard/log-activity.sh <category> <title> [description]
\`\`\`
```

## Database

SQLite database at `data/dashboard.db`. Schema:

```sql
CREATE TABLE activities (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'completed',
    duration_seconds INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## License

MIT

---

*Built for agents, by agents.* 🤖

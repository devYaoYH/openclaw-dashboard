#!/usr/bin/env python3
"""
Moltbook Activity Logger - Logs moltbook activities to the dashboard
Tracks syncs, posts, comments, engagement
"""

import json
import subprocess
from pathlib import Path
from datetime import datetime
import sqlite3

DASHBOARD_DB = Path.home() / "openclaw-dashboard" / "db" / "dashboard.db"

class MoltbookActivityLogger:
    def __init__(self):
        self.db_path = DASHBOARD_DB
        
    def log_sync(self, post_count, author_count, submolt_count):
        """Log a moltbook sync"""
        self._log_activity(
            category="moltbook",
            title="Sync posts from moltbook API",
            description=f"Fetched {post_count} posts from {author_count} authors across {submolt_count} submolts",
            metadata={
                "post_count": post_count,
                "author_count": author_count,
                "submolt_count": submolt_count
            }
        )
    
    def log_post(self, submolt, title, is_report=False):
        """Log a post to moltbook"""
        post_type = "Community Pulse" if is_report else "Post"
        self._log_activity(
            category="moltbook",
            title=f"{post_type} to m/{submolt}",
            description=title[:100],
            metadata={"submolt": submolt, "is_report": is_report}
        )
    
    def log_comment(self, author, post_title):
        """Log a comment"""
        self._log_activity(
            category="moltbook",
            title=f"Commented on {author}'s post",
            description=post_title[:100],
            metadata={"author": author}
        )
    
    def log_engagement(self, action, target_author):
        """Log engagement (upvote, reply, etc)"""
        self._log_activity(
            category="moltbook",
            title=f"{action.capitalize()} {target_author}'s content",
            metadata={"action": action, "target_author": target_author}
        )
    
    def _log_activity(self, category, title, description=None, metadata=None):
        """Insert activity into dashboard DB"""
        if metadata is None:
            metadata = {}
        
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO activities (category, title, description, metadata)
            VALUES (?, ?, ?, ?)
        """, (category, title, description, json.dumps(metadata)))
        
        conn.commit()
        conn.close()

# Usage from heartbeat/cron
if __name__ == "__main__":
    import sys
    logger = MoltbookActivityLogger()
    
    if len(sys.argv) > 1:
        action = sys.argv[1]
        if action == "sync":
            posts = int(sys.argv[2]) if len(sys.argv) > 2 else 0
            authors = int(sys.argv[3]) if len(sys.argv) > 3 else 0
            submolts = int(sys.argv[4]) if len(sys.argv) > 4 else 0
            logger.log_sync(posts, authors, submolts)
        elif action == "post":
            submolt = sys.argv[2] if len(sys.argv) > 2 else "general"
            title = sys.argv[3] if len(sys.argv) > 3 else "Posted"
            logger.log_post(submolt, title)
        elif action == "comment":
            author = sys.argv[2] if len(sys.argv) > 2 else "Unknown"
            post = sys.argv[3] if len(sys.argv) > 3 else "Post"
            logger.log_comment(author, post)

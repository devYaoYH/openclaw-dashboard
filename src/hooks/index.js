/**
 * Event logging hooks for Ethan's dashboard
 * 
 * Usage from CLI:
 *   node src/hooks/index.js event <category> <title> [description]
 *   node src/hooks/index.js start <title> [description]
 *   node src/hooks/index.js complete <work_id>
 *   node src/hooks/index.js plan <title> [description] [priority]
 */

const db = require('../db');

const [,, action, ...args] = process.argv;

switch (action) {
  case 'event': {
    const [category, title, description] = args;
    if (!category || !title) {
      console.error('Usage: node src/hooks/index.js event <category> <title> [description]');
      process.exit(1);
    }
    const result = db.logEvent(category, title, description || null);
    console.log(`✓ Logged event #${result.lastInsertRowid}`);
    break;
  }
  
  case 'start': {
    const [title, description] = args;
    if (!title) {
      console.error('Usage: node src/hooks/index.js start <title> [description]');
      process.exit(1);
    }
    const result = db.startWork(title, description || null);
    console.log(`✓ Started work #${result.lastInsertRowid}: ${title}`);
    break;
  }
  
  case 'complete': {
    const [id] = args;
    if (!id) {
      console.error('Usage: node src/hooks/index.js complete <work_id>');
      process.exit(1);
    }
    db.completeWork(parseInt(id));
    console.log(`✓ Completed work #${id}`);
    break;
  }
  
  case 'plan': {
    const [title, description, priority] = args;
    if (!title) {
      console.error('Usage: node src/hooks/index.js plan <title> [description] [priority]');
      process.exit(1);
    }
    const result = db.addPlannedWork(title, description || null, parseInt(priority) || 0);
    console.log(`✓ Planned work #${result.lastInsertRowid}: ${title}`);
    break;
  }
  
  case 'status': {
    const current = db.getCurrentWork();
    const planned = db.getPlannedWork();
    const recent = db.getRecentEvents(5);
    
    console.log('\n🎯 Ethan Dashboard Status\n');
    
    console.log('📌 Current Work:');
    if (current.length === 0) {
      console.log('   (none)');
    } else {
      current.forEach(w => console.log(`   • ${w.title}`));
    }
    
    console.log('\n📋 Planned:');
    if (planned.length === 0) {
      console.log('   (none)');
    } else {
      planned.slice(0, 5).forEach(w => console.log(`   • ${w.title}`));
    }
    
    console.log('\n📝 Recent Events:');
    if (recent.length === 0) {
      console.log('   (none)');
    } else {
      recent.forEach(e => console.log(`   [${e.category}] ${e.title}`));
    }
    console.log('');
    break;
  }
  
  default:
    console.log(`
🎯 Ethan Dashboard Hooks

Commands:
  event <category> <title> [desc]  - Log an activity event
  start <title> [desc]             - Start working on something
  complete <id>                    - Mark work as complete
  plan <title> [desc] [priority]   - Add planned work
  status                           - Show current status
`);
}

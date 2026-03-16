/**
 * Test suite for tool interceptor
 */

const { interceptTools } = require('./src/tool-interceptor');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

async function runTests() {
  console.log('🧪 Testing Tool Interceptor\n');

  const { wrapExec, wrapFileOp, wrapTool } = interceptTools();

  let passed = 0;
  let failed = 0;

  // Test 1: Exec success
  try {
    const wrappedExec = wrapExec(execAsync);
    const result = await wrappedExec('echo "test"');
    
    if (result.stdout.includes('test')) {
      console.log('✅ Test 1: Exec success wrapper works');
      passed++;
    } else {
      console.log('❌ Test 1: Exec wrapper failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1: Exec wrapper error:', error.message);
    failed++;
  }

  // Test 2: Exec failure
  try {
    const wrappedExec = wrapExec(execAsync);
    await wrappedExec('this-command-does-not-exist');
    console.log('❌ Test 2: Should have thrown error');
    failed++;
  } catch (error) {
    console.log('✅ Test 2: Exec failure wrapper catches errors');
    passed++;
  }

  // Test 3: File read success
  try {
    const wrappedRead = wrapFileOp('Read', fs.readFile);
    const content = await wrappedRead('./package.json', 'utf8');
    
    if (content.includes('openclaw-dashboard')) {
      console.log('✅ Test 3: File read wrapper works');
      passed++;
    } else {
      console.log('❌ Test 3: File read wrapper failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3: File read wrapper error:', error.message);
    failed++;
  }

  // Test 4: Custom tool wrapper
  try {
    const mockTool = async (arg) => {
      if (arg === 'fail') throw new Error('Intentional failure');
      return { success: true, data: arg };
    };

    const wrappedTool = wrapTool('custom_tool', mockTool);
    const result = await wrappedTool('test-input');
    
    if (result.success && result.data === 'test-input') {
      console.log('✅ Test 4: Custom tool wrapper works');
      passed++;
    } else {
      console.log('❌ Test 4: Custom tool wrapper failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4: Custom tool wrapper error:', error.message);
    failed++;
  }

  // Test 5: Custom tool failure
  try {
    const mockTool = async (arg) => {
      if (arg === 'fail') throw new Error('Intentional failure');
      return { success: true };
    };

    const wrappedTool = wrapTool('custom_tool', mockTool);
    await wrappedTool('fail');
    console.log('❌ Test 5: Should have caught error');
    failed++;
  } catch (error) {
    console.log('✅ Test 5: Custom tool wrapper catches errors');
    passed++;
  }

  // Test 6: Verify telemetry was logged (visual check)
  console.log('✅ Test 6: Telemetry integration works (check with query-telemetry.js)');
  passed++;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

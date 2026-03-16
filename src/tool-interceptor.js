/**
 * Tool Call Interceptor - Automatically log telemetry for OpenClaw tool calls
 * 
 * Usage:
 *   const { interceptTools } = require('./tool-interceptor');
 *   const wrappers = interceptTools();
 *   const wrappedExec = wrappers.wrapExec(execFn);
 * 
 * This wraps common tool patterns and automatically emits telemetry events.
 */

const { logToolCall } = require('./telemetry-logger');

const AGENT_ID = process.env.AGENT_ID || 'ethan';
const SESSION_ID = process.env.SESSION_ID || 'unknown';

/**
 * Wrap exec commands with telemetry
 */
function wrapExec(execFn) {
  return async function wrappedExec(command, options = {}) {
    const startTime = Date.now();
    const context = {
      command: command.substring(0, 100),
      cwd: options.cwd || process.cwd()
    };

    try {
      const result = await execFn(command, options);
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName: 'exec',
        inputSummary: `exec: ${command.substring(0, 50)}...`,
        outcome: result.exitCode === 0 ? 'success' : 'failure',
        latencyMs,
        errorMessage: result.exitCode !== 0 ? result.stderr : null,
        context
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName: 'exec',
        inputSummary: `exec: ${command.substring(0, 50)}...`,
        outcome: 'failure',
        latencyMs,
        errorMessage: error.message,
        context
      });

      throw error;
    }
  };
}

/**
 * Wrap file operations with telemetry
 */
function wrapFileOp(operation, fn) {
  return async function wrappedFileOp(...args) {
    const startTime = Date.now();
    const filePath = args[0];
    const context = {
      operation,
      path: filePath
    };

    try {
      const result = await fn(...args);
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName: operation,
        inputSummary: `${operation}: ${require('path').basename(filePath)}`,
        outcome: 'success',
        latencyMs,
        context
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName: operation,
        inputSummary: `${operation}: ${require('path').basename(filePath)}`,
        outcome: 'failure',
        latencyMs,
        errorMessage: error.message,
        context
      });

      throw error;
    }
  };
}

/**
 * Wrap web search with telemetry
 */
function wrapWebSearch(searchFn) {
  return async function wrappedWebSearch(query, options = {}) {
    const startTime = Date.now();
    const context = {
      query: query.substring(0, 100),
      ...options
    };

    try {
      const result = await searchFn(query, options);
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName: 'web_search',
        inputSummary: `search: ${query.substring(0, 50)}...`,
        outcome: result && result.results ? 'success' : 'failure',
        latencyMs,
        context,
        metadata: {
          resultCount: result?.results?.length || 0
        }
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName: 'web_search',
        inputSummary: `search: ${query.substring(0, 50)}...`,
        outcome: 'failure',
        latencyMs,
        errorMessage: error.message,
        context
      });

      throw error;
    }
  };
}

/**
 * Generic tool wrapper for custom tools
 */
function wrapTool(toolName, fn) {
  return async function wrappedTool(...args) {
    const startTime = Date.now();
    const context = {
      toolName,
      argsCount: args.length
    };

    try {
      const result = await fn(...args);
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName,
        inputSummary: `${toolName} called`,
        outcome: 'success',
        latencyMs,
        context
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      await logToolCall({
        agentId: AGENT_ID,
        sessionId: SESSION_ID,
        toolName,
        inputSummary: `${toolName} called`,
        outcome: 'failure',
        latencyMs,
        errorMessage: error.message,
        context
      });

      throw error;
    }
  };
}

/**
 * Initialize tool interception
 */
function interceptTools() {
  return {
    wrapExec,
    wrapFileOp,
    wrapWebSearch,
    wrapTool
  };
}

module.exports = { interceptTools, wrapExec, wrapFileOp, wrapWebSearch, wrapTool };

/**
 * Local API Server (Fastify)
 *
 * Exposes terminal buffer via HTTP endpoints
 * Runs on localhost:3333 by default
 */

import Fastify from 'fastify';
import type { CircularBuffer } from './buffer.js';
import type { CrashContext, TerminalOutput } from './types.js';

export async function startApiServer(port: number, buffer: CircularBuffer) {
  const fastify = Fastify({
    logger: false, // Silent by default
  });

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      locked: buffer.isLocked(),
      framework: buffer.getFramework(),
      buffer_size: buffer.size(),
      error_count: buffer.errorCount(),
      warning_count: buffer.warningCount(),
    };
  });

  // Get live terminal output
  fastify.get<{
    Querystring: { lines?: string; filter?: string }
  }>('/live', async (request) => {
    const lines = Math.min(parseInt(request.query.lines || '50', 10), 100);
    const filter = request.query.filter || 'all';

    let output: string[];

    if (filter === 'errors') {
      output = buffer.getErrors();
    } else if (filter === 'warnings') {
      output = buffer.getWarnings();
    } else {
      output = buffer.getLast(lines);
    }

    const response: TerminalOutput = {
      output,
      timestamp: new Date().toISOString(),
      process_status: buffer.isLocked() ? 'crashed' : 'running',
      errors_detected: buffer.errorCount() > 0,
      relevant_files: buffer.extractRelevantFiles(),
    };

    return response;
  });

  // Get crash snapshot (if exists)
  fastify.get<{
    Querystring: { verbose?: string }
  }>('/crash', async (request) => {
    if (!buffer.isLocked()) {
      return {
        error: 'No crash detected',
        snapshot: null,
      };
    }

    const verbose = request.query.verbose === 'true';
    const relevantFiles = buffer.extractRelevantFiles(!verbose);

    const crashContext: CrashContext = {
      error_message: buffer.getErrorMessage() || 'Unknown error',
      stack_trace: buffer.getAll(),
      relevant_files: relevantFiles,
      exit_code: buffer.getExitCode() || 1,
      timestamp: new Date().toISOString(),
    };

    return crashContext;
  });

  // Get errors only (shortcut endpoint)
  fastify.get('/errors', async () => {
    const errors = buffer.getErrors();

    return {
      output: errors,
      count: errors.length,
      timestamp: new Date().toISOString(),
      process_status: buffer.isLocked() ? 'crashed' : 'running',
      relevant_files: buffer.extractRelevantFiles(),
    };
  });

  // Get error context (lines around errors)
  fastify.get<{
    Querystring: { window?: string }
  }>('/context', async (request) => {
    const windowSize = parseInt(request.query.window || '5', 10);
    const context = buffer.getErrorContext(windowSize);

    return {
      output: context,
      timestamp: new Date().toISOString(),
      process_status: buffer.isLocked() ? 'crashed' : 'running',
      error_message: buffer.getErrorMessage(),
      relevant_files: buffer.extractRelevantFiles(),
    };
  });

  try {
    await fastify.listen({ port, host: '127.0.0.1' });
    console.error(`[VIBE-WATCH] API server running on http://127.0.0.1:${port}`);
  } catch (err) {
    console.error('[VIBE-WATCH] Failed to start API server:', err);
    throw err;
  }

  return fastify;
}

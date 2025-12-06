/**
 * Local API Server (Fastify)
 *
 * Exposes terminal buffer via HTTP endpoints
 * Runs on localhost:3333 by default
 */

import Fastify from 'fastify';
import type { CircularBuffer } from './buffer.js';

export async function startApiServer(port: number, buffer: CircularBuffer) {
  const fastify = Fastify({
    logger: false, // Silent by default
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', locked: buffer.isLocked() };
  });

  // Get live terminal output
  fastify.get<{
    Querystring: { lines?: string; filter?: string }
  }>('/live', async (request) => {
    const lines = parseInt(request.query.lines || '50', 10);
    const filter = request.query.filter || 'all';

    let output: string[];

    if (filter === 'errors') {
      output = buffer.getErrors();
    } else if (filter === 'warnings') {
      output = buffer.getWarnings();
    } else {
      output = buffer.getLast(lines);
    }

    return {
      output,
      timestamp: new Date().toISOString(),
      process_status: buffer.isLocked() ? 'crashed' : 'running',
      errors_detected: buffer.getErrors().length > 0,
    };
  });

  // Get crash snapshot (if exists)
  fastify.get('/crash', async () => {
    if (!buffer.isLocked()) {
      return {
        error: 'No crash detected',
        snapshot: null,
      };
    }

    return {
      output: buffer.getAll(),
      timestamp: new Date().toISOString(),
      process_status: 'crashed',
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

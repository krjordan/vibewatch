import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startApiServer } from '../src/api-server.js';
import { CircularBuffer } from '../src/buffer.js';
import type { FastifyInstance } from 'fastify';

describe('API Server', () => {
  let server: FastifyInstance;
  let buffer: CircularBuffer;
  const TEST_PORT = 33334; // Use a different port for tests

  beforeAll(async () => {
    buffer = new CircularBuffer(100);
    server = await startApiServer(TEST_PORT, buffer);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    buffer.clear();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);
      expect(response.statusCode).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.locked).toBe(false);
      expect(body.buffer_size).toBe(0);
      expect(body.error_count).toBe(0);
      expect(body.warning_count).toBe(0);
    });

    it('should reflect buffer state', async () => {
      buffer.addRaw('Error: something failed');
      buffer.addRaw('Warning: deprecated');
      buffer.setFramework('nextjs');

      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);
      expect(body.buffer_size).toBe(2);
      expect(body.error_count).toBe(1);
      expect(body.warning_count).toBe(1);
      expect(body.framework).toBe('nextjs');
    });
  });

  describe('GET /live', () => {
    it('should return live output', async () => {
      buffer.addRaw('line 1');
      buffer.addRaw('line 2');

      const response = await server.inject({
        method: 'GET',
        url: '/live',
      });

      const body = JSON.parse(response.body);
      expect(response.statusCode).toBe(200);
      expect(body.output).toEqual(['line 1', 'line 2']);
      expect(body.process_status).toBe('running');
      expect(body.detail_level).toBe('full');
    });

    it('should limit lines', async () => {
      for (let i = 0; i < 10; i++) {
        buffer.addRaw(`line ${i}`);
      }

      const response = await server.inject({
        method: 'GET',
        url: '/live?lines=5',
      });

      const body = JSON.parse(response.body);
      expect(body.output.length).toBe(5);
    });

    it('should filter errors', async () => {
      buffer.addRaw('normal line');
      buffer.addRaw('Error: something failed');
      buffer.addRaw('another normal line');

      const response = await server.inject({
        method: 'GET',
        url: '/live?filter=errors',
      });

      const body = JSON.parse(response.body);
      expect(body.output.length).toBe(1);
      expect(body.output[0]).toContain('Error:');
    });

    it('should filter warnings', async () => {
      buffer.addRaw('normal line');
      buffer.addRaw('Warning: deprecated');
      buffer.addRaw('another normal line');

      const response = await server.inject({
        method: 'GET',
        url: '/live?filter=warnings',
      });

      const body = JSON.parse(response.body);
      expect(body.output.length).toBe(1);
      expect(body.output[0]).toContain('Warning:');
    });

    it('should support detail=errors', async () => {
      buffer.addRaw('normal line');
      buffer.addRaw('Error: something failed');

      const response = await server.inject({
        method: 'GET',
        url: '/live?detail=errors',
      });

      const body = JSON.parse(response.body);
      expect(body.output.length).toBe(1);
      expect(body.detail_level).toBe('errors');
    });

    it('should support detail=context', async () => {
      buffer.addRaw('context line');
      buffer.addRaw('Error: something failed');
      buffer.addRaw('after error');

      const response = await server.inject({
        method: 'GET',
        url: '/live?detail=context',
      });

      const body = JSON.parse(response.body);
      expect(body.detail_level).toBe('context');
    });

    it('should detect errors in buffer', async () => {
      buffer.addRaw('Error: test error');

      const response = await server.inject({
        method: 'GET',
        url: '/live',
      });

      const body = JSON.parse(response.body);
      expect(body.errors_detected).toBe(true);
    });

    it('should show crashed status when locked', async () => {
      buffer.addRaw('Error: crash');
      buffer.lockSnapshot(1);

      const response = await server.inject({
        method: 'GET',
        url: '/live',
      });

      const body = JSON.parse(response.body);
      expect(body.process_status).toBe('crashed');
    });
  });

  describe('GET /crash', () => {
    it('should return error when no crash', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/crash',
      });

      const body = JSON.parse(response.body);
      expect(body.error).toBe('No crash detected');
      expect(body.snapshot).toBe(null);
    });

    it('should return crash context when crashed', async () => {
      buffer.addRaw('Starting...');
      buffer.addRaw('Error: Connection refused');
      buffer.addRaw('at /app/src/index.js:42:5');
      buffer.lockSnapshot(1);

      const response = await server.inject({
        method: 'GET',
        url: '/crash',
      });

      const body = JSON.parse(response.body);
      expect(body.error_message).toBe('Error: Connection refused');
      expect(body.exit_code).toBe(1);
      expect(body.stack_trace).toContain('Error: Connection refused');
    });

    it('should support verbose mode', async () => {
      buffer.addRaw('Error at /app/node_modules/express/lib/router.js:42:5');
      buffer.addRaw('at /app/src/index.js:10:3');
      buffer.lockSnapshot(1);

      const verboseResponse = await server.inject({
        method: 'GET',
        url: '/crash?verbose=true',
      });

      const body = JSON.parse(verboseResponse.body);
      // Verbose mode includes node_modules paths
      expect(body.relevant_files.some((f: string) => f.includes('node_modules'))).toBe(true);
    });
  });

  describe('GET /errors', () => {
    it('should return only errors', async () => {
      buffer.addRaw('normal line');
      buffer.addRaw('Error: first error');
      buffer.addRaw('another line');
      buffer.addRaw('TypeError: second error');

      const response = await server.inject({
        method: 'GET',
        url: '/errors',
      });

      const body = JSON.parse(response.body);
      expect(body.count).toBe(2);
      expect(body.output.length).toBe(2);
      expect(body.output[0]).toContain('Error:');
      expect(body.output[1]).toContain('TypeError:');
    });

    it('should extract relevant files', async () => {
      buffer.addRaw('Error at /app/src/index.js:42:5');

      const response = await server.inject({
        method: 'GET',
        url: '/errors',
      });

      const body = JSON.parse(response.body);
      expect(body.relevant_files.length).toBeGreaterThan(0);
    });
  });

  describe('GET /context', () => {
    it('should return error context', async () => {
      buffer.addRaw('line 1');
      buffer.addRaw('line 2');
      buffer.addRaw('Error: failed');
      buffer.addRaw('line 4');
      buffer.addRaw('line 5');

      const response = await server.inject({
        method: 'GET',
        url: '/context',
      });

      const body = JSON.parse(response.body);
      expect(body.output).toContain('line 2');
      expect(body.output).toContain('Error: failed');
      expect(body.output).toContain('line 4');
      expect(body.error_message).toBe('Error: failed');
    });

    it('should support custom window size', async () => {
      for (let i = 0; i < 10; i++) {
        buffer.addRaw(`line ${i}`);
      }
      buffer.addRaw('Error: at line 10');

      const response = await server.inject({
        method: 'GET',
        url: '/context?window=2',
      });

      const body = JSON.parse(response.body);
      expect(body.output.length).toBeLessThanOrEqual(5); // 2 before, error, 2 after
    });
  });
});

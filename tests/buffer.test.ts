import { describe, it, expect, beforeEach } from 'vitest';
import { CircularBuffer } from '../src/buffer.js';

describe('CircularBuffer', () => {
  let buffer: CircularBuffer;

  beforeEach(() => {
    buffer = new CircularBuffer(10);
  });

  describe('constructor', () => {
    it('should create buffer with specified size', () => {
      const buf = new CircularBuffer(50);
      expect(buf.size()).toBe(0);
    });

    it('should default to 100 if no size specified', () => {
      const buf = new CircularBuffer();
      // Add 101 lines, should only keep 100
      for (let i = 0; i < 101; i++) {
        buf.addRaw(`line ${i}`);
      }
      expect(buf.size()).toBe(100);
    });
  });

  describe('add', () => {
    it('should add lines to buffer', () => {
      buffer.add('line 1');
      buffer.add('line 2');
      expect(buffer.size()).toBe(2);
    });

    it('should filter noise lines', () => {
      buffer.setFramework('nextjs');
      buffer.add('Compiling...');
      buffer.add('✓ Compiled in 500ms');
      buffer.add('Error: failed');
      // Noise is filtered, only error should remain
      expect(buffer.getErrors().length).toBe(1);
    });

    it('should collapse repeated lines after threshold', () => {
      // NoiseFilter collapses after maxRepeats (3) - triggered on 4th identical line
      buffer.add('Building modules');
      buffer.add('Building modules');  // 1st repeat
      buffer.add('Building modules');  // 2nd repeat
      buffer.add('Building modules');  // 3rd repeat - triggers collapse message
      const lines = buffer.getAll();
      // The collapse message contains "repeated"
      expect(lines.some(l => l.includes('repeated'))).toBe(true);
    });
  });

  describe('addRaw', () => {
    it('should add lines without filtering', () => {
      buffer.setFramework('nextjs');
      buffer.addRaw('Compiling...');
      buffer.addRaw('✓ Ready in 500ms');
      expect(buffer.size()).toBe(2);
    });
  });

  describe('circular behavior', () => {
    it('should overwrite oldest lines when full', () => {
      for (let i = 0; i < 15; i++) {
        buffer.addRaw(`line ${i}`);
      }
      expect(buffer.size()).toBe(10);
      const lines = buffer.getAll();
      expect(lines[0]).toBe('line 5');
      expect(lines[9]).toBe('line 14');
    });
  });

  describe('getLast', () => {
    it('should return last N lines', () => {
      for (let i = 0; i < 10; i++) {
        buffer.addRaw(`line ${i}`);
      }
      const last = buffer.getLast(3);
      expect(last).toEqual(['line 7', 'line 8', 'line 9']);
    });

    it('should return all lines if N > size', () => {
      buffer.addRaw('line 1');
      buffer.addRaw('line 2');
      const last = buffer.getLast(10);
      expect(last).toEqual(['line 1', 'line 2']);
    });
  });

  describe('getAll', () => {
    it('should return all lines in order', () => {
      buffer.addRaw('first');
      buffer.addRaw('second');
      buffer.addRaw('third');
      expect(buffer.getAll()).toEqual(['first', 'second', 'third']);
    });
  });

  describe('getErrors', () => {
    it('should return only error lines', () => {
      buffer.addRaw('normal line');
      buffer.addRaw('Error: something failed');
      buffer.addRaw('another normal line');
      buffer.addRaw('TypeError: undefined is not a function');
      const errors = buffer.getErrors();
      expect(errors.length).toBe(2);
      expect(errors[0]).toContain('Error:');
      expect(errors[1]).toContain('TypeError:');
    });
  });

  describe('getWarnings', () => {
    it('should return only warning lines', () => {
      buffer.addRaw('normal line');
      buffer.addRaw('Warning: deprecated');
      buffer.addRaw('DeprecationWarning: use newAPI');
      const warnings = buffer.getWarnings();
      expect(warnings.length).toBe(2);
    });
  });

  describe('errorCount', () => {
    it('should count errors', () => {
      buffer.addRaw('Error: one');
      buffer.addRaw('normal');
      buffer.addRaw('Error: two');
      expect(buffer.errorCount()).toBe(2);
    });
  });

  describe('warningCount', () => {
    it('should count warnings', () => {
      buffer.addRaw('Warning: one');
      buffer.addRaw('normal');
      buffer.addRaw('Warning: two');
      expect(buffer.warningCount()).toBe(2);
    });
  });

  describe('lockSnapshot', () => {
    it('should lock the buffer', () => {
      buffer.addRaw('line 1');
      buffer.lockSnapshot(1);
      expect(buffer.isLocked()).toBe(true);
    });

    it('should preserve exit code', () => {
      buffer.lockSnapshot(127);
      expect(buffer.getExitCode()).toBe(127);
    });

    it('should prevent new lines from being added', () => {
      buffer.addRaw('line 1');
      buffer.lockSnapshot(1);
      buffer.addRaw('line 2');
      expect(buffer.size()).toBe(1);
    });
  });

  describe('unlock', () => {
    it('should unlock the buffer', () => {
      buffer.lockSnapshot(1);
      buffer.unlock();
      expect(buffer.isLocked()).toBe(false);
    });

    it('should allow new lines after unlock', () => {
      buffer.addRaw('line 1');
      buffer.lockSnapshot(1);
      buffer.unlock();
      buffer.addRaw('line 2');
      expect(buffer.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all lines', () => {
      buffer.addRaw('line 1');
      buffer.addRaw('line 2');
      buffer.clear();
      expect(buffer.size()).toBe(0);
    });

    it('should unlock when clearing', () => {
      buffer.lockSnapshot(1);
      buffer.clear();
      expect(buffer.isLocked()).toBe(false);
    });
  });

  describe('setFramework', () => {
    it('should set framework for filtering', () => {
      buffer.setFramework('nextjs');
      expect(buffer.getFramework()).toBe('nextjs');
    });
  });

  describe('extractRelevantFiles', () => {
    it('should extract file paths from buffer', () => {
      buffer.addRaw('Error at /app/src/index.ts:42:5');
      buffer.addRaw('at Object.<anonymous> (/app/src/utils.js:10:3)');
      const files = buffer.extractRelevantFiles();
      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.includes('index.ts'))).toBe(true);
    });

    it('should filter node_modules by default', () => {
      buffer.addRaw('at /app/node_modules/express/lib/router.js:42:5');
      buffer.addRaw('at /app/src/index.js:10:3');
      const files = buffer.extractRelevantFiles(true);
      expect(files.some(f => f.includes('node_modules'))).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract primary error message', () => {
      buffer.addRaw('Starting server...');
      buffer.addRaw('Error: Connection refused');
      buffer.addRaw('at net.js:42');
      expect(buffer.getErrorMessage()).toBe('Error: Connection refused');
    });

    it('should return null when no error', () => {
      buffer.addRaw('Server started');
      expect(buffer.getErrorMessage()).toBe(null);
    });
  });

  describe('getErrorContext', () => {
    it('should return lines around errors', () => {
      buffer.addRaw('line 1');
      buffer.addRaw('line 2');
      buffer.addRaw('Error: failed');
      buffer.addRaw('line 4');
      buffer.addRaw('line 5');
      const context = buffer.getErrorContext(1);
      expect(context).toContain('line 2');
      expect(context).toContain('Error: failed');
      expect(context).toContain('line 4');
    });
  });
});

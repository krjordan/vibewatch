import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProcessManager } from '../src/process-manager.js';

describe('ProcessManager', () => {
  let pm: ProcessManager;

  beforeEach(() => {
    pm = new ProcessManager();
  });

  afterEach(() => {
    pm.kill();
  });

  describe('spawn', () => {
    it('should spawn a process and emit log events', async () => {
      const logs: string[] = [];
      pm.on('log', (line: string) => logs.push(line));

      pm.spawn('echo', ['hello world']);

      await new Promise<void>((resolve) => {
        pm.on('exit', () => resolve());
      });

      expect(logs.some(l => l.includes('hello world'))).toBe(true);
    });

    it('should emit exit event with code 0 for successful process', async () => {
      const exitCode = await new Promise<number | null>((resolve) => {
        pm.on('exit', (code) => resolve(code));
        pm.spawn('true', []);
      });

      expect(exitCode).toBe(0);
    });

    it('should emit crash event for non-zero exit', async () => {
      const crashCode = await new Promise<number>((resolve) => {
        pm.on('crash', (code) => resolve(code));
        pm.spawn('false', []);
      });

      expect(crashCode).toBe(1);
    });

    it('should capture stderr', async () => {
      const logs: string[] = [];
      pm.on('log', (line: string) => logs.push(line));

      // Use a simple command that outputs to stderr across platforms
      // node -e is reliable for stderr output
      pm.spawn('node', ['-e', 'process.stderr.write("stderr output\\n")']);

      await new Promise<void>((resolve) => {
        pm.on('exit', () => resolve());
      });

      expect(logs.some(l => l.includes('stderr output'))).toBe(true);
    });
  });

  describe('kill', () => {
    it('should kill a running process', async () => {
      pm.spawn('sleep', ['10']);

      // Give process time to start
      await new Promise(resolve => setTimeout(resolve, 100));

      pm.kill();

      const exitCode = await new Promise<number | null>((resolve) => {
        pm.on('exit', (code) => resolve(code));
      });

      // Process was killed, exit code should be null or signal-based
      expect(pm.getStatus()).toBe('exited');
    });

    it('should not throw if no process running', () => {
      expect(() => pm.kill()).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return running initially', () => {
      expect(pm.getStatus()).toBe('running');
    });

    it('should return crashed after crash', async () => {
      pm.spawn('false', []);

      await new Promise<void>((resolve) => {
        pm.on('crash', () => resolve());
      });

      expect(pm.getStatus()).toBe('crashed');
    });

    it('should return exited after clean exit', async () => {
      pm.spawn('true', []);

      await new Promise<void>((resolve) => {
        pm.on('exit', () => resolve());
      });

      expect(pm.getStatus()).toBe('exited');
    });
  });

  describe('error handling', () => {
    it('should emit crash for invalid command (shell exits with 127)', async () => {
      // With shell: true, a nonexistent command causes the shell to exit with code 127
      // rather than emitting an error event
      const crashCode = await new Promise<number>((resolve) => {
        pm.on('crash', (code) => resolve(code));
        pm.spawn('nonexistent-command-xyz-12345', []);
      });

      expect(crashCode).toBe(127);
    });
  });
});

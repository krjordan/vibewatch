/**
 * Process Manager
 *
 * Spawns and monitors child processes
 * Pipes output to terminal and buffer
 */

import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { ProcessStatus } from './types.js';

export interface ProcessManagerEvents {
  log: (line: string) => void;
  crash: (exitCode: number) => void;
  exit: (exitCode: number | null) => void;
  error: (error: Error) => void;
}

export class ProcessManager extends EventEmitter {
  private child: ChildProcess | null = null;
  private status: ProcessStatus = 'running';

  /**
   * Spawn a command
   */
  spawn(command: string, args: string[]): void {
    console.error(`[VIBE-WATCH] Spawning: ${command} ${args.join(' ')}`);

    this.child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      env: process.env,
    });

    // Pipe stdout - both to terminal and emit for buffer
    this.child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();

      // Pass through to terminal
      process.stdout.write(data);

      // Emit for buffer
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          this.emit('log', line);
        }
      });
    });

    // Pipe stderr - both to terminal and emit for buffer
    this.child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();

      // Pass through to terminal
      process.stderr.write(data);

      // Emit for buffer
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          this.emit('log', line);
        }
      });
    });

    // Handle process exit
    this.child.on('exit', (code, signal) => {
      // Determine if this is a crash:
      // - Non-zero exit code
      // - Killed by a signal (except SIGINT/SIGTERM which are user-initiated)
      const isUserSignal = signal === 'SIGINT' || signal === 'SIGTERM';
      const isCrash = (code !== 0 && code !== null) ||
                      (signal !== null && !isUserSignal);

      if (isCrash) {
        this.status = 'crashed';
        const exitInfo = code !== null ? `exit code: ${code}` : `signal: ${signal}`;
        console.error(`\n[VIBE-WATCH] ❌ Crash detected (${exitInfo})`);
        this.emit('crash', code ?? 1);
      } else {
        this.status = 'exited';
        console.error(`\n[VIBE-WATCH] ✓ Process exited cleanly`);
      }

      this.emit('exit', code);
    });

    // Handle errors
    this.child.on('error', (err) => {
      console.error(`[VIBE-WATCH] ❌ Process error:`, err);
      this.emit('error', err);
    });
  }

  /**
   * Kill the child process
   */
  kill(): void {
    if (this.child) {
      this.child.kill('SIGTERM');
    }
  }

  /**
   * Get current status
   */
  getStatus(): ProcessStatus {
    return this.status;
  }
}

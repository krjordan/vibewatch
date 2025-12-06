/**
 * Circular Buffer implementation
 *
 * Stores last N lines of terminal output
 * Supports snapshot locking on crash
 */

import type { LogLine } from './types.js';

export class CircularBuffer {
  private buffer: LogLine[] = [];
  private maxSize: number;
  private snapshot: LogLine[] | null = null;
  private locked: boolean = false;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Add a line to the buffer
   */
  add(line: string): void {
    if (this.locked) {
      // Don't modify buffer after crash
      return;
    }

    const logLine: LogLine = {
      content: line,
      timestamp: new Date(),
      isError: this.detectError(line),
      isWarning: this.detectWarning(line),
    };

    this.buffer.push(logLine);

    // FIFO - remove oldest if exceeds max size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get last N lines from buffer
   */
  getLast(n: number = 50): string[] {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return [];

    return lines
      .slice(-n)
      .map(l => l.content);
  }

  /**
   * Get all lines from buffer
   */
  getAll(): string[] {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return [];

    return lines.map(l => l.content);
  }

  /**
   * Lock buffer snapshot (on crash)
   */
  lockSnapshot(): void {
    this.snapshot = [...this.buffer];
    this.locked = true;
  }

  /**
   * Check if buffer is locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Clear buffer and unlock
   */
  clear(): void {
    this.buffer = [];
    this.snapshot = null;
    this.locked = false;
  }

  /**
   * Detect if line contains error
   */
  private detectError(line: string): boolean {
    const errorPatterns = [
      /error:/i,
      /exception:/i,
      /failed:/i,
      /cannot/i,
      /undefined/i,
    ];

    return errorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Detect if line contains warning
   */
  private detectWarning(line: string): boolean {
    const warningPatterns = [
      /warning:/i,
      /deprecated:/i,
      /deprecation:/i,
    ];

    return warningPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Get errors only
   */
  getErrors(): string[] {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return [];

    return lines
      .filter(l => l.isError)
      .map(l => l.content);
  }

  /**
   * Get warnings only
   */
  getWarnings(): string[] {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return [];

    return lines
      .filter(l => l.isWarning)
      .map(l => l.content);
  }
}

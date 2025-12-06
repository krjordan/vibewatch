/**
 * Circular Buffer implementation
 *
 * Stores last N lines of terminal output
 * Supports snapshot locking on crash
 * Includes noise reduction and framework-aware filtering
 */

import type { LogLine } from './types.js';
import { LogAnalyzer, NoiseFilter, type Framework } from './analyzer.js';

export class CircularBuffer {
  private buffer: LogLine[] = [];
  private maxSize: number;
  private snapshot: LogLine[] | null = null;
  private locked: boolean = false;
  private noiseFilter: NoiseFilter;
  private framework: Framework = 'generic';
  private exitCode: number | null = null;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    this.noiseFilter = new NoiseFilter();
  }

  /**
   * Set the detected framework for better filtering
   */
  setFramework(framework: Framework): void {
    this.framework = framework;
  }

  /**
   * Get the current framework
   */
  getFramework(): Framework {
    return this.framework;
  }

  /**
   * Add a line to the buffer with noise filtering
   */
  add(line: string): void {
    if (this.locked) {
      // Don't modify buffer after crash
      return;
    }

    // Apply noise filter
    const filterResult = this.noiseFilter.shouldKeep(line, this.framework);
    if (!filterResult.keep) {
      return;
    }

    // Use modified content if provided (e.g., "[... repeated X times]")
    const content = filterResult.modified || line;

    const logLine: LogLine = {
      content,
      timestamp: new Date(),
      isError: LogAnalyzer.isError(line, this.framework),
      isWarning: LogAnalyzer.isWarning(line, this.framework),
    };

    this.buffer.push(logLine);

    // FIFO - remove oldest if exceeds max size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Add a line without noise filtering (for raw mode)
   */
  addRaw(line: string): void {
    if (this.locked) return;

    const logLine: LogLine = {
      content: line,
      timestamp: new Date(),
      isError: LogAnalyzer.isError(line, this.framework),
      isWarning: LogAnalyzer.isWarning(line, this.framework),
    };

    this.buffer.push(logLine);

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
   * Get all LogLine objects (with metadata)
   */
  getAllWithMetadata(): LogLine[] {
    const lines = this.locked ? this.snapshot : this.buffer;
    return lines ? [...lines] : [];
  }

  /**
   * Lock buffer snapshot (on crash)
   */
  lockSnapshot(exitCode?: number): void {
    this.snapshot = [...this.buffer];
    this.locked = true;
    this.exitCode = exitCode ?? null;
  }

  /**
   * Get the exit code that caused the crash
   */
  getExitCode(): number | null {
    return this.exitCode;
  }

  /**
   * Check if buffer is locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Unlock the buffer (without clearing)
   */
  unlock(): void {
    this.locked = false;
    this.snapshot = null;
    this.exitCode = null;
  }

  /**
   * Clear buffer and unlock
   */
  clear(): void {
    this.buffer = [];
    this.snapshot = null;
    this.locked = false;
    this.exitCode = null;
    this.noiseFilter.reset();
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

  /**
   * Get the current buffer size
   */
  size(): number {
    const lines = this.locked ? this.snapshot : this.buffer;
    return lines?.length ?? 0;
  }

  /**
   * Get error count
   */
  errorCount(): number {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return 0;
    return lines.filter(l => l.isError).length;
  }

  /**
   * Get warning count
   */
  warningCount(): number {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return 0;
    return lines.filter(l => l.isWarning).length;
  }

  /**
   * Extract relevant file paths from buffer content
   */
  extractRelevantFiles(filterNodeModules: boolean = true): string[] {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return [];

    const content = lines.map(l => l.content).join('\n');
    return LogAnalyzer.extractFilePaths(content, filterNodeModules);
  }

  /**
   * Get the primary error message
   */
  getErrorMessage(): string | null {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return null;

    return LogAnalyzer.extractErrorMessage(lines.map(l => l.content));
  }

  /**
   * Get context around errors (lines before/after)
   */
  getErrorContext(windowSize: number = 5): string[] {
    const lines = this.locked ? this.snapshot : this.buffer;
    if (!lines) return [];

    const contentLines = lines.map(l => l.content);

    // Find first error line
    const errorIndex = lines.findIndex(l => l.isError);
    if (errorIndex === -1) return contentLines.slice(-windowSize * 2);

    return LogAnalyzer.getErrorContext(contentLines, errorIndex, windowSize);
  }
}

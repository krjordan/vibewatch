/**
 * Shared TypeScript types for VibeWatch
 */

export interface LogLine {
  content: string;
  timestamp: Date;
  isError: boolean;
  isWarning: boolean;
}

export interface CrashContext {
  error_message: string;
  stack_trace: string[];
  relevant_files: string[];
  exit_code: number;
  timestamp: string;
}

export interface TerminalOutput {
  output: string[];
  timestamp: string;
  process_status: 'running' | 'crashed' | 'exited';
  errors_detected: boolean;
  relevant_files?: string[];
  detail_level?: string;
}

export type ProcessStatus = 'running' | 'crashed' | 'exited';

export type FilterMode = 'all' | 'errors' | 'warnings';

export type DetailLevel = 'errors' | 'context' | 'full';

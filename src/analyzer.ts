/**
 * Log Analyzer Engine
 *
 * Detects errors, warnings, and extracts file paths from stack traces
 */

export class LogAnalyzer {
  /**
   * Detect if process crashed based on exit code
   */
  static isCrash(exitCode: number | null): boolean {
    return exitCode !== null && exitCode !== 0;
  }

  /**
   * Extract file paths from stack trace
   */
  static extractFilePaths(stackTrace: string): string[] {
    const paths: string[] = [];

    // JavaScript/TypeScript pattern: at Object.<anonymous> (/path/file.js:42:5)
    const jsPattern = /\(([^)]+\.(?:js|ts|jsx|tsx)):(\d+):(\d+)\)/g;

    // Python pattern: File "/path/file.py", line 42
    const pyPattern = /File "([^"]+\.py)", line (\d+)/g;

    let match;

    // Extract JS/TS paths
    while ((match = jsPattern.exec(stackTrace)) !== null) {
      paths.push(`${match[1]}:${match[2]}`);
    }

    // Extract Python paths
    while ((match = pyPattern.exec(stackTrace)) !== null) {
      paths.push(`${match[1]}:${match[2]}`);
    }

    // Deduplicate
    return Array.from(new Set(paths));
  }

  /**
   * Strip ANSI color codes
   */
  static stripAnsi(text: string): string {
    // Basic ANSI pattern - will use strip-ansi package in actual implementation
    const ansiPattern = /\x1b\[[0-9;]*m/g;
    return text.replace(ansiPattern, '');
  }

  /**
   * Detect language from command
   */
  static detectLanguage(command: string): 'javascript' | 'python' | 'rust' | 'go' | 'unknown' {
    if (command.includes('npm') || command.includes('node') || command.includes('yarn') || command.includes('pnpm') || command.includes('bun')) {
      return 'javascript';
    }

    if (command.includes('python') || command.includes('pytest') || command.includes('uvicorn') || command.includes('django-admin')) {
      return 'python';
    }

    if (command.includes('cargo')) {
      return 'rust';
    }

    if (command.includes('go ')) {
      return 'go';
    }

    return 'unknown';
  }
}

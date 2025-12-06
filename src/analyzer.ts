/**
 * Log Analyzer Engine
 *
 * Detects errors, warnings, and extracts file paths from stack traces
 * Supports framework-specific patterns and noise reduction
 */

export type Framework = 'nextjs' | 'vite' | 'webpack' | 'django' | 'fastapi' | 'pytest' | 'generic';
export type Language = 'javascript' | 'python' | 'rust' | 'go' | 'unknown';

/**
 * Framework-specific error patterns
 */
export const FrameworkPatterns = {
  // JavaScript/TypeScript general errors
  javascript: {
    errors: [
      /Error:/i,
      /TypeError:/i,
      /SyntaxError:/i,
      /ReferenceError:/i,
      /RangeError:/i,
      /URIError:/i,
      /EvalError:/i,
      /Cannot find module/i,
      /Module not found/i,
      /Cannot read propert/i,
      /is not defined/i,
      /is not a function/i,
      /Unexpected token/i,
      /ENOENT:/i,
      /EACCES:/i,
      /EADDRINUSE:/i,
    ],
    warnings: [
      /warning:/i,
      /deprecated/i,
      /DeprecationWarning/i,
    ],
  },

  // Next.js specific
  nextjs: {
    errors: [
      /Failed to compile/i,
      /Compiled with errors/i,
      /Error: .* is not a valid Page/i,
      /Hydration failed/i,
      /Server Error/i,
      /Unhandled Runtime Error/i,
      /Error: Page .* is missing/i,
      /Module parse failed/i,
      /Build error occurred/i,
      /Invalid getStaticProps/i,
      /Invalid getServerSideProps/i,
      /Error: connect ECONNREFUSED/i,
      /⨯\s*Error:/,  // Next.js error symbol
    ],
    warnings: [
      /Fast Refresh had to perform a full reload/i,
      /Compiled with warnings/i,
      /Image with src .* was detected as priority/i,
      /next\/image.*Un-configured Host/i,
    ],
    noise: [
      /Compiling\s*\.{3}$/,
      /Compiled .* in \d+/,
      /wait.*compiling/i,
      /event.*compiled/i,
      /○\s*Compiling/,
      /✓\s*Ready in/,
      /✓\s*Compiled/,
      /▲\s*Next\.js/,  // Next.js banner
      /-\s*Local:/,
      /-\s*Network:/,
      /-\s*Environments:/,
      /-\s*Experiments/,
      /·\s*\w+/,  // Experiment list items
      /GET\s+\/.*\s+\d{3}\s+in\s+\d+ms/,  // Request logs (non-error)
      /POST\s+\/.*\s+\d{3}\s+in\s+\d+ms/,
    ],
  },

  // Vite specific
  vite: {
    errors: [
      /\[vite\].*error/i,
      /Pre-transform error/i,
      /Failed to resolve/i,
      /ENOENT.*no such file/i,
      /Internal server error/i,
      /500.*Internal Server Error/i,
    ],
    warnings: [
      /\[vite\].*warning/i,
      /\[plugin:.*\] warning/i,
    ],
    noise: [
      /VITE v\d+/,
      /ready in \d+ ms/,
      /➜.*Local:/,
      /➜.*Network:/,
      /\[vite\] hmr update/i,
      /\[vite\] page reload/i,
      /\d+:\d+:\d+.*\[vite\]/,
    ],
  },

  // Webpack specific
  webpack: {
    errors: [
      /ERROR in/,
      /Module build failed/,
      /ModuleNotFoundError/,
      /Cannot resolve/,
    ],
    warnings: [
      /WARNING in/,
    ],
    noise: [
      /webpack \d+\.\d+/,
      /Hash:/,
      /Version:/,
      /Time:/,
      /Built at:/,
      /Asset\s+Size/,
      /\[\d+\]/,
      /\d+%.*building/i,
    ],
  },

  // Python general
  python: {
    errors: [
      /Traceback \(most recent call last\):/,
      /^\s*File ".*", line \d+/,
      /ImportError:/,
      /ModuleNotFoundError:/,
      /NameError:/,
      /TypeError:/,
      /ValueError:/,
      /AttributeError:/,
      /KeyError:/,
      /IndexError:/,
      /SyntaxError:/,
      /IndentationError:/,
      /RuntimeError:/,
      /OSError:/,
      /FileNotFoundError:/,
      /PermissionError:/,
      /ConnectionError:/,
      /ZeroDivisionError:/,
    ],
    warnings: [
      /DeprecationWarning:/,
      /UserWarning:/,
      /RuntimeWarning:/,
      /FutureWarning:/,
      /PendingDeprecationWarning:/,
    ],
  },

  // Django specific
  django: {
    errors: [
      /django\..*Error/i,
      /ImproperlyConfigured/,
      /OperationalError/,
      /IntegrityError/,
      /TemplateDoesNotExist/,
      /TemplateSyntaxError/,
      /NoReverseMatch/,
      /DisallowedHost/,
      /CSRF verification failed/,
      /django\.db\.utils\./,
    ],
    warnings: [
      /RemovedInDjango/,
      /WARNINGS:/,
    ],
    noise: [
      /Watching for file changes/,
      /Performing system checks/,
      /System check identified/,
      /Starting development server/,
      /Quit the server with/,
      /\[\d{2}\/\w+\/\d{4} \d{2}:\d{2}:\d{2}\]/,
    ],
  },

  // FastAPI/Uvicorn specific
  fastapi: {
    errors: [
      /pydantic.*ValidationError/i,
      /RequestValidationError/,
      /HTTPException/,
      /ERROR:/,
      /Internal Server Error/,
      /uvicorn\.error/,
    ],
    warnings: [
      /WARNING:/,
      /DeprecationWarning/,
    ],
    noise: [
      /INFO:\s+Started/,
      /INFO:\s+Waiting/,
      /INFO:\s+Application startup/,
      /INFO:\s+Uvicorn running/,
      /INFO:\s+\d+\.\d+\.\d+\.\d+:\d+ -/,
    ],
  },

  // pytest specific
  pytest: {
    errors: [
      /FAILED/,
      /ERROR/,
      /AssertionError/,
      /E\s+assert/,
      /E\s+.*Error/,
      /short test summary info/i,
    ],
    warnings: [
      /warnings summary/i,
      /PytestWarning/,
      /pytest.*DeprecationWarning/,
    ],
    noise: [
      /^={3,}/,
      /^-{3,}/,
      /collected \d+ items?/,
      /^\.\.\./,
      /^\.+$/,
      /\d+ passed/,
      /^platform/,
      /^cachedir:/,
      /^rootdir:/,
      /^plugins:/,
    ],
  },
};

export class LogAnalyzer {
  private static detectedFramework: Framework = 'generic';

  /**
   * Detect if process crashed based on exit code
   */
  static isCrash(exitCode: number | null): boolean {
    return exitCode !== null && exitCode !== 0;
  }

  /**
   * Detect framework from command and output
   */
  static detectFramework(command: string, outputLines: string[] = []): Framework {
    const cmdLower = command.toLowerCase();
    const output = outputLines.join('\n').toLowerCase();

    // Check command patterns
    if (cmdLower.includes('next') || output.includes('next.js')) {
      this.detectedFramework = 'nextjs';
      return 'nextjs';
    }

    if (cmdLower.includes('vite') || output.includes('vite v')) {
      this.detectedFramework = 'vite';
      return 'vite';
    }

    if (cmdLower.includes('webpack') || output.includes('webpack')) {
      this.detectedFramework = 'webpack';
      return 'webpack';
    }

    if (cmdLower.includes('django') || cmdLower.includes('manage.py') || output.includes('django')) {
      this.detectedFramework = 'django';
      return 'django';
    }

    if (cmdLower.includes('uvicorn') || cmdLower.includes('fastapi') || output.includes('fastapi')) {
      this.detectedFramework = 'fastapi';
      return 'fastapi';
    }

    if (cmdLower.includes('pytest') || output.includes('pytest')) {
      this.detectedFramework = 'pytest';
      return 'pytest';
    }

    this.detectedFramework = 'generic';
    return 'generic';
  }

  /**
   * Get current detected framework
   */
  static getDetectedFramework(): Framework {
    return this.detectedFramework;
  }

  /**
   * Check if line is an error (framework-aware)
   */
  static isError(line: string, framework: Framework = 'generic'): boolean {
    const language = this.detectLanguageFromLine(line);

    // Check language-specific patterns
    if (language === 'javascript') {
      if (FrameworkPatterns.javascript.errors.some(p => p.test(line))) return true;
    } else if (language === 'python') {
      if (FrameworkPatterns.python.errors.some(p => p.test(line))) return true;
    }

    // Check framework-specific patterns
    if (framework !== 'generic' && FrameworkPatterns[framework]) {
      const patterns = FrameworkPatterns[framework];
      if (patterns.errors?.some(p => p.test(line))) return true;
    }

    // Fallback generic patterns
    const genericPatterns = [
      /error/i,
      /exception/i,
      /fatal/i,
      /failed/i,
      /crash/i,
    ];
    return genericPatterns.some(p => p.test(line));
  }

  /**
   * Check if line is a warning (framework-aware)
   */
  static isWarning(line: string, framework: Framework = 'generic'): boolean {
    const language = this.detectLanguageFromLine(line);

    // Check language-specific patterns
    if (language === 'javascript') {
      if (FrameworkPatterns.javascript.warnings.some(p => p.test(line))) return true;
    } else if (language === 'python') {
      if (FrameworkPatterns.python.warnings.some(p => p.test(line))) return true;
    }

    // Check framework-specific patterns
    if (framework !== 'generic' && FrameworkPatterns[framework]) {
      const patterns = FrameworkPatterns[framework];
      if (patterns.warnings?.some(p => p.test(line))) return true;
    }

    // Fallback generic patterns
    const genericPatterns = [
      /warning/i,
      /deprecated/i,
      /caution/i,
    ];
    return genericPatterns.some(p => p.test(line));
  }

  /**
   * Check if line is noise (should be collapsed/filtered)
   */
  static isNoise(line: string, framework: Framework = 'generic'): boolean {
    // Empty or whitespace-only lines
    if (!line.trim()) return true;

    // Progress indicators
    if (/^\s*\d+%/.test(line)) return true;
    if (/\[\s*=*\s*\]/.test(line)) return true;
    if (/\.{3,}$/.test(line) && !this.isError(line)) return true;

    // Framework-specific noise
    if (framework !== 'generic' && FrameworkPatterns[framework]) {
      const patterns = FrameworkPatterns[framework];
      if (patterns.noise?.some(p => p.test(line))) return true;
    }

    return false;
  }

  /**
   * Detect if line looks like JavaScript or Python
   */
  private static detectLanguageFromLine(line: string): Language {
    // Python indicators
    if (/File ".*\.py"/.test(line)) return 'python';
    if (/Traceback \(most recent/.test(line)) return 'python';
    if (/^\s+at\s+/.test(line)) return 'javascript'; // JS stack trace
    if (/\.js:\d+:\d+/.test(line)) return 'javascript';
    if (/\.ts:\d+:\d+/.test(line)) return 'javascript';

    return 'unknown';
  }

  /**
   * Extract file paths from stack trace
   */
  static extractFilePaths(stackTrace: string, filterNodeModules: boolean = true): string[] {
    const paths: string[] = [];

    // JavaScript/TypeScript patterns
    const jsPatterns = [
      // at Object.<anonymous> (/path/file.js:42:5)
      /\(([^)]+\.(?:js|ts|jsx|tsx|mjs|cjs)):(\d+)(?::(\d+))?\)/g,
      // at /path/file.js:42:5
      /at\s+([^\s(]+\.(?:js|ts|jsx|tsx|mjs|cjs)):(\d+)(?::(\d+))?/g,
      // /path/file.ts:42:5 - error TS
      /([^\s:]+\.(?:ts|tsx)):(\d+):(\d+)\s*-?\s*error/g,
      // ./src/file.ts:42:5
      /(\.\/[^\s:]+\.(?:js|ts|jsx|tsx)):(\d+)(?::(\d+))?/g,
    ];

    // Python pattern: File "/path/file.py", line 42
    const pyPattern = /File "([^"]+\.py)", line (\d+)/g;

    // Rust pattern: --> src/main.rs:42:5
    const rustPattern = /-->\s+([^\s:]+\.rs):(\d+):(\d+)/g;

    // Go pattern: /path/file.go:42:5
    const goPattern = /([^\s:]+\.go):(\d+)(?::(\d+))?/g;

    let match;

    // Extract JS/TS paths
    for (const pattern of jsPatterns) {
      while ((match = pattern.exec(stackTrace)) !== null) {
        const filePath = match[1];
        const line = match[2];

        // Filter node_modules if requested
        if (filterNodeModules && filePath.includes('node_modules')) continue;

        paths.push(`${filePath}:${line}`);
      }
    }

    // Extract Python paths
    while ((match = pyPattern.exec(stackTrace)) !== null) {
      const filePath = match[1];
      const line = match[2];

      // Filter site-packages if requested
      if (filterNodeModules && (filePath.includes('site-packages') || filePath.includes('/lib/python'))) continue;

      paths.push(`${filePath}:${line}`);
    }

    // Extract Rust paths
    while ((match = rustPattern.exec(stackTrace)) !== null) {
      paths.push(`${match[1]}:${match[2]}`);
    }

    // Extract Go paths
    while ((match = goPattern.exec(stackTrace)) !== null) {
      paths.push(`${match[1]}:${match[2]}`);
    }

    // Deduplicate while preserving order
    return [...new Set(paths)];
  }

  /**
   * Extract the primary error message from output
   */
  static extractErrorMessage(lines: string[]): string | null {
    for (const line of lines) {
      // Look for common error message patterns
      const errorPatterns = [
        /^Error:\s*(.+)$/i,
        /^TypeError:\s*(.+)$/i,
        /^SyntaxError:\s*(.+)$/i,
        /^ReferenceError:\s*(.+)$/i,
        /^([A-Z][a-z]+Error):\s*(.+)$/,
        /FAILED\s+(.+)/,
        /AssertionError:\s*(.+)/,
      ];

      for (const pattern of errorPatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[0];
        }
      }
    }

    // Fallback: return first error-like line
    for (const line of lines) {
      if (this.isError(line)) {
        return line.trim().substring(0, 200); // Truncate long lines
      }
    }

    return null;
  }

  /**
   * Get context lines around an error
   */
  static getErrorContext(lines: string[], errorIndex: number, windowSize: number = 5): string[] {
    const start = Math.max(0, errorIndex - windowSize);
    const end = Math.min(lines.length, errorIndex + windowSize + 1);
    return lines.slice(start, end);
  }

  /**
   * Strip ANSI color codes
   */
  static stripAnsi(text: string): string {
    // Comprehensive ANSI pattern
    const ansiPattern = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
    return text.replace(ansiPattern, '');
  }

  /**
   * Detect language from command
   */
  static detectLanguage(command: string): Language {
    const cmdLower = command.toLowerCase();

    if (cmdLower.includes('npm') || cmdLower.includes('node') || cmdLower.includes('yarn') ||
        cmdLower.includes('pnpm') || cmdLower.includes('bun') || cmdLower.includes('npx') ||
        cmdLower.includes('next') || cmdLower.includes('vite') || cmdLower.includes('webpack')) {
      return 'javascript';
    }

    if (cmdLower.includes('python') || cmdLower.includes('pytest') || cmdLower.includes('uvicorn') ||
        cmdLower.includes('django') || cmdLower.includes('flask') || cmdLower.includes('pip')) {
      return 'python';
    }

    if (cmdLower.includes('cargo') || cmdLower.includes('rustc')) {
      return 'rust';
    }

    if (cmdLower.includes('go ') || cmdLower.includes('go run') || cmdLower.includes('go build')) {
      return 'go';
    }

    return 'unknown';
  }
}

/**
 * Line relevance scores for prioritization
 */
export enum RelevanceScore {
  CRITICAL = 100,  // Error messages, crash indicators
  HIGH = 75,       // Stack trace lines, file paths
  MEDIUM = 50,     // Warnings, context
  LOW = 25,        // Info logs
  NOISE = 0,       // Should be filtered
}

/**
 * Scored line with relevance information
 */
export interface ScoredLine {
  content: string;
  score: RelevanceScore;
  lineNumber: number;
  isError: boolean;
  isWarning: boolean;
  filePath?: string;
}

/**
 * Output detail level for progressive disclosure
 */
export type DetailLevel = 'errors' | 'context' | 'full';

/**
 * Relevance Scorer - Assigns importance scores to log lines
 */
export class RelevanceScorer {
  /**
   * Score a single line
   */
  static scoreLine(line: string, framework: Framework = 'generic', lineNumber: number = 0): ScoredLine {
    const isError = LogAnalyzer.isError(line, framework);
    const isWarning = LogAnalyzer.isWarning(line, framework);
    const isNoise = LogAnalyzer.isNoise(line, framework);
    const filePath = this.extractFilePath(line);

    let score: RelevanceScore;

    if (isNoise) {
      score = RelevanceScore.NOISE;
    } else if (isError) {
      score = RelevanceScore.CRITICAL;
    } else if (isWarning) {
      score = RelevanceScore.HIGH;
    } else if (filePath) {
      // Stack trace lines with file paths
      score = RelevanceScore.HIGH;
    } else if (this.isStackTraceLine(line)) {
      score = RelevanceScore.MEDIUM;
    } else if (this.isInfoLog(line)) {
      score = RelevanceScore.LOW;
    } else {
      score = RelevanceScore.MEDIUM;
    }

    return {
      content: line,
      score,
      lineNumber,
      isError,
      isWarning,
      filePath,
    };
  }

  /**
   * Score multiple lines
   */
  static scoreLines(lines: string[], framework: Framework = 'generic'): ScoredLine[] {
    return lines.map((line, i) => this.scoreLine(line, framework, i));
  }

  /**
   * Filter lines by detail level (progressive disclosure)
   */
  static filterByDetailLevel(scoredLines: ScoredLine[], level: DetailLevel): ScoredLine[] {
    switch (level) {
      case 'errors':
        // Only critical errors
        return scoredLines.filter(l => l.score === RelevanceScore.CRITICAL);

      case 'context':
        // Errors + high relevance (stack traces, warnings)
        return scoredLines.filter(l => l.score >= RelevanceScore.HIGH);

      case 'full':
      default:
        // Everything except noise
        return scoredLines.filter(l => l.score > RelevanceScore.NOISE);
    }
  }

  /**
   * Get lines with context window around errors
   */
  static getErrorsWithContext(lines: string[], windowSize: number = 5, framework: Framework = 'generic'): string[] {
    const scored = this.scoreLines(lines, framework);
    const result: Set<number> = new Set();

    // Find error indices
    scored.forEach((line, index) => {
      if (line.isError) {
        // Add error line and surrounding context
        for (let i = Math.max(0, index - windowSize); i <= Math.min(lines.length - 1, index + windowSize); i++) {
          result.add(i);
        }
      }
    });

    // Build output with collapse indicators
    const output: string[] = [];
    let lastIndex = -1;
    const sortedIndices = Array.from(result).sort((a, b) => a - b);

    for (const index of sortedIndices) {
      if (lastIndex !== -1 && index > lastIndex + 1) {
        const collapsed = index - lastIndex - 1;
        if (collapsed > 0) {
          output.push(`... [${collapsed} line${collapsed > 1 ? 's' : ''} collapsed] ...`);
        }
      }
      output.push(lines[index]);
      lastIndex = index;
    }

    return output;
  }

  /**
   * Extract file path from line if present
   */
  private static extractFilePath(line: string): string | undefined {
    // JS/TS patterns
    const jsMatch = line.match(/([^\s(]+\.(?:js|ts|jsx|tsx|mjs|cjs)):(\d+)/);
    if (jsMatch) return `${jsMatch[1]}:${jsMatch[2]}`;

    // Python pattern
    const pyMatch = line.match(/File "([^"]+\.py)", line (\d+)/);
    if (pyMatch) return `${pyMatch[1]}:${pyMatch[2]}`;

    // Rust pattern
    const rustMatch = line.match(/-->\s+([^\s:]+\.rs):(\d+)/);
    if (rustMatch) return `${rustMatch[1]}:${rustMatch[2]}`;

    // Go pattern
    const goMatch = line.match(/([^\s:]+\.go):(\d+)/);
    if (goMatch) return `${goMatch[1]}:${goMatch[2]}`;

    return undefined;
  }

  /**
   * Check if line is part of a stack trace
   */
  private static isStackTraceLine(line: string): boolean {
    return /^\s+at\s+/.test(line) ||  // JS stack
           /^\s+File "/.test(line) ||  // Python stack
           /^\s*\d+\s*\|/.test(line);  // Code snippet with line numbers
  }

  /**
   * Check if line is an info/debug log
   */
  private static isInfoLog(line: string): boolean {
    return /\b(info|debug|log|trace)\b/i.test(line) ||
           /^\s*\[info\]/i.test(line) ||
           /^\s*\[debug\]/i.test(line);
  }
}

/**
 * Noise Filter - Collapses repeated lines and removes clutter
 */
export class NoiseFilter {
  private lastLine: string = '';
  private repeatCount: number = 0;
  private readonly maxRepeats: number = 3;

  /**
   * Process a line and determine if it should be added, collapsed, or skipped
   */
  shouldKeep(line: string, framework: Framework = 'generic'): { keep: boolean; modified?: string } {
    const trimmed = line.trim();

    // Always keep errors and warnings
    if (LogAnalyzer.isError(line, framework) || LogAnalyzer.isWarning(line, framework)) {
      this.resetRepeat();
      return { keep: true };
    }

    // Check for noise
    if (LogAnalyzer.isNoise(line, framework)) {
      return { keep: false };
    }

    // Check for repeated line
    if (this.isSimilar(trimmed, this.lastLine)) {
      this.repeatCount++;
      if (this.repeatCount === this.maxRepeats) {
        return { keep: true, modified: `[... repeated ${this.repeatCount}+ times]` };
      }
      return { keep: false };
    }

    // New line - reset counter
    this.resetRepeat();
    this.lastLine = trimmed;
    return { keep: true };
  }

  /**
   * Check if two lines are similar (for collapsing)
   */
  private isSimilar(line1: string, line2: string): boolean {
    if (!line1 || !line2) return false;
    if (line1 === line2) return true;

    // Check for progress bar updates (same prefix, different percentage)
    const progressPattern = /^(.+?)\s*\d+%/;
    const match1 = line1.match(progressPattern);
    const match2 = line2.match(progressPattern);
    if (match1 && match2 && match1[1] === match2[1]) return true;

    return false;
  }

  /**
   * Reset repeat tracking
   */
  private resetRepeat(): void {
    this.repeatCount = 0;
    this.lastLine = '';
  }

  /**
   * Reset the filter state
   */
  reset(): void {
    this.resetRepeat();
  }
}

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LogAnalyzer,
  NoiseFilter,
  RelevanceScorer,
  RelevanceScore,
  FrameworkPatterns,
  type Framework,
  type Language,
} from '../src/analyzer.js';

describe('LogAnalyzer', () => {
  describe('isCrash', () => {
    it('should return true for non-zero exit codes', () => {
      expect(LogAnalyzer.isCrash(1)).toBe(true);
      expect(LogAnalyzer.isCrash(127)).toBe(true);
      expect(LogAnalyzer.isCrash(-1)).toBe(true);
    });

    it('should return false for zero exit code', () => {
      expect(LogAnalyzer.isCrash(0)).toBe(false);
    });

    it('should return false for null exit code', () => {
      expect(LogAnalyzer.isCrash(null)).toBe(false);
    });
  });

  describe('detectFramework', () => {
    it('should detect Next.js from command', () => {
      expect(LogAnalyzer.detectFramework('npx next dev')).toBe('nextjs');
      expect(LogAnalyzer.detectFramework('npm run next')).toBe('nextjs');
    });

    it('should detect Next.js from output', () => {
      expect(LogAnalyzer.detectFramework('npm run dev', ['Next.js 14.0.0'])).toBe('nextjs');
    });

    it('should detect Vite from command', () => {
      expect(LogAnalyzer.detectFramework('vite dev')).toBe('vite');
      expect(LogAnalyzer.detectFramework('npx vite')).toBe('vite');
    });

    it('should detect Vite from output', () => {
      expect(LogAnalyzer.detectFramework('npm run dev', ['VITE v5.0.0'])).toBe('vite');
    });

    it('should detect Webpack from command', () => {
      expect(LogAnalyzer.detectFramework('webpack serve')).toBe('webpack');
    });

    it('should detect Django from command', () => {
      expect(LogAnalyzer.detectFramework('python manage.py runserver')).toBe('django');
      expect(LogAnalyzer.detectFramework('django-admin runserver')).toBe('django');
    });

    it('should detect FastAPI from command', () => {
      expect(LogAnalyzer.detectFramework('uvicorn main:app')).toBe('fastapi');
      expect(LogAnalyzer.detectFramework('fastapi dev')).toBe('fastapi');
    });

    it('should detect pytest from command', () => {
      expect(LogAnalyzer.detectFramework('pytest')).toBe('pytest');
      expect(LogAnalyzer.detectFramework('python -m pytest')).toBe('pytest');
    });

    it('should return generic for unknown commands', () => {
      expect(LogAnalyzer.detectFramework('node app.js')).toBe('generic');
      expect(LogAnalyzer.detectFramework('go run main.go')).toBe('generic');
    });
  });

  describe('isError', () => {
    describe('JavaScript errors', () => {
      it('should detect Error:', () => {
        expect(LogAnalyzer.isError('Error: Something went wrong')).toBe(true);
      });

      it('should detect TypeError:', () => {
        expect(LogAnalyzer.isError('TypeError: undefined is not a function')).toBe(true);
      });

      it('should detect SyntaxError:', () => {
        expect(LogAnalyzer.isError('SyntaxError: Unexpected token')).toBe(true);
      });

      it('should detect ReferenceError:', () => {
        expect(LogAnalyzer.isError('ReferenceError: foo is not defined')).toBe(true);
      });

      it('should detect module not found', () => {
        // "Module not found" patterns - these contain "error" or framework-specific patterns
        expect(LogAnalyzer.isError('Module not found: Error')).toBe(true);
        expect(LogAnalyzer.isError('Error: Module not found')).toBe(true);
      });
    });

    describe('Python errors', () => {
      it('should detect Traceback', () => {
        expect(LogAnalyzer.isError('Traceback (most recent call last):')).toBe(true);
      });

      it('should detect ImportError', () => {
        expect(LogAnalyzer.isError('ImportError: No module named \'foo\'')).toBe(true);
      });

      it('should detect ModuleNotFoundError', () => {
        expect(LogAnalyzer.isError('ModuleNotFoundError: No module named \'bar\'')).toBe(true);
      });
    });

    describe('Next.js errors', () => {
      it('should detect Failed to compile', () => {
        expect(LogAnalyzer.isError('Failed to compile', 'nextjs')).toBe(true);
      });

      it('should detect Hydration failed', () => {
        expect(LogAnalyzer.isError('Hydration failed because', 'nextjs')).toBe(true);
      });

      it('should detect Server Error', () => {
        expect(LogAnalyzer.isError('Server Error in \'/page\'', 'nextjs')).toBe(true);
      });
    });

    describe('generic patterns', () => {
      it('should detect generic error patterns', () => {
        expect(LogAnalyzer.isError('FATAL: connection refused')).toBe(true);
        expect(LogAnalyzer.isError('Build failed')).toBe(true);
        expect(LogAnalyzer.isError('exception occurred')).toBe(true);
      });

      it('should not flag normal output', () => {
        expect(LogAnalyzer.isError('Server listening on port 3000')).toBe(false);
        expect(LogAnalyzer.isError('Compiling...')).toBe(false);
      });
    });
  });

  describe('isWarning', () => {
    it('should detect warning patterns', () => {
      expect(LogAnalyzer.isWarning('Warning: Something might be wrong')).toBe(true);
      expect(LogAnalyzer.isWarning('deprecated: use newMethod instead')).toBe(true);
      expect(LogAnalyzer.isWarning('DeprecationWarning: Buffer() is deprecated')).toBe(true);
    });

    it('should detect Python warnings', () => {
      expect(LogAnalyzer.isWarning('UserWarning: This is a warning')).toBe(true);
      expect(LogAnalyzer.isWarning('FutureWarning: This will change')).toBe(true);
    });

    it('should not flag normal output', () => {
      expect(LogAnalyzer.isWarning('Server started')).toBe(false);
    });
  });

  describe('isNoise', () => {
    it('should detect empty lines as noise', () => {
      expect(LogAnalyzer.isNoise('')).toBe(true);
      expect(LogAnalyzer.isNoise('   ')).toBe(true);
    });

    it('should detect progress indicators', () => {
      expect(LogAnalyzer.isNoise('50% building...')).toBe(true);
      expect(LogAnalyzer.isNoise('[====    ] 40%')).toBe(true);
    });

    it('should detect Next.js noise', () => {
      expect(LogAnalyzer.isNoise('Compiling...', 'nextjs')).toBe(true);
      expect(LogAnalyzer.isNoise('✓ Compiled in 500ms', 'nextjs')).toBe(true);
      expect(LogAnalyzer.isNoise('✓ Ready in 1000ms', 'nextjs')).toBe(true);
    });

    it('should detect Vite noise', () => {
      expect(LogAnalyzer.isNoise('VITE v5.0.0', 'vite')).toBe(true);
      expect(LogAnalyzer.isNoise('[vite] hmr update /app.tsx', 'vite')).toBe(true);
    });

    it('should not flag errors as noise', () => {
      expect(LogAnalyzer.isNoise('Error: failed', 'nextjs')).toBe(false);
    });
  });

  describe('extractFilePaths', () => {
    it('should extract JavaScript file paths', () => {
      const stack = `
        at Object.<anonymous> (/app/src/index.js:42:5)
        at Module._compile (internal/modules/cjs/loader.js:1063:30)
      `;
      const paths = LogAnalyzer.extractFilePaths(stack);
      expect(paths).toContain('/app/src/index.js:42');
    });

    it('should extract TypeScript file paths', () => {
      const stack = 'Error in ./src/components/App.tsx:15:10';
      const paths = LogAnalyzer.extractFilePaths(stack);
      expect(paths).toContain('./src/components/App.tsx:15');
    });

    it('should extract Python file paths', () => {
      const stack = 'File "/app/views.py", line 42, in get';
      const paths = LogAnalyzer.extractFilePaths(stack);
      expect(paths).toContain('/app/views.py:42');
    });

    it('should extract Rust file paths', () => {
      const stack = '--> src/main.rs:42:5';
      const paths = LogAnalyzer.extractFilePaths(stack);
      expect(paths).toContain('src/main.rs:42');
    });

    it('should extract Go file paths', () => {
      const stack = 'panic at /app/main.go:42:5';
      const paths = LogAnalyzer.extractFilePaths(stack);
      expect(paths).toContain('/app/main.go:42');
    });

    it('should filter node_modules by default', () => {
      const stack = `
        at Object.<anonymous> (/app/node_modules/express/lib/router.js:42:5)
        at myFunction (/app/src/index.js:10:3)
      `;
      const paths = LogAnalyzer.extractFilePaths(stack, true);
      expect(paths).not.toContain('/app/node_modules/express/lib/router.js:42');
      expect(paths).toContain('/app/src/index.js:10');
    });

    it('should include node_modules when not filtering', () => {
      const stack = 'at Object.<anonymous> (/app/node_modules/express/lib/router.js:42:5)';
      const paths = LogAnalyzer.extractFilePaths(stack, false);
      expect(paths).toContain('/app/node_modules/express/lib/router.js:42');
    });

    it('should deduplicate paths', () => {
      const stack = `
        at fn (/app/src/index.js:42:5)
        at fn2 (/app/src/index.js:42:5)
      `;
      const paths = LogAnalyzer.extractFilePaths(stack);
      expect(paths.filter(p => p === '/app/src/index.js:42').length).toBe(1);
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract Error: message', () => {
      const lines = ['some output', 'Error: Something failed', 'more output'];
      expect(LogAnalyzer.extractErrorMessage(lines)).toBe('Error: Something failed');
    });

    it('should extract TypeError: message', () => {
      const lines = ['TypeError: Cannot read property \'foo\' of undefined'];
      expect(LogAnalyzer.extractErrorMessage(lines)).toBe('TypeError: Cannot read property \'foo\' of undefined');
    });

    it('should return first error-like line as fallback', () => {
      const lines = ['Build failed with 3 errors'];
      const result = LogAnalyzer.extractErrorMessage(lines);
      expect(result).toContain('Build failed');
    });

    it('should return null when no error', () => {
      const lines = ['Server started', 'Listening on port 3000'];
      expect(LogAnalyzer.extractErrorMessage(lines)).toBe(null);
    });
  });

  describe('getErrorContext', () => {
    it('should return lines around error', () => {
      const lines = ['line1', 'line2', 'ERROR', 'line4', 'line5'];
      const context = LogAnalyzer.getErrorContext(lines, 2, 1);
      expect(context).toEqual(['line2', 'ERROR', 'line4']);
    });

    it('should handle edge cases at start', () => {
      const lines = ['ERROR', 'line2', 'line3'];
      const context = LogAnalyzer.getErrorContext(lines, 0, 2);
      expect(context).toEqual(['ERROR', 'line2', 'line3']);
    });

    it('should handle edge cases at end', () => {
      const lines = ['line1', 'line2', 'ERROR'];
      const context = LogAnalyzer.getErrorContext(lines, 2, 2);
      expect(context).toEqual(['line1', 'line2', 'ERROR']);
    });
  });

  describe('detectLanguage', () => {
    it('should detect JavaScript', () => {
      expect(LogAnalyzer.detectLanguage('npm run dev')).toBe('javascript');
      expect(LogAnalyzer.detectLanguage('node app.js')).toBe('javascript');
      expect(LogAnalyzer.detectLanguage('yarn dev')).toBe('javascript');
      expect(LogAnalyzer.detectLanguage('npx next dev')).toBe('javascript');
    });

    it('should detect Python', () => {
      expect(LogAnalyzer.detectLanguage('python app.py')).toBe('python');
      expect(LogAnalyzer.detectLanguage('pytest')).toBe('python');
      expect(LogAnalyzer.detectLanguage('uvicorn main:app')).toBe('python');
    });

    it('should detect Rust', () => {
      expect(LogAnalyzer.detectLanguage('cargo run')).toBe('rust');
      expect(LogAnalyzer.detectLanguage('cargo test')).toBe('rust');
    });

    it('should detect Go', () => {
      expect(LogAnalyzer.detectLanguage('go run main.go')).toBe('go');
      expect(LogAnalyzer.detectLanguage('go build')).toBe('go');
    });

    it('should return unknown for unrecognized', () => {
      expect(LogAnalyzer.detectLanguage('ruby app.rb')).toBe('unknown');
    });
  });

  describe('stripAnsi', () => {
    it('should remove ANSI color codes', () => {
      const colored = '\x1b[31mRed text\x1b[0m';
      expect(LogAnalyzer.stripAnsi(colored)).toBe('Red text');
    });

    it('should handle text without ANSI codes', () => {
      expect(LogAnalyzer.stripAnsi('plain text')).toBe('plain text');
    });
  });
});

describe('NoiseFilter', () => {
  let filter: NoiseFilter;

  beforeEach(() => {
    filter = new NoiseFilter();
  });

  describe('shouldKeep', () => {
    it('should always keep errors', () => {
      const result = filter.shouldKeep('Error: something failed');
      expect(result.keep).toBe(true);
    });

    it('should always keep warnings', () => {
      const result = filter.shouldKeep('Warning: deprecated API');
      expect(result.keep).toBe(true);
    });

    it('should filter noise', () => {
      const result = filter.shouldKeep('', 'generic');
      expect(result.keep).toBe(false);
    });

    it('should collapse repeated lines after max repeats', () => {
      // First call - new line, keep it
      filter.shouldKeep('Building modules');
      // Second call - repeat, increment counter, skip
      filter.shouldKeep('Building modules');
      // Third call - repeat, increment counter, skip
      filter.shouldKeep('Building modules');
      // Fourth call - at maxRepeats (3), return collapse message
      const result = filter.shouldKeep('Building modules');
      expect(result.keep).toBe(true);
      expect(result.modified).toContain('repeated');
    });

    it('should keep new different lines', () => {
      filter.shouldKeep('line 1');
      const result = filter.shouldKeep('line 2');
      expect(result.keep).toBe(true);
      expect(result.modified).toBeUndefined();
    });

    it('should detect progress bar updates as similar', () => {
      filter.shouldKeep('Building 10%');
      filter.shouldKeep('Building 20%');
      filter.shouldKeep('Building 30%');
      // Fourth call triggers collapse at maxRepeats (3)
      const result = filter.shouldKeep('Building 40%');
      expect(result.keep).toBe(true);
      expect(result.modified).toContain('repeated');
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      filter.shouldKeep('line 1');
      filter.shouldKeep('line 1');
      filter.reset();
      const result = filter.shouldKeep('line 1');
      expect(result.modified).toBeUndefined();
    });
  });
});

describe('RelevanceScorer', () => {
  describe('scoreLine', () => {
    it('should score errors as CRITICAL', () => {
      const result = RelevanceScorer.scoreLine('Error: something failed');
      expect(result.score).toBe(RelevanceScore.CRITICAL);
      expect(result.isError).toBe(true);
    });

    it('should score warnings as HIGH', () => {
      const result = RelevanceScorer.scoreLine('Warning: deprecated');
      expect(result.score).toBe(RelevanceScore.HIGH);
      expect(result.isWarning).toBe(true);
    });

    it('should score lines with file paths as HIGH', () => {
      const result = RelevanceScorer.scoreLine('at /app/src/index.js:42:5');
      expect(result.score).toBe(RelevanceScore.HIGH);
      expect(result.filePath).toBeDefined();
    });

    it('should score stack trace lines as MEDIUM', () => {
      const result = RelevanceScorer.scoreLine('    at Object.<anonymous>');
      expect(result.score).toBe(RelevanceScore.MEDIUM);
    });

    it('should score info logs as LOW', () => {
      const result = RelevanceScorer.scoreLine('[info] Server started');
      expect(result.score).toBe(RelevanceScore.LOW);
    });

    it('should score noise as NOISE', () => {
      const result = RelevanceScorer.scoreLine('', 'generic');
      expect(result.score).toBe(RelevanceScore.NOISE);
    });
  });

  describe('filterByDetailLevel', () => {
    const lines = [
      { content: 'Error: fail', score: RelevanceScore.CRITICAL, lineNumber: 0, isError: true, isWarning: false },
      { content: 'at file.js:10', score: RelevanceScore.HIGH, lineNumber: 1, isError: false, isWarning: false },
      { content: 'some context', score: RelevanceScore.MEDIUM, lineNumber: 2, isError: false, isWarning: false },
      { content: '[info] log', score: RelevanceScore.LOW, lineNumber: 3, isError: false, isWarning: false },
    ];

    it('should filter to errors only', () => {
      const result = RelevanceScorer.filterByDetailLevel(lines, 'errors');
      expect(result.length).toBe(1);
      expect(result[0].content).toBe('Error: fail');
    });

    it('should filter to context level', () => {
      const result = RelevanceScorer.filterByDetailLevel(lines, 'context');
      expect(result.length).toBe(2);
    });

    it('should return all for full level', () => {
      const result = RelevanceScorer.filterByDetailLevel(lines, 'full');
      expect(result.length).toBe(4);
    });
  });

  describe('getErrorsWithContext', () => {
    it('should return errors with surrounding context', () => {
      const lines = [
        'line 1',
        'line 2',
        'Error: something failed',
        'line 4',
        'line 5',
      ];
      const result = RelevanceScorer.getErrorsWithContext(lines, 1);
      expect(result).toContain('line 2');
      expect(result).toContain('Error: something failed');
      expect(result).toContain('line 4');
    });

    it('should add collapse indicators between error contexts', () => {
      // Two errors far apart should have collapsed lines between them
      const lines = [
        'Error: first error',     // 0 - error
        'context 1',               // 1 - context of first
        'line 2',                  // 2 - should be collapsed
        'line 3',                  // 3 - should be collapsed
        'line 4',                  // 4 - should be collapsed
        'context 5',               // 5 - context of second
        'Error: second error',     // 6 - error
        'line 7',                  // 7 - context of second
      ];
      const result = RelevanceScorer.getErrorsWithContext(lines, 1);
      // Lines 2-4 should be collapsed between the two error contexts
      expect(result.some(l => l.includes('collapsed'))).toBe(true);
    });
  });
});

describe('FrameworkPatterns', () => {
  it('should have patterns for all frameworks', () => {
    const frameworks = ['javascript', 'nextjs', 'vite', 'webpack', 'python', 'django', 'fastapi', 'pytest'];
    frameworks.forEach(framework => {
      expect(FrameworkPatterns[framework as keyof typeof FrameworkPatterns]).toBeDefined();
    });
  });

  it('should have error patterns for each framework', () => {
    expect(FrameworkPatterns.javascript.errors.length).toBeGreaterThan(0);
    expect(FrameworkPatterns.nextjs.errors.length).toBeGreaterThan(0);
    expect(FrameworkPatterns.python.errors.length).toBeGreaterThan(0);
  });
});

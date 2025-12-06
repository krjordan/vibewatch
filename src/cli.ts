/**
 * VibeWatch CLI - Main entry point
 *
 * Usage: vibewatch <command>
 * Example: vibewatch npm run dev
 */

import { Command } from 'commander';
import stripAnsi from 'strip-ansi';
import { CircularBuffer } from './buffer.js';
import { ProcessManager } from './process-manager.js';
import { startApiServer } from './api-server.js';
import { LogAnalyzer } from './analyzer.js';

const program = new Command();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.cyan): void {
  console.error(`${color}[VIBE-WATCH]${colors.reset} ${message}`);
}

function logError(message: string): void {
  console.error(`${colors.red}[VIBE-WATCH] ❌${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.error(`${colors.green}[VIBE-WATCH] ✓${colors.reset} ${message}`);
}

function logWarning(message: string): void {
  console.error(`${colors.yellow}[VIBE-WATCH] ⚠${colors.reset} ${message}`);
}

program
  .name('vibewatch')
  .description('Your AI pair programmer\'s eyes on your terminal')
  .version('0.1.0')
  .argument('<command...>', 'Command to monitor (e.g., npm run dev)')
  .option('-p, --port <number>', 'API server port', '3333')
  .option('-b, --buffer-size <number>', 'Log buffer size', '100')
  .option('-v, --verbose', 'Include node_modules in stack traces')
  .option('-r, --raw', 'Disable noise filtering (keep all output)')
  .option('-k, --keep-alive <seconds>', 'Keep API server alive after crash (for MCP queries)', '30')
  .action(async (command: string[], options) => {
    const fullCommand = command.join(' ');

    // Banner
    console.error('');
    console.error(`${colors.cyan}${colors.bright}╭─────────────────────────────────────────╮${colors.reset}`);
    console.error(`${colors.cyan}${colors.bright}│${colors.reset}  ${colors.bright}VIBE-WATCH${colors.reset} - AI Terminal Monitor       ${colors.cyan}${colors.bright}│${colors.reset}`);
    console.error(`${colors.cyan}${colors.bright}╰─────────────────────────────────────────╯${colors.reset}`);
    console.error('');

    log(`Monitoring: ${colors.bright}${fullCommand}${colors.reset}`);

    // Parse options
    const port = parseInt(options.port, 10);
    const bufferSize = parseInt(options.bufferSize, 10);
    const rawMode = options.raw ?? false;
    const keepAliveSeconds = parseInt(options.keepAlive, 10);

    // Create buffer
    const buffer = new CircularBuffer(bufferSize);
    log(`Buffer: ${bufferSize} lines${rawMode ? ' (raw mode)' : ' (noise filtering enabled)'}`);

    // Detect language and framework
    const language = LogAnalyzer.detectLanguage(fullCommand);
    const framework = LogAnalyzer.detectFramework(fullCommand);
    buffer.setFramework(framework);
    log(`Detected: ${language}${framework !== 'generic' ? ` (${framework})` : ''}`);

    // Start API server
    let fastify;
    try {
      fastify = await startApiServer(port, buffer);
    } catch (err) {
      logError(`Failed to start API server: ${err}`);
      process.exit(1);
    }

    // Create process manager
    const pm = new ProcessManager();

    // Graceful shutdown handler
    const cleanup = async () => {
      log('Shutting down...');
      pm.kill();
      await fastify?.close();
      process.exit(0);
    };

    // Signal forwarding - forward SIGINT/SIGTERM to child process
    process.on('SIGINT', () => {
      log('Received SIGINT, forwarding to child process...');
      pm.kill();
    });

    process.on('SIGTERM', () => {
      log('Received SIGTERM, forwarding to child process...');
      pm.kill();
    });

    // Handle uncaught exceptions gracefully
    process.on('uncaughtException', async (err) => {
      logError(`Uncaught exception: ${err.message}`);
      await cleanup();
    });

    // Track if we've seen errors (for non-fatal error notifications)
    let lastErrorCount = 0;

    // Wire up events
    pm.on('log', (line: string) => {
      // Strip ANSI codes and add to buffer
      const cleaned = stripAnsi(line);

      if (rawMode) {
        buffer.addRaw(cleaned);
      } else {
        buffer.add(cleaned);
      }

      // Check for new errors (non-fatal error detection)
      const currentErrorCount = buffer.errorCount();
      if (currentErrorCount > lastErrorCount) {
        // New error detected while process is still running
        const newErrors = currentErrorCount - lastErrorCount;
        if (newErrors === 1) {
          logWarning(`Error detected in output (process still running)`);
        }
        lastErrorCount = currentErrorCount;
      }
    });

    pm.on('crash', (exitCode: number) => {
      buffer.lockSnapshot(exitCode);
      console.error('');
      console.error(`${colors.red}${colors.bright}╭─────────────────────────────────────────╮${colors.reset}`);
      console.error(`${colors.red}${colors.bright}│${colors.reset}  ${colors.red}${colors.bright}CRASH DETECTED${colors.reset}                         ${colors.red}${colors.bright}│${colors.reset}`);
      console.error(`${colors.red}${colors.bright}╰─────────────────────────────────────────╯${colors.reset}`);
      console.error('');
      logError(`Exit code: ${exitCode}`);

      const errorMessage = buffer.getErrorMessage();
      if (errorMessage) {
        logError(`Error: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`);
      }

      const relevantFiles = buffer.extractRelevantFiles();
      if (relevantFiles.length > 0) {
        log(`Relevant files: ${relevantFiles.slice(0, 3).join(', ')}${relevantFiles.length > 3 ? '...' : ''}`);
      }

      console.error('');
      log(`${colors.bright}📸 Snapshot captured${colors.reset} - Ask Claude: "Check my terminal" or "Fix this crash"`);
      log(`API server staying alive for ${keepAliveSeconds}s at http://127.0.0.1:${port}`);
      log(`Press Ctrl+C to exit immediately`);
      console.error('');

      // Keep the API server alive so Claude can query crash context
      setTimeout(() => {
        log('Keep-alive timeout reached, shutting down...');
        fastify?.close().then(() => {
          process.exit(exitCode);
        });
      }, keepAliveSeconds * 1000);
    });

    pm.on('exit', (exitCode: number | null) => {
      if (exitCode === 0 || exitCode === null) {
        logSuccess(`Process exited cleanly`);
        // Clean exit - close immediately
        fastify?.close().then(() => {
          process.exit(exitCode || 0);
        });
      }
      // For crashes, the 'crash' event handler keeps the server alive
    });

    pm.on('error', (err: Error) => {
      logError(`Process error: ${err.message}`);
      fastify?.close().then(() => {
        process.exit(1);
      });
    });

    // Spawn the command
    log(`Starting process...`);
    console.error('');
    const [cmd, ...args] = command;
    pm.spawn(cmd, args);
  });

program.parse();

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

program
  .name('vibewatch')
  .description('Your AI pair programmer\'s eyes on your terminal')
  .version('0.1.0')
  .argument('<command...>', 'Command to monitor (e.g., npm run dev)')
  .option('-p, --port <number>', 'API server port', '3333')
  .option('-b, --buffer-size <number>', 'Log buffer size', '100')
  .option('-v, --verbose', 'Include node_modules in stack traces')
  .action(async (command: string[], options) => {
    console.error('[VIBE-WATCH] Starting...');
    console.error(`[VIBE-WATCH] Monitoring: ${command.join(' ')}`);

    // Parse options
    const port = parseInt(options.port, 10);
    const bufferSize = parseInt(options.bufferSize, 10);

    // Create buffer
    const buffer = new CircularBuffer(bufferSize);
    console.error(`[VIBE-WATCH] Buffer size: ${bufferSize} lines`);

    // Start API server
    try {
      await startApiServer(port, buffer);
    } catch (err) {
      console.error('[VIBE-WATCH] Failed to start API server:', err);
      process.exit(1);
    }

    // Detect language
    const fullCommand = command.join(' ');
    const language = LogAnalyzer.detectLanguage(fullCommand);
    console.error(`[VIBE-WATCH] Detected language: ${language}`);

    // Create process manager
    const pm = new ProcessManager();

    // Wire up events
    pm.on('log', (line: string) => {
      // Strip ANSI codes and add to buffer
      const cleaned = stripAnsi(line);
      buffer.add(cleaned);
    });

    pm.on('crash', (exitCode: number) => {
      buffer.lockSnapshot();
      console.error('[VIBE-WATCH] 📸 Snapshot captured - Ask Claude to "Fix this crash"');
      console.error(`[VIBE-WATCH] 🔍 Exit code: ${exitCode}`);
    });

    pm.on('exit', (exitCode: number | null) => {
      console.error(`[VIBE-WATCH] Process exited with code: ${exitCode}`);
      process.exit(exitCode || 0);
    });

    pm.on('error', (err: Error) => {
      console.error('[VIBE-WATCH] ❌ Error:', err.message);
      process.exit(1);
    });

    // Spawn the command
    const [cmd, ...args] = command;
    pm.spawn(cmd, args);
  });

program.parse();

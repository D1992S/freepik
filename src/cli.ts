#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import * as dotenv from 'dotenv';
import {
  loadAndValidateStockPlan,
  formatValidationErrors,
} from './validator/stockplan-validator.js';
import { buildPrompt, buildCompactSummary } from './prompt-builder/prompt-builder.js';
import { FreepikClient } from './client/freepik-client.js';
import { SearchRunner, type SceneSelection } from './runner/search-runner.js';
import { DownloadRunner } from './runner/download-runner.js';
import { ErrorLogger } from './utils/error-logger.js';
import { Lockfile } from './utils/lockfile.js';
import { readFileSync } from 'fs';

dotenv.config();

const program = new Command();

program
  .name('stockbot')
  .description('Automated stock video downloader from Freepik')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate a stockplan.json file')
  .argument('<file>', 'Path to stockplan.json file')
  .action((file: string) => {
    console.log(`Validating ${file}...`);
    const result = loadAndValidateStockPlan(file);

    if (result.valid && result.data) {
      console.log('✅ Valid stockplan.json');
      console.log('');
      console.log(buildCompactSummary(result.data));
      process.exit(0);
    } else {
      console.error('❌ Validation failed:');
      console.error('');
      console.error(formatValidationErrors(result.errors));
      process.exit(1);
    }
  });

program
  .command('build-prompt')
  .description('Build prompt from stockplan.json')
  .argument('<file>', 'Path to stockplan.json file')
  .option('-o, --output <file>', 'Output file for the prompt')
  .action((file: string, options: { output?: string }) => {
    console.log(`Building prompt from ${file}...`);
    const result = loadAndValidateStockPlan(file);

    if (!result.valid || !result.data) {
      console.error('❌ Validation failed:');
      console.error('');
      console.error(formatValidationErrors(result.errors));
      process.exit(1);
    }

    const prompt = buildPrompt(result.data);

    if (options.output) {
      writeFileSync(options.output, prompt, 'utf-8');
      console.log(`✅ Prompt written to ${options.output}`);
    } else {
      console.log('');
      console.log(prompt);
    }
  });

program
  .command('search')
  .description('Search for videos matching the stock plan')
  .argument('<file>', 'Path to stockplan.json file')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--dry-run', 'Generate selection without downloading videos')
  .action(async (file: string, options: { output: string; dryRun?: boolean }) => {
    console.log(`🔍 Searching for videos from ${file}...`);

    // Validate stock plan
    const result = loadAndValidateStockPlan(file);
    if (!result.valid || !result.data) {
      console.error('❌ Validation failed:');
      console.error('');
      console.error(formatValidationErrors(result.errors));
      process.exit(1);
    }

    // Check API key
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
      console.error('❌ FREEPIK_API_KEY environment variable not set');
      console.error('Please create a .env file with your Freepik API key');
      process.exit(1);
    }

    // Create lockfile and error logger
    const lockfile = new Lockfile(options.output);
    const errorLogger = new ErrorLogger(options.output);

    try {
      // Acquire lock
      await lockfile.acquire('search');
    } catch (error) {
      console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    // Create client and runner
    const client = new FreepikClient({ apiKey });
    const runner = new SearchRunner(client, {
      outputDir: options.output,
      dryRun: options.dryRun,
      errorLogger,
      progressCallback: (current, total, sceneName) => {
        console.log(`[${current}/${total}] Processing scene: ${sceneName}`);
      },
    });

    // Setup graceful shutdown
    lockfile.onShutdown(() => {
      console.log('Saving checkpoint...');
    });

    try {
      // Run search pipeline
      const results = await runner.run(result.data);

      console.log('');
      console.log('✅ Search completed!');
      console.log('');
      console.log('Summary:');
      console.log(`  - Total scenes: ${results.selection.length}`);
      console.log(
        `  - Fulfilled: ${results.selection.filter((s) => s.status === 'fulfilled').length}`
      );
      console.log(`  - Partial: ${results.selection.filter((s) => s.status === 'partial').length}`);
      console.log(
        `  - Unfulfilled: ${results.selection.filter((s) => s.status === 'unfulfilled').length}`
      );
      console.log('');
      console.log(`Results saved to: ${options.output}/_meta/`);
      console.log(`  - candidates.json: All candidates with scores`);
      console.log(`  - selection.json: Top clips selected for each scene`);

      if (options.dryRun) {
        console.log('');
        console.log('ℹ️  Dry run mode: No videos were downloaded');
        console.log('   Use the download command to download selected videos');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(`❌ Search failed: ${msg}`);
      if (stack) {
        console.error(stack);
      }
      process.exit(1);
    } finally {
      await lockfile.release();
    }
  });

program
  .command('download')
  .description('Download videos from selection.json')
  .argument('<file>', 'Path to stockplan.json file')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-c, --concurrency <number>', 'Max concurrent downloads', '3')
  .action(async (file: string, options: { output: string; concurrency: string }) => {
    console.log(`⬇️  Downloading videos from ${file}...`);

    // Validate stock plan
    const result = loadAndValidateStockPlan(file);
    if (!result.valid || !result.data) {
      console.error('❌ Validation failed:');
      console.error('');
      console.error(formatValidationErrors(result.errors));
      process.exit(1);
    }

    // Load selection.json
    const selectionPath = `${options.output}/_meta/selection.json`;
    let selection: SceneSelection[];
    try {
      const parsed: unknown = JSON.parse(readFileSync(selectionPath, 'utf-8'));

      // Validate that parsed is an array
      if (!Array.isArray(parsed)) {
        throw new Error(`selection.json must be an array, got ${typeof parsed}`);
      }

      // Validate each item has required fields
      for (let i = 0; i < parsed.length; i++) {
        const item: unknown = parsed[i];
        if (!item || typeof item !== 'object') {
          throw new Error(`selection[${i}] must be an object, got ${typeof item}`);
        }
        const obj = item as Record<string, unknown>;
        if (typeof obj.scene_slug !== 'string') {
          throw new Error(`selection[${i}].scene_slug must be a string`);
        }
        if (typeof obj.status !== 'string') {
          throw new Error(`selection[${i}].status must be a string`);
        }
        if (!Array.isArray(obj.selected_clips)) {
          throw new Error(`selection[${i}].selected_clips must be an array`);
        }
      }

      selection = parsed as SceneSelection[];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to load or validate selection.json: ${msg}`);
      console.error(`   Path: ${selectionPath}`);
      console.error('   Run the search command first to generate valid selection.json');
      process.exit(1);
    }

    // Check API key
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
      console.error('❌ FREEPIK_API_KEY environment variable not set');
      console.error('Please create a .env file with your Freepik API key');
      process.exit(1);
    }

    // Create lockfile and error logger
    const lockfile = new Lockfile(options.output);
    const errorLogger = new ErrorLogger(options.output);

    try {
      // Acquire lock
      await lockfile.acquire('download');
    } catch (error) {
      console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    // Create client and download runner
    const client = new FreepikClient({ apiKey });
    const runner = new DownloadRunner(client, {
      outputDir: options.output,
      maxConcurrent: parseInt(options.concurrency, 10),
      errorLogger,
      progressCallback: (progress) => {
        console.log(
          `[${progress.completedFiles}/${progress.totalFiles}] ${progress.currentScene}: ${progress.currentFile}`
        );
      },
    });

    // Setup graceful shutdown
    lockfile.onShutdown(() => {
      console.log('Finishing current download...');
    });

    try {
      await runner.run(result.data, selection);

      console.log('');
      console.log('✅ Download completed!');
      console.log(`   All videos saved to: ${options.output}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(`❌ Download failed: ${msg}`);
      if (stack) {
        console.error(stack);
      }
      process.exit(1);
    } finally {
      await lockfile.release();
    }
  });

program.parse();

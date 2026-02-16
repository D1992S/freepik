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
import { SearchRunner } from './runner/search-runner.js';

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

    // Create client and runner
    const client = new FreepikClient({ apiKey });
    const runner = new SearchRunner(client, {
      outputDir: options.output,
      dryRun: options.dryRun,
      progressCallback: (current, total, sceneName) => {
        console.log(`[${current}/${total}] Processing scene: ${sceneName}`);
      },
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
        `  - Fulfilled: ${results.selection.filter((s) => s.status === 'fulfilled').length}`,
      );
      console.log(
        `  - Partial: ${results.selection.filter((s) => s.status === 'partial').length}`,
      );
      console.log(
        `  - Unfulfilled: ${results.selection.filter((s) => s.status === 'unfulfilled').length}`,
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
      console.error('❌ Search failed:', error);
      process.exit(1);
    }
  });

program.parse();

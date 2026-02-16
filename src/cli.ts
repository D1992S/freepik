#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import {
  loadAndValidateStockPlan,
  formatValidationErrors,
} from './validator/stockplan-validator.js';
import { buildPrompt, buildCompactSummary } from './prompt-builder/prompt-builder.js';

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

program.parse();

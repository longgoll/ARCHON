#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { generateProjectSkeleton } from './generator.js';
import { watchProjectSkeleton } from './watcher.js';

const program = new Command();

program
  .name('archon-skeleton')
  .description('Build and monitor lightweight AI architectural context skeleton & MAP.md')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('-o, --out <path>', 'Output directory', undefined)
  .option('-w, --watch', 'Live watch mode for automatic synchronization on code changes')
  .option('--specs', 'Also generate per-module SPEC.md inside each module folder')
  .action(async (options) => {
    try {
      if (options.watch) {
        watchProjectSkeleton({
          cwd: options.cwd,
          outDir: options.out,
          writeModuleSpecs: options.specs,
        });
        return;
      }

      console.log(pc.blue('🦴 Building Archon Architectural Skeleton & Context Map...'));
      const skeleton = await generateProjectSkeleton({
        cwd: options.cwd,
        outDir: options.out,
        writeModuleSpecs: options.specs,
      });

      console.log(
        pc.green(
          `✔ Extracted ${skeleton.modules.length} modules into:\n` +
          `   - .context/MAP.md (Markdown Bible for AI Agents)\n` +
          `   - .context/architecture.json (Structured AST schema)\n` +
          `   - .context/skeleton.d.ts (Ambient type definitions)`
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        console.error(pc.red(`Failed to build skeleton: ${error.message}`));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);

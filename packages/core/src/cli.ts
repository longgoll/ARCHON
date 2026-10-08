#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { loadGuardianConfig } from './config/loader.js';
import { runLinter } from './linter.js';
import { printLintReport } from './reporter/console.js';
import { decomposeFile } from './decomposer/index.js';
import { startArchonStudio } from './studio/server.js';
import { generateProjectSkeleton, watchProjectSkeleton } from '@archon/skeleton';

const program = new Command();

program
  .name('archon')
  .description('AI Architectural Guardian - Deterministic Linter, Skeleton Generator & Context Map')
  .version('0.1.0');

// 1. archon check
program
  .command('check')
  .alias('lint')
  .description('Lint project files against architectural boundaries and line limits')
  .option('-c, --cwd <path>', 'Working directory to inspect', process.cwd())
  .action(async (options) => {
    try {
      const config = loadGuardianConfig(options.cwd);
      const report = await runLinter({ cwd: options.cwd, config });
      printLintReport(report);

      if (report.hasErrors) {
        process.exit(1);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(pc.red(`Archon Error: ${error.message}`));
      } else {
        console.error(pc.red('Unknown Archon error occurred.'));
      }
      process.exit(1);
    }
  });

// 2. archon skeleton / archon map
program
  .command('skeleton')
  .alias('map')
  .description('Generate architectural context map (.context/MAP.md) and skeleton for AI Agents')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('-o, --out <path>', 'Output directory', undefined)
  .option('-w, --watch', 'Run in continuous watch mode')
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

      console.log(pc.blue('🦴 Generating Archon Architectural Context Map (.context/MAP.md)...'));
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

// 3. archon watch
program
  .command('watch')
  .description('Live watch mode: automatically sync .context/MAP.md whenever code changes')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('-o, --out <path>', 'Output directory', undefined)
  .option('--specs', 'Also generate per-module SPEC.md inside each module folder')
  .action(async (options) => {
    watchProjectSkeleton({
      cwd: options.cwd,
      outDir: options.out,
      writeModuleSpecs: options.specs,
    });
  });

// 4. archon fix
program
  .command('fix')
  .description('Auto-decompose bloated files (>200 lines or >120 lines UI components) using AST engine')
  .option('-t, --target <path>', 'Specific file path to decompose')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .action(async (options) => {
    try {
      const cwd = options.cwd;
      if (options.target) {
        console.log(pc.blue(`🔧 Decomposing file: ${options.target}...`));
        const res = decomposeFile(options.target);
        if (res.success) {
          console.log(pc.green(`✔ ${res.message}`));
          for (const ext of res.extractedFiles) {
            console.log(pc.cyan(`   ➔ Extracted [${ext.kind}]: ${ext.filePath} (${ext.lines} lines)`));
          }
        } else {
          console.log(pc.yellow(`ℹ ${res.message}`));
        }
        return;
      }

      const config = loadGuardianConfig(cwd);
      const report = await runLinter({ cwd, config });
      const lineViolations = report.violations.filter(
        (v) => v.rule === 'line-limit' || v.rule === 'component-limit'
      );

      if (lineViolations.length === 0) {
        console.log(pc.green('✔ No oversized files found in codebase!'));
        return;
      }

      console.log(pc.blue(`Found ${lineViolations.length} oversized file(s). Starting auto-decomposition...`));
      for (const v of lineViolations) {
        const res = decomposeFile(v.file);
        if (res.success) {
          console.log(pc.green(`✔ Fixed ${v.file}: ${res.originalLines} ➔ ${res.newLines} lines`));
          for (const ext of res.extractedFiles) {
            console.log(pc.cyan(`   ➔ Extracted [${ext.kind}]: ${ext.filePath}`));
          }
        } else {
          console.log(pc.yellow(`⚠ Could not auto-decompose ${v.file}: ${res.message}`));
        }
      }
    } catch (error: any) {
      console.error(pc.red(`Archon Fix Error: ${error.message}`));
      process.exit(1);
    }
  });

// 5. archon studio / archon visual
program
  .command('studio')
  .alias('visual')
  .description('Launch Archon Studio web cockpit for interactive architecture visualization & health score')
  .option('-p, --port <number>', 'Port to listen on', '4321')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      const cwd = options.cwd;
      const { url } = await startArchonStudio({ cwd, port });
      console.log(pc.bold(pc.cyan('\n🛡️  ARCHON STUDIO ACTIVE!')));
      console.log(pc.green(`✔ Web Dashboard running at: ${pc.underline(url)}`));
      console.log(pc.gray('Press Ctrl+C to close studio.\n'));
    } catch (error: any) {
      console.error(pc.red(`Archon Studio Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

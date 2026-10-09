#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { loadGuardianConfig } from './config/loader.js';
import { runLinter } from './linter.js';
import { printLintReport } from './reporter/console.js';
import { decomposeFile } from './decomposer/index.js';
import { startArchonStudio } from './studio/server.js';
import { generateProjectSkeleton, watchProjectSkeleton, checkContractDrift } from '@archon/skeleton';

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
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      const cwd = options.cwd;
      const { url } = await startArchonStudio({ cwd, port });
      console.log(pc.bold(pc.cyan('\n🛡️  ARCHON STUDIO ACTIVE!')));
      console.log(pc.green(`✔ Web Dashboard running at: ${pc.underline(url)}`));
      console.log(pc.gray('Press Ctrl+C to close studio.\n'));

      if (options.open !== false) {
        const { exec } = await import('node:child_process');
        const startCmd =
          process.platform === 'win32'
            ? `start ${url}`
            : process.platform === 'darwin'
            ? `open ${url}`
            : `xdg-open ${url}`;
        exec(startCmd, () => {});
      }
    } catch (error: any) {
      console.error(pc.red(`Archon Studio Error: ${error.message}`));
      process.exit(1);
    }
  });

// 6. archon drift
program
  .command('drift')
  .description('Check contract drift between Frontend API calls (fetch/axios) and Backend Express route endpoints')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('--client <dir>', 'Client source directory', 'client/src')
  .option('--server <dir>', 'Server source directory', 'server/src')
  .action(async (options) => {
    try {
      console.log(pc.blue('🔍 Scanning for API Contract Drift between Frontend and Backend...'));
      const report = await checkContractDrift({
        cwd: options.cwd,
        clientDir: options.client,
        serverDir: options.server,
      });

      console.log(
        pc.gray(`   Client Calls: ${report.totalClientCalls} | Server Endpoints: ${report.totalServerRoutes}`)
      );

      if (!report.hasErrors) {
        console.log(pc.bold(pc.green('\n✔ ZERO CONTRACT DRIFT DETECTED!')));
        console.log(pc.green('   All Client API calls match registered Server routes perfectly.'));
        if (report.orphanRoutes.length > 0) {
          console.log(
            pc.yellow(`   ℹ ${report.orphanRoutes.length} server route(s) registered but not called by client yet.`)
          );
        }
        return;
      }

      console.log(pc.bold(pc.red(`\n❌ FOUND ${report.issues.length} CONTRACT DRIFT ISSUE(S):\n`)));
      for (const issue of report.issues) {
        console.log(pc.red(`  • [${issue.type}] ${issue.message}`));
        console.log(pc.gray(`    File: ${issue.file}:${issue.line}`));
        console.log(pc.yellow(`    🛠️ Remediation: ${issue.remediation}\n`));
      }

      process.exit(1);
    } catch (error: any) {
      console.error(pc.red(`Contract Drift Check Error: ${error.message}`));
      process.exit(1);
    }
  });

// 7. archon ci / archon guardian
program
  .command('ci')
  .alias('guardian')
  .description('Run complete CI Guardian check (Linter + Contract Drift) and emit GitHub PR summaries & annotations')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('-o, --output <file>', 'Path to save markdown report artifact (e.g. archon-pr-report.md)')
  .action(async (options) => {
    try {
      const cwd = options.cwd;
      const config = loadGuardianConfig(cwd);
      console.log(pc.blue('🛡️  Running Archon CI PR Guardian...'));

      const lintReport = await runLinter({ cwd, config });
      const driftReport = await checkContractDrift({ cwd });

      const { generatePrGuardianReport } = await import('./reporter/github.js');
      const result = generatePrGuardianReport(lintReport, driftReport, {
        cwd,
        outputPath: options.output,
      });

      console.log('\n' + result.markdownSummary + '\n');

      if (result.hasErrors) {
        console.log(pc.red(`❌ Archon CI Guardian failed with ${result.totalViolations} boundary issue(s) and ${result.totalDriftIssues} contract drift(s).`));
        process.exit(1);
      } else {
        console.log(pc.green('✔ All Archon CI Guardian architectural checks passed successfully!'));
      }
    } catch (error: any) {
      console.error(pc.red(`Archon CI Error: ${error.message}`));
      process.exit(1);
    }
  });

// 8. archon init
program
  .command('init')
  .description('Initialize Archon architectural guardrails in an existing project (brownfield zero-lockin)')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .action(async (options) => {
    try {
      const cwd = options.cwd;
      console.log(pc.bold(pc.blue('\n🛡️  INITIALIZING ARCHON ARCHITECTURAL GUARDIAN...')));

      const configPath = path.resolve(cwd, 'guardian.config.json');
      if (!fs.existsSync(configPath)) {
        // Auto-detect project structure
        const hasClientServer = fs.existsSync(path.resolve(cwd, 'client')) && fs.existsSync(path.resolve(cwd, 'server'));
        const hasSrcFeatures = fs.existsSync(path.resolve(cwd, 'src/features'));

        let clientDir = 'src/modules';
        let serverDir = 'src/modules';
        let preset = 'modular-monolith';

        if (hasClientServer) {
          clientDir = 'client/src/modules';
          serverDir = 'server/src/modules';
          preset = 'vite-express-modular';
        } else if (hasSrcFeatures) {
          clientDir = 'src/features';
          serverDir = 'src/features';
          preset = 'feature-sliced';
        }

        const initialConfig = {
          $schema: 'https://archon.dev/schema.json',
          preset,
          language: 'typescript',
          strictness: 'strict',
          rules: {
            maxFileLines: 200,
            maxComponentLines: 120,
            ignoreBlankLines: false,
            preventCircularDependencies: true,
            moduleBoundary: {
              clientModulesDir: clientDir,
              serverModulesDir: serverDir,
              gatewayFile: 'index.ts',
              allowDeepImports: false,
            },
            dependencyFreeze: {
              enabled: false,
              allowedLibraries: [],
            },
          },
        };

        fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
        console.log(pc.green(`✔ Created guardian.config.json (detected preset: '${preset}')`));
      } else {
        console.log(pc.yellow(`ℹ guardian.config.json already exists.`));
      }

      // Generate .cursor/mcp.json for AI IDEs
      const cursorDir = path.resolve(cwd, '.cursor');
      if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
      const mcpPath = path.resolve(cursorDir, 'mcp.json');
      if (!fs.existsSync(mcpPath)) {
        fs.writeFileSync(
          mcpPath,
          JSON.stringify(
            {
              mcpServers: {
                archon: {
                  command: 'npx',
                  args: ['-y', '@archon/mcp'],
                },
              },
            },
            null,
            2
          )
        );
        console.log(pc.green(`✔ Configured AI MCP server in .cursor/mcp.json`));
      }

      // Generate AGENTS.md constitution if not present
      const agentsMdPath = path.resolve(cwd, 'AGENTS.md');
      if (!fs.existsSync(agentsMdPath)) {
        const constitution = `# 🛡️ AGENT CONSTITUTION & ARCHITECTURAL MANDATE\n\n> **Mandatory rules for all AI Coding Agents (Cursor, Windsurf, Claude Code, GitHub Copilot, Gemini)**\n\n1. **Check .context/MAP.md first**: Never re-implement duplicate functions.\n2. **File Size Limit**: Files must be under 200 lines (UI components under 120 lines).\n3. **Modular Boundary**: Always import from module gateway (\`index.ts\`). Never deep import internal files.\n4. **Pre-flight Validation**: Run \`npx archon check\` before committing.\n`;
        fs.writeFileSync(agentsMdPath, constitution);
        console.log(pc.green(`✔ Generated AI constitution: AGENTS.md`));
      }

      // Generate initial skeleton map
      const skeleton = await generateProjectSkeleton({ cwd });
      console.log(pc.green(`✔ Built initial Context Map (.context/MAP.md) with ${skeleton.modules.length} module(s).`));

      console.log(pc.bold(pc.cyan('\n✨ Archon successfully initialized! AI Coding Guardian is now active.\n')));
    } catch (error: any) {
      console.error(pc.red(`Archon Init Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

#!/usr/bin/env node
import * as p from '@clack/prompts';
import pc from 'picocolors';
import path from 'node:path';
import { scaffoldProject } from './scaffolder.js';

async function main() {
  console.log('');
  p.intro(pc.bgBlue(pc.white(pc.bold(' 🛡️  AI ARCHITECTURAL GUARDIAN (ARCHON) '))));

  const projectName = await p.text({
    message: 'Project name:',
    placeholder: 'my-saas-app',
    defaultValue: 'my-saas-app',
    validate: (value) => {
      if (!value) return 'Please enter a project name';
      if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Project name can only contain alphanumeric characters, hyphens, and underscores';
      return;
    },
  });

  if (p.isCancel(projectName)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const framework = await p.select({
    message: 'Select framework / ecosystem:',
    options: [
      { value: 'vite-express', label: 'React + Node.js (Vite + Express)', hint: 'recommended' },
      { value: 'nextjs', label: 'Next.js 15 (App Router - Fullstack)', hint: 'coming soon' },
      { value: 'fastapi', label: 'Python (FastAPI + Pydantic)', hint: 'coming soon' },
      { value: 'go', label: 'Go (Standard Project Layout)', hint: 'coming soon' },
    ],
    initialValue: 'vite-express',
  });

  if (p.isCancel(framework)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const language = await p.select({
    message: 'Select language variant:',
    options: [
      {
        value: 'typescript',
        label: 'TypeScript',
        hint: '10x better AI context skeleton & type safety',
      },
      {
        value: 'javascript',
        label: 'JavaScript',
        hint: 'Vanilla + JSDoc validation',
      },
    ],
    initialValue: 'typescript',
  });

  if (p.isCancel(language)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const pattern = await p.select({
    message: 'Select architectural pattern:',
    options: [
      {
        value: 'modular-monolith',
        label: 'Modular Monolith',
        hint: 'src/modules/[feature]/{ui, routes, services, schemas}',
      },
      {
        value: 'clean-architecture',
        label: 'Clean Architecture',
        hint: 'domain, usecases, adapters',
      },
    ],
    initialValue: 'modular-monolith',
  });

  if (p.isCancel(pattern)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const strictness = await p.select({
    message: 'Architectural strictness (Guardian enforcement):',
    options: [
      {
        value: 'relaxed',
        label: 'Relaxed',
        hint: 'Max 300 lines/file, warnings only',
      },
      {
        value: 'strict',
        label: 'Strict',
        hint: 'Max 200 lines/file, deep imports fail build immediately',
      },
      {
        value: 'hardcore',
        label: 'Hardcore',
        hint: 'Max 150 lines/file + 100% Zod validation required',
      },
    ],
    initialValue: 'strict',
  });

  if (p.isCancel(strictness)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const gitHooks = await p.confirm({
    message: 'Setup automatic Git hook (block invalid AI commits)?',
    initialValue: true,
  });

  if (p.isCancel(gitHooks)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const targetDir = path.resolve(process.cwd(), projectName as string);

  const s = p.spinner();
  s.start(`Scaffolding project in ./${projectName}...`);

  try {
    await scaffoldProject({
      projectName: projectName as string,
      targetDir,
      framework: framework as string,
      language: language as 'typescript' | 'javascript',
      pattern: pattern as string,
      strictness: strictness as 'relaxed' | 'strict' | 'hardcore',
      gitHooks: gitHooks as boolean,
    });

    s.stop(`Scaffolding complete in ./${projectName}!`);

    p.note(
      [
        `✔ Core template created (client: Vite, server: Express)`,
        `✔ guardian.config.json generated (Strictness: ${strictness})`,
        `✔ AGENTS.md & .cursorrules generated for AI IDEs`,
        `✔ AI Context Skeleton initialized (.context/architecture.json)`,
        gitHooks ? `✔ Pre-commit guards configured (simple-git-hooks)` : `○ Pre-commit guards skipped`,
      ].join('\n'),
      'What was created'
    );

    p.outro(
      pc.green(`All done! To start vibe coding with AI:\n\n`) +
        pc.cyan(`  cd ${projectName}\n`) +
        pc.cyan(`  npm install\n`) +
        pc.cyan(`  npm run dev`)
    );
  } catch (error) {
    s.stop('Failed to scaffold project.');
    if (error instanceof Error) {
      p.cancel(error.message);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

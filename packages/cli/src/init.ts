#!/usr/bin/env node
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { generateAgentsMarkdown, generateMcpConfig } from './constitution.js';
import { generateProjectSkeleton } from '@archon/skeleton';

async function main() {
  console.log('');
  p.intro(pc.bgBlue(pc.white(pc.bold(' 🛡️  ARCHON INIT (Brownfield Setup) '))));

  const cwd = process.cwd();
  const pkgPath = path.join(cwd, 'package.json');
  let detectedProjectName = 'my-project';

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) detectedProjectName = pkg.name;
    } catch {}
  }

  const strictness = await p.select({
    message: 'Select architectural strictness:',
    options: [
      { value: 'relaxed', label: 'Relaxed', hint: 'Max 300 lines/file, warnings only' },
      { value: 'strict', label: 'Strict', hint: 'Max 200 lines/file' },
      { value: 'hardcore', label: 'Hardcore', hint: 'Max 150 lines/file' },
    ],
    initialValue: 'strict',
  });

  if (p.isCancel(strictness)) {
    p.cancel('Init cancelled.');
    process.exit(0);
  }

  const language = fs.existsSync(path.join(cwd, 'tsconfig.json')) ? 'typescript' : 'javascript';
  const maxLinesMap = { relaxed: 300, strict: 200, hardcore: 150 };

  const s = p.spinner();
  s.start('Configuring Archon in current repository...');

  // 1. Generate guardian.config.json
  const config = {
    $schema: 'https://archon.dev/schema.json',
    preset: 'vite-express-modular',
    language,
    strictness,
    rules: {
      maxFileLines: maxLinesMap[strictness as 'relaxed' | 'strict' | 'hardcore'],
      maxComponentLines: 120,
      ignoreBlankLines: false,
      moduleBoundary: {
        clientModulesDir: 'client/src/modules',
        serverModulesDir: 'server/src/modules',
        gatewayFile: language === 'typescript' ? 'index.ts' : 'index.js',
        allowDeepImports: false,
      },
      dependencyFreeze: {
        enabled: false,
        allowedLibraries: [],
      },
    },
  };

  fs.writeFileSync(path.join(cwd, 'guardian.config.json'), JSON.stringify(config, null, 2), 'utf-8');

  // 2. Generate AGENTS.md & .cursorrules
  const constitution = generateAgentsMarkdown({
    projectName: detectedProjectName,
    strictness: strictness as 'relaxed' | 'strict' | 'hardcore',
    language,
    maxLines: maxLinesMap[strictness as 'relaxed' | 'strict' | 'hardcore'],
  });

  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), constitution, 'utf-8');
  fs.writeFileSync(path.join(cwd, '.cursorrules'), constitution, 'utf-8');

  // 3. Generate .cursor/mcp.json
  const cursorDir = path.join(cwd, '.cursor');
  if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
  fs.writeFileSync(path.join(cursorDir, 'mcp.json'), generateMcpConfig(), 'utf-8');

  // 4. Generate Skeleton
  await generateProjectSkeleton({ cwd });

  s.stop('Archon successfully initialized!');

  p.outro(pc.green('Run `archon check` to inspect your codebase against architectural rules.'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

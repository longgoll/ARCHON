import path from 'node:path';
import fs from 'node:fs';
import { scaffoldProject } from '../packages/cli/dist/scaffolder.js';
import { loadGuardianConfig } from '../packages/core/dist/config/loader.js';
import { runLinter } from '../packages/core/dist/linter.js';

async function runE2ETest() {
  console.log('--- Starting End-to-End Archon Test ---');
  const tempDir = path.resolve(process.cwd(), 'temp-test-project');

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  try {
    // 1. Test Scaffolding
    console.log('1. Scaffolding project into temp-test-project...');
    await scaffoldProject({
      projectName: 'temp-test-project',
      targetDir: tempDir,
      framework: 'vite-express',
      language: 'typescript',
      pattern: 'modular-monolith',
      strictness: 'strict',
      gitHooks: true,
    });

    const filesToCheck = [
      'guardian.config.json',
      'AGENTS.md',
      '.cursorrules',
      '.context/architecture.json',
      '.context/skeleton.d.ts',
      '.context/MAP.md',
      '.cursor/mcp.json',
      'client/src/modules/auth/index.ts',
      'server/src/modules/auth/index.ts',
    ];

    for (const f of filesToCheck) {
      if (!fs.existsSync(path.join(tempDir, f))) {
        throw new Error(`Missing expected file: ${f}`);
      }
      console.log(`  ✔ Verified file exists: ${f}`);
    }

    // 2. Test Linter on Clean Template
    console.log('2. Running Linter on Clean Scaffolding...');
    const config = loadGuardianConfig(tempDir);
    const cleanReport = await runLinter({ cwd: tempDir, config });
    if (cleanReport.hasErrors) {
      throw new Error(`Clean template has unexpected errors: ${JSON.stringify(cleanReport.violations)}`);
    }
    console.log(`  ✔ Clean template passed: ${cleanReport.filesScanned} files scanned, 0 violations.`);

    // 3. Test Violation Detection: Deep Import
    console.log('3. Testing Violation Detection (Illegal Deep Import)...');
    const badClientFile = path.join(tempDir, 'client/src/modules/user/ui/user-card.tsx');
    fs.mkdirSync(path.dirname(badClientFile), { recursive: true });
    fs.writeFileSync(
      badClientFile,
      `import React from 'react';\nimport { LoginForm } from '@/modules/auth/ui/login-form';\nexport function UserCard() { return <div>Card</div>; }`,
      'utf-8'
    );

    const violationReport = await runLinter({ cwd: tempDir, config });
    if (!violationReport.hasErrors) {
      throw new Error('Linter failed to catch deep import violation!');
    }
    console.log(`  ✔ Deep import violation caught successfully:`);
    console.log(`    Message: ${violationReport.violations[0].message}`);
    console.log(`    Remediation: ${violationReport.violations[0].remediation}`);

    console.log('\n🎉 ALL ARCHON E2E TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

runE2ETest().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});

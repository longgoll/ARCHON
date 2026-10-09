import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAgentsMarkdown, generateMcpConfig } from './constitution.js';
import { generateProjectSkeleton } from '@archon/skeleton';

export interface ScaffoldOptions {
  projectName: string;
  targetDir: string;
  framework: string;
  language: 'typescript' | 'javascript';
  pattern: string;
  strictness: 'relaxed' | 'strict' | 'hardcore';
  gitHooks: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyDirRecursive(src: string, dest: string, projectName: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, projectName);
    } else {
      let content = fs.readFileSync(srcPath, 'utf-8');
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
      fs.writeFileSync(destPath, content, 'utf-8');
    }
  }
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<void> {
  const { projectName, targetDir, language, strictness } = options;

  // Determine template directory across both local monorepo and packaged npm distribution
  const templateName = language === 'typescript' ? 'vite-express-ts' : 'vite-express-ts';
  const templateCandidates = [
    path.resolve(__dirname, '../templates', templateName),
    path.resolve(__dirname, '../../templates', templateName),
    path.resolve(__dirname, '../../../templates', templateName),
    path.resolve(process.cwd(), 'templates', templateName),
  ];

  const templateDir = templateCandidates.find((dir) => fs.existsSync(dir));

  if (!templateDir) {
    throw new Error(
      `Template directory '${templateName}' not found. Searched in:\n` +
      templateCandidates.map((c) => `  - ${c}`).join('\n')
    );
  }

  // 1. Copy template files
  copyDirRecursive(templateDir, targetDir, projectName);

  // 2. Generate guardian.config.json
  const maxLinesMap = { relaxed: 300, strict: 200, hardcore: 150 };
  const maxComponentLinesMap = { relaxed: 180, strict: 120, hardcore: 90 };

  const guardianConfig = {
    $schema: 'https://archon.dev/schema.json',
    preset: 'vite-express-modular',
    language,
    strictness,
    rules: {
      maxFileLines: maxLinesMap[strictness],
      maxComponentLines: maxComponentLinesMap[strictness],
      ignoreBlankLines: false,
      moduleBoundary: {
        clientModulesDir: 'client/src/modules',
        serverModulesDir: 'server/src/modules',
        gatewayFile: language === 'typescript' ? 'index.ts' : 'index.js',
        allowDeepImports: false,
      },
      dependencyFreeze: {
        enabled: true,
        allowedLibraries: [
          'react',
          'react-dom',
          'express',
          'cors',
          'zod',
          'lucide-react',
        ],
      },
    },
  };

  fs.writeFileSync(
    path.join(targetDir, 'guardian.config.json'),
    JSON.stringify(guardianConfig, null, 2),
    'utf-8'
  );

  // 3. Generate AGENTS.md & .cursorrules
  const agentsMarkdown = generateAgentsMarkdown({
    projectName,
    strictness,
    language,
    maxLines: maxLinesMap[strictness],
  });

  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMarkdown, 'utf-8');
  fs.writeFileSync(path.join(targetDir, '.cursorrules'), agentsMarkdown, 'utf-8');

  // 4. Generate .cursor/mcp.json for native Cursor MCP integration
  const cursorDir = path.join(targetDir, '.cursor');
  if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
  fs.writeFileSync(path.join(cursorDir, 'mcp.json'), generateMcpConfig(), 'utf-8');

  // 5. Generate initial context skeleton
  await generateProjectSkeleton({ cwd: targetDir });
}

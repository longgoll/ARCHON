import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import {
  generateProjectSkeleton,
  generateContextMapMarkdown,
  generateContractsDeclaration,
} from '@archon/skeleton';
import { loadGuardianConfig } from '../config/loader.js';
import { runLinter } from '../linter.js';
import { extractCrossModuleImports, findModuleCycles } from '../rules/circular.js';
import { decomposeFile } from '../decomposer/index.js';
import { getStudioHtml } from './ui.js';

export interface StartStudioOptions {
  cwd?: string;
  port?: number;
}

export async function collectStudioData(cwd: string) {
  const config = loadGuardianConfig(cwd);
  const [skeleton, report] = await Promise.all([
    generateProjectSkeleton({ cwd }),
    runLinter({ cwd, config }),
  ]);

  // Read scanned source files for graph dependencies
  const filePatterns = [
    'client/src/**/*.{ts,tsx,js,jsx}',
    'server/src/**/*.{ts,js}',
    'src/**/*.{ts,tsx,js,jsx}',
  ];
  const files = await fg(filePatterns, {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.context/**', '**/*.d.ts'],
    absolute: false,
  });

  const scannedFiles: { filePath: string; content: string }[] = [];
  let totalSourceBytes = 0;
  for (const rel of files) {
    try {
      const content = fs.readFileSync(path.resolve(cwd, rel), 'utf-8');
      scannedFiles.push({ filePath: rel, content });
      totalSourceBytes += content.length;
    } catch {
      // ignore read error
    }
  }

  const crossImports = extractCrossModuleImports(scannedFiles, config);
  const cycles = findModuleCycles(crossImports);

  // Group dependencies into unique edges for graph visualization
  const edgeMap = new Map<
    string,
    { from: string; to: string; side: 'client' | 'server'; count: number; files: string[] }
  >();
  for (const item of crossImports) {
    const key = `${item.sourceModule}->${item.importedModule}:${item.side}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        from: item.sourceModule,
        to: item.importedModule,
        side: item.side,
        count: 0,
        files: [],
      });
    }
    const edge = edgeMap.get(key)!;
    edge.count++;
    if (!edge.files.includes(item.file)) edge.files.push(item.file);
  }
  const edges = Array.from(edgeMap.values());

  // Calculate health score: 100 - (errors * 15 + warnings * 5)
  const errors = report.violations.filter((v) => v.severity === 'error').length;
  const warnings = report.violations.filter((v) => v.severity === 'warning').length;
  const healthScore = Math.max(0, Math.min(100, 100 - (errors * 15 + warnings * 5)));

  // Token savings estimation
  const allRoutes = skeleton.modules.flatMap((m) => m.routes || []);
  const contextMapMarkdown = generateContextMapMarkdown(skeleton);
  const contractsContent = generateContractsDeclaration(allRoutes);

  // Estimation: 1 token approx 4 characters
  const rawTokens = Math.max(1000, Math.round(totalSourceBytes / 4));
  const skeletonTokens = Math.max(200, Math.round((contextMapMarkdown.length + contractsContent.length) / 4));
  const tokensSaved = Math.max(0, rawTokens - skeletonTokens);
  const savingsPct = Number(((tokensSaved / rawTokens) * 100).toFixed(1));

  return {
    cwd,
    skeleton,
    report,
    config,
    dependencies: crossImports,
    edges,
    cycles,
    healthScore,
    tokenStats: {
      rawTokens,
      skeletonTokens,
      tokensSaved,
      savingsPct,
      filesScanned: files.length,
    },
    contextMap: contextMapMarkdown,
    contractsDts: contractsContent,
  };
}

export async function startArchonStudio(options: StartStudioOptions = {}) {
  const cwd = options.cwd || process.cwd();
  const port = options.port || 4321;

  const server = http.createServer(async (req, res) => {
    // Enable CORS for potential external dashboard or API calls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // GET /api/stats - Realtime stats endpoint for polling
    if (url.pathname === '/api/stats' && req.method === 'GET') {
      try {
        const data = await collectStudioData(cwd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // POST /api/fix - One-click AST Auto-Decomposer endpoint
    if (url.pathname === '/api/fix' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const targetFile = parsed.filePath;
          if (!targetFile) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'filePath parameter is required' }));
            return;
          }

          const result = decomposeFile(targetFile);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: result.success, result }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Default: Serve HTML dashboard
    try {
      const initialData = await collectStudioData(cwd);
      const html = getStudioHtml(initialData);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Archon Studio Error: ${err.message}`);
    }
  });

  return new Promise<{ server: http.Server; url: string }>((resolve, reject) => {
    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      resolve({ server, url });
    });
    server.on('error', reject);
  });
}

import http from 'node:http';
import { generateProjectSkeleton } from '@archon/skeleton';
import { loadGuardianConfig } from '../config/loader.js';
import { runLinter } from '../linter.js';
import { getStudioHtml } from './ui.js';

export interface StartStudioOptions {
  cwd?: string;
  port?: number;
}

export async function startArchonStudio(options: StartStudioOptions = {}) {
  const cwd = options.cwd || process.cwd();
  const port = options.port || 4321;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/api/stats') {
      try {
        const config = loadGuardianConfig(cwd);
        const [skeleton, report] = await Promise.all([
          generateProjectSkeleton({ cwd }),
          runLinter({ cwd, config }),
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ skeleton, report, config }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Default HTML dashboard
    try {
      const config = loadGuardianConfig(cwd);
      const [skeleton, report] = await Promise.all([
        generateProjectSkeleton({ cwd }),
        runLinter({ cwd, config }),
      ]);

      const html = getStudioHtml({ skeleton, report, config });
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

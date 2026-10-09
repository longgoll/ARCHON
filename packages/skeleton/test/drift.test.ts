import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractClientApiCalls, checkContractDrift } from '../src/drift.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureDir = path.resolve(__dirname, 'drift-fixture');

describe('Archon Contract Drift Checker (FE vs BE)', () => {
  function setupTestRepo() {
    if (fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.resolve(fixtureDir, 'client/src/modules/billing/ui'), { recursive: true });
    fs.mkdirSync(path.resolve(fixtureDir, 'server/src/modules/billing/routes'), { recursive: true });
  }

  function cleanupTestRepo() {
    if (fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  }

  it('should extract client fetch and axios calls correctly', () => {
    setupTestRepo();
    try {
      const clientFile = path.resolve(fixtureDir, 'client/src/modules/billing/ui/billing-view.tsx');
      fs.writeFileSync(
        clientFile,
        `
        import React from 'react';
        import axios from 'axios';

        export function BillingView() {
          const loadData = async () => {
            const res = await fetch('/api/billing/invoices');
            const data = await res.json();
            await axios.post('/api/billing/charge', { amount: 100 });
          };
          return <div>Billing</div>;
        }
        `
      );

      const calls = extractClientApiCalls(clientFile);
      assert.strictEqual(calls.length, 2);

      const getCall = calls.find((c) => c.method === 'GET');
      assert.ok(getCall);
      assert.strictEqual(getCall.normalizedPath, '/api/billing/invoices');

      const postCall = calls.find((c) => c.method === 'POST');
      assert.ok(postCall);
      assert.strictEqual(postCall.normalizedPath, '/api/billing/charge');
    } finally {
      cleanupTestRepo();
    }
  });

  it('should detect ENDPOINT_NOT_FOUND and METHOD_MISMATCH drift issues', async () => {
    setupTestRepo();
    try {
      // 1. Create server routes
      const serverRouteFile = path.resolve(
        fixtureDir,
        'server/src/modules/billing/routes/billing.routes.ts'
      );
      fs.writeFileSync(
        serverRouteFile,
        `
        import { Router } from 'express';
        const router = Router();

        // Registered POST route
        router.post('/api/billing/charge', (req, res) => res.json({ ok: true }));

        // Registered GET route
        router.get('/api/billing/history', (req, res) => res.json({ history: [] }));

        export default router;
        `
      );

      // 2. Create client file with drift:
      // - Calls GET /api/billing/charge (METHOD_MISMATCH: server only has POST)
      // - Calls POST /api/billing/fake-endpoint (ENDPOINT_NOT_FOUND)
      const clientFile = path.resolve(fixtureDir, 'client/src/modules/billing/ui/billing-view.tsx');
      fs.writeFileSync(
        clientFile,
        `
        import React from 'react';

        export function BillingView() {
          const handleAction = async () => {
            // Method mismatch: GET instead of POST
            await fetch('/api/billing/charge');

            // Non-existent route
            await fetch('/api/billing/fake-endpoint', { method: 'POST' });
          };
          return <div>Test</div>;
        }
        `
      );

      const report = await checkContractDrift({
        cwd: fixtureDir,
        clientDir: 'client/src',
        serverDir: 'server/src',
      });

      assert.strictEqual(report.hasErrors, true);
      assert.strictEqual(report.issues.length, 2);

      const methodMismatch = report.issues.find((i) => i.type === 'METHOD_MISMATCH');
      assert.ok(methodMismatch);
      assert.strictEqual(methodMismatch.clientMethod, 'GET');
      assert.deepStrictEqual(methodMismatch.availableMethods, ['POST']);

      const notFound = report.issues.find((i) => i.type === 'ENDPOINT_NOT_FOUND');
      assert.ok(notFound);
      assert.strictEqual(notFound.clientPath, '/api/billing/fake-endpoint');

      // Check orphan route (/api/billing/history was never called)
      const orphanHistory = report.orphanRoutes.find((r) => r.path === '/api/billing/history');
      assert.ok(orphanHistory);
    } finally {
      cleanupTestRepo();
    }
  });

  it('should pass cleanly with zero issues when client calls match server routes', async () => {
    setupTestRepo();
    try {
      const serverRouteFile = path.resolve(
        fixtureDir,
        'server/src/modules/billing/routes/billing.routes.ts'
      );
      fs.writeFileSync(
        serverRouteFile,
        `
        import { Router } from 'express';
        const router = Router();
        router.get('/api/billing/invoices', (req, res) => res.json([]));
        router.post('/api/billing/charge', (req, res) => res.json({}));
        `
      );

      const clientFile = path.resolve(fixtureDir, 'client/src/modules/billing/ui/billing-view.tsx');
      fs.writeFileSync(
        clientFile,
        `
        import React from 'react';
        export function BillingView() {
          const run = async () => {
            await fetch('/api/billing/invoices');
            await fetch('/api/billing/charge', { method: 'POST' });
          };
          return <div>OK</div>;
        }
        `
      );

      const report = await checkContractDrift({
        cwd: fixtureDir,
        clientDir: 'client/src',
        serverDir: 'server/src',
      });

      assert.strictEqual(report.hasErrors, false);
      assert.strictEqual(report.issues.length, 0);
      assert.strictEqual(report.totalClientCalls, 2);
      assert.strictEqual(report.totalServerRoutes, 2);
    } finally {
      cleanupTestRepo();
    }
  });

  it('should resolve mount prefix when router uses relative paths mounted via app.use', async () => {
    setupTestRepo();
    try {
      // 1. Create server app.ts mounting auth router under /api/auth
      const appFile = path.resolve(fixtureDir, 'server/src/app.ts');
      fs.writeFileSync(
        appFile,
        `
        import express from 'express';
        import { authRouter } from './modules/auth/routes/auth.routes.js';
        const app = express();
        app.use('/api/auth', authRouter);
        `
      );

      // 2. Create server route with relative path /login
      fs.mkdirSync(path.resolve(fixtureDir, 'server/src/modules/auth/routes'), { recursive: true });
      const authRouteFile = path.resolve(
        fixtureDir,
        'server/src/modules/auth/routes/auth.routes.ts'
      );
      fs.writeFileSync(
        authRouteFile,
        `
        import { Router } from 'express';
        export const authRouter = Router();
        authRouter.post('/login', (req, res) => res.json({ ok: true }));
        `
      );

      // 3. Create client calling /api/auth/login
      fs.mkdirSync(path.resolve(fixtureDir, 'client/src/modules/auth/ui'), { recursive: true });
      const clientFile = path.resolve(fixtureDir, 'client/src/modules/auth/ui/auth-view.tsx');
      fs.writeFileSync(
        clientFile,
        `
        import React from 'react';
        export function AuthView() {
          const login = async () => {
            await fetch('/api/auth/login', { method: 'POST' });
          };
          return <div>Auth</div>;
        }
        `
      );

      const report = await checkContractDrift({
        cwd: fixtureDir,
        clientDir: 'client/src',
        serverDir: 'server/src',
      });

      assert.strictEqual(report.hasErrors, false, 'Expected zero drift errors');
      assert.strictEqual(report.issues.length, 0);
      assert.strictEqual(report.totalClientCalls, 1);
      assert.strictEqual(report.totalServerRoutes, 1);
    } finally {
      cleanupTestRepo();
    }
  });
});

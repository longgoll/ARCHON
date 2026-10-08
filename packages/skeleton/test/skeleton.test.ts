import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractModuleExports,
  generateContextMapMarkdown,
  ProjectSkeleton,
  extractRoutesFromFile,
  generateContractsDeclaration,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Archon Context Skeleton & Extractor', () => {
  it('should extract exported functions with JSDoc comments', () => {
    const fixtureCode = `
      /**
       * Calculates tax for a given transaction amount
       */
      export function calculateTax(amount: number, rate: number): number {
        return amount * rate;
      }

      /**
       * Primary auth token validator
       */
      export const verifyToken = async (token: string): Promise<boolean> => {
        return true;
      };
    `;

    const tmpFile = path.resolve(__dirname, 'temp-fixture.ts');
    fs.writeFileSync(tmpFile, fixtureCode, 'utf-8');

    try {
      const exports = extractModuleExports(tmpFile);
      assert.strictEqual(exports.length, 2);

      const taxFn = exports.find((e) => e.name === 'calculateTax');
      assert.ok(taxFn);
      assert.strictEqual(taxFn.kind, 'function');
      assert.strictEqual(taxFn.description, 'Calculates tax for a given transaction amount');
      assert.strictEqual(taxFn.signature, '(amount: number, rate: number) => number');

      const verifyFn = exports.find((e) => e.name === 'verifyToken');
      assert.ok(verifyFn);
      assert.strictEqual(verifyFn.kind, 'function');
      assert.strictEqual(verifyFn.description, 'Primary auth token validator');
      assert.strictEqual(verifyFn.signature, '(token: string) => Promise<boolean>');
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('should detect React components in TSX files', () => {
    const fixtureCode = `
      import React from 'react';

      /**
       * User avatar badge with status
       */
      export function UserBadge({ name }: { name: string }) {
        return <div>{name}</div>;
      }
    `;

    const tmpFile = path.resolve(__dirname, 'temp-component.tsx');
    fs.writeFileSync(tmpFile, fixtureCode, 'utf-8');

    try {
      const exports = extractModuleExports(tmpFile);
      assert.strictEqual(exports.length, 1);
      assert.strictEqual(exports[0].name, 'UserBadge');
      assert.strictEqual(exports[0].kind, 'component');
      assert.strictEqual(exports[0].description, 'User avatar badge with status');
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('should generate formatted MAP.md with AI directives and module listings', () => {
    const mockSkeleton: ProjectSkeleton = {
      generatedAt: '2026-10-08T22:00:00.000Z',
      preset: 'vite-express-modular',
      modules: [
        {
          moduleName: 'auth',
          side: 'client',
          gatewayPath: 'client/src/modules/auth/index.ts',
          internalFiles: ['api/auth.api.ts', 'ui/LoginForm.tsx'],
          exports: [
            {
              name: 'login',
              kind: 'function',
              signature: '(creds: LoginInput) => Promise<Session>',
              description: 'Authenticates user and returns session',
            },
            {
              name: 'LoginForm',
              kind: 'component',
              signature: '(props: LoginFormProps) => JSX.Element',
              description: 'Login form UI',
            },
          ],
        },
      ],
    };

    const mapMarkdown = generateContextMapMarkdown(mockSkeleton);
    assert.ok(mapMarkdown.includes('# 🗺️ ARCHON ARCHITECTURAL CONTEXT MAP'));
    assert.ok(mapMarkdown.includes('AI AGENT MANDATE'));
    assert.ok(mapMarkdown.includes('### 📦 `@/modules/auth`'));
    assert.ok(mapMarkdown.includes('Authenticates user and returns session'));
    assert.ok(mapMarkdown.includes('`<LoginForm />`'));
  });

  it('should extract Express API routes with validators and handlers', () => {
    const routeCode = `
      import { Router } from 'express';
      const router = Router();

      /**
       * Login user with credentials
       */
      router.post('/login', validate(LoginSchema), authController.login);

      /**
       * Get current user profile
       */
      router.get('/me', authController.getProfile);

      export default router;
    `;

    const tmpFile = path.resolve(__dirname, 'temp-routes.ts');
    fs.writeFileSync(tmpFile, routeCode, 'utf-8');

    try {
      const routes = extractRoutesFromFile(tmpFile);
      assert.strictEqual(routes.length, 2);

      const postRoute = routes.find((r) => r.method === 'POST');
      assert.ok(postRoute);
      assert.strictEqual(postRoute.path, '/login');
      assert.strictEqual(postRoute.schema, 'LoginSchema');
      assert.strictEqual(postRoute.handler, 'authController.login');
      assert.strictEqual(postRoute.description, 'Login user with credentials');

      const getRoute = routes.find((r) => r.method === 'GET');
      assert.ok(getRoute);
      assert.strictEqual(getRoute.path, '/me');
      assert.strictEqual(getRoute.handler, 'authController.getProfile');

      const dts = generateContractsDeclaration(routes);
      assert.ok(dts.includes('ArchonApiEndpoints'));
      assert.ok(dts.includes('"POST /login"'));
      assert.ok(dts.includes('"GET /me"'));
      assert.ok(dts.includes('LoginSchemaInput'));
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});

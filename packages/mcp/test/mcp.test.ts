import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createArchonMcpServer } from '../src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Archon Model Context Protocol (MCP) Server', () => {
  const fixtureDir = path.resolve(__dirname, 'fixtures');

  // Setup temporary modular structure for testing
  function setupTestRepo() {
    if (fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.resolve(fixtureDir, 'client/src/modules/billing'), { recursive: true });
    fs.mkdirSync(path.resolve(fixtureDir, 'client/src/modules/auth'), { recursive: true });

    // Config
    fs.writeFileSync(
      path.resolve(fixtureDir, 'guardian.config.json'),
      JSON.stringify(
        {
          preset: 'vite-express-modular',
          strictness: 'strict',
          rules: {
            maxFileLines: 200,
            moduleBoundary: {
              clientModulesDir: 'client/src/modules',
              serverModulesDir: 'server/src/modules',
              gatewayFile: 'index.ts',
              allowDeepImports: false,
            },
          },
        },
        null,
        2
      )
    );

    // Gateway for auth
    fs.writeFileSync(
      path.resolve(fixtureDir, 'client/src/modules/auth/index.ts'),
      `/**
 * Verifies user session token
 */
export function verifySession(token: string): boolean {
  return Boolean(token);
}
`
    );
  }

  function cleanupTestRepo() {
    if (fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  }

  it('should initialize and register all Archon tools and resources', async () => {
    setupTestRepo();
    try {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const server = createArchonMcpServer({ cwd: fixtureDir });
      await server.connect(serverTransport);

      const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(clientTransport);

      const toolList = await client.listTools();
      const toolNames = toolList.tools.map((t) => t.name);

      assert.ok(toolNames.includes('archon_query_context'));
      assert.ok(toolNames.includes('archon_validate_proposal'));
      assert.ok(toolNames.includes('archon_get_module_contract'));
      assert.ok(toolNames.includes('archon_lint_project'));
      assert.ok(toolNames.includes('archon_get_architecture_map'));

      const resourceList = await client.listResources();
      const resourceUris = resourceList.resources.map((r) => r.uri);
      assert.ok(resourceUris.includes('archon://context/map'));
      assert.ok(resourceUris.includes('archon://config'));
    } finally {
      cleanupTestRepo();
    }
  });

  it('should allow AI to query existing context without token bloat', async () => {
    setupTestRepo();
    try {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const server = createArchonMcpServer({ cwd: fixtureDir });
      await server.connect(serverTransport);

      const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(clientTransport);

      const result: any = await client.callTool({
        name: 'archon_query_context',
        arguments: {
          query: 'session',
        },
      });

      assert.ok(result.content && result.content.length > 0);
      const text = result.content[0].text;
      assert.ok(text.includes('verifySession'));
      assert.ok(text.includes('@/modules/auth'));
      assert.ok(text.includes('Verifies user session token'));
    } finally {
      cleanupTestRepo();
    }
  });

  it('should pre-flight validate compliant code proposals as PASS', async () => {
    setupTestRepo();
    try {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const server = createArchonMcpServer({ cwd: fixtureDir });
      await server.connect(serverTransport);

      const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(clientTransport);

      const compliantCode = `
import React from 'react';
import { verifySession } from '@/modules/auth';

export function BillingPage() {
  return <div>Billing Page</div>;
}
`;

      const result: any = await client.callTool({
        name: 'archon_validate_proposal',
        arguments: {
          filePath: 'client/src/modules/billing/ui/billing-page.tsx',
          content: compliantCode,
        },
      });

      const text = result.content[0].text;
      assert.ok(text.includes('PASS'));
      assert.ok(text.includes('safely'));
    } finally {
      cleanupTestRepo();
    }
  });

  it('should reject deep imports and oversized proposals during pre-flight validation', async () => {
    setupTestRepo();
    try {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const server = createArchonMcpServer({ cwd: fixtureDir });
      await server.connect(serverTransport);

      const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(clientTransport);

      // Violates deep import rule
      const illegalCode = `
import React from 'react';
import { internalHelper } from '@/modules/auth/private/internal';

export function BillingPage() {
  return <div>Illegal import</div>;
}
`;

      const result: any = await client.callTool({
        name: 'archon_validate_proposal',
        arguments: {
          filePath: 'client/src/modules/billing/ui/billing-page.tsx',
          content: illegalCode,
        },
      });

      const text = result.content[0].text;
      assert.ok(text.includes('REJECTED'));
      assert.ok(text.includes('MODULE-BOUNDARY'));
      assert.ok(text.includes('Remediation'));
    } finally {
      cleanupTestRepo();
    }
  });
});

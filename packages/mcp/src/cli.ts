#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Command } from 'commander';
import path from 'node:path';
import { createArchonMcpServer } from './server.js';

const program = new Command();

program
  .name('archon-mcp')
  .description('Model Context Protocol (MCP) server for Archon Architectural Guardian')
  .version('0.1.0')
  .option('-C, --cwd <dir>', 'Working directory for the Archon project', process.cwd())
  .action(async (options) => {
    const cwd = path.resolve(process.cwd(), options.cwd);
    const server = createArchonMcpServer({ cwd });
    const transport = new StdioServerTransport();

    // Standard error logging so stdout stays 100% clean for MCP JSON-RPC protocol
    process.stderr.write(`[ARCHON-MCP] Starting Archon MCP Server (stdio transport) in: ${cwd}\n`);

    try {
      await server.connect(transport);
      process.stderr.write(`[ARCHON-MCP] Connected and ready to serve AI Agent requests.\n`);
    } catch (err: any) {
      process.stderr.write(`[ARCHON-MCP] Fatal error: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);

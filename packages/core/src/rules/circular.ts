import ts from 'typescript';
import path from 'node:path';
import { GuardianConfig } from '../config/schema.js';
import { Violation } from '../reporter/types.js';

export interface FileImportRecord {
  file: string;
  importedModule: string; // e.g. "billing"
  rawSpecifier: string;
  sourceModule: string;   // e.g. "order"
  side: 'client' | 'server';
  line: number;
}

export interface CircularCycle {
  side: 'client' | 'server';
  modules: string[]; // e.g. ["order", "billing", "order"]
  triggerFile: string;
  line: number;
}

/**
 * Extracts all cross-module imports from a list of scanned source files.
 */
export function extractCrossModuleImports(
  files: { filePath: string; content: string }[]
): FileImportRecord[] {
  const records: FileImportRecord[] = [];

  for (const { filePath, content } of files) {
    const normalized = filePath.replace(/\\/g, '/');

    // Detect if this file belongs to a module:
    // client/src/modules/<mod>/... or server/src/modules/<mod>/...
    const clientMatch = normalized.match(/(?:^|\/)client\/src\/modules\/([^/]+)\//);
    const serverMatch = normalized.match(/(?:^|\/)server\/src\/modules\/([^/]+)\//);

    if (!clientMatch && !serverMatch) continue;

    const side = clientMatch ? 'client' : 'server';
    const sourceModule = (clientMatch ? clientMatch[1] : serverMatch![1]);

    let scriptKind = ts.ScriptKind.TSX;
    if (filePath.endsWith('.ts')) scriptKind = ts.ScriptKind.TS;
    else if (filePath.endsWith('.js')) scriptKind = ts.ScriptKind.JS;
    else if (filePath.endsWith('.jsx')) scriptKind = ts.ScriptKind.JSX;

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    function visit(node: ts.Node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        const aliasMatch = specifier.match(/^@\/modules\/([^/]+)/);

        if (aliasMatch) {
          const targetModule = aliasMatch[1];
          if (targetModule !== sourceModule) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            records.push({
              file: filePath,
              importedModule: targetModule,
              rawSpecifier: specifier,
              sourceModule,
              side,
              line: line + 1,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return records;
}

/**
 * Finds all cycles in a directed graph using DFS.
 */
export function findModuleCycles(records: FileImportRecord[]): CircularCycle[] {
  const cycles: CircularCycle[] = [];
  const reportedKeys = new Set<string>();

  // Group by side ('client' or 'server')
  const bySide: Record<'client' | 'server', FileImportRecord[]> = {
    client: records.filter((r) => r.side === 'client'),
    server: records.filter((r) => r.side === 'server'),
  };

  for (const side of ['client', 'server'] as const) {
    const list = bySide[side];
    const adj = new Map<string, Array<{ to: string; file: string; line: number }>>();

    for (const rec of list) {
      if (!adj.has(rec.sourceModule)) adj.set(rec.sourceModule, []);
      adj.get(rec.sourceModule)!.push({
        to: rec.importedModule,
        file: rec.file,
        line: rec.line,
      });
    }

    const visited = new Set<string>();
    const recStack: string[] = [];

    function dfs(current: string, pathRecords: Array<{ to: string; file: string; line: number }>) {
      visited.add(current);
      recStack.push(current);

      const neighbors = adj.get(current) || [];
      for (const edge of neighbors) {
        const next = edge.to;
        const cycleIndex = recStack.indexOf(next);

        if (cycleIndex !== -1) {
          // Cycle detected!
          const cycleModules = [...recStack.slice(cycleIndex), next];
          // Canonical key to prevent duplicate reporting of same cycle rotated
          const sortedCore = [...cycleModules.slice(0, -1)].sort().join('->');
          const cycleKey = `${side}:${sortedCore}`;

          if (!reportedKeys.has(cycleKey)) {
            reportedKeys.add(cycleKey);
            cycles.push({
              side,
              modules: cycleModules,
              triggerFile: edge.file,
              line: edge.line,
            });
          }
        } else if (!recStack.includes(next)) {
          dfs(next, [...pathRecords, edge]);
        }
      }

      recStack.pop();
    }

    for (const mod of adj.keys()) {
      dfs(mod, []);
    }
  }

  return cycles;
}

/**
 * Validates whole-project files against circular module dependencies.
 */
export function checkCircularDependencies(
  files: { filePath: string; content: string }[],
  config: GuardianConfig
): Violation[] {
  if (config.rules.preventCircularDependencies === false) {
    return [];
  }

  const importRecords = extractCrossModuleImports(files);
  const cycles = findModuleCycles(importRecords);
  const severity = config.strictness === 'relaxed' ? 'warning' : 'error';

  return cycles.map((c) => ({
    rule: 'circular-dependency',
    file: c.triggerFile,
    line: c.line,
    message: `Circular module dependency detected on ${c.side}: ${c.modules.join(' ➔ ')}.`,
    remediation: `Break the cycle by extracting shared contracts/types into '@/shared' or refactoring the dependency between '${c.modules[0]}' and '${c.modules[1]}'.`,
    severity,
  }));
}

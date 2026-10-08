import ts from 'typescript';
import path from 'node:path';
import { GuardianConfig } from '../config/schema.js';
import { Violation } from '../reporter/types.js';

interface ImportInfo {
  importPath: string;
  line: number;
}

function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      imports.push({
        importPath: node.moduleSpecifier.text,
        line: line + 1,
      });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      imports.push({
        importPath: node.moduleSpecifier.text,
        line: line + 1,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

export function checkModuleBoundaries(
  filePath: string,
  content: string,
  config: GuardianConfig
): Violation[] {
  const violations: Violation[] = [];
  const normalizedPath = filePath.replace(/\\/g, '/');
  const severity = config.strictness === 'relaxed' ? 'warning' : 'error';

  // Determine script kind based on extension
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

  const imports = extractImports(sourceFile);

  // 1. Check Client -> Server Direct Import Leak
  const isClientFile = normalizedPath.includes('/client/') || normalizedPath.startsWith('client/');
  for (const imp of imports) {
    if (isClientFile) {
      if (
        imp.importPath.includes('/server/') ||
        imp.importPath.startsWith('@server') ||
        imp.importPath.startsWith('../../../server') ||
        imp.importPath.startsWith('../../server')
      ) {
        violations.push({
          rule: 'module-boundary',
          file: filePath,
          line: imp.line,
          message: `Client file illegally imports from server: '${imp.importPath}'.`,
          remediation: `Remove direct server import. Create an API endpoint in server router and call it via HTTP / client fetch.`,
          severity,
        });
      }
    }
  }

  // 2. Check Modular Monolith Deep Imports
  // Regex to detect modules path: e.g. client/src/modules/<modName>/... or server/src/modules/<modName>/...
  const moduleMatch = normalizedPath.match(/src\/modules\/([^/]+)\//);
  if (!moduleMatch) {
    return violations;
  }

  const currentModule = moduleMatch[1];

  for (const imp of imports) {
    // Check alias imports: e.g. @/modules/<targetMod>/<deepPath>
    const aliasMatch = imp.importPath.match(/^@\/modules\/([^/]+)(\/.*)?$/);
    if (aliasMatch) {
      const targetModule = aliasMatch[1];
      const deepPath = aliasMatch[2]; // e.g. /ui/login-form or /server/db

      // Deep import into ANOTHER module
      if (targetModule !== currentModule && deepPath && deepPath !== '/' && deepPath !== '/index') {
        violations.push({
          rule: 'module-boundary',
          file: filePath,
          line: imp.line,
          message: `Deep import into module '${targetModule}' is forbidden: '${imp.importPath}'.`,
          remediation: `Export '${path.basename(deepPath)}' through '@/modules/${targetModule}/index.ts' and import as: import { ... } from '@/modules/${targetModule}'.`,
          severity,
        });
      }
    }

    // Check relative imports into another module: e.g. ../../<targetMod>/<deepPath>
    const relativeModuleMatch = imp.importPath.match(/\.\.\/(?:\.\.\/)?modules\/([^/]+)(\/.*)?$/);
    if (relativeModuleMatch) {
      const targetModule = relativeModuleMatch[1];
      const deepPath = relativeModuleMatch[2];

      if (targetModule !== currentModule && deepPath && deepPath !== '/' && deepPath !== '/index') {
        violations.push({
          rule: 'module-boundary',
          file: filePath,
          line: imp.line,
          message: `Deep relative import into module '${targetModule}' is forbidden: '${imp.importPath}'.`,
          remediation: `Export necessary symbols via '${targetModule}/index.ts' and import via public gateway: '@/modules/${targetModule}'.`,
          severity,
        });
      }
    }
  }

  return violations;
}

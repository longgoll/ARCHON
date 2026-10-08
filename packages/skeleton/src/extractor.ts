import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

export interface ExportedSymbol {
  name: string;
  kind: 'function' | 'interface' | 'type' | 'class' | 'variable' | 'component' | 'reexport';
  signature?: string;
  description?: string;
  sourceFile?: string;
}

export interface RouteEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  schema?: string;
  handler?: string;
  description?: string;
}

export interface ModuleSkeleton {
  moduleName: string;
  side: 'client' | 'server';
  gatewayPath: string;
  description?: string;
  exports: ExportedSymbol[];
  internalFiles: string[];
  routes?: RouteEndpoint[];
}

export interface ProjectSkeleton {
  generatedAt: string;
  preset: string;
  modules: ModuleSkeleton[];
}

function resolveModuleTarget(dir: string, specifier: string): string | null {
  const cleanSpecifier = specifier.replace(/\.jsx?$/, '');
  const candidateBases = [
    path.resolve(dir, specifier),
    path.resolve(dir, cleanSpecifier),
  ];
  const extensions = [
    '',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '/index.ts',
    '/index.tsx',
    '/index.js',
    '/index.jsx',
  ];
  for (const base of candidateBases) {
    for (const ext of extensions) {
      const candidate = base + ext;
      if (fs.existsSync(candidate)) {
        try {
          if (fs.statSync(candidate).isFile()) {
            return candidate;
          }
        } catch {}
      }
    }
  }
  return null;
}

export function extractJsDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  const fullText = sourceFile.getFullText();
  const comments = ts.getLeadingCommentRanges(fullText, node.getFullStart());
  if (comments && comments.length > 0) {
    const lastComment = comments[comments.length - 1];
    const rawComment = fullText.substring(lastComment.pos, lastComment.end);
    const cleaned = rawComment
      .replace(/^\/\*\*?/, '')
      .replace(/\*\/$/, '')
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line) => !line.startsWith('@'))
      .filter(Boolean)
      .join(' ');
    return cleaned || undefined;
  }
  return undefined;
}

export function extractModuleExports(
  filePath: string,
  visited: Set<string> = new Set()
): ExportedSymbol[] {
  const normalized = path.resolve(filePath);
  if (!fs.existsSync(normalized) || visited.has(normalized)) {
    return [];
  }
  visited.add(normalized);

  let content: string;
  try {
    content = fs.readFileSync(normalized, 'utf-8');
  } catch {
    return [];
  }

  let scriptKind = ts.ScriptKind.TS;
  if (normalized.endsWith('.tsx')) scriptKind = ts.ScriptKind.TSX;
  else if (normalized.endsWith('.js')) scriptKind = ts.ScriptKind.JS;
  else if (normalized.endsWith('.jsx')) scriptKind = ts.ScriptKind.JSX;

  const sourceFile = ts.createSourceFile(
    normalized,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const symbols: ExportedSymbol[] = [];

  function isExported(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  function visit(node: ts.Node) {
    const jsDoc = extractJsDocComment(node, sourceFile);

    // 1. Export function
    if (ts.isFunctionDeclaration(node) && isExported(node) && node.name) {
      const name = node.name.text;
      const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
      const returnType = node.type ? node.type.getText(sourceFile) : 'any';
      const isComponent =
        /^[A-Z]/.test(name) &&
        (normalized.endsWith('.tsx') ||
          returnType.includes('JSX') ||
          returnType.includes('ReactNode') ||
          returnType.includes('ReactElement'));

      symbols.push({
        name,
        kind: isComponent ? 'component' : 'function',
        signature: `(${params}) => ${returnType}`,
        description: jsDoc,
        sourceFile: filePath,
      });
    }

    // 2. Export interface
    else if (ts.isInterfaceDeclaration(node) && isExported(node)) {
      symbols.push({
        name: node.name.text,
        kind: 'interface',
        signature: node.getText(sourceFile).slice(0, 200).trim(),
        description: jsDoc,
        sourceFile: filePath,
      });
    }

    // 3. Export type alias
    else if (ts.isTypeAliasDeclaration(node) && isExported(node)) {
      symbols.push({
        name: node.name.text,
        kind: 'type',
        signature: node.getText(sourceFile).slice(0, 200).trim(),
        description: jsDoc,
        sourceFile: filePath,
      });
    }

    // 4. Export class
    else if (ts.isClassDeclaration(node) && isExported(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: 'class',
        signature: `class ${node.name.text}`,
        description: jsDoc,
        sourceFile: filePath,
      });
    }

    // 5. Export variable (const / let / export const foo = ...)
    else if (ts.isVariableStatement(node) && isExported(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
          ) {
            const fn = decl.initializer;
            const params = fn.parameters.map((p) => p.getText(sourceFile)).join(', ');
            const returnType = fn.type
              ? fn.type.getText(sourceFile)
              : decl.type
              ? decl.type.getText(sourceFile)
              : 'any';

            const isComponent =
              /^[A-Z]/.test(name) &&
              (normalized.endsWith('.tsx') ||
                returnType.includes('JSX') ||
                returnType.includes('ReactNode') ||
                returnType.includes('ReactElement'));

            symbols.push({
              name,
              kind: isComponent ? 'component' : 'function',
              signature: `(${params}) => ${returnType}`,
              description: jsDoc,
              sourceFile: filePath,
            });
          } else {
            const type = decl.type ? decl.type.getText(sourceFile) : 'unknown';
            symbols.push({
              name,
              kind: 'variable',
              signature: type,
              description: jsDoc,
              sourceFile: filePath,
            });
          }
        }
      }
    }

    // 6. Export re-exports: export { foo, bar } from './xyz' or export * from './xyz'
    else if (ts.isExportDeclaration(node)) {
      const moduleSpecifier =
        node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : undefined;

      if (moduleSpecifier && (moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/'))) {
        const resolved = resolveModuleTarget(path.dirname(normalized), moduleSpecifier);
        if (resolved) {
          const resolvedSymbols = extractModuleExports(resolved, visited);

          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            for (const el of node.exportClause.elements) {
              const exportedName = el.name.text;
              const originalName = el.propertyName ? el.propertyName.text : exportedName;
              const match = resolvedSymbols.find((s) => s.name === originalName);
              if (match) {
                symbols.push({
                  ...match,
                  name: exportedName,
                  sourceFile: resolved,
                });
              } else {
                symbols.push({
                  name: exportedName,
                  kind: 'reexport',
                  signature: `from '${moduleSpecifier}'`,
                  sourceFile: resolved,
                });
              }
            }
          } else if (!node.exportClause) {
            // export * from './xyz'
            for (const sym of resolvedSymbols) {
              symbols.push({
                ...sym,
                sourceFile: resolved,
              });
            }
          }
          return;
        }
      }

      // External re-export
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          symbols.push({
            name: el.name.text,
            kind: 'reexport',
            signature: moduleSpecifier ? `from '${moduleSpecifier}'` : undefined,
            sourceFile: filePath,
          });
        }
      } else if (!node.exportClause && moduleSpecifier) {
        symbols.push({
          name: '*',
          kind: 'reexport',
          signature: `export * from '${moduleSpecifier}'`,
          sourceFile: filePath,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return symbols;
}

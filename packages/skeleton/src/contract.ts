import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { RouteEndpoint } from './extractor.js';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

export interface RouteExtractionOptions {
  prefix?: string;
  mountMap?: Map<string, string>;
}

/**
 * Normalizes and joins a mount prefix and a route path cleanly.
 * e.g. ('/api/auth', '/login') -> '/api/auth/login'
 * e.g. ('/api/auth', '/') -> '/api/auth'
 * e.g. ('/api/auth', '/api/auth/login') -> '/api/auth/login'
 */
export function joinRoutePaths(prefix?: string, routePath?: string): string {
  const rawRoute = (routePath || '').trim();
  if (!prefix || prefix === '/') {
    if (!rawRoute) return '/';
    return rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`;
  }

  const cleanPrefix = ('/' + prefix.trim()).replace(/\/+/g, '/').replace(/\/$/, '');
  const cleanRoute = (rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`).replace(/\/+/g, '/');

  // If route already starts with the prefix or is identical
  if (cleanRoute === cleanPrefix || cleanRoute.startsWith(cleanPrefix + '/')) {
    return cleanRoute;
  }

  // If route already has full /api/... path, do not prepend another /api prefix
  if (cleanRoute.startsWith('/api/') && cleanPrefix.startsWith('/api')) {
    return cleanRoute;
  }

  if (cleanRoute === '/') {
    return cleanPrefix;
  }

  return `${cleanPrefix}${cleanRoute}`;
}

/**
 * Discovers Express router mount prefixes (e.g. app.use('/api/auth', authRouter))
 * from server entry files (app.ts, server.ts, index.ts, main.ts) using AST.
 */
export function discoverServerMountPrefixes(cwd: string, serverDir?: string): Map<string, string> {
  const mountMap = new Map<string, string>();
  const targetDir = serverDir ? path.resolve(cwd, serverDir) : cwd;
  if (!fs.existsSync(targetDir)) return mountMap;

  // Potential entry files
  const candidateFiles = [
    path.resolve(targetDir, 'app.ts'),
    path.resolve(targetDir, 'app.js'),
    path.resolve(targetDir, 'server.ts'),
    path.resolve(targetDir, 'server.js'),
    path.resolve(targetDir, 'index.ts'),
    path.resolve(targetDir, 'index.js'),
    path.resolve(targetDir, 'main.ts'),
    path.resolve(targetDir, 'main.js'),
    path.resolve(cwd, 'server/src/app.ts'),
    path.resolve(cwd, 'server/src/server.ts'),
    path.resolve(cwd, 'src/app.ts'),
    path.resolve(cwd, 'src/server.ts'),
  ];

  const uniqueFiles = Array.from(new Set(candidateFiles)).filter((f) => fs.existsSync(f));

  for (const entryFile of uniqueFiles) {
    try {
      const content = fs.readFileSync(entryFile, 'utf-8');
      const isTs = entryFile.endsWith('.ts');
      const sourceFile = ts.createSourceFile(
        entryFile,
        content,
        ts.ScriptTarget.Latest,
        true,
        isTs ? ts.ScriptKind.TS : ts.ScriptKind.JS
      );

      // Track imported identifiers to their module names or target paths
      const importedSymbols = new Map<string, { specifier: string; resolvedModule?: string }>();

      function visitImports(node: ts.Node) {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const specifier = node.moduleSpecifier.text;
          // Extract module name if importing from ./modules/<name> or @/modules/<name>
          const modMatch = specifier.match(/(?:modules|features)\/([^/]+)/);
          const resolvedModule = modMatch ? modMatch[1] : undefined;

          if (node.importClause) {
            // Default import: import authRouter from '...'
            if (node.importClause.name) {
              importedSymbols.set(node.importClause.name.text, { specifier, resolvedModule });
            }
            // Named imports: import { authRouter } from '...'
            if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
              for (const el of node.importClause.namedBindings.elements) {
                importedSymbols.set(el.name.text, { specifier, resolvedModule });
              }
            }
          }
        }
        ts.forEachChild(node, visitImports);
      }
      visitImports(sourceFile);

      // Visit app.use(...) or router.use(...)
      function visitMounts(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          if (
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'use' &&
            node.arguments.length >= 2
          ) {
            const firstArg = node.arguments[0];
            const secondArg = node.arguments[1];

            let mountPath = '';
            if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
              mountPath = firstArg.text;
            }

            if (mountPath) {
              let routerName = '';
              if (ts.isIdentifier(secondArg)) {
                routerName = secondArg.text;
              } else if (ts.isPropertyAccessExpression(secondArg)) {
                routerName = secondArg.name.text;
              }

              if (routerName && importedSymbols.has(routerName)) {
                const info = importedSymbols.get(routerName)!;
                if (info.resolvedModule) {
                  mountMap.set(info.resolvedModule, mountPath);
                }
                mountMap.set(info.specifier, mountPath);
                const resolvedFile = path.resolve(path.dirname(entryFile), info.specifier);
                mountMap.set(resolvedFile.replace(/\\/g, '/'), mountPath);
              }

              // Also check direct module name in mountPath (e.g. /api/auth -> 'auth')
              const pathMatch = mountPath.match(/\/api\/([^/]+)/);
              if (pathMatch) {
                const inferredModule = pathMatch[1];
                if (!mountMap.has(inferredModule)) {
                  mountMap.set(inferredModule, mountPath);
                }
              }
            }
          }
        }
        ts.forEachChild(node, visitMounts);
      }
      visitMounts(sourceFile);
    } catch {}
  }

  return mountMap;
}

/**
 * Extracts Express route declarations (e.g. router.get('/path', ...)) from a source file using AST.
 */
export function extractRoutesFromFile(
  filePath: string,
  options: RouteExtractionOptions = {}
): RouteEndpoint[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  let scriptKind = ts.ScriptKind.TS;
  if (filePath.endsWith('.js')) scriptKind = ts.ScriptKind.JS;

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const normalizedPath = filePath.replace(/\\/g, '/');
  // Determine effective prefix
  let effectivePrefix = options.prefix;
  if (!effectivePrefix && options.mountMap) {
    const modMatch = normalizedPath.match(/(?:modules|features)\/([^/]+)/);
    if (modMatch && options.mountMap.has(modMatch[1])) {
      effectivePrefix = options.mountMap.get(modMatch[1]);
    } else {
      for (const [key, val] of options.mountMap.entries()) {
        if (normalizedPath.includes(key.replace(/\\/g, '/'))) {
          effectivePrefix = val;
          break;
        }
      }
    }
  }

  // Fallback convention: if inside modules/<moduleName> and no prefix found
  if (!effectivePrefix) {
    const modMatch = normalizedPath.match(/(?:modules|features)\/([^/]+)/);
    if (modMatch) {
      effectivePrefix = `/api/${modMatch[1]}`;
    }
  }

  const routes: RouteEndpoint[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text.toUpperCase();
        if (HTTP_METHODS.has(methodName) && node.arguments.length >= 1) {
          const firstArg = node.arguments[0];
          let routePath = '';

          if (ts.isStringLiteral(firstArg)) {
            routePath = firstArg.text;
          } else if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
            routePath = firstArg.text;
          }

          if (routePath) {
            let schema: string | undefined;
            let handler: string | undefined;

            // Check middle arguments for validate(Schema) or handlers
            for (let i = 1; i < node.arguments.length; i++) {
              const arg = node.arguments[i];

              // e.g. validate(CreateUserSchema)
              if (ts.isCallExpression(arg) && arg.arguments.length > 0) {
                const subArg = arg.arguments[0];
                if (ts.isIdentifier(subArg)) {
                  schema = subArg.text;
                }
              }

              // e.g. userController.createUser or handleCreate
              if (ts.isPropertyAccessExpression(arg)) {
                handler = `${arg.expression.getText(sourceFile)}.${arg.name.text}`;
              } else if (ts.isIdentifier(arg) && !schema) {
                handler = arg.text;
              }
            }

            // Extract JSDoc comment if present on parent statement
            let description: string | undefined;
            const parentStatement = node.parent;
            if (parentStatement) {
              const text = sourceFile.getFullText();
              const ranges = ts.getLeadingCommentRanges(text, parentStatement.getFullStart());
              if (ranges && ranges.length > 0) {
                const commentText = text.slice(ranges[0].pos, ranges[0].end);
                description = commentText
                  .replace(/^\/\*\*?|\*\/$/g, '')
                  .split('\n')
                  .map((l) => l.replace(/^\s*\*\s?/, '').trim())
                  .filter(Boolean)
                  .join(' ');
              }
            }

            const fullPath = joinRoutePaths(effectivePrefix, routePath);

            routes.push({
              method: methodName as any,
              path: fullPath,
              schema,
              handler,
              description,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

/**
 * Generates an ambient TypeScript type contract file (.context/contracts.d.ts)
 * bridging Client fetchers with Server Express routes.
 */
export function generateContractsDeclaration(routes: RouteEndpoint[]): string {
  const lines: string[] = [
    '// AUTO-GENERATED BY ARCHON FULLSTACK CONTRACT LINKER',
    '// DO NOT EDIT DIRECTLY. Real-time synchronized Client <-> Server Type Contracts.',
    '',
    'export interface ArchonApiEndpoints {',
  ];

  if (routes.length === 0) {
    lines.push('  // No server routes detected yet');
  } else {
    for (const r of routes) {
      const key = `"${r.method} ${r.path}"`;
      const schemaType = r.schema ? `${r.schema}Input` : 'unknown';
      lines.push(`  /**`);
      if (r.description) lines.push(`   * ${r.description}`);
      if (r.handler) lines.push(`   * Handler: ${r.handler}`);
      lines.push(`   */`);
      lines.push(`  ${key}: {`);
      lines.push(`    body: ${r.method === 'GET' ? 'undefined' : schemaType};`);
      lines.push(`    response: unknown;`);
      lines.push(`  };`);
    }
  }

  lines.push('}');
  lines.push('');
  lines.push('export type ApiRouteKey = keyof ArchonApiEndpoints;');
  lines.push('');
  lines.push('export type ApiRequestBody<K extends ApiRouteKey> = ArchonApiEndpoints[K][\'body\'];');
  lines.push('export type ApiResponseData<K extends ApiRouteKey> = ArchonApiEndpoints[K][\'response\'];');
  lines.push('');

  return lines.join('\n');
}

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { RouteEndpoint } from './extractor.js';
import { extractRoutesFromFile, discoverServerMountPrefixes } from './contract.js';

export interface ClientApiCall {
  file: string;
  line: number;
  rawUrl: string;
  normalizedPath: string;
  method: string;
}

export interface DriftIssue {
  type: 'ENDPOINT_NOT_FOUND' | 'METHOD_MISMATCH';
  file: string;
  line: number;
  clientMethod: string;
  clientPath: string;
  availableMethods?: string[];
  message: string;
  remediation: string;
  suggestedRoute?: string;
}

export interface ContractDriftReport {
  timestamp: string;
  totalClientCalls: number;
  totalServerRoutes: number;
  issues: DriftIssue[];
  orphanRoutes: RouteEndpoint[];
  hasErrors: boolean;
}

export interface CheckContractDriftOptions {
  cwd?: string;
  clientDir?: string;
  serverDir?: string;
}

function expressPathToRegExp(expressPath: string): RegExp {
  // Convert /api/users/:id to regex ^\/api\/users\/[^/]+$
  const regexString = expressPath
    .replace(/:[a-zA-Z0-9_]+/g, '[^/]+')
    .replace(/\*/g, '.*');
  return new RegExp(`^${regexString}$`);
}

/**
 * Extracts API call expressions from a client source file using TypeScript AST.
 */
export function extractClientApiCalls(filePath: string): ClientApiCall[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
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

  const calls: ClientApiCall[] = [];

  function getUrlFromNode(argNode: ts.Expression): string | null {
    if (ts.isStringLiteral(argNode) || ts.isNoSubstitutionTemplateLiteral(argNode)) {
      return argNode.text;
    }
    if (ts.isTemplateExpression(argNode)) {
      // e.g. `/api/users/${id}` -> `/api/users/:param`
      let pathTemplate = argNode.head.text;
      for (const span of argNode.templateSpans) {
        pathTemplate += ':param' + span.literal.text;
      }
      return pathTemplate;
    }
    if (ts.isBinaryExpression(argNode) && argNode.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      if (ts.isStringLiteral(argNode.left)) {
        return argNode.left.text + ':param';
      }
    }
    return null;
  }

  function getMethodFromOptions(optionsNode?: ts.Expression): string {
    if (!optionsNode || !ts.isObjectLiteralExpression(optionsNode)) return 'GET';
    for (const prop of optionsNode.properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) &&
        prop.name.text.toLowerCase() === 'method'
      ) {
        if (ts.isStringLiteral(prop.initializer)) {
          return prop.initializer.text.toUpperCase();
        }
      }
    }
    return 'GET';
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const lineNumber = line + 1;

      // 1. fetch('/api/...', { method: 'POST' }) or archonFetch(...)
      const fnName = ts.isIdentifier(node.expression) ? node.expression.text.toLowerCase() : '';
      const isFetchLike = ['fetch', 'archonfetch', 'apifetch', 'request', 'customfetch'].includes(fnName);

      if (isFetchLike && node.arguments.length >= 1) {
        const rawUrl = getUrlFromNode(node.arguments[0]);
        if (rawUrl && (rawUrl.startsWith('/api') || rawUrl.startsWith('api/'))) {
          const method = getMethodFromOptions(node.arguments[1]);
          const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
          calls.push({
            file: filePath,
            line: lineNumber,
            rawUrl,
            normalizedPath,
            method,
          });
        }
      }

      // 2. axios.get('/api/...'), axios.post(...), api.get(...), apiClient.post(...)
      if (ts.isPropertyAccessExpression(node.expression) && node.arguments.length >= 1) {
        const propName = node.expression.name.text.toUpperCase();
        const objText = node.expression.expression.getText(sourceFile).toLowerCase();
        const isHttpHelper = ['axios', 'api', 'apiclient', 'client', 'ky', 'http'].some((h) =>
          objText.includes(h)
        );

        if (isHttpHelper && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(propName)) {
          const rawUrl = getUrlFromNode(node.arguments[0]);
          if (rawUrl && (rawUrl.startsWith('/api') || rawUrl.startsWith('api/'))) {
            const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
            calls.push({
              file: filePath,
              line: lineNumber,
              rawUrl,
              normalizedPath,
              method: propName,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

/**
 * Checks for API Contract Drift between Client API calls and Server Express routes.
 */
export async function checkContractDrift(
  options: CheckContractDriftOptions = {}
): Promise<ContractDriftReport> {
  const cwd = options.cwd || process.cwd();
  const clientDir = options.clientDir || 'client/src';
  const serverDir = options.serverDir || 'server/src';

  // 1. Collect all server routes
  const serverFiles = await fg(
    [
      `${serverDir}/**/routes/**/*.{ts,js}`,
      `${serverDir}/**/*route*.{ts,js}`,
      `${serverDir}/modules/**/index.{ts,js}`,
    ],
    { cwd }
  );

  const mountMap = discoverServerMountPrefixes(cwd, serverDir);
  const serverRoutes: RouteEndpoint[] = [];
  const seenRouteKeys = new Set<string>();

  for (const sf of serverFiles) {
    const extracted = extractRoutesFromFile(path.resolve(cwd, sf), { mountMap });
    for (const r of extracted) {
      const key = `${r.method} ${r.path}`;
      if (!seenRouteKeys.has(key)) {
        seenRouteKeys.add(key);
        serverRoutes.push(r);
      }
    }
  }

  // 2. Collect all client API calls
  const clientFiles = await fg(`${clientDir}/**/*.{ts,tsx,js,jsx}`, { cwd });
  const clientCalls: ClientApiCall[] = [];
  for (const cf of clientFiles) {
    const calls = extractClientApiCalls(path.resolve(cwd, cf));
    clientCalls.push(...calls);
  }

  const issues: DriftIssue[] = [];
  const calledRouteIndexes = new Set<number>();

  // 3. Match client calls against server routes
  for (const call of clientCalls) {
    // Strip query string if present
    const cleanClientPath = call.normalizedPath.split('?')[0];

    // Find routes matching path
    const pathMatches: { route: RouteEndpoint; index: number }[] = [];
    serverRoutes.forEach((route, idx) => {
      const regExp = expressPathToRegExp(route.path);
      const clientRegExp = expressPathToRegExp(cleanClientPath);

      if (
        route.path === cleanClientPath ||
        regExp.test(cleanClientPath) ||
        clientRegExp.test(route.path)
      ) {
        pathMatches.push({ route, index: idx });
      }
    });

    if (pathMatches.length === 0) {
      // Endpoint not found at all
      issues.push({
        type: 'ENDPOINT_NOT_FOUND',
        file: call.file,
        line: call.line,
        clientMethod: call.method,
        clientPath: cleanClientPath,
        message: `Client calls non-existent server endpoint: '${call.method} ${cleanClientPath}'.`,
        remediation: `Verify backend routes or register '${call.method} ${cleanClientPath}' in the appropriate server route module.`,
      });
    } else {
      // Endpoint exists, check HTTP method
      const exactMatch = pathMatches.find((m) => m.route.method === call.method);
      if (exactMatch) {
        calledRouteIndexes.add(exactMatch.index);
      } else {
        const availableMethods = pathMatches.map((m) => m.route.method);
        issues.push({
          type: 'METHOD_MISMATCH',
          file: call.file,
          line: call.line,
          clientMethod: call.method,
          clientPath: cleanClientPath,
          availableMethods,
          message: `HTTP Method Mismatch: Client called '${call.method} ${cleanClientPath}', but server only accepts: [${availableMethods.join(', ')}].`,
          remediation: `Change client request method to '${availableMethods[0]}' or add '${call.method}' handler in server router.`,
        });
      }
    }
  }

  // 4. Identify orphan server routes
  const orphanRoutes = serverRoutes.filter((_, idx) => !calledRouteIndexes.has(idx));

  return {
    timestamp: new Date().toISOString(),
    totalClientCalls: clientCalls.length,
    totalServerRoutes: serverRoutes.length,
    issues,
    orphanRoutes,
    hasErrors: issues.length > 0,
  };
}

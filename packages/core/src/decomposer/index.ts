import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

export interface DecomposeResult {
  targetFile: string;
  originalLines: number;
  newLines: number;
  extractedFiles: Array<{
    filePath: string;
    symbolName: string;
    kind: 'component' | 'hook' | 'helper';
    lines: number;
  }>;
  success: boolean;
  message: string;
}

interface ExtractCandidate {
  name: string;
  kind: 'component' | 'hook' | 'helper';
  node: ts.Node;
  start: number;
  end: number;
  text: string;
}

/**
 * Checks if an AST node looks like a React sub-component.
 */
function isReactComponent(name: string, node: ts.Node, sourceFile: ts.SourceFile): boolean {
  // Starts with uppercase letter
  if (!/^[A-Z]/.test(name)) return false;

  const text = node.getText(sourceFile);
  // Returns JSX elements: <div>, <...> or jsx/jsxs
  return /<\s*[A-Za-z0-9_]+|return\s*\(/m.test(text);
}

/**
 * Checks if a function is a custom React hook.
 */
function isCustomHook(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

/**
 * Analyzes a source file and automatically decomposes internal sub-components,
 * hooks, and helpers into separate modular files under components/ and hooks/.
 */
export function decomposeFile(targetFilePath: string): DecomposeResult {
  const absPath = path.resolve(process.cwd(), targetFilePath);
  if (!fs.existsSync(absPath)) {
    return {
      targetFile: targetFilePath,
      originalLines: 0,
      newLines: 0,
      extractedFiles: [],
      success: false,
      message: `File does not exist: ${targetFilePath}`,
    };
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  const originalLines = content.split('\n').length;

  let scriptKind = ts.ScriptKind.TSX;
  if (targetFilePath.endsWith('.ts')) scriptKind = ts.ScriptKind.TS;
  else if (targetFilePath.endsWith('.js')) scriptKind = ts.ScriptKind.JS;
  else if (targetFilePath.endsWith('.jsx')) scriptKind = ts.ScriptKind.JSX;

  const sourceFile = ts.createSourceFile(
    targetFilePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const candidates: ExtractCandidate[] = [];

  // Determine main component name from file name
  const baseName = path.basename(targetFilePath, path.extname(targetFilePath));
  // Convert kebab-case or PascalCase (e.g. order-page -> OrderPage)
  const mainNameCandidate = baseName
    .replace(/(^[a-z]|-[a-z])/g, (m) => m.replace('-', '').toUpperCase());

  // Find top-level declarations that can be extracted
  for (const statement of sourceFile.statements) {
    // 1. Function declarations: function SubComponent() {}
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      // Do not extract the main component
      const isDefault = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (name.toLowerCase() === mainNameCandidate.toLowerCase() || isDefault) {
        continue;
      }

      if (isCustomHook(name)) {
        candidates.push({
          name,
          kind: 'hook',
          node: statement,
          start: statement.getFullStart(),
          end: statement.getEnd(),
          text: statement.getText(sourceFile),
        });
      } else if (isReactComponent(name, statement, sourceFile)) {
        candidates.push({
          name,
          kind: 'component',
          node: statement,
          start: statement.getFullStart(),
          end: statement.getEnd(),
          text: statement.getText(sourceFile),
        });
      }
    }

    // 2. Variable statement: const SubTable = () => {} or const useData = () => {}
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          if (name.toLowerCase() === mainNameCandidate.toLowerCase()) continue;

          if (isCustomHook(name)) {
            candidates.push({
              name,
              kind: 'hook',
              node: statement,
              start: statement.getFullStart(),
              end: statement.getEnd(),
              text: statement.getText(sourceFile),
            });
            break;
          } else if (isReactComponent(name, statement, sourceFile)) {
            candidates.push({
              name,
              kind: 'component',
              node: statement,
              start: statement.getFullStart(),
              end: statement.getEnd(),
              text: statement.getText(sourceFile),
            });
            break;
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    return {
      targetFile: targetFilePath,
      originalLines,
      newLines: originalLines,
      extractedFiles: [],
      success: false,
      message: 'No extractable sub-components or custom hooks detected in file.',
    };
  }

  const dir = path.dirname(absPath);
  const ext = path.extname(targetFilePath);
  const isTs = ext === '.ts' || ext === '.tsx';
  const compExt = isTs ? '.tsx' : '.jsx';
  const hookExt = isTs ? '.ts' : '.js';

  // Read common imports from original file to copy to extracted files
  const originalImportStatements = sourceFile.statements
    .filter(ts.isImportDeclaration)
    .map((s) => s.getText(sourceFile))
    .join('\n');

  const extractedList: DecomposeResult['extractedFiles'] = [];
  const newImportLines: string[] = [];

  // Write new extracted files
  for (const cand of candidates) {
    let targetSubDir = '';
    let fileExt = '';

    if (cand.kind === 'component') {
      targetSubDir = path.join(dir, 'components');
      fileExt = compExt;
    } else {
      targetSubDir = path.join(dir, 'hooks');
      fileExt = hookExt;
    }

    if (!fs.existsSync(targetSubDir)) {
      fs.mkdirSync(targetSubDir, { recursive: true });
    }

    const subFileName = `${cand.name}${fileExt}`;
    const subFilePath = path.join(targetSubDir, subFileName);

    // Prepare code for extracted file
    let extractedCode = cand.text;
    if (!extractedCode.trim().startsWith('export ')) {
      extractedCode = `export ${extractedCode}`;
    }

    const fileContent = [
      '// AUTO-EXTRACTED BY ARCHON AUTO-DECOMPOSER ENGINE',
      originalImportStatements,
      '',
      extractedCode,
      '',
    ].join('\n');

    fs.writeFileSync(subFilePath, fileContent, 'utf-8');

    const relativeSubPath = cand.kind === 'component'
      ? `./components/${cand.name}.js`
      : `./hooks/${cand.name}.js`;

    newImportLines.push(`import { ${cand.name} } from '${relativeSubPath}';`);

    extractedList.push({
      filePath: path.relative(process.cwd(), subFilePath).replace(/\\/g, '/'),
      symbolName: cand.name,
      kind: cand.kind,
      lines: fileContent.split('\n').length,
    });
  }

  // Remove extracted declarations from original file and insert new imports
  // Sort candidates by descending position to safely slice
  const sorted = [...candidates].sort((a, b) => b.start - a.start);
  let updatedContent = content;

  for (const cand of sorted) {
    updatedContent = updatedContent.slice(0, cand.start) + updatedContent.slice(cand.end);
  }

  // Prepend new imports
  const importBlock = newImportLines.join('\n') + '\n';
  // Insert right after existing imports or at top
  const lastImport = [...sourceFile.statements].reverse().find(ts.isImportDeclaration);
  if (lastImport) {
    const insertPos = lastImport.getEnd();
    updatedContent =
      updatedContent.slice(0, insertPos) + '\n' + importBlock + updatedContent.slice(insertPos);
  } else {
    updatedContent = importBlock + updatedContent;
  }

  fs.writeFileSync(absPath, updatedContent, 'utf-8');
  const newLines = updatedContent.split('\n').length;

  return {
    targetFile: targetFilePath,
    originalLines,
    newLines,
    extractedFiles: extractedList,
    success: true,
    message: `Decomposed ${candidates.length} item(s). Reduced from ${originalLines} to ${newLines} lines.`,
  };
}

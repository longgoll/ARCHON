import fs from 'node:fs';
import path from 'node:path';
import { GuardianConfig, GuardianConfigSchema } from './schema.js';

export const DEFAULT_CONFIG: GuardianConfig = {
  preset: 'vite-express-modular',
  language: 'typescript',
  strictness: 'strict',
  sourcePatterns: [
    'client/src/**/*.{ts,tsx,js,jsx}',
    'server/src/**/*.{ts,js}',
    'src/**/*.{ts,tsx,js,jsx}',
  ],
  rules: {
    maxFileLines: 200,
    maxComponentLines: 120,
    ignoreBlankLines: false,
    preventCircularDependencies: true,
    moduleBoundary: {
      clientModulesDir: 'client/src/modules',
      serverModulesDir: 'server/src/modules',
      gatewayFile: 'index.ts',
      allowDeepImports: false,
    },
    dependencyFreeze: {
      enabled: false,
      allowedLibraries: [],
    },
  },
};

export function resolveStrictnessDefaults(strictness: string) {
  switch (strictness) {
    case 'relaxed':
      return { maxFileLines: 300, maxComponentLines: 180 };
    case 'hardcore':
      return { maxFileLines: 150, maxComponentLines: 90 };
    case 'strict':
    default:
      return { maxFileLines: 200, maxComponentLines: 120 };
  }
}

export function loadGuardianConfig(cwd: string = process.cwd()): GuardianConfig {
  const configPath = path.resolve(cwd, 'guardian.config.json');

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const rawContent = fs.readFileSync(configPath, 'utf-8');
    const parsedJson = JSON.parse(rawContent);

    // If strictness is provided, apply defaults if user didn't explicitly override maxFileLines
    const strictness = parsedJson.strictness || 'strict';
    const strictnessDefaults = resolveStrictnessDefaults(strictness);

    if (parsedJson.rules) {
      if (parsedJson.rules.maxFileLines === undefined) {
        parsedJson.rules.maxFileLines = strictnessDefaults.maxFileLines;
      }
      if (parsedJson.rules.maxComponentLines === undefined) {
        parsedJson.rules.maxComponentLines = strictnessDefaults.maxComponentLines;
      }
    }

    const validated = GuardianConfigSchema.parse(parsedJson);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load guardian.config.json: ${error.message}`);
    }
    throw error;
  }
}

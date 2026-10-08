import { z } from 'zod';

export const StrictnessLevelSchema = z.enum(['relaxed', 'strict', 'hardcore']);

export const ModuleBoundaryRuleSchema = z.object({
  clientModulesDir: z.string().default('client/src/modules'),
  serverModulesDir: z.string().default('server/src/modules'),
  gatewayFile: z.string().default('index.ts'),
  allowDeepImports: z.boolean().default(false),
});

export const DependencyFreezeRuleSchema = z.object({
  enabled: z.boolean().default(true),
  allowedLibraries: z.array(z.string()).default([]),
});

export const RulesConfigSchema = z.object({
  maxFileLines: z.number().int().positive().default(200),
  maxComponentLines: z.number().int().positive().default(120),
  ignoreBlankLines: z.boolean().default(false),
  preventCircularDependencies: z.boolean().default(true),
  moduleBoundary: ModuleBoundaryRuleSchema.default({}),
  dependencyFreeze: DependencyFreezeRuleSchema.default({}),
});

export const GuardianConfigSchema = z.object({
  $schema: z.string().optional(),
  preset: z.string().default('vite-express-modular'),
  language: z.enum(['typescript', 'javascript']).default('typescript'),
  strictness: StrictnessLevelSchema.default('strict'),
  rules: RulesConfigSchema.default({}),
});

export type StrictnessLevel = z.infer<typeof StrictnessLevelSchema>;
export type GuardianConfig = z.infer<typeof GuardianConfigSchema>;
export type RulesConfig = z.infer<typeof RulesConfigSchema>;

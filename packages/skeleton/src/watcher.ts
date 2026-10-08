import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { generateProjectSkeleton, GenerateSkeletonOptions } from './generator.js';

export interface WatcherOptions extends GenerateSkeletonOptions {
  debounceMs?: number;
}

export function watchProjectSkeleton(options: WatcherOptions = {}) {
  const cwd = options.cwd || process.cwd();
  const debounceMs = options.debounceMs || 250;

  // Directories to watch
  const targetDirs = [
    path.resolve(cwd, 'client/src/modules'),
    path.resolve(cwd, 'server/src/modules'),
    path.resolve(cwd, 'src/modules'),
  ].filter((d) => fs.existsSync(d));

  if (targetDirs.length === 0) {
    console.log(pc.yellow('⚠ No modular directories found to watch (checked client/src/modules, server/src/modules, src/modules)'));
    return;
  }

  console.log(pc.cyan(`👀 Archon Skeleton Watcher active in:`));
  for (const d of targetDirs) {
    console.log(pc.dim(`   → ${path.relative(cwd, d).replace(/\\/g, '/')}`));
  }

  let debounceTimer: NodeJS.Timeout | null = null;
  let isRegenerating = false;

  async function triggerRegen(changedPath?: string) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (isRegenerating) return;
      isRegenerating = true;
      const start = Date.now();
      try {
        const skeleton = await generateProjectSkeleton(options);
        const elapsed = Date.now() - start;
        const triggerDesc = changedPath
          ? ` (triggered by ${path.basename(changedPath)})`
          : '';
        console.log(
          pc.green(
            `⚡ [ARCHON AUTO-SYNC] Regenerated .context/MAP.md & skeleton across ${skeleton.modules.length} modules (${elapsed}ms)${triggerDesc}`
          )
        );
      } catch (err) {
        if (err instanceof Error) {
          console.error(pc.red(`❌ [ARCHON WATCH ERROR] ${err.message}`));
        }
      } finally {
        isRegenerating = false;
      }
    }, debounceMs);
  }

  // Initial generation
  triggerRegen();

  // Watch directories
  const watchers: fs.FSWatcher[] = [];

  for (const dir of targetDirs) {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        // Only trigger on code files
        if (/\.(ts|tsx|js|jsx)$/.test(filename) && !filename.includes('.spec.') && !filename.includes('.test.')) {
          triggerRegen(filename);
        }
      });
      watchers.push(watcher);
    } catch (err) {
      console.error(pc.yellow(`Could not attach watcher to ${dir}: ${err}`));
    }
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    for (const w of watchers) {
      w.close();
    }
    process.exit(0);
  });
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootTemplates = path.resolve(__dirname, '../../../templates');
const targetTemplates = path.resolve(__dirname, '../templates');

if (fs.existsSync(rootTemplates)) {
  if (!fs.existsSync(targetTemplates)) {
    fs.mkdirSync(targetTemplates, { recursive: true });
  }
  fs.cpSync(rootTemplates, targetTemplates, { recursive: true });
  console.log(`[create-archon] Copied templates to ${targetTemplates}`);
}

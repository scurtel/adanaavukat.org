/**
 * Salt okunur menü doğrulama — apply-menu-structure.mjs --verify-only
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = resolve(__dirname, 'apply-menu-structure.mjs');
const child = spawn(process.execPath, [script, '--verify-only'], {
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 1));

/**
 * Site geneli header ince ayar.
 * Not: WP custom_css REST type filtresi bu hostta güvenilir değil.
 * Layout düzeltmeleri Code Snippet ile uygulanır.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, 'apply-header-layout-fixes.mjs');

console.log('Delegating to apply-header-layout-fixes.mjs (Code Snippet + homepage CSS)...');
const result = spawnSync(process.execPath, [target], { stdio: 'inherit' });
process.exit(result.status ?? 1);

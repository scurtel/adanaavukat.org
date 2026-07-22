import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');

function loadEnvFile() {
  const envPath = resolve(rootDir, '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function looksLikeAppPassword(value) {
  return typeof value === 'string' && /\s/.test(value) && value.length >= 20;
}

function looksLikeEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getWpConfig() {
  const baseUrl = (
    process.env.ADANAAVUKAT_WP_BASE_URL ||
    process.env.WP_BASE_URL ||
    'https://adanaavukat.org'
  ).replace(/\/$/, '');

  let username = process.env.ADANAAVUKAT_WP_USERNAME || process.env.WP_USERNAME || '';
  let appPassword =
    process.env.ADANAAVUKAT_WP_APP_PASSWORD || process.env.WP_APP_PASSWORD || '';

  // Auto-correct if username/password appear swapped (common setup mistake)
  if (looksLikeAppPassword(username) && looksLikeEmail(appPassword)) {
    [username, appPassword] = [appPassword, username];
  }

  return { baseUrl, username, appPassword };
}

export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    searchGrounding:
      process.env.GEMINI_GOOGLE_SEARCH_ENABLED === 'true' ||
      process.env.GEMINI_ENABLE_SEARCH_GROUNDING === 'true',
  };
}

export function getAuthHeader(username, appPassword) {
  const token = Buffer.from(`${username}:${appPassword}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

export { rootDir };

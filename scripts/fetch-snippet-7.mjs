import { writeFileSync } from 'fs';
import { wpFetch } from './lib/wp-client.mjs';

const sn = await wpFetch('/wp-json/code-snippets/v1/snippets/7');
writeFileSync('data/snippet-7-from-api.php', sn.code);
console.log('active', sn.active, 'scope', sn.scope);
console.log('has data-labels', sn.code.includes('aa-post-card-data'));
console.log('has broken innerHTML', sn.code.includes("thumb.innerHTML='<a"));
const lines = sn.code.split('\n');
console.log('total lines', lines.length);
console.log('last 12 lines:\n', lines.slice(-12).join('\n'));

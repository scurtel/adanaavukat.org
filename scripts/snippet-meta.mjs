import { wpFetch } from './lib/wp-client.mjs';

const sn = await wpFetch('/wp-json/code-snippets/v1/snippets/7');
console.log(JSON.stringify({
  id: sn.id,
  name: sn.name,
  active: sn.active,
  scope: sn.scope,
  priority: sn.priority,
  modified: sn.modified,
  tags: sn.tags,
  condition_id: sn.condition_id,
  code_length: sn.code?.length,
}, null, 2));

#!/usr/bin/env node
/**
 * Offline tests for auto-article topic pool + payload validation.
 * No WordPress / Gemini / network.
 */
import {
  TOPIC_POOL,
  pickTopicFromPool,
  isSafeArticleSlug,
  sanitizeArticleTitle,
  validateGeneratedArticle,
} from './lib/article-topic-pool.mjs';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`PASS  ${name}`);
    passed++;
  } else {
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

assert('TOPIC_POOL has unused-capacity buffer', TOPIC_POOL.length >= 30);

{
  const picked = pickTopicFromPool([]);
  assert('empty site picks a topic', Boolean(picked?.topic));
}

{
  const exhausted = TOPIC_POOL.map((t) => ({
    slug: 'x',
    title: { rendered: t.matchPatterns.map((re) => re.source).join(' ') },
  }));
  const picked = pickTopicFromPool(exhausted);
  assert('exhausted pool returns null (does not throw)', picked === null);
}

{
  const fixture = {
    title: "Adana'da test: nafaka ve 'velayet'",
    slug: 'adanada-test-nafaka-ve-velayet',
    content_html: '<p>Gövde</p>',
  };
  assert('colon/quote title sanitizes', sanitizeArticleTitle(fixture.title).includes('nafaka'));
  assert('safe slug accepted', isSafeArticleSlug(fixture.slug));
  assert('unsafe slug rejected', !isSafeArticleSlug('Adana Başlık') && !isSafeArticleSlug(''));
  const errors = validateGeneratedArticle(fixture, [{ slug: 'other' }]);
  assert('valid fixture article passes', errors.length === 0);
  const dup = validateGeneratedArticle(fixture, [{ slug: fixture.slug }]);
  assert('duplicate slug is rejected', dup.some((e) => e.includes('duplicate slug')));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

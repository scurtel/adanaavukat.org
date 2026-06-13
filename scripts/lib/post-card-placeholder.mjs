/**
 * Yazı kartı placeholder — tek inline SVG + paylaşılan CSS.
 */

export const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false" width="56" height="56"><rect x="11" y="7" width="26" height="34" rx="2.5" stroke="#c4a962" stroke-width="1.4" opacity=".75"/><path d="M16 17h18M16 23h14M16 29h16" stroke="#e8dcc0" stroke-width="1.2" stroke-linecap="round" opacity=".55"/></svg>`;

export const PLACEHOLDER_SVG_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><rect x="11" y="7" width="26" height="34" rx="2.5" stroke="%23c4a962" stroke-width="1.4" opacity=".75"/><path d="M16 17h18M16 23h14M16 29h16" stroke="%23e8dcc0" stroke-width="1.2" stroke-linecap="round" opacity=".55"/></svg>'
)}`;

export function buildPostCardThumb(link, imageUrl = null) {
  if (imageUrl) {
    return `<a href="${link}" class="aa-post-thumb" tabindex="-1" aria-hidden="true"><img src="${imageUrl}" alt="" width="640" height="360" loading="lazy" decoding="async" class="aa-post-thumb__img"/></a>`;
  }
  return `<a href="${link}" class="aa-post-thumb" tabindex="-1" aria-hidden="true"><span class="aa-post-thumb__ph" role="presentation">${PLACEHOLDER_SVG}</span></a>`;
}

export const POST_CARD_ASTRA_CSS = `
/* ── Astra arşiv / kategori / ilgili yazı kartları ── */
.blog .ast-article-post .ast-no-thumb .ast-blog-featured-section.post-thumb,
.archive .ast-article-post .ast-no-thumb .ast-blog-featured-section.post-thumb,
.search .ast-article-post .ast-no-thumb .ast-blog-featured-section.post-thumb,
.ast-related-post .ast-no-thumb .ast-blog-featured-section.post-thumb,
.ast-related-post .ast-no-thumb .post-thumb{
  display:block;position:relative;aspect-ratio:16/9;width:100%;
  min-height:0;margin-bottom:1rem;border-radius:10px;overflow:hidden;
  background:linear-gradient(145deg,#0a1f38 0%,#0f2747 45%,#1a3a5c 100%)
}
.blog .ast-article-post .ast-no-thumb .ast-blog-featured-section.post-thumb::before,
.archive .ast-article-post .ast-no-thumb .ast-blog-featured-section.post-thumb::before,
.search .ast-article-post .ast-no-thumb .ast-blog-featured-section.post-thumb::before,
.ast-related-post .ast-no-thumb .ast-blog-featured-section.post-thumb::before,
.ast-related-post .ast-no-thumb .post-thumb::before{
  content:"";position:absolute;inset:0;
  background-image:url("${PLACEHOLDER_SVG_DATA_URI}");
  background-repeat:no-repeat;background-position:center;background-size:56px 56px;
  opacity:.42;pointer-events:none
}
.single .ast-article-single .ast-no-thumb .ast-blog-featured-section.post-thumb,
.single .ast-article-single .ast-no-thumb .post-thumb{display:none!important;height:0;margin:0;padding:0}
`;

export const POST_CARD_HOMEPAGE_CSS = `
/* ── Yazı kartı placeholder (ana sayfa) ── */
.aa-home .aa-post-card{display:flex;flex-direction:column;padding:0;overflow:hidden}
.aa-home .aa-post-card .aa-post-body{padding:1.35rem 1.6rem 1.6rem;flex:1;display:flex;flex-direction:column}
.aa-home .aa-post-card .aa-date{margin-bottom:.45rem}
.aa-home .aa-post-card h3{margin-bottom:.55rem}
.aa-home .aa-post-card p{flex:1;margin-bottom:1.1rem}
.aa-home .aa-post-thumb{
  display:block;aspect-ratio:16/9;width:100%;flex-shrink:0;
  text-decoration:none!important;overflow:hidden;background:#0f2747;position:relative
}
.aa-home .aa-post-thumb__ph{
  display:flex;align-items:center;justify-content:center;width:100%;height:100%;
  min-height:0;
  background:linear-gradient(145deg,#0a1f38 0%,#0f2747 45%,#1a3a5c 100%)
}
.aa-home .aa-post-thumb__ph svg{width:56px;height:56px;opacity:.42;flex-shrink:0}
.aa-home .aa-post-thumb__img{
  width:100%;height:100%;object-fit:cover;aspect-ratio:16/9;display:block
}
@media(max-width:600px){
  .aa-home .aa-post-card .aa-post-body{padding:1.15rem 1.25rem 1.25rem}
}
`;

export const POST_CARD_PLACEHOLDER_CSS = `${POST_CARD_HOMEPAGE_CSS}${POST_CARD_ASTRA_CSS}`;

export const POST_CARD_SNIPPET_NAME = 'Adana Avukat Post Card Placeholder';

export function buildPostCardSnippetPhp() {
  const css = POST_CARD_ASTRA_CSS.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `add_action('wp_head', function () {
    if (is_admin()) {
        return;
    }
    echo '<style id="aa-post-card-placeholder">${css}</style>';
}, 99);`;
}

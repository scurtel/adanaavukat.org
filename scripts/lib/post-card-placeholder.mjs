/**
 * Yazı kartı placeholder — PHP (Code Snippet) + CSS + ana sayfa HTML.
 */

export const POST_CARD_LABELS = {
  aile: 'Aile Hukuku',
  bosanma: 'Boşanma Hukuku',
  miras: 'Miras Hukuku',
  kira: 'Kira Hukuku',
  is: 'İş Hukuku',
  default: 'Hukuk Rehberi',
};

export const POST_CARD_PLACEHOLDER_CSS = `
/* ── Yazı kartı görseli / placeholder (Astra arşiv + ana sayfa) ── */
.post-card-image,
.ast-blog-featured-section.post-thumb img,
.aa-home .aa-post-thumb__img{
  width:100%;
  aspect-ratio:16/9;
  border-radius:10px;
  display:block;
  object-fit:cover;
  overflow:hidden;
}
.post-card-placeholder,
.aa-home .aa-post-thumb__ph.post-card-placeholder,
.ast-blog-featured-section.post-thumb.post-card-placeholder{
  width:100%;
  aspect-ratio:16/9;
  min-height:140px;
  border-radius:10px;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  position:relative;
  margin-bottom:1rem;
  background:
    radial-gradient(circle at top left, rgba(212,175,55,.22), transparent 34%),
    linear-gradient(135deg,#071b35 0%,#102f55 100%);
  box-shadow:inset 0 0 0 1px rgba(196,169,98,.14)
}
.post-card-placeholder::after,
.aa-home .aa-post-thumb__ph.post-card-placeholder::after{
  content:"";
  position:absolute;
  inset:14px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:8px;
  pointer-events:none
}
.post-card-placeholder span,
.aa-home .aa-post-thumb__ph.post-card-placeholder span{
  position:relative;
  z-index:1;
  color:#f5d77a;
  font-size:14px;
  font-weight:600;
  letter-spacing:.03em;
  padding:8px 14px;
  border:1px solid rgba(245,215,122,.35);
  border-radius:999px;
  background:rgba(7,27,53,.55);
  text-align:center;
  line-height:1.3
}
.post-card-placeholder-link{
  display:flex;
  align-items:center;
  justify-content:center;
  width:100%;
  height:100%;
  text-decoration:none!important;
  color:inherit
}
/* Astra boş thumb alanı — JS ile doldurulana kadar gizleme yok */
.ast-blog-featured-section.post-thumb:empty:not(.post-card-placeholder){
  display:block!important;
  min-height:0;
  margin:0;
  padding:0;
  border:0;
  background:transparent
}
.single .ast-article-single .ast-no-thumb .ast-blog-featured-section.post-thumb,
.single .ast-article-single .ast-no-thumb .post-thumb{display:none!important;height:0;margin:0;padding:0}
/* Ana sayfa kartları */
.aa-home .aa-post-card{display:flex;flex-direction:column;padding:0;overflow:hidden}
.aa-home .aa-post-card .aa-post-body{padding:1.35rem 1.6rem 1.6rem;flex:1;display:flex;flex-direction:column}
.aa-home .aa-post-card .aa-date{margin-bottom:.45rem}
.aa-home .aa-post-card h3{margin-bottom:.55rem}
.aa-home .aa-post-card p{flex:1;margin-bottom:1.1rem}
.aa-home .aa-post-thumb{
  display:block;aspect-ratio:16/9;width:100%;flex-shrink:0;
  text-decoration:none!important;overflow:hidden;position:relative
}
@media(max-width:600px){
  .aa-home .aa-post-card .aa-post-body{padding:1.15rem 1.25rem 1.25rem}
  .post-card-placeholder span{font-size:13px;padding:7px 12px}
}
`;

export function buildPostCardThumb(
  link,
  imageUrl = null,
  label = POST_CARD_LABELS.default,
  altText = label
) {
  if (imageUrl) {
    const safeAlt = String(altText || label)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
    return `<a href="${link}" class="aa-post-thumb" tabindex="-1" aria-hidden="true"><img src="${imageUrl}" alt="${safeAlt}" width="640" height="360" loading="lazy" decoding="async" class="aa-post-thumb__img post-card-image"/></a>`;
  }
  return `<a href="${link}" class="aa-post-thumb" tabindex="-1" aria-hidden="true"><span class="aa-post-thumb__ph post-card-placeholder" role="presentation"><span>${label}</span></span></a>`;
}

export const POST_CARD_SNIPPET_NAME = 'Adana Avukat Post Card Placeholder';

export function buildPostCardSnippetPhp() {
  const css = POST_CARD_PLACEHOLDER_CSS.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `/**
 * Adana Avukat — yazı kartı placeholder (Astra blog / arşiv)
 */
if (!function_exists('aa_post_card_should_apply')) {
function aa_post_card_should_apply() {
    if (is_admin() || is_single() || is_feed()) {
        return false;
    }
    return is_home() || is_archive() || is_search() || is_page('aile-hukuku-rehberi');
}

function aa_post_card_label_for_post($post_id) {
    $label = 'Hukuk Rehberi';
    $cats  = get_the_category($post_id);
    if (empty($cats)) {
        return $label;
    }
    $cat_text = implode(' ', wp_list_pluck($cats, 'name'));
    $check    = function_exists('mb_strtolower') ? mb_strtolower($cat_text, 'UTF-8') : strtolower($cat_text);

    if (false !== strpos($check, 'boşanma') || false !== strpos($check, 'bosanma')) {
        return 'Boşanma Hukuku';
    }
    if (false !== strpos($check, 'aile')) {
        return 'Aile Hukuku';
    }
    if (false !== strpos($check, 'miras')) {
        return 'Miras Hukuku';
    }
    if (false !== strpos($check, 'kira')) {
        return 'Kira Hukuku';
    }
    if (false !== strpos($check, 'iş') || false !== strpos($check, 'is ')) {
        return 'İş Hukuku';
    }
    return $label;
}

function aa_post_card_placeholder_html($post_id) {
    $label = aa_post_card_label_for_post($post_id);
    $link  = get_permalink($post_id);
    return '<a href="' . esc_url($link) . '" class="post-card-placeholder-link" tabindex="-1" aria-hidden="true">'
        . '<div class="post-card-placeholder"><span>' . esc_html($label) . '</span></div></a>';
}

add_filter('post_thumbnail_html', function ($html, $post_id) {
    if (!aa_post_card_should_apply() || !empty($html)) {
        return $html;
    }
    return aa_post_card_placeholder_html($post_id);
}, 20, 2);

add_filter('wp_get_attachment_image_attributes', function ($attr) {
    if (!aa_post_card_should_apply()) {
        return $attr;
    }
    $attr['class'] = trim(($attr['class'] ?? '') . ' post-card-image');
    $attr['loading'] = 'lazy';
    $attr['decoding'] = 'async';
    return $attr;
}, 12);

global $aa_post_card_placeholder_map;
$aa_post_card_placeholder_map = array();

add_action('the_post', function ($post) {
    if (!aa_post_card_should_apply() || has_post_thumbnail($post)) {
        return;
    }
    global $aa_post_card_placeholder_map;
    $aa_post_card_placeholder_map[$post->ID] = aa_post_card_label_for_post($post->ID);
});

add_action('wp_head', function () {
    if (!aa_post_card_should_apply()) {
        return;
    }
    echo '<style id="aa-post-card-placeholder">${css}</style>';
}, 99);

add_action('wp_footer', function () {
    if (!aa_post_card_should_apply()) {
        return;
    }
    global $aa_post_card_placeholder_map;
    if (empty($aa_post_card_placeholder_map)) {
        return;
    }
    $json = wp_json_encode($aa_post_card_placeholder_map);
    echo '<div id="aa-post-card-data" data-labels="' . esc_attr($json) . '" hidden></div>';
    echo '<script id="aa-post-card-placeholder-js">';
    echo "(function(){function run(){var el=document.getElementById('aa-post-card-data');if(!el)return;var map={};try{map=JSON.parse(el.getAttribute('data-labels')||'{}');}catch(e){return;}Object.keys(map).forEach(function(id){var article=document.getElementById('post-'+id);if(!article)return;var thumb=article.querySelector('.ast-blog-featured-section.post-thumb');if(!thumb||thumb.querySelector('img'))return;var titleLink=article.querySelector('.entry-title a');var href=titleLink?titleLink.href:'#';var label=String(map[id]||'');thumb.className='ast-blog-featured-section post-thumb post-card-placeholder ast-blog-single-element';thumb.innerHTML='<a href=\"'+href+'\" class=\"post-card-placeholder-link\" tabindex=\"-1\" aria-hidden=\"true\"><span>'+label.replace(/</g,'&lt;')+'</span></a>';});}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run);}else{run();}})();";
    echo '</script>';
}, 20);
}`;
}

export const POST_CARD_HOMEPAGE_CSS = '';
export const POST_CARD_ASTRA_CSS = '';
export const POST_CARD_PLACEHOLDER_CSS_FULL = POST_CARD_PLACEHOLDER_CSS;

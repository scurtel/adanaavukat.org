/**
 * Header layout fixes — İletişim CTA, logo yanındaki site-title, profil tek H1.
 * Code Snippets üzerinden wp_head CSS + Astra title filter.
 */

export const HEADER_LAYOUT_SNIPPET_NAME = 'Adana Avukat Header Layout Fixes';
export const PROFILE_PAGE_ID = 268;

export const HEADER_LAYOUT_CSS = `/* aa-header-layout-fixes */
/* 1) İletişim CTA: Astra height:100% / line-height çakışmasını kır */
.site-header .main-header-menu > .menu-item > a.menu-link[href*="/iletisim/"],
.main-header-menu .menu-item a[href*="/iletisim/"],
.ast-header-break-point .main-header-menu .menu-item a[href*="/iletisim/"]{
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  line-height:1.25!important;
  display:inline-flex!important;
  align-items:center!important;
  align-self:center!important;
  box-sizing:border-box!important;
  background:#0f2747!important;
  color:#fff!important;
  border-radius:8px!important;
  padding:.45rem 1.1rem!important;
  margin-left:.4rem;
  font-weight:600!important;
  box-shadow:0 2px 10px rgba(15,39,71,.18);
  transition:background .2s,transform .2s,box-shadow .2s!important
}
.main-header-menu .menu-item a[href*="/iletisim/"]:hover,
.ast-header-break-point .main-header-menu .menu-item a[href*="/iletisim/"]:hover{
  background:#1a3a5c!important;
  color:#fff!important;
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(15,39,71,.22)
}
@media(max-width:921px){
  .main-header-menu .menu-item a[href*="/iletisim/"],
  .ast-header-break-point .main-header-menu .menu-item a[href*="/iletisim/"]{
    margin-left:0;
    margin-top:.5rem;
    display:inline-flex!important;
    height:auto!important;
    line-height:1.25!important;
    align-self:flex-start!important
  }
}

/* 2) Logo varken site-title görsel gizle; DOM/semantik koru (sr-only) */
body.wp-custom-logo .site-header .ast-site-title-wrap{
  position:absolute!important;
  width:1px!important;
  height:1px!important;
  padding:0!important;
  margin:-1px!important;
  overflow:hidden!important;
  clip:rect(0,0,0,0)!important;
  white-space:nowrap!important;
  border:0!important
}

/* 3) Profil: Astra entry-title yedek gizleme (PHP filter birincil) */
body.page-id-${PROFILE_PAGE_ID} .entry-header .entry-title,
body.page-id-${PROFILE_PAGE_ID} .ast-single-entry-header .entry-title{
  display:none!important;
  height:0!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important
}`;

/** Homepage inline <style> içinde kullanılacak CTA kuralları (snippet ile uyumlu). */
export const HOMEPAGE_HEADER_CTA_CSS = `.main-header-menu .menu-item a[href*="/iletisim/"]{
  height:auto!important;min-height:0!important;line-height:1.25!important;
  display:inline-flex!important;align-items:center!important;align-self:center!important;
  background:#0f2747!important;color:#fff!important;border-radius:8px!important;
  padding:.45rem 1.1rem!important;margin-left:.4rem;font-weight:600!important;
  box-shadow:0 2px 10px rgba(15,39,71,.18);transition:background .2s,transform .2s,box-shadow .2s!important;
  box-sizing:border-box!important
}
.main-header-menu .menu-item a[href*="/iletisim/"]:hover{
  background:#1a3a5c!important;color:#fff!important;transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(15,39,71,.22)
}
body.wp-custom-logo .site-header .ast-site-title-wrap{
  position:absolute!important;width:1px!important;height:1px!important;padding:0!important;
  margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;
  white-space:nowrap!important;border:0!important
}
@media(max-width:921px){
  .site-header .main-header-bar{padding:.65rem 1rem!important}
  .main-header-menu .menu-item a[href*="/iletisim/"]{
    margin-left:0;margin-top:.5rem;display:inline-flex!important;
    height:auto!important;line-height:1.25!important;align-self:flex-start!important
  }
}`;

export function buildHeaderLayoutSnippetPhp() {
  return `/**
 * Adana Avukat — header layout fixes
 * İletişim CTA kompakt hiza, logo varken site-title sr-only, profil tek H1.
 */
if (!defined('ABSPATH')) {
    exit;
}

add_filter('astra_the_title_enabled', function ($enabled) {
    if (is_page(${PROFILE_PAGE_ID})) {
        return false;
    }
    return $enabled;
}, 20);

add_action('wp_head', function () {
    if (is_admin()) {
        return;
    }
    echo '<style id="aa-header-layout-fixes">';
    echo ${JSON.stringify(HEADER_LAYOUT_CSS)};
    echo '</style>';
}, 45);
`;
}

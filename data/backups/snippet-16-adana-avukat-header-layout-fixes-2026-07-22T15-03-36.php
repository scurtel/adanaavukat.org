/**
 * Adana Avukat — header layout fixes
 * İletişim CTA kompakt hiza, logo varken site-title sr-only, profil tek H1.
 */
if (!defined('ABSPATH')) {
    exit;
}

add_filter('astra_the_title_enabled', function ($enabled) {
    if (is_page(268)) {
        return false;
    }
    return $enabled;
}, 20);

add_action('wp_head', function () {
    if (is_admin()) {
        return;
    }
    echo '<style id="aa-header-layout-fixes">';
    echo "/* aa-header-layout-fixes */\n/* 1) İletişim CTA: Astra height:100% / line-height çakışmasını kır */\n.site-header .main-header-menu > .menu-item > a.menu-link[href*=\"/iletisim/\"],\n.main-header-menu .menu-item a[href*=\"/iletisim/\"],\n.ast-header-break-point .main-header-menu .menu-item a[href*=\"/iletisim/\"]{\n  height:auto!important;\n  min-height:0!important;\n  max-height:none!important;\n  line-height:1.25!important;\n  display:inline-flex!important;\n  align-items:center!important;\n  align-self:center!important;\n  box-sizing:border-box!important;\n  background:#0f2747!important;\n  color:#fff!important;\n  border-radius:8px!important;\n  padding:.45rem 1.1rem!important;\n  margin-left:.4rem;\n  font-weight:600!important;\n  box-shadow:0 2px 10px rgba(15,39,71,.18);\n  transition:background .2s,transform .2s,box-shadow .2s!important\n}\n.main-header-menu .menu-item a[href*=\"/iletisim/\"]:hover,\n.ast-header-break-point .main-header-menu .menu-item a[href*=\"/iletisim/\"]:hover{\n  background:#1a3a5c!important;\n  color:#fff!important;\n  transform:translateY(-1px);\n  box-shadow:0 4px 14px rgba(15,39,71,.22)\n}\n@media(max-width:921px){\n  .main-header-menu .menu-item a[href*=\"/iletisim/\"],\n  .ast-header-break-point .main-header-menu .menu-item a[href*=\"/iletisim/\"]{\n    margin-left:0;\n    margin-top:.5rem;\n    display:inline-flex!important;\n    height:auto!important;\n    line-height:1.25!important;\n    align-self:flex-start!important\n  }\n}\n\n/* 2) Logo varken site-title görsel gizle; DOM/semantik koru (sr-only) */\nbody.wp-custom-logo .site-header .ast-site-title-wrap{\n  position:absolute!important;\n  width:1px!important;\n  height:1px!important;\n  padding:0!important;\n  margin:-1px!important;\n  overflow:hidden!important;\n  clip:rect(0,0,0,0)!important;\n  white-space:nowrap!important;\n  border:0!important\n}\n\n/* 3) Profil: Astra entry-title yedek gizleme (PHP filter birincil) */\nbody.page-id-268 .entry-header .entry-title,\nbody.page-id-268 .ast-single-entry-header .entry-title{\n  display:none!important;\n  height:0!important;\n  margin:0!important;\n  padding:0!important;\n  overflow:hidden!important\n}";
    echo '</style>';
}, 45);

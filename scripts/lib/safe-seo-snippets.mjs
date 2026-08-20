import { PROFILE_SLUG_OLD } from './ceren-authority-config.mjs';

export const SNIPPET_NAMES_ROUND1 = {
  wwwRedirect: 'Adana Avukat WWW Canonical Redirect',
  homepagePagedNoindex: 'Adana Avukat Homepage Paged Noindex',
  profileGuard: 'Adana Avukat Profile Redirect Guard',
};

export function buildWwwRedirectSnippetPhp() {
  return `/**
 * www.adanaavukat.org -> adanaavukat.org (301), path + query korunur.
 * CDN katmanından sonra PHP'ye düşen istekler için yedek katman.
 */
add_action('template_redirect', function () {
    if (!isset($_SERVER['HTTP_HOST'])) {
        return;
    }
    $host = strtolower(wp_unslash($_SERVER['HTTP_HOST']));
    if ($host !== 'www.adanaavukat.org') {
        return;
    }
    $uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '/';
    if (!is_string($uri) || $uri === '') {
        $uri = '/';
    }
    wp_safe_redirect('https://adanaavukat.org' . $uri, 301);
    exit;
}, 0);`;
}

export function buildHomepagePagedNoindexSnippetPhp() {
  return `/**
 * Statik ana sayfada /page/N/ kopyalarını index dışı bırak (canonical ana sayfa).
 * Gerçek blog pagination değil; duplicate index riskini azaltır.
 */
add_action('wp_head', function () {
    if (is_front_page() && is_paged()) {
        echo '<meta name="robots" content="noindex, follow" />' . "\\n";
    }
}, 1);

add_filter('rank_math/frontend/robots', function ($robots) {
    if (is_front_page() && is_paged()) {
        $robots['index'] = 'noindex';
        $robots['follow'] = 'follow';
    }
    return $robots;
}, 20);`;
}

export function buildProfileRedirectGuardSnippetPhp() {
  return `/**
 * Eski profil slug 301 — snippet map yedek kontrolü (loop yok).
 */
add_action('template_redirect', function () {
    $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
    $path = wp_parse_url($request_uri, PHP_URL_PATH);
    $path = is_string($path) ? untrailingslashit($path) : '';
    $old = '/${PROFILE_SLUG_OLD}';
    $new = home_url('/avukat-ceren-sumer-cilli/');
    if ($path === $old && !is_page('avukat-ceren-sumer-cilli')) {
        wp_safe_redirect($new, 301);
        exit;
    }
}, 1);`;
}

/**
 * Otorite URL yönlendirmeleri:
 * - Eski yazar arşivi → yeni yazar arşivi
 * - Eski profil slug → kısa profil URL
 * - EN kopya sayfalar (mevcut davranış korunur)
 */
add_action('template_redirect', function () {
    $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
    $path = wp_parse_url($request_uri, PHP_URL_PATH);
    $path = is_string($path) ? untrailingslashit($path) : '';

    $map = array(
        '/author/yigit-cilligmail-com' => home_url('/author/avukat-ceren-sumer-cilli/'),
        '/avukat-ceren-sumer-cilli-kimdir-adana-bosanma-ve-aile-hukuku' => home_url('/avukat-ceren-sumer-cilli/'),
        '/about-us' => home_url('/hakkimizda/'),
        '/contact' => home_url('/iletisim/'),
    );

    if (isset($map[$path])) {
        wp_safe_redirect($map[$path], 301);
        exit;
    }

    if (is_page('about-us')) {
        wp_safe_redirect(home_url('/hakkimizda/'), 301);
        exit;
    }
    if (is_page('contact')) {
        wp_safe_redirect(home_url('/iletisim/'), 301);
        exit;
    }
}, 1);
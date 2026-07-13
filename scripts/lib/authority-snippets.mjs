import {
  BASE_URL,
  PROFILE_URL_NEW,
  PROFILE_SLUG_OLD,
  AUTHOR_SLUG_OLD,
  AUTHOR_SLUG_NEW,
  AUTHOR_DISPLAY_NAME,
  AUTHOR_USER_ID,
  FAMILY_LAW_CATEGORY_SLUGS,
  SNIPPET_NAMES,
} from './ceren-authority-config.mjs';

export function buildAuthorityRedirectSnippetPhp() {
  return `/**
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
        '/author/${AUTHOR_SLUG_OLD}' => home_url('/author/${AUTHOR_SLUG_NEW}/'),
        '/${PROFILE_SLUG_OLD}' => home_url('/avukat-ceren-sumer-cilli/'),
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
}, 1);`;
}

export function buildProfileShortcodesSnippetPhp() {
  return `/**
 * Profil shortcode'ları + uygulama notu meta alanı
 */
add_action('init', function () {
    register_post_meta('post', 'ceren_uygulama_notu', array(
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ));
    register_post_meta('post', 'aa_legal_review_date', array(
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ));
    register_post_meta('post', 'aa_prepared_by', array(
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ));
    register_post_meta('post', 'aa_reviewed_by', array(
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ));
});

function aa_family_category_ids() {
    $slugs = array(${FAMILY_LAW_CATEGORY_SLUGS.map((s) => `'${s}'`).join(', ')});
    $ids = array();
    foreach ($slugs as $slug) {
        $term = get_category_by_slug($slug);
        if ($term) {
            $ids[] = (int) $term->term_id;
        }
    }
    return $ids;
}

add_shortcode('ceren_aile_makaleleri', function () {
    $q = new WP_Query(array(
        'post_type' => 'post',
        'post_status' => 'publish',
        'posts_per_page' => 20,
        'author' => ${AUTHOR_USER_ID},
        'category__in' => aa_family_category_ids(),
        'orderby' => 'date',
        'order' => 'DESC',
        'no_found_rows' => true,
    ));
    if (!$q->have_posts()) {
        return '<p>Henüz listelenecek aile hukuku makalesi bulunamadı.</p>';
    }
    $out = '<ul class="aa-profile-articles">';
    while ($q->have_posts()) {
        $q->the_post();
        $out .= '<li><a href="' . esc_url(get_permalink()) . '">' . esc_html(get_the_title()) . '</a></li>';
    }
    wp_reset_postdata();
    $out .= '</ul>';
    return $out;
});

add_shortcode('ceren_son_guncellenen', function () {
    $q = new WP_Query(array(
        'post_type' => 'post',
        'post_status' => 'publish',
        'posts_per_page' => 8,
        'author' => ${AUTHOR_USER_ID},
        'category__in' => aa_family_category_ids(),
        'orderby' => 'modified',
        'order' => 'DESC',
        'no_found_rows' => true,
    ));
    if (!$q->have_posts()) {
        return '';
    }
    $out = '<ul class="aa-profile-updated">';
    while ($q->have_posts()) {
        $q->the_post();
        $out .= '<li><a href="' . esc_url(get_permalink()) . '">' . esc_html(get_the_title()) . '</a> <small>(' . esc_html(get_the_modified_date('d.m.Y')) . ')</small></li>';
    }
    wp_reset_postdata();
    $out .= '</ul>';
    return $out;
});

add_shortcode('ceren_uygulama_notu', function () {
    if (!is_singular('post')) {
        return '';
    }
    $note = get_post_meta(get_the_ID(), 'ceren_uygulama_notu', true);
    if (!is_string($note) || trim($note) === '') {
        return '';
    }
    return '<aside class="aa-practice-note"><h2>Avukat Ceren Sümer Cilli’nin uygulama notu</h2><div>' . wp_kses_post(wpautop($note)) . '</div></aside>';
});`;
}

export function buildArticleAuthoritySnippetPhp() {
  return `/**
 * Aile hukuku yazılarında uzman kutusu + ilgili içerikler + Person author şeması güçlendirme
 * Yalnızca yazar ID ${AUTHOR_USER_ID} ve aile hukuku kategorilerinde çalışır.
 */
function aa_authority_family_category_ids() {
    $slugs = array(${FAMILY_LAW_CATEGORY_SLUGS.map((s) => `'${s}'`).join(', ')});
    $ids = array();
    foreach ($slugs as $slug) {
        $term = get_category_by_slug($slug);
        if ($term) {
            $ids[] = (int) $term->term_id;
        }
    }
    return $ids;
}

function aa_is_family_law_authority_post() {
    if (!is_singular('post')) {
        return false;
    }
    $post = get_post();
    if (!$post || (int) $post->post_author !== ${AUTHOR_USER_ID}) {
        return false;
    }
    $ids = aa_authority_family_category_ids();
    if (empty($ids)) {
        return false;
    }
    return has_category($ids, $post);
}

add_filter('the_content', function ($content) {
    if (!aa_is_family_law_authority_post() || !in_the_loop() || !is_main_query()) {
        return $content;
    }
    if (strpos($content, 'aa-authority-footer') !== false) {
        return $content;
    }

    $profile = esc_url('${PROFILE_URL_NEW}');
    $hub = esc_url('${BASE_URL}/aile-hukuku-rehberi/');
    $post_id = get_the_ID();

    $related = new WP_Query(array(
        'post_type' => 'post',
        'post_status' => 'publish',
        'posts_per_page' => 3,
        'post__not_in' => array($post_id),
        'category__in' => wp_get_post_categories($post_id),
        'orderby' => 'modified',
        'order' => 'DESC',
        'no_found_rows' => true,
    ));

    $related_html = '';
    if ($related->have_posts()) {
        $related_html .= '<section class="aa-related-family"><h2>İlgili aile hukuku içerikleri</h2><ul>';
        while ($related->have_posts()) {
            $related->the_post();
            $related_html .= '<li><a href="' . esc_url(get_permalink()) . '">' . esc_html(get_the_title()) . '</a></li>';
        }
        wp_reset_postdata();
        $related_html .= '</ul></section>';
    }

    $note = do_shortcode('[ceren_uygulama_notu]');
    $review = get_post_meta($post_id, 'aa_legal_review_date', true);
    $review_html = '';
    if (is_string($review) && trim($review) !== '') {
        $review_html = '<p class="aa-legal-review"><strong>Son hukuk kontrolü:</strong> ' . esc_html($review) . '</p>';
    }

    $box = '<aside class="aa-authority-footer author-box" style="margin-top:2rem;padding:1.25rem;border-top:1px solid #e5e7eb">'
        . $note
        . $related_html
        . '<p>İlgili rehber: <a href="' . $hub . '">Aile Hukuku Rehberi</a> · Yazar profili: <a href="' . $profile . '">${AUTHOR_DISPLAY_NAME}</a></p>'
        . '<p>Bu içerik, ${AUTHOR_DISPLAY_NAME} tarafından aile hukuku uygulaması bakımından hazırlanmış veya hukuki açıdan kontrol edilmiştir.</p>'
        . $review_html
        . '<p><em>Bu sayfa genel bilgilendirme amacıyla hazırlanmıştır. Somut olayınız için bir avukata danışmanız önerilir.</em></p>'
        . '</aside>';

    return $content . $box;
}, 25);

add_filter('rank_math/json_ld', function ($data, $jsonld) {
    if (!aa_is_family_law_authority_post() || !is_array($data)) {
        return $data;
    }
    $author = array(
        '@type' => 'Person',
        'name' => '${AUTHOR_DISPLAY_NAME}',
        'url' => '${PROFILE_URL_NEW}',
    );
    foreach ($data as $key => $piece) {
        if (!is_array($piece)) {
            continue;
        }
        $types = isset($piece['@type']) ? (array) $piece['@type'] : array();
        if (in_array('Article', $types, true) || in_array('BlogPosting', $types, true) || in_array('NewsArticle', $types, true)) {
            $data[$key]['author'] = $author;
        }
        if (isset($piece['@graph']) && is_array($piece['@graph'])) {
            foreach ($piece['@graph'] as $gKey => $gPiece) {
                if (!is_array($gPiece)) {
                    continue;
                }
                $gTypes = isset($gPiece['@type']) ? (array) $gPiece['@type'] : array();
                if (in_array('Article', $gTypes, true) || in_array('BlogPosting', $gTypes, true)) {
                    $data[$key]['@graph'][$gKey]['author'] = $author;
                }
            }
        }
    }
    return $data;
}, 99, 2);

// Rank Math yoksa veya Article üretmiyorsa tek bir Article JSON-LD ekle
add_action('wp_footer', function () {
    if (!aa_is_family_law_authority_post()) {
        return;
    }
    if (defined('RANK_MATH_VERSION')) {
        return;
    }
    $post = get_post();
    $permalink = get_permalink($post);
    $image = get_the_post_thumbnail_url($post, 'full');
    $data = array(
        '@context' => 'https://schema.org',
        '@type' => 'Article',
        '@id' => trailingslashit($permalink) . '#article',
        'headline' => wp_strip_all_tags(get_the_title($post)),
        'description' => wp_strip_all_tags(get_the_excerpt($post)),
        'datePublished' => get_the_date('c', $post),
        'dateModified' => get_the_modified_date('c', $post),
        'mainEntityOfPage' => array('@type' => 'WebPage', '@id' => $permalink),
        'author' => array(
            '@type' => 'Person',
            'name' => '${AUTHOR_DISPLAY_NAME}',
            'url' => '${PROFILE_URL_NEW}',
        ),
        'publisher' => array(
            '@type' => 'Organization',
            'name' => 'Adana Avukat | Ceren Sümer Cilli Hukuk ve Danışmanlık',
            'url' => '${BASE_URL}/',
        ),
    );
    if ($image) {
        $data['image'] = array($image);
    }
    echo '<script type="application/ld+json" id="aa-article-author-jsonld">' . wp_json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
}, 30);

add_action('wp_head', function () {
    if (!aa_is_family_law_authority_post() && !is_page('avukat-ceren-sumer-cilli') && !is_home()) {
        return;
    }
    echo '<style id="aa-authority-css">'
        . '.aa-authority-footer{line-height:1.6}'
        . '.aa-related-family ul,.aa-profile-articles,.aa-profile-updated{padding-left:1.2rem}'
        . '.aa-practice-note{margin:1.5rem 0;padding:1rem;background:#f8fafc;border-left:3px solid #0f2747}'
        . '.aa-cluster-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:1.25rem 0}'
        . '.aa-cluster-card{padding:1rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff}'
        . '.aa-cluster-card h3{margin:0 0 .5rem;font-size:1.05rem}'
        . '</style>';
}, 20);`;
}

export function buildEnhancedBlogHubSnippetPhp() {
  return `/**
 * Aile Hukuku Rehberi hub — konu kümeleri + yazar otoritesi
 */
function aa_blog_hub_should_show() {
    return is_home() && !is_front_page();
}

function aa_blog_hub_intro_markup() {
    static $done = false;
    if ($done || !aa_blog_hub_should_show()) {
        return;
    }
    $done = true;
    echo '<div class="aa-blog-hub-intro ast-container">';
    echo '<header class="aa-blog-hub-intro__header">';
    echo '<h1 class="aa-blog-hub-intro__title entry-title">Aile Hukuku Rehberi</h1>';
    echo '<p class="aa-blog-hub-intro__lead">Boşanma, velayet, nafaka, mal rejimi ve 6284 sayılı Kanun konularında bilgilendirici rehber. İçerikler ${AUTHOR_DISPLAY_NAME} tarafından hazırlanır veya hukuki açıdan kontrol edilir.</p>';
    echo '</header>';
    echo '<div class="aa-cluster-grid">';
    echo '<div class="aa-cluster-card"><h3>Boşanma ve deliller</h3><p>Anlaşmalı/çekişmeli boşanma, delil ve kanun yolları.</p><p><a href="${BASE_URL}/adana-bosanma-avukati/">Boşanma hizmet sayfası</a></p></div>';
    echo '<div class="aa-cluster-card"><h3>Velayet</h3><p>Velayet kriterleri, kişisel ilişki ve inceleme süreçleri.</p><p><a href="${BASE_URL}/velayet-davasi-avukati-adana/">Velayet hizmet sayfası</a></p></div>';
    echo '<div class="aa-cluster-card"><h3>Nafaka</h3><p>Tedbir, iştirak, yoksulluk nafakası; artırım ve kaldırma.</p><p><a href="${BASE_URL}/nafaka-davasi/">Nafaka hizmet sayfası</a></p></div>';
    echo '<div class="aa-cluster-card"><h3>Mal rejimi ve ziynet</h3><p>Tasfiye, aile konutu ve ekonomik uyuşmazlıklar.</p><p><a href="${BASE_URL}/adana-ortakligin-giderilmesi-davasi-avukat/">Mal paylaşımı</a></p></div>';
    echo '<div class="aa-cluster-card"><h3>6284 tedbirleri</h3><p>Koruma ve uzaklaştırma tedbirlerine ilişkin genel bilgilendirme.</p><p><a href="${BASE_URL}/adana-aile-hukuku-avukati/">Aile hukuku</a></p></div>';
    echo '</div>';
    echo '<p class="aa-blog-hub-intro__author">Yazar ve hukuk kontrolü: <a href="${PROFILE_URL_NEW}">${AUTHOR_DISPLAY_NAME}</a>. Kaynak ve güncellik yaklaşımı için <a href="${BASE_URL}/editoryal-politika/">editoryal politika</a> sayfasına bakınız.</p>';
    echo '</div>';
}

add_action('astra_primary_content_top', 'aa_blog_hub_intro_markup', 5);
add_action('loop_start', function ($query) {
    if (!$query->is_main_query() || !aa_blog_hub_should_show()) {
        return;
    }
    aa_blog_hub_intro_markup();
}, 5);

add_action('wp_head', function () {
    if (!aa_blog_hub_should_show()) {
        return;
    }
    $data = array(
        '@context' => 'https://schema.org',
        '@type' => 'CollectionPage',
        '@id' => '${BASE_URL}/aile-hukuku-rehberi/#collection',
        'name' => 'Aile Hukuku Rehberi',
        'url' => '${BASE_URL}/aile-hukuku-rehberi/',
        'description' => 'Boşanma, velayet, nafaka, mal rejimi ve 6284 sayılı Kanun konularında aile hukuku rehberi.',
        'author' => array(
            '@type' => 'Person',
            'name' => '${AUTHOR_DISPLAY_NAME}',
            'url' => '${PROFILE_URL_NEW}',
        ),
        'isPartOf' => array('@id' => '${BASE_URL}/#website'),
    );
    echo '<script type="application/ld+json" id="aa-hub-collection-jsonld">' . wp_json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
    echo '<style id="aa-blog-hub-intro-css">'
        . '.aa-blog-hub-intro{padding:1.5rem 0 .75rem;margin-bottom:.75rem}'
        . '.aa-blog-hub-intro__title{font-size:clamp(1.6rem,3vw,2.1rem);margin:0 0 .65rem;line-height:1.25}'
        . '.aa-blog-hub-intro__lead{margin:0 0 1rem;color:#4b5563;max-width:70ch;font-size:1.05rem;line-height:1.6}'
        . '.aa-blog-hub-intro__author{margin:1rem 0 0;color:#374151;max-width:70ch}'
        . '</style>';
}, 20);`;
}

export { SNIPPET_NAMES };

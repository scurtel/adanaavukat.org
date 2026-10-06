/**
 * Aile hukuku yazılarında uzman kutusu + ilgili içerikler + Person author şeması güçlendirme
 * Yalnızca yazar ID 1 ve aile hukuku kategorilerinde çalışır.
 */
function aa_authority_family_category_ids() {
    $slugs = array('aile-hukuku', 'bosanma-davalari', 'nafaka', 'velayet', 'mal-paylasimi');
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
    if (!$post || (int) $post->post_author !== 1) {
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

    $profile = esc_url('https://adanaavukat.org/avukat-ceren-sumer-cilli/');
    $hub = esc_url('https://adanaavukat.org/aile-hukuku-rehberi/');
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
        . '<p>İlgili rehber: <a href="' . $hub . '">Aile Hukuku Rehberi</a> · Yazar profili: <a href="' . $profile . '">Avukat Ceren Sümer Cilli</a></p>'
        . '<p>Bu içerik, Avukat Ceren Sümer Cilli tarafından aile hukuku uygulaması bakımından hazırlanmış veya hukuki açıdan kontrol edilmiştir.</p>'
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
        '@id' => 'https://adanaavukat.org/avukat-ceren-sumer-cilli/#person',
        'name' => 'Avukat Ceren Sümer Cilli',
        'url' => 'https://adanaavukat.org/avukat-ceren-sumer-cilli/',
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
            '@id' => 'https://adanaavukat.org/avukat-ceren-sumer-cilli/#person',
            'name' => 'Avukat Ceren Sümer Cilli',
            'url' => 'https://adanaavukat.org/avukat-ceren-sumer-cilli/',
        ),
        'publisher' => array(
            '@type' => 'Organization',
            'name' => 'Adana Avukat | Ceren Sümer Cilli Hukuk ve Danışmanlık',
            'url' => 'https://adanaavukat.org/',
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
}, 20);
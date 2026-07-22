/**
 * LiteSpeed lazy-load exclude + kritik görsel HTML düzeltmeleri (Code Snippet).
 * v2: conf filtresi ve ?? operatörü kaldırıldı (Hostinger/LS uyumu).
 */

export const IMAGE_LAZYLOAD_SNIPPET_NAME = 'Adana Avukat Image Lazy Load Fixes';

export const PROFILE_PHOTO_MEDIA_ID = 269;
export const SITE_LOGO_MEDIA_ID = 18;
export const CRITICAL_BLOG_THUMB_COUNT = 3;

export function buildImageLazyloadSnippetPhp() {
  return `/**
 * Adana Avukat — LiteSpeed lazy-load excludes (v2)
 * Logo, profil fotoğrafı ve blog listesi ilk görselleri JS beklemeden yüklenir.
 */
add_filter('litespeed_media_lazy_img_excludes', function ($list) {
    if (!is_array($list)) {
        $list = array();
    }
    foreach (array('custom-logo', 'skip-lazy', 'aa-skip-lazy', 'aa-profile-photo', 'aa-critical-img', 'adana-avukat-ceren-sumer-logo', 'Avukat-Ceren-Sumer-Cilli') as $item) {
        if (!in_array($item, $list, true)) {
            $list[] = $item;
        }
    }
    return $list;
});

add_filter('get_custom_logo', function ($html) {
    if (!is_string($html) || $html === '') {
        return $html;
    }
    if (false !== strpos($html, 'aa-skip-lazy')) {
        return $html;
    }
    if (preg_match('/class=("|\\')(.*?)("|\\')/i', $html)) {
        $html = preg_replace('/class=("|\\')(.*?)("|\\')/i', 'class=$1$2 skip-lazy aa-skip-lazy$3', $html, 1);
    }
    if (!preg_match('/\\sloading=/i', $html)) {
        $html = preg_replace('/<img\\b/i', '<img loading="eager" fetchpriority="high" data-no-lazy="1"', $html, 1);
    } else {
        $html = preg_replace('/\\sloading=("|\\')(.*?)("|\\')/i', ' loading="eager"', $html, 1);
    }
    if (!preg_match('/\\sfetchpriority=/i', $html)) {
        $html = preg_replace('/<img\\b/i', '<img fetchpriority="high"', $html, 1);
    }
    if (!preg_match('/\\sdata-no-lazy=/i', $html)) {
        $html = preg_replace('/<img\\b/i', '<img data-no-lazy="1"', $html, 1);
    }
    return $html;
}, 20);

add_filter('wp_get_attachment_image_attributes', function ($attr, $attachment) {
    $id = is_object($attachment) ? (int) $attachment->ID : (int) $attachment;
    $classes = isset($attr['class']) ? (string) $attr['class'] : '';
    $logo_id = (int) get_theme_mod('custom_logo');

    if ($logo_id && $id === $logo_id) {
        $attr['class'] = trim($classes . ' custom-logo skip-lazy aa-skip-lazy');
        $attr['loading'] = 'eager';
        $attr['fetchpriority'] = 'high';
        $attr['data-no-lazy'] = '1';
        $attr['decoding'] = 'async';
        return $attr;
    }

    if ($id === ${PROFILE_PHOTO_MEDIA_ID} || false !== strpos($classes, 'aa-profile-photo')) {
        $attr['class'] = trim($classes . ' aa-profile-photo skip-lazy aa-skip-lazy');
        $attr['loading'] = 'eager';
        $attr['fetchpriority'] = 'high';
        $attr['data-no-lazy'] = '1';
        $attr['decoding'] = 'async';
        return $attr;
    }

    $is_blog_list = !is_admin() && !is_singular() && !is_feed() && (is_home() || is_archive() || is_search() || is_page('aile-hukuku-rehberi'));
    if ($is_blog_list && false !== strpos($classes, 'wp-post-image')) {
        static $aa_blog_thumb_i = 0;
        $aa_blog_thumb_i++;
        if ($aa_blog_thumb_i <= ${CRITICAL_BLOG_THUMB_COUNT}) {
            $attr['class'] = trim($classes . ' post-card-image skip-lazy aa-skip-lazy aa-critical-img');
            $attr['loading'] = 'eager';
            $attr['data-no-lazy'] = '1';
        } else {
            $attr['class'] = trim($classes . ' post-card-image');
            $attr['loading'] = 'lazy';
        }
        $attr['decoding'] = 'async';
    }
    return $attr;
}, 30, 2);

add_filter('the_content', function ($content) {
    if (is_admin() || !is_string($content) || false === strpos($content, 'Avukat-Ceren-Sumer-Cilli')) {
        return $content;
    }
    return preg_replace_callback('/<img\\b[^>]*>/i', function ($m) {
        $tag = $m[0];
        if (false === stripos($tag, 'Avukat-Ceren-Sumer-Cilli')) {
            return $tag;
        }
        if (false === strpos($tag, 'aa-skip-lazy')) {
            if (preg_match('/\\sclass=("|\\')(.*?)("|\\')/i', $tag)) {
                $tag = preg_replace('/\\sclass=("|\\')(.*?)("|\\')/i', ' class="$2 aa-profile-photo skip-lazy aa-skip-lazy"', $tag, 1);
            } else {
                $tag = preg_replace('/<img\\b/i', '<img class="aa-profile-photo skip-lazy aa-skip-lazy"', $tag, 1);
            }
        }
        if (!preg_match('/\\sdata-no-lazy=/i', $tag)) {
            $tag = preg_replace('/<img\\b/i', '<img data-no-lazy="1"', $tag, 1);
        }
        if (preg_match('/\\sloading=/i', $tag)) {
            $tag = preg_replace('/\\sloading=("|\\')(.*?)("|\\')/i', ' loading="eager"', $tag, 1);
        } else {
            $tag = preg_replace('/<img\\b/i', '<img loading="eager"', $tag, 1);
        }
        if (!preg_match('/\\sfetchpriority=/i', $tag)) {
            $tag = preg_replace('/<img\\b/i', '<img fetchpriority="high"', $tag, 1);
        }
        return $tag;
    }, $content);
}, 20);

add_action('wp_head', function () {
    echo '<!-- aa-image-lazyload-fixes-active -->';
    echo '<style id="aa-image-lazyload-fixes">';
    echo '.site-header .custom-logo-link{display:inline-flex;align-items:center;line-height:0}';
    echo '.site-header .custom-logo-link img.custom-logo,.site-header .site-logo-img img.custom-logo{display:block;width:auto;height:40px;max-height:44px;max-width:min(180px,55vw);object-fit:contain}';
    echo '@media(max-width:921px){.site-header .custom-logo-link img.custom-logo,.site-header .site-logo-img img.custom-logo{height:34px;max-height:36px;max-width:min(150px,60vw)}}';
    echo '.aa-profile-photo,img.aa-profile-photo{display:block;width:min(280px,100%);max-width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:4px}';
    echo '</style>';
}, 40);
`;
}

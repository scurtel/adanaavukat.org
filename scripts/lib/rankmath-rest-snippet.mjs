export const RANKMATH_REST_SNIPPET_NAME = 'Adana Avukat Rank Math REST';

export const RANKMATH_REST_SNIPPET_CODE = `add_action('init', function () {
    $meta_fields = [
        'rank_math_title' => 'string',
        'rank_math_description' => 'string',
        'rank_math_focus_keyword' => 'string',
        'rank_math_facebook_title' => 'string',
        'rank_math_facebook_description' => 'string',
        'rank_math_twitter_title' => 'string',
        'rank_math_twitter_description' => 'string',
        'rank_math_robots' => 'array',
        'rank_math_additional_keywords' => 'string',
    ];

    foreach (['page', 'post'] as $post_type) {
        foreach ($meta_fields as $key => $type) {
            register_post_meta($post_type, $key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ]);
        }
    }
});

add_action('rest_api_init', function () {
    register_rest_route('adanaavukat/v1', '/rankmath-meta/(?P<id>\\d+)', [
        'methods' => 'POST',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
        'callback' => function (WP_REST_Request $request) {
            $post_id = (int) $request['id'];
            if (!get_post($post_id)) {
                return new WP_Error('not_found', 'Post not found', ['status' => 404]);
            }

            $allowed = [
                'rank_math_title',
                'rank_math_description',
                'rank_math_focus_keyword',
                'rank_math_facebook_title',
                'rank_math_facebook_description',
                'rank_math_twitter_title',
                'rank_math_twitter_description',
                'rank_math_robots',
                'rank_math_additional_keywords',
            ];

            $updated = [];
            foreach ($allowed as $key) {
                if ($request->has_param($key)) {
                    update_post_meta($post_id, $key, $request->get_param($key));
                    $updated[$key] = $request->get_param($key);
                }
            }

            if (function_exists('rank_math')) {
                delete_post_meta($post_id, 'rank_math_seo_score');
            }

            return ['post_id' => $post_id, 'updated' => $updated];
        },
    ]);

    register_rest_route('adanaavukat/v1', '/rankmath-global', [
        'methods' => 'POST',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        },
        'callback' => function (WP_REST_Request $request) {
            $changed = [];
            $titles = get_option('rank-math-options-titles');
            if (is_array($titles)) {
                foreach (['noindex_archive', 'noindex_category', 'noindex_tag', 'noindex_author', 'noindex_date', 'noindex_search'] as $key) {
                    if ($request->get_param($key) !== null) {
                        $titles[$key] = $request->get_param($key);
                        $changed[$key] = $titles[$key];
                    }
                }
                update_option('rank-math-options-titles', $titles);
            }

            $sitemap = get_option('rank-math-options-sitemap');
            if (is_array($sitemap) && $request->get_param('sitemap_on') !== null) {
                $sitemap['sitemap'] = $request->get_param('sitemap_on') ? 'on' : 'off';
                update_option('rank-math-options-sitemap', $sitemap);
                $changed['sitemap'] = $sitemap['sitemap'];
            }

            if ($request->get_param('flush_sitemap')) {
                delete_option('rank_math_sitemap_cache');
                delete_transient('rank_math_sitemap');
                if (class_exists('\\RankMath\\Sitemap\\Cache')) {
                    \\RankMath\\Sitemap\\Cache::invalidate_storage();
                }
                if (class_exists('\\RankMath\\Helper')) {
                    \\RankMath\\Helper::clear_cache();
                }
                do_action('rank_math/sitemap/hit_index');
                $changed['flush_sitemap'] = true;
            }

            if ($request->get_param('purge_litespeed')) {
                do_action('litespeed_purge_all');
                if (class_exists('\\LiteSpeed\\Purge')) {
                    \\LiteSpeed\\Purge::purge_all();
                }
                $changed['purge_litespeed'] = true;
            }

            return ['changed' => $changed];
        },
    ]);
});`;

<?php
/**
 * Plugin Name: Adana Avukat Rank Math REST
 * Description: Registers Rank Math post meta fields for WordPress REST API updates.
 * Version: 1.0.0
 * Author: adanaavukat.org tooling
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('init', function () {
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

    $post_types = ['page', 'post'];

    foreach ($post_types as $post_type) {
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
    register_rest_route('adanaavukat/v1', '/rankmath-meta/(?P<id>\d+)', [
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
});

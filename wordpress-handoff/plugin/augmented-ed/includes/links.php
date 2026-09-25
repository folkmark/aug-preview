<?php
/**
 * Where the AugmentED pages' links point.
 *
 * The site links its five pages to each other constantly — 78 links across the five
 * templates — and none of them can be a path: where the pages live on aerdf.org is AERDF's
 * decision (see DECISIONS.md), and it may change. So a link names a template, and this finds
 * the published page using that template. Move a page, rename its slug, re-parent it: every
 * link follows.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

/** The value stored in _wp_page_template for a template key. */
function augmented_ed_template_value( $key ) {
	return 'augmented-ed/' . $key . '.php';
}

/**
 * Page IDs per template key, published pages only, cached in an option.
 *
 * Cached because every AugmentED page calls this dozens of times and the answer only
 * changes when a page is saved, trashed or deleted — which clears it (below).
 *
 * @param bool $refresh Ignore the cache.
 * @return array<string, int[]>
 */
function augmented_ed_template_pages( $refresh = false ) {
	$cached = get_option( 'augmented_ed_template_pages' );
	if ( ! $refresh && is_array( $cached ) ) {
		return $cached;
	}
	$map = array();
	foreach ( array_keys( AUGMENTED_ED_TEMPLATES ) as $key ) {
		$map[ $key ] = array_map(
			'intval',
			get_posts(
				array(
					'post_type'        => 'page',
					'post_status'      => 'publish',
					'meta_key'         => '_wp_page_template', // phpcs:ignore WordPress.DB.SlowDBQuery -- five small lookups, cached.
					'meta_value'       => augmented_ed_template_value( $key ), // phpcs:ignore WordPress.DB.SlowDBQuery
					'fields'           => 'ids',
					'numberposts'      => 2,
					'orderby'          => 'ID',
					'order'            => 'ASC',
					'suppress_filters' => true,
				)
			)
		);
	}
	update_option( 'augmented_ed_template_pages', $map, false );
	return $map;
}

foreach ( array( 'save_post_page', 'deleted_post', 'trashed_post', 'untrashed_post' ) as $augmented_ed_hook ) {
	add_action(
		$augmented_ed_hook,
		function () {
			delete_option( 'augmented_ed_template_pages' );
		}
	);
}

/**
 * The URL of the page using a template.
 *
 * Before the pages are published there is nothing to link to. An editor previewing the
 * drafts still gets working links (to the drafts); a visitor gets the site's home page
 * rather than a dead link, and the settings screen says which template has no page.
 */
function augmented_ed_url( $key ) {
	$map = augmented_ed_template_pages();
	if ( ! empty( $map[ $key ][0] ) ) {
		return get_permalink( $map[ $key ][0] );
	}
	if ( current_user_can( 'edit_pages' ) ) {
		$drafts = get_posts(
			array(
				'post_type'        => 'page',
				'post_status'      => array( 'draft', 'pending', 'private', 'future' ),
				'meta_key'         => '_wp_page_template', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'       => augmented_ed_template_value( $key ), // phpcs:ignore WordPress.DB.SlowDBQuery
				'fields'           => 'ids',
				'numberposts'      => 1,
				'suppress_filters' => true,
			)
		);
		if ( $drafts ) {
			return get_permalink( $drafts[0] );
		}
	}
	return home_url( '/' );
}

/**
 * A URL into the plugin's assets/ directory.
 *
 * Plugin files, not media-library uploads, and that is deliberate: the components address
 * their frames by exact filename, the headshots' colour twins are found by rewriting the
 * headshot's own URL, and WP-Stateless on aerdf.org moves every upload to Google Cloud
 * Storage under a URL none of that could construct. Plugin files are left where they are.
 */
function augmented_ed_asset( $rel ) {
	return plugins_url( 'assets/' . ltrim( $rel, '/' ), AUGMENTED_ED_FILE );
}

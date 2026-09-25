<?php
/**
 * Which pages are AugmentED pages, and what draws them.
 *
 * A page is an AugmentED page because of the TEMPLATE it is given, never because of its
 * slug. The previous handoff matched slugs (team, approach, follow…), and on aerdf.org
 * /team/ is the team post type's archive and other programmes have pages with those names.
 * A template is chosen on purpose, one page at a time, in the page's own Template menu.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

// The templates appear in every page's Template menu, beside the theme's own.
add_filter(
	'theme_page_templates',
	function ( $templates ) {
		foreach ( AUGMENTED_ED_TEMPLATES as $key => $label ) {
			$templates[ augmented_ed_template_value( $key ) ] = 'AugmentED — ' . $label;
		}
		return $templates;
	}
);

/**
 * The AugmentED template the current request is drawn with, or null.
 *
 * One of the five page keys, or 'bio' for an AugmentED team member's single page. Everything
 * the plugin does on the front end — the template swap, the assets, the body classes — is
 * gated on this, so none of it reaches any other page of aerdf.org.
 */
function augmented_ed_current_template() {
	static $current = false;
	if ( false !== $current ) {
		return $current;
	}
	$current = null;
	if ( is_page() ) {
		$slug = (string) get_page_template_slug( get_queried_object_id() );
		if ( str_starts_with( $slug, 'augmented-ed/' ) ) {
			$key = substr( $slug, strlen( 'augmented-ed/' ), -strlen( '.php' ) );
			if ( isset( AUGMENTED_ED_TEMPLATES[ $key ] ) ) {
				$current = $key;
			}
		}
	} elseif ( is_singular( augmented_ed_post_type() ) ) {
		$post = get_queried_object();
		if ( $post instanceof WP_Post && augmented_ed_serves_bio( $post ) ) {
			$current = 'bio';
		}
	}
	return $current;
}

/**
 * Swap in the generated template.
 *
 * Priority 100. Elementor's own page templates hook at 11 (modules/page-templates, checked
 * in Elementor 4.3.2) and Elementor Pro's Theme Builder at about 12 — on aerdf.org the
 * Theme Builder draws every team member's page, so the bio template has to come after it.
 * Elementor's safe mode hooks at 999 on purpose, and it should still win: when AERDF is
 * troubleshooting with safe mode on, it is supposed to get a plain page.
 */
add_filter(
	'template_include',
	function ( $template ) {
		$key = augmented_ed_current_template();
		if ( null === $key ) {
			return $template;
		}
		$file = AUGMENTED_ED_DIR . 'generated/templates/' . $key . '.php';
		return is_readable( $file ) ? $file : $template;
	},
	100
);

add_filter(
	'body_class',
	function ( $classes ) {
		$key = augmented_ed_current_template();
		if ( null !== $key ) {
			$classes[] = 'augmented-ed-page';
			$classes[] = 'augmented-ed-' . $key;
		}
		return $classes;
	}
);

/**
 * On an AugmentED page's edit screen, say what the page is.
 *
 * The page's content is never shown: the template draws the whole page from the plugin.
 * Someone opening it in Elementor would build a layout nobody sees — or, worse, switch the
 * page to one of Elementor's own templates and replace the AugmentED page with it.
 */
add_action(
	'edit_form_after_title',
	function ( $post ) {
		if ( 'page' !== $post->post_type ) {
			return;
		}
		$slug = (string) get_page_template_slug( $post );
		if ( ! str_starts_with( $slug, 'augmented-ed/' ) ) {
			return;
		}
		echo '<div class="notice notice-info inline"><p><strong>' . esc_html__( 'This page is drawn by the AugmentED plugin.', 'augmented-ed' ) . '</strong> '
			. esc_html__( 'Its content box is not shown on the site, so leave it empty, and do not open this page in Elementor: choosing an Elementor layout replaces the AugmentED template. The title, slug, parent and Yoast fields are used as normal.', 'augmented-ed' )
			. '</p></div>';
	}
);

/**
 * Create the five pages as drafts, each with its template, under one parent.
 *
 * A convenience, and a safe one: drafts have no public URL, so nothing changes on
 * aerdf.org until someone publishes them — including /augmented/, which today redirects to
 * the existing AugmentED page and would be taken over by a published page at that address.
 * A template that already has a page (in any status) is skipped. Yoast's title and
 * description are filled from the site's own, only where empty.
 *
 * @return array<string, int> Page IDs created, by key.
 */
function augmented_ed_create_pages() {
	$pages   = augmented_ed_data( 'pages' ) ? augmented_ed_data( 'pages' ) : array();
	$meta    = array();
	foreach ( $pages as $p ) {
		$meta[ $p['key'] ] = $p;
	}
	$created = array();
	$parent  = 0;
	foreach ( array_keys( AUGMENTED_ED_TEMPLATES ) as $key ) {
		$existing = get_posts(
			array(
				'post_type'        => 'page',
				'post_status'      => 'any',
				'meta_key'         => '_wp_page_template', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'       => augmented_ed_template_value( $key ), // phpcs:ignore WordPress.DB.SlowDBQuery
				'fields'           => 'ids',
				'numberposts'      => 1,
				'suppress_filters' => true,
			)
		);
		if ( $existing ) {
			if ( 'home' === $key ) {
				$parent = (int) $existing[0];
			}
			continue;
		}
		$id = wp_insert_post(
			array(
				'post_type'   => 'page',
				'post_status' => 'draft',
				'post_title'  => 'home' === $key ? 'AugmentED' : AUGMENTED_ED_TEMPLATES[ $key ],
				'post_name'   => 'home' === $key ? 'augmented' : $key,
				'post_parent' => 'home' === $key ? 0 : $parent,
				'meta_input'  => array( '_wp_page_template' => augmented_ed_template_value( $key ) ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			continue;
		}
		if ( 'home' === $key ) {
			$parent = (int) $id;
		}
		if ( ! empty( $meta[ $key ]['title'] ) && ! get_post_meta( $id, '_yoast_wpseo_title', true ) ) {
			update_post_meta( $id, '_yoast_wpseo_title', $meta[ $key ]['title'] );
		}
		if ( ! empty( $meta[ $key ]['description'] ) && ! get_post_meta( $id, '_yoast_wpseo_metadesc', true ) ) {
			update_post_meta( $id, '_yoast_wpseo_metadesc', $meta[ $key ]['description'] );
		}
		$created[ $key ] = (int) $id;
	}
	delete_option( 'augmented_ed_template_pages' );
	return $created;
}

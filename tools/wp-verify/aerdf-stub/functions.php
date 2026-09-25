<?php
/**
 * The AERDF stand-in. Everything here is mimicry, measured from aerdf.org on 2026-09-25:
 * nothing is AERDF's code, and the only AERDF files it uses are the public stylesheets the
 * harness downloads into .wp-verify/host-css/ at test time (never committed).
 */

// `team`, as CPT UI registers it on aerdf.org: public, /team/<slug>/, an archive at /team/,
// the ordinary category taxonomy, hidden from the REST API.
add_action( 'init', function () {
	register_post_type( 'team', array(
		'label'        => 'Team Members',
		'public'       => true,
		'has_archive'  => 'team',
		'rewrite'      => array( 'slug' => 'team' ),
		'supports'     => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
		'taxonomies'   => array( 'category' ),
		'show_in_rest' => false,
	) );
} );

// The site's stylesheets, in the order aerdf.org links them, then deliberately hostile rules.
add_action( 'wp_enqueue_scripts', function () {
	$dir  = ABSPATH . 'host-css';
	$uri  = home_url( '/host-css/' );
	$prev = array();
	foreach ( glob( rtrim( $dir, '/' ) . '/*.css' ) ?: array() as $i => $file ) {
		wp_enqueue_style( 'aerdf-host-' . $i, $uri . basename( $file ), $prev, null );
		$prev = array( 'aerdf-host-' . $i );
	}
	wp_enqueue_style( 'aerdf-hostile', get_stylesheet_directory_uri() . '/hostile.css', $prev, null );
} );

// The Elementor kit class every aerdf.org page carries; the kit's CSS keys on it.
add_filter( 'body_class', function ( $c ) { $c[] = 'elementor-kit-1734'; return $c; } );

// Elementor Pro's Theme Builder draws every team post with template 3899, hooked at about 12.
add_filter( 'template_include', function ( $t ) {
	return is_singular( 'team' ) ? get_stylesheet_directory() . '/single-team.php' : $t;
}, 12 );

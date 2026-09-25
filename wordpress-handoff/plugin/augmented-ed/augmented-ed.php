<?php
/**
 * Plugin Name:       AugmentED
 * Description:       The AugmentED pages, team and Follow form, drawn inside AERDF's own theme: five page templates, AugmentED team members as team posts, bio pages, and a Follow form that submits to HubSpot.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      8.0
 * Author:            AugmentED
 * License:           Proprietary
 * Text Domain:       augmented-ed
 *
 * How this plugin is put together, for whoever maintains it:
 *
 * - generated/ is written by tools/build-wp-plugin.mjs from the AugmentED site's own
 *   export: the page templates, the program bar, the team tile, the bio template, and one
 *   stylesheet scoped to #augmented-ed. Never edit it by hand; regenerate it.
 * - includes/ is the runtime, written by hand: which page is an AugmentED page and which
 *   template draws it (templates.php), where its links point (links.php), what it loads
 *   (assets.php), the team (team.php, importer.php, cli.php), the Follow form's relay to
 *   HubSpot (follow.php), and the settings and tools screens (admin.php).
 * - assets/ is copied in when the plugin is assembled (node tools/build-wp-plugin.mjs
 *   --assemble), and holds exactly the files the pages use.
 *
 * Start with wordpress-handoff/START-HERE.md in the repository.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

const AUGMENTED_ED_VERSION = '1.0.0';
const AUGMENTED_ED_FILE    = __FILE__;
define( 'AUGMENTED_ED_DIR', plugin_dir_path( __FILE__ ) );

/**
 * The page templates, by key. The key is what the generated templates link by
 * (augmented_ed_url( 'team' )), and the labels are what a page's Template menu shows.
 */
const AUGMENTED_ED_TEMPLATES = array(
	'home'      => 'Home',
	'challenge' => 'The Challenge',
	'approach'  => 'Our Approach',
	'team'      => 'Who We Are',
	'follow'    => 'Follow Our Work',
);

/** The settings, one option. See includes/admin.php for each key. */
function augmented_ed_settings() {
	$defaults = array(
		'hubspot_portal'       => '',
		'hubspot_form'         => '',
		'hubspot_token'        => '',
		'hubspot_persona'      => 'augmented_persona',
		'consent_text'         => '',
		'privacy_url'          => '',
		'subscription_type'    => '',
		'offset_px'            => '',
		'offset_selector'      => '',
		'mobile_sticky'        => 1,
		'title_meta_key'       => '',
		'team_shim'            => 0,
	);
	$saved = get_option( 'augmented_ed_settings', array() );
	return array_merge( $defaults, is_array( $saved ) ? $saved : array() );
}

/** A file under generated/data/, decoded. */
function augmented_ed_data( $name ) {
	static $cache = array();
	if ( ! isset( $cache[ $name ] ) ) {
		$file             = AUGMENTED_ED_DIR . 'generated/data/' . $name . '.json';
		$cache[ $name ] = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local file in this plugin.
	}
	return $cache[ $name ];
}

/** Includes a generated partial by name. */
function augmented_ed_partial( $name ) {
	$file = AUGMENTED_ED_DIR . 'generated/templates/partials/' . $name . '.php';
	if ( is_readable( $file ) ) {
		include $file;
	}
}

require_once AUGMENTED_ED_DIR . 'includes/links.php';
require_once AUGMENTED_ED_DIR . 'includes/templates.php';
require_once AUGMENTED_ED_DIR . 'includes/assets.php';
require_once AUGMENTED_ED_DIR . 'includes/team.php';
require_once AUGMENTED_ED_DIR . 'includes/importer.php';
require_once AUGMENTED_ED_DIR . 'includes/follow.php';
require_once AUGMENTED_ED_DIR . 'includes/shim.php';

if ( is_admin() ) {
	require_once AUGMENTED_ED_DIR . 'includes/admin.php';
}
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once AUGMENTED_ED_DIR . 'includes/cli.php';
}

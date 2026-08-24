<?php
/**
 * AugmentED asset loading for a classic WordPress theme.
 *
 * This file registers everything the AugmentED pages need — the design-system
 * stylesheets in their required order, and the three page components — with
 * the loading behavior the handoff specifies: filemtime() cache-busting versions,
 * deferred scripts, and the attributes that tell optimization plugins to leave
 * the component scripts alone.
 *
 * To install it:
 *
 * 1. Copy this file into your theme (for example `inc/augmented-ed-assets.php`)
 *    and require it from functions.php:
 *
 *        require_once get_theme_file_path( 'inc/augmented-ed-assets.php' );
 *
 * 2. Copy the handoff's two asset directories into your theme:
 *
 *        <theme>/augmented/ds/       <- the contents of the _ds/augmented-design-system-… folder
 *        <theme>/augmented/assets/   <- the repository's assets/ directory, verbatim
 *
 *    Deploy them as theme files. Do not upload any of it through the media
 *    library: the components address frames by exact filename, and on this
 *    install WP-Stateless would additionally move uploads to Google Cloud
 *    Storage, where those filenames no longer exist. See "Rules that apply to
 *    every component" in the handoff README.
 *
 * 3. Tell it which pages are AugmentED pages, either by editing
 *    AUGMENTED_ED_PAGES below or from functions.php:
 *
 *        add_filter( 'augmented_ed_is_active', fn( $active ) => is_page( 'augmented' ) );
 *
 * What this file deliberately does not do:
 *
 * - It emits no markup. The component markup, the hero-copy CSS block, and the
 *   cycle-wheel CSS live in your page templates; build them from
 *   wordpress-handoff/pages/ and the specs in wordpress-handoff/sections/.
 * - It does not enqueue the Approach scrub (`approach.js`), which is not
 *   currently mounted on any page. Uncomment the lines below if that section
 *   returns; read wordpress-handoff/sections/approach.md first.
 * - It does not register content types or the Follow form. See "Content" in
 *   the handoff README.
 *
 * @package AugmentED
 */

/** Page slugs this loads on. Override with the augmented_ed_is_active filter. */
const AUGMENTED_ED_PAGES = array( 'augmented', 'challenge', 'approach', 'team', 'follow' );

/** Script handles that must survive optimization plugins untouched. */
const AUGMENTED_ED_PROTECTED_HANDLES = array( 'augmented-hero-bridge', 'augmented-falling-blocks', 'augmented-cycle-wheel' );

/**
 * Whether the current request is an AugmentED page.
 *
 * Everything below is gated on this so the ~150 design-system custom properties
 * and the component scripts never load site-wide on aerdf.org.
 */
function augmented_ed_is_active() {
	return (bool) apply_filters( 'augmented_ed_is_active', is_page( AUGMENTED_ED_PAGES ) );
}

add_action( 'wp_enqueue_scripts', function () {
	if ( ! augmented_ed_is_active() ) {
		return;
	}

	$dir = get_theme_file_path( 'augmented/' );
	$uri = get_theme_file_uri( 'augmented/' );

	// filemtime() as the version: managed hosts and Cloudflare cache static
	// assets far-future, so a re-encode or a stylesheet edit must change the
	// URL or visitors keep the old file until the cache expires.
	$ver = function ( $rel ) use ( $dir ) {
		$abs = $dir . $rel;
		return file_exists( $abs ) ? (string) filemtime( $abs ) : null;
	};

	// The design system: eight files, and the order is a contract — tokens
	// before schemes before base before the component styles. Each file depends
	// on the previous one so WordPress cannot reorder them.
	$ds   = array(
		'tokens/fonts', 'tokens/colors', 'tokens/typography', 'tokens/layout',
		'tokens/icons', 'tokens/schemes', 'tokens/base', 'styles',
	);
	$prev = array();
	foreach ( $ds as $file ) {
		$handle = 'augmented-ds-' . str_replace( '/', '-', $file );
		wp_enqueue_style( $handle, $uri . 'ds/' . $file . '.css', $prev, $ver( 'ds/' . $file . '.css' ) );
		$prev = array( $handle );
	}

	// The components. Every script is defer-safe and order-independent; the two
	// canvas rigs find their frames through the `base` attribute your template
	// sets on the element, never through their own URL, and the cycle wheel
	// touches only the markup you author.
	foreach ( array( 'hero-bridge', 'falling-blocks', 'cycle-wheel' ) as $component ) {
		wp_enqueue_style(
			'augmented-' . $component,
			$uri . 'assets/' . $component . '.css',
			array(),
			$ver( 'assets/' . $component . '.css' )
		);
		wp_enqueue_script(
			'augmented-' . $component,
			$uri . 'assets/' . $component . '.js',
			array(),
			$ver( 'assets/' . $component . '.js' ),
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);
	}

	// The Approach scrub is not currently mounted anywhere. If it returns:
	// wp_enqueue_style( 'augmented-approach', $uri . 'assets/approach.css', array(), $ver( 'assets/approach.css' ) );
	// wp_enqueue_script( 'augmented-approach', $uri . 'assets/approach.js', array(), $ver( 'assets/approach.js' ), array( 'strategy' => 'defer', 'in_footer' => true ) );
} );

/**
 * Optimizer-proofing for the component scripts.
 *
 * "Delay JS until interaction" boots a scroll-scrubbed component mid-scroll,
 * and combine/minify relocates files. WP Engine disallows the page-cache
 * plugins that do most of this, so today these attributes are dormant — they
 * exist so the components survive a future host move or a Cloudflare feature
 * without anyone remembering this rule. Each attribute is the documented
 * opt-out for one plugin family: `nowprocket` (WP Rocket),
 * `data-no-defer` (LiteSpeed Cache), `data-jetpack-boost` (Jetpack Boost).
 */
add_filter( 'script_loader_tag', function ( $tag, $handle ) {
	if ( in_array( $handle, AUGMENTED_ED_PROTECTED_HANDLES, true ) ) {
		$tag = str_replace( ' src=', ' nowprocket data-no-defer="1" data-jetpack-boost="ignore" src=', $tag );
	}
	return $tag;
}, 10, 2 );

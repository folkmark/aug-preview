<?php
/**
 * What an AugmentED page loads, and nothing on any other page.
 *
 * Everything here is gated on augmented_ed_current_template(), so the ~160 design-system
 * custom properties, the fonts and the component scripts never load anywhere else on
 * aerdf.org. And every file is versioned by its modification time: WP Engine and Cloudflare
 * cache static files far into the future, so a re-encode or a stylesheet change has to
 * change the URL or visitors keep the old file.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

/** Script handles that must survive optimisation plugins untouched. */
const AUGMENTED_ED_PROTECTED_HANDLES = array(
	'augmented-ed',
	'augmented-ed-hero-bridge',
	'augmented-ed-falling-blocks',
	'augmented-ed-cycle-wheel',
	'augmented-ed-team-colour',
	'augmented-ed-follow',
);

/** Which component scripts each template uses. */
const AUGMENTED_ED_COMPONENTS = array(
	'home'   => array( 'hero-bridge', 'falling-blocks', 'cycle-wheel' ),
	'team'   => array( 'team-colour' ),
	'follow' => array(),
);

function augmented_ed_version( $rel ) {
	$abs = AUGMENTED_ED_DIR . $rel;
	return file_exists( $abs ) ? (string) filemtime( $abs ) : AUGMENTED_ED_VERSION;
}

add_action(
	'wp_enqueue_scripts',
	function () {
		$key = augmented_ed_current_template();
		if ( null === $key ) {
			return;
		}
		$url = plugins_url( '', AUGMENTED_ED_FILE ) . '/';

		// One stylesheet for every page: the design system, the page's own rules and the
		// components' rules, all scoped to #augmented-ed (generated), then what the plugin
		// knows about the host's CSS (host.css), which must come after it.
		wp_enqueue_style( 'augmented-ed', $url . 'generated/css/augmented-ed.css', array(), augmented_ed_version( 'generated/css/augmented-ed.css' ) );
		wp_enqueue_style( 'augmented-ed-host', $url . 'css/host.css', array( 'augmented-ed' ), augmented_ed_version( 'css/host.css' ) );

		$s = augmented_ed_settings();
		wp_enqueue_script( 'augmented-ed', $url . 'js/augmented-ed.js', array(), augmented_ed_version( 'js/augmented-ed.js' ), array( 'strategy' => 'defer', 'in_footer' => true ) );
		wp_add_inline_script(
			'augmented-ed',
			'window.augmentedEd = ' . wp_json_encode(
				array(
					'offsetPx'       => '' === $s['offset_px'] ? null : (float) $s['offset_px'],
					'offsetSelector' => (string) $s['offset_selector'],
					'mobileSticky'   => (bool) $s['mobile_sticky'],
				)
			) . ';',
			'before'
		);

		foreach ( AUGMENTED_ED_COMPONENTS[ $key ] ?? array() as $component ) {
			wp_enqueue_script( 'augmented-ed-' . $component, $url . 'assets/' . $component . '.js', array(), augmented_ed_version( 'assets/' . $component . '.js' ), array( 'strategy' => 'defer', 'in_footer' => true ) );
		}
		if ( 'follow' === $key ) {
			wp_enqueue_script( 'augmented-ed-follow', $url . 'js/follow-form.js', array(), augmented_ed_version( 'js/follow-form.js' ), array( 'strategy' => 'defer', 'in_footer' => true ) );
		}
	}
);

/**
 * In the head of an AugmentED page: the flag that lets the reveal hide content, and the
 * three font weights every page renders first.
 *
 * aug-js is set here, synchronously, rather than by the deferred script: the reveal hides
 * blocks only once the page knows script is running (css/host.css), so a visitor whose
 * scripts are blocked sees everything, and the flag has to exist before first paint or the
 * blocks flash visible and then vanish.
 */
add_action(
	'wp_head',
	function () {
		if ( null === augmented_ed_current_template() ) {
			return;
		}
		echo "<script>document.documentElement.classList.add('aug-js');</script>\n";
		foreach ( array( 'AvenirLTPro-Light', 'AvenirLTPro-Roman', 'AvenirLTPro-Heavy' ) as $font ) {
			printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( augmented_ed_asset( 'fonts/' . $font . '.woff2' ) ) );
		}
	},
	1
);

/**
 * Optimiser-proofing for the component scripts.
 *
 * "Delay JS until interaction" boots a scroll-scrubbed component mid-scroll, and
 * combine/minify relocates files. None of these run on aerdf.org today (checked 2026-09-25);
 * the attributes are here so the components survive a future host move or a Cloudflare
 * setting without anyone remembering this rule. Each is the documented opt-out for one
 * family: nowprocket (WP Rocket), data-no-defer (LiteSpeed), data-jetpack-boost (Jetpack
 * Boost), data-cfasync="false" (Cloudflare Rocket Loader), data-nitro-exclude (NitroPack,
 * which WP Engine's Page Speed Boost is built on).
 */
add_filter(
	'script_loader_tag',
	function ( $tag, $handle ) {
		if ( in_array( $handle, AUGMENTED_ED_PROTECTED_HANDLES, true ) ) {
			$tag = str_replace( ' src=', ' nowprocket data-no-defer="1" data-jetpack-boost="ignore" data-cfasync="false" data-nitro-exclude src=', $tag );
		}
		return $tag;
	},
	10,
	2
);

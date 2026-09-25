<?php
/**
 * A stand-in `team` post type, for a test install only.
 *
 * aerdf.org registers `team` itself. A fresh WordPress — a local copy, WordPress Playground,
 * this repository's own verification harness — has no such type, and without one there is
 * nothing to import the team into. This registers a plain one, shaped like AERDF's (public,
 * /team/<slug>/, the ordinary category taxonomy), but ONLY when it is switched on (the
 * setting, which Settings → AugmentED shows only outside production, or the
 * AUGMENTED_ED_TEAM_SHIM constant) AND no `team` type exists. On aerdf.org it can never
 * replace the real one, and it says so loudly whenever it is active.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

function augmented_ed_shim_wanted() {
	return ( defined( 'AUGMENTED_ED_TEAM_SHIM' ) && AUGMENTED_ED_TEAM_SHIM ) || ! empty( augmented_ed_settings()['team_shim'] );
}

add_action(
	'init',
	function () {
		if ( ! augmented_ed_shim_wanted() || post_type_exists( augmented_ed_post_type() ) ) {
			return;
		}
		register_post_type(
			augmented_ed_post_type(),
			array(
				'label'        => 'Team (AugmentED test stand-in)',
				'public'       => true,
				'has_archive'  => 'team',
				'rewrite'      => array( 'slug' => 'team' ),
				'supports'     => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
				'taxonomies'   => array( 'category' ),
				'show_in_rest' => false,
			)
		);
		$GLOBALS['augmented_ed_shim_active'] = true;
	},
	99
);

add_action(
	'admin_notices',
	function () {
		if ( ! empty( $GLOBALS['augmented_ed_shim_active'] ) ) {
			echo '<div class="notice notice-warning"><p><strong>AugmentED:</strong> '
				. esc_html__( 'the test stand-in "team" post type is active. This is for test installs only — on aerdf.org the site registers its own team type, and this must be switched off (Settings → AugmentED).', 'augmented-ed' )
				. '</p></div>';
		}
	}
);

<?php
/**
 * Settings → AugmentED, and Tools → AugmentED team.
 *
 * Settings holds the few things only AERDF can supply — the HubSpot form, the privacy
 * policy, AERDF's own job-title field — plus a status panel that says, without anyone
 * reading documentation, whether the install is finished: which page carries each template,
 * how many people are in each group, whether the form is connected.
 *
 * Tools holds the one-time jobs: create the pages, and import the team (dry run first).
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	function () {
		add_options_page( 'AugmentED', 'AugmentED', 'manage_options', 'augmented-ed', 'augmented_ed_settings_page' );
		add_management_page( 'AugmentED team', 'AugmentED team', 'manage_options', 'augmented-ed-team', 'augmented_ed_tools_page' );
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( AUGMENTED_ED_FILE ),
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=augmented-ed' ) ) . '">' . esc_html__( 'Settings', 'augmented-ed' ) . '</a>' );
		return $links;
	}
);

add_action(
	'admin_init',
	function () {
		register_setting(
			'augmented_ed',
			'augmented_ed_settings',
			array(
				'type'              => 'array',
				'sanitize_callback' => 'augmented_ed_sanitize_settings',
			)
		);
	}
);

function augmented_ed_sanitize_settings( $in ) {
	$in  = is_array( $in ) ? $in : array();
	$out = augmented_ed_settings();
	foreach ( array( 'hubspot_portal', 'hubspot_form', 'hubspot_persona', 'consent_text', 'offset_selector', 'title_meta_key' ) as $k ) {
		$out[ $k ] = isset( $in[ $k ] ) ? sanitize_text_field( $in[ $k ] ) : '';
	}
	$out['hubspot_portal']    = preg_replace( '/[^0-9]/', '', $out['hubspot_portal'] );
	$out['hubspot_form']      = preg_replace( '/[^0-9a-f-]/i', '', $out['hubspot_form'] );
	$out['hubspot_token']     = isset( $in['hubspot_token'] ) ? sanitize_text_field( $in['hubspot_token'] ) : '';
	$out['privacy_url']       = isset( $in['privacy_url'] ) ? esc_url_raw( $in['privacy_url'] ) : '';
	$out['subscription_type'] = isset( $in['subscription_type'] ) ? preg_replace( '/[^0-9]/', '', $in['subscription_type'] ) : '';
	$out['offset_px']         = isset( $in['offset_px'] ) && '' !== trim( $in['offset_px'] ) ? (string) (float) $in['offset_px'] : '';
	$out['mobile_sticky']     = empty( $in['mobile_sticky'] ) ? 0 : 1;
	$out['team_shim']         = empty( $in['team_shim'] ) || 'production' === wp_get_environment_type() ? 0 : 1;
	return $out;
}

/** Meta keys already used on team posts: the candidates for AERDF's job-title field. */
function augmented_ed_candidate_title_keys() {
	global $wpdb;
	$keys = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- an admin-only listing, run on demand.
		$wpdb->prepare(
			"SELECT DISTINCT pm.meta_key FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.post_type = %s AND pm.meta_key NOT LIKE %s AND pm.meta_key NOT LIKE %s ORDER BY pm.meta_key LIMIT 100",
			augmented_ed_post_type(),
			$wpdb->esc_like( '_' ) . '%',
			$wpdb->esc_like( 'augmented_ed_' ) . '%'
		)
	);
	return $keys ? $keys : array();
}

function augmented_ed_settings_page() {
	$s     = augmented_ed_settings();
	$field = function ( $key, $label, $help = '', $type = 'text' ) use ( $s ) {
		printf(
			'<tr><th scope="row"><label for="aug-%1$s">%2$s</label></th><td><input class="regular-text" type="%5$s" id="aug-%1$s" name="augmented_ed_settings[%1$s]" value="%3$s"><p class="description">%4$s</p></td></tr>',
			esc_attr( $key ),
			esc_html( $label ),
			esc_attr( (string) $s[ $key ] ),
			wp_kses_post( $help ),
			esc_attr( $type )
		);
	};
	echo '<div class="wrap"><h1>AugmentED</h1>';
	augmented_ed_status_panel();
	echo '<form method="post" action="options.php">';
	settings_fields( 'augmented_ed' );

	echo '<h2>' . esc_html__( 'The Follow form → HubSpot', 'augmented-ed' ) . '</h2><table class="form-table" role="presentation">';
	$field( 'hubspot_portal', 'Portal ID', 'AERDF\'s HubSpot account number (20910033 on aerdf.org today).' );
	$field( 'hubspot_form', 'Form ID', 'The GUID of the HubSpot form that receives submissions. Create it with exactly these fields — firstname, lastname, email, phone, message, and the "which describes you" property named below — and with <strong>CAPTCHA off</strong>: HubSpot rejects every API submission to a form with CAPTCHA on. The plugin has its own spam defences.' );
	$field( 'hubspot_persona', 'Persona property', 'The HubSpot contact property for "Which best describes you?" (internal name). Its options must include: educator, researcher, engineer, administrator, nonprofit, executive, funder, journalist, other.' );
	$field( 'consent_text', 'Consent sentence', 'Shown beside the checkbox and sent to HubSpot as the consent text. Default: "I agree to the privacy policy".' );
	$field( 'privacy_url', 'Privacy policy URL', 'Links the words "privacy policy" in the consent sentence.', 'url' );
	$field( 'subscription_type', 'Subscription type ID', 'Optional. The HubSpot subscription type the consent opts into.' );
	$field( 'hubspot_token', 'Private app token', 'Optional today. Uses HubSpot\'s authenticated endpoint; likely needed after HubSpot ends support for its v3 APIs in September 2027.', 'password' );
	echo '</table>';

	echo '<h2>' . esc_html__( 'Layout', 'augmented-ed' ) . '</h2><table class="form-table" role="presentation">';
	printf(
		'<tr><th scope="row">%s</th><td><label><input type="checkbox" name="augmented_ed_settings[mobile_sticky]" value="1"%s> %s</label></td></tr>',
		esc_html__( 'Program bar on phones', 'augmented-ed' ),
		checked( $s['mobile_sticky'], 1, false ),
		esc_html__( 'Stays at the top while scrolling (as on the AugmentED site). Off: it scrolls away with AERDF\'s header, as Assessment for Good\'s does.', 'augmented-ed' )
	);
	$field( 'offset_selector', 'Also offset by', 'A CSS selector for anything the theme fixes at the top of the screen above the program bar. Empty on aerdf.org today: its header scrolls away.' );
	$field( 'offset_px', 'Offset override (px)', 'Replaces the measured offset. Leave empty.', 'number' );
	echo '</table>';

	echo '<h2>' . esc_html__( 'Team', 'augmented-ed' ) . '</h2><table class="form-table" role="presentation">';
	$keys = augmented_ed_candidate_title_keys();
	echo '<tr><th scope="row"><label for="aug-title-key">' . esc_html__( 'AERDF\'s job-title field', 'augmented-ed' ) . '</label></th><td><select id="aug-title-key" name="augmented_ed_settings[title_meta_key]"><option value="">' . esc_html__( '(none)', 'augmented-ed' ) . '</option>';
	foreach ( array_unique( array_merge( $keys, array_filter( array( $s['title_meta_key'] ) ) ) ) as $k ) {
		echo '<option value="' . esc_attr( $k ) . '"' . selected( $s['title_meta_key'], $k, false ) . '>' . esc_html( $k ) . '</option>';
	}
	echo '</select><p class="description">' . esc_html__( 'The field AERDF\'s own team pages show a job title from. When set, a card with no AugmentED role falls back to it, and the import fills it where it is empty.', 'augmented-ed' ) . '</p></td></tr>';
	if ( 'production' !== wp_get_environment_type() ) {
		printf(
			'<tr><th scope="row">%s</th><td><label><input type="checkbox" name="augmented_ed_settings[team_shim]" value="1"%s> %s</label></td></tr>',
			esc_html__( 'Testing', 'augmented-ed' ),
			checked( $s['team_shim'], 1, false ),
			esc_html__( 'Register a stand-in "team" post type (test installs without AERDF\'s). Never on aerdf.org.', 'augmented-ed' )
		);
	}
	echo '</table>';
	submit_button();
	echo '</form>';

	echo '<h2>' . esc_html__( 'Test the form', 'augmented-ed' ) . '</h2><form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'augmented_ed_test_submit' );
	echo '<input type="hidden" name="action" value="augmented_ed_test_submit"><p>' . esc_html__( 'Sends one real submission to the HubSpot form above, as you, and shows HubSpot\'s answer. It creates or updates your contact in HubSpot.', 'augmented-ed' ) . '</p>';
	submit_button( __( 'Send test submission', 'augmented-ed' ), 'secondary', 'submit', false );
	echo '</form></div>';
}

function augmented_ed_status_panel() {
	$rows = array();
	foreach ( augmented_ed_template_pages( true ) as $key => $ids ) {
		$label = AUGMENTED_ED_TEMPLATES[ $key ];
		if ( ! $ids ) {
			$rows[] = array( 'warning', $label, __( 'No published page uses this template yet.', 'augmented-ed' ) );
		} elseif ( count( $ids ) > 1 ) {
			$rows[] = array( 'warning', $label, __( 'More than one published page uses this template; links go to the oldest.', 'augmented-ed' ) );
		} else {
			$rows[] = array( 'ok', $label, '<a href="' . esc_url( get_permalink( $ids[0] ) ) . '">' . esc_html( get_permalink( $ids[0] ) ) . '</a>' );
		}
	}
	$groups = augmented_ed_group_terms();
	if ( ! $groups ) {
		$rows[] = array( 'warning', __( 'Team', 'augmented-ed' ), __( 'Not imported yet (Tools → AugmentED team).', 'augmented-ed' ) );
	} else {
		foreach ( $groups as $t ) {
			$rows[] = array( 'ok', $t->name, sprintf( _n( '%d person', '%d people', $t->count, 'augmented-ed' ), $t->count ) );
		}
	}
	$s        = augmented_ed_settings();
	$rows[]   = '' !== $s['hubspot_portal'] && '' !== $s['hubspot_form']
		? array( 'ok', __( 'Follow form', 'augmented-ed' ), __( 'Connected to HubSpot. Use "Send test submission" below to prove it.', 'augmented-ed' ) )
		: array( 'warning', __( 'Follow form', 'augmented-ed' ), __( 'Not connected: submissions are refused until a HubSpot portal and form are set below.', 'augmented-ed' ) );
	$assets   = is_readable( AUGMENTED_ED_DIR . 'assets/hero-bridge.js' );
	$rows[]   = $assets ? array( 'ok', __( 'Assets', 'augmented-ed' ), __( 'Present.', 'augmented-ed' ) ) : array( 'warning', __( 'Assets', 'augmented-ed' ), __( 'assets/ is missing — install the assembled zip, not the repository folder.', 'augmented-ed' ) );
	echo '<h2>' . esc_html__( 'Status', 'augmented-ed' ) . '</h2><table class="widefat striped" style="max-width:60rem"><tbody>';
	foreach ( $rows as $r ) {
		printf( '<tr><td style="width:1.5em">%s</td><th scope="row" style="width:14em">%s</th><td>%s</td></tr>', 'ok' === $r[0] ? '✓' : '⚠', esc_html( $r[1] ), wp_kses_post( $r[2] ) );
	}
	echo '</tbody></table>';
}

add_action(
	'admin_post_augmented_ed_test_submit',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Not allowed.' );
		}
		check_admin_referer( 'augmented_ed_test_submit' );
		$user   = wp_get_current_user();
		$names  = augmented_ed_hubspot_names();
		$result = Augmented_ED_HubSpot::submit(
			array(
				$names['firstname'] => $user->first_name ? $user->first_name : $user->display_name,
				$names['lastname']  => $user->last_name ? $user->last_name : 'Test',
				$names['email']     => $user->user_email,
				$names['message']   => 'Test submission from the AugmentED WordPress plugin.',
				$names['persona']   => 'other',
			),
			array(
				'pageUri'  => augmented_ed_url( 'follow' ),
				'pageName' => 'Follow Our Work | AugmentED (test)',
			),
			array( 'text' => augmented_ed_consent_text() )
		);
		set_transient( 'augmented_ed_test_result_' . get_current_user_id(), $result, 300 );
		wp_safe_redirect( admin_url( 'options-general.php?page=augmented-ed&aug_tested=1' ) );
		exit;
	}
);

add_action(
	'admin_notices',
	function () {
		if ( empty( $_GET['aug_tested'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification -- display only.
			return;
		}
		$r = get_transient( 'augmented_ed_test_result_' . get_current_user_id() );
		if ( ! $r ) {
			return;
		}
		printf(
			'<div class="notice notice-%s"><p><strong>%s</strong> %s</p></div>',
			$r['ok'] ? 'success' : 'error',
			esc_html( $r['ok'] ? __( 'HubSpot accepted the test submission.', 'augmented-ed' ) : sprintf( __( 'HubSpot refused the test submission (%d).', 'augmented-ed' ), $r['status'] ) ),
			esc_html( $r['message'] . ( $r['errors'] ? ' ' . wp_json_encode( $r['errors'] ) : '' ) )
		);
	}
);

// ---------------------------------------------------------------- Tools → AugmentED team

function augmented_ed_tools_page() {
	$report  = get_transient( 'augmented_ed_report_' . get_current_user_id() );
	$created = get_transient( 'augmented_ed_created_' . get_current_user_id() );
	delete_transient( 'augmented_ed_report_' . get_current_user_id() );
	delete_transient( 'augmented_ed_created_' . get_current_user_id() );
	$last = get_option( 'augmented_ed_import' );

	echo '<div class="wrap"><h1>' . esc_html__( 'AugmentED team', 'augmented-ed' ) . '</h1>';

	echo '<h2>' . esc_html__( '1. The pages', 'augmented-ed' ) . '</h2><p>' . esc_html__( 'Creates any of the five AugmentED pages that do not exist yet, as drafts, with their templates and Yoast titles: "AugmentED" at /augmented/, and The Challenge, Our Approach, Who We Are and Follow Our Work under it. Nothing is public until you publish them — and publishing /augmented/ replaces the redirect that address has today. Move or rename them freely; the links follow the templates.', 'augmented-ed' ) . '</p>';
	if ( is_array( $created ) ) {
		echo '<div class="notice notice-success inline"><p>' . esc_html( $created ? sprintf( __( 'Created: %s.', 'augmented-ed' ), implode( ', ', array_keys( $created ) ) ) : __( 'Every template already has a page; nothing was created.', 'augmented-ed' ) ) . '</p></div>';
	}
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'augmented_ed_create_pages' );
	echo '<input type="hidden" name="action" value="augmented_ed_create_pages">';
	submit_button( __( 'Create the pages as drafts', 'augmented-ed' ), 'secondary', 'submit', false );
	echo '</form>';

	echo '<h2>' . esc_html__( '2. The team', 'augmented-ed' ) . '</h2><p>' . esc_html__( 'Imports the 29 people as team posts in an "AugmentED Team" category, one child category per Who We Are group. Sherry Lachman and Caitlin Mills already exist and are only attached: their titles, content and photos are left alone. Run a dry run first; running it again later changes only what changed.', 'augmented-ed' ) . '</p>';
	if ( $last ) {
		echo '<p>' . esc_html( sprintf( __( 'Last import: %1$s ago — %2$s.', 'augmented-ed' ), human_time_diff( $last['time'] ), implode( ', ', array_map( function ( $k, $v ) { return "$v $k"; }, array_keys( $last['counts'] ), $last['counts'] ) ) ) ) . '</p>';
	}
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'augmented_ed_import' );
	$key = augmented_ed_settings()['title_meta_key'];
	echo '<input type="hidden" name="action" value="augmented_ed_import"><table class="form-table" role="presentation">'
		. '<tr><th scope="row">' . esc_html__( 'New people are', 'augmented-ed' ) . '</th><td><select name="status"><option value="publish">' . esc_html__( 'Published', 'augmented-ed' ) . '</option><option value="draft">' . esc_html__( 'Drafts', 'augmented-ed' ) . '</option></select></td></tr>'
		. '<tr><th scope="row">' . esc_html__( 'Attach', 'augmented-ed' ) . '</th><td><input class="regular-text" name="attach" placeholder="slug-one, slug-two"><p class="description">' . esc_html__( 'Only if a dry run reports a slug that already exists and you have checked it is the same person.', 'augmented-ed' ) . '</p></td></tr>'
		. '<tr><th scope="row">' . esc_html__( 'Options', 'augmented-ed' ) . '</th><td><label><input type="checkbox" name="overwrite_content" value="1"> ' . esc_html__( 'Replace existing posts\' content with the AugmentED bio', 'augmented-ed' ) . '</label><br><label><input type="checkbox" name="force" value="1"> ' . esc_html__( 'Update cards edited in WordPress since the last import', 'augmented-ed' ) . '</label>'
		. ( $key ? '<br>' . esc_html( sprintf( __( 'Roles are also written to AERDF\'s "%s" field where it is empty.', 'augmented-ed' ), $key ) ) : '' ) . '</td></tr></table>';
	submit_button( __( 'Dry run', 'augmented-ed' ), 'secondary', 'dry_run', false );
	echo ' ';
	submit_button( __( 'Import', 'augmented-ed' ), 'primary', 'import', false );
	echo '</form>';

	if ( is_array( $report ) ) {
		echo '<h2>' . esc_html( $report['dry_run'] ? __( 'Dry run — nothing was changed', 'augmented-ed' ) : __( 'Imported', 'augmented-ed' ) ) . '</h2>';
		foreach ( $report['errors'] as $e ) {
			echo '<div class="notice notice-error inline"><p>' . esc_html( $e ) . '</p></div>';
		}
		if ( $report['counts'] ) {
			echo '<p><strong>' . esc_html( implode( ', ', array_map( function ( $k, $v ) { return "$v $k"; }, array_keys( $report['counts'] ), $report['counts'] ) ) ) . '</strong></p>';
		}
		echo '<table class="widefat striped" style="max-width:60rem"><thead><tr><th>' . esc_html__( 'Person', 'augmented-ed' ) . '</th><th>' . esc_html__( 'Action', 'augmented-ed' ) . '</th><th>' . esc_html__( 'Detail', 'augmented-ed' ) . '</th></tr></thead><tbody>';
		foreach ( $report['terms'] as $slug => $what ) {
			printf( '<tr><td>%s</td><td>%s</td><td>%s</td></tr>', esc_html( $slug ), esc_html( $what ), esc_html__( 'category', 'augmented-ed' ) );
		}
		foreach ( $report['people'] as $slug => $row ) {
			printf( '<tr><td>%s</td><td>%s</td><td>%s</td></tr>', esc_html( $slug ), esc_html( $row[0] ), esc_html( $row[1] ) );
		}
		echo '</tbody></table>';
	}
	echo '</div>';
}

add_action(
	'admin_post_augmented_ed_import',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Not allowed.' );
		}
		check_admin_referer( 'augmented_ed_import' );
		$attach = isset( $_POST['attach'] ) ? array_filter( array_map( 'trim', explode( ',', sanitize_text_field( wp_unslash( $_POST['attach'] ) ) ) ) ) : array();
		$report = augmented_ed_import_team(
			array(
				'dry_run'           => isset( $_POST['dry_run'] ),
				'status'            => isset( $_POST['status'] ) ? sanitize_key( wp_unslash( $_POST['status'] ) ) : 'publish',
				'overwrite_content' => ! empty( $_POST['overwrite_content'] ),
				'attach'            => $attach,
				'title_meta_key'    => augmented_ed_settings()['title_meta_key'],
				'force'             => ! empty( $_POST['force'] ),
			)
		);
		set_transient( 'augmented_ed_report_' . get_current_user_id(), $report, 600 );
		wp_safe_redirect( admin_url( 'tools.php?page=augmented-ed-team' ) );
		exit;
	}
);

add_action(
	'admin_post_augmented_ed_create_pages',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Not allowed.' );
		}
		check_admin_referer( 'augmented_ed_create_pages' );
		set_transient( 'augmented_ed_created_' . get_current_user_id(), augmented_ed_create_pages(), 600 );
		wp_safe_redirect( admin_url( 'tools.php?page=augmented-ed-team' ) );
		exit;
	}
);

<?php
/**
 * Every Follow sign-up, kept in WordPress as well as sent to HubSpot.
 *
 * Until 1.1.7 the form had one destination. With no HubSpot form set, or with HubSpot down
 * or refusing the form, the visitor was told "Sorry — that did not go through" and what
 * they typed was gone. The pages went live on aerdf.org in October 2026 before AERDF's
 * HubSpot form existed, so for that stretch every sign-up would have been lost. Now each
 * valid sign-up is saved here first, and HubSpot, when it is set, gets it as before. A
 * sign-up that is safely saved is thanked, whatever HubSpot said, because it is no longer
 * at risk; the record shows whether HubSpot has it.
 *
 * The records are private: no front end, no REST route, no search, and only administrators
 * (manage_options) can see them, under Tools → Follow sign-ups. They are kept when the plugin
 * is removed, like the team posts (see uninstall.php): they are people's details AERDF is
 * holding, and deleting a plugin is not a decision to delete them. They answer WordPress's
 * own personal-data export and erase requests by email address (Tools → Export / Erase
 * Personal Data), which is how AERDF deletes one person's.
 *
 * Settings → AugmentED → "Email each sign-up to" sends a plain notification for each one,
 * so the AugmentED team sees them without a WordPress login. A CSV of all of them is on the
 * list screen.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

const AUGMENTED_ED_SIGNUP = 'augmented_ed_signup';

/** The stored fields, in column order: meta key suffix => label. */
function augmented_ed_signup_fields() {
	return array(
		'firstname' => __( 'First name', 'augmented-ed' ),
		'lastname'  => __( 'Last name', 'augmented-ed' ),
		'email'     => __( 'Email', 'augmented-ed' ),
		'phone'     => __( 'Phone', 'augmented-ed' ),
		'persona'   => __( 'Which best describes you?', 'augmented-ed' ),
		'message'   => __( 'Message', 'augmented-ed' ),
		'consent'   => __( 'Consent', 'augmented-ed' ),
		'hubspot'   => __( 'HubSpot', 'augmented-ed' ),
	);
}

add_action(
	'init',
	function () {
		// Every capability maps to manage_options, and nobody can add one by hand: a record is
		// what a visitor sent, and an editable one would stop being evidence of that.
		$cap = 'manage_options';
		register_post_type(
			AUGMENTED_ED_SIGNUP,
			array(
				'labels'              => array(
					'name'          => __( 'Follow sign-ups', 'augmented-ed' ),
					'singular_name' => __( 'Follow sign-up', 'augmented-ed' ),
					'menu_name'     => __( 'Follow sign-ups', 'augmented-ed' ),
					'all_items'     => __( 'Follow sign-ups', 'augmented-ed' ),
					'search_items'  => __( 'Search sign-ups', 'augmented-ed' ),
					'not_found'     => __( 'No sign-ups yet.', 'augmented-ed' ),
					'edit_item'     => __( 'Follow sign-up', 'augmented-ed' ),
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_in_rest'        => false,
				'show_in_nav_menus'   => false,
				'show_ui'             => true,
				'show_in_menu'        => 'tools.php',
				'rewrite'             => false,
				'query_var'           => false,
				'supports'            => array( 'title' ),
				'map_meta_cap'        => false,
				'capabilities'        => array(
					'create_posts'           => 'do_not_allow',
					'edit_post'              => $cap,
					'read_post'              => $cap,
					'delete_post'            => $cap,
					'edit_posts'             => $cap,
					'edit_others_posts'      => $cap,
					'edit_private_posts'     => $cap,
					'edit_published_posts'   => $cap,
					'publish_posts'          => $cap,
					'read_private_posts'     => $cap,
					'delete_posts'           => $cap,
					'delete_others_posts'    => $cap,
					'delete_private_posts'   => $cap,
					'delete_published_posts' => $cap,
				),
			)
		);
	}
);

/**
 * Saves one sign-up, already validated and sanitised by the form handler.
 *
 * @param array $values Our field names => values (firstname, lastname, email, …, consent).
 * @return int The record's ID, or 0 if it could not be saved.
 */
function augmented_ed_signup_store( $values ) {
	$meta = array( '_augmented_ed_hubspot' => 'pending' );
	foreach ( array_keys( augmented_ed_signup_fields() ) as $k ) {
		if ( 'hubspot' !== $k && 'consent' !== $k ) {
			$meta[ '_augmented_ed_' . $k ] = (string) ( $values[ $k ] ?? '' );
		}
	}
	// The sentence they agreed to, as it read when they agreed: the setting can change later.
	$meta['_augmented_ed_consent'] = ! empty( $values['consent'] ) ? augmented_ed_consent_text() : '';
	// Slashed because wp_insert_post() and the meta API unslash what they are given, and the
	// form handler has already unslashed $_POST: without this a backslash a visitor typed
	// ("C:\path") would be stripped from their message.
	$id = wp_insert_post(
		wp_slash(
			array(
				'post_type'   => AUGMENTED_ED_SIGNUP,
				'post_status' => 'private',
				'post_title'  => trim( ( $values['firstname'] ?? '' ) . ' ' . ( $values['lastname'] ?? '' ) ),
				'meta_input'  => $meta,
			)
		),
		true
	);
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/** Records what HubSpot said about a saved sign-up. */
function augmented_ed_signup_hubspot( $id, $result ) {
	if ( ! $id ) {
		return;
	}
	update_post_meta( $id, '_augmented_ed_hubspot', $result['ok'] ? 'sent' : 'not sent' );
	update_post_meta( $id, '_augmented_ed_hubspot_note', wp_slash( $result['ok'] ? '' : trim( $result['status'] . ' ' . $result['message'] ) ) );
}

/** The persona's label as the visitor saw it, from the form's own options. */
function augmented_ed_signup_persona_label( $value ) {
	foreach ( (array) ( augmented_ed_data( 'form' )['fields'] ?? array() ) as $f ) {
		foreach ( (array) ( $f['options'] ?? array() ) as $o ) {
			if ( 'persona' === $f['name'] && ( $o['value'] ?? '' ) === $value ) {
				return (string) $o['label'];
			}
		}
	}
	return (string) $value;
}

/** One record's fields as label => text, for the notification, the edit screen and exports. */
function augmented_ed_signup_row( $id ) {
	$row = array();
	foreach ( augmented_ed_signup_fields() as $k => $label ) {
		$v = (string) get_post_meta( $id, '_augmented_ed_' . $k, true );
		if ( 'persona' === $k ) {
			$v = augmented_ed_signup_persona_label( $v );
		} elseif ( 'consent' === $k ) {
			$v = '' !== $v ? sprintf( /* translators: %s: the consent sentence. */ __( 'Agreed: "%s"', 'augmented-ed' ), $v ) : __( 'Not given', 'augmented-ed' );
		} elseif ( 'hubspot' === $k ) {
			$note = (string) get_post_meta( $id, '_augmented_ed_hubspot_note', true );
			$v   .= '' !== $note ? ' (' . $note . ')' : '';
		}
		$row[ $label ] = $v;
	}
	return $row;
}

/** The notification addresses from Settings, valid ones only. */
function augmented_ed_signup_recipients() {
	return array_values( array_filter( array_map( 'sanitize_email', preg_split( '/[\s,;]+/', (string) augmented_ed_settings()['notify_email'] ) ) ) );
}

/** Emails a saved sign-up to the addresses in Settings, if any. */
function augmented_ed_signup_notify( $id ) {
	$to = augmented_ed_signup_recipients();
	if ( ! $id || ! $to ) {
		return;
	}
	$row   = augmented_ed_signup_row( $id );
	$lines = array();
	foreach ( $row as $label => $v ) {
		if ( '' !== $v ) {
			$lines[] = $label . ': ' . $v;
		}
	}
	$lines[] = '';
	$lines[] = __( 'Every sign-up:', 'augmented-ed' ) . ' ' . admin_url( 'edit.php?post_type=' . AUGMENTED_ED_SIGNUP );
	$email   = (string) get_post_meta( $id, '_augmented_ed_email', true );
	wp_mail(
		$to,
		/* translators: %s: the person's name. */
		sprintf( __( 'New AugmentED sign-up: %s', 'augmented-ed' ), get_the_title( $id ) ),
		implode( "\n", $lines ),
		is_email( $email ) ? array( 'Reply-To: ' . $email ) : array()
	);
}

// The list: who, how to reach them, what they said they are, and whether HubSpot has them.
add_filter(
	'manage_' . AUGMENTED_ED_SIGNUP . '_posts_columns',
	function () {
		return array(
			'cb'                   => '<input type="checkbox">',
			'title'                => __( 'Name', 'augmented-ed' ),
			'augmented_ed_email'   => __( 'Email', 'augmented-ed' ),
			'augmented_ed_persona' => __( 'Describes them', 'augmented-ed' ),
			'augmented_ed_hubspot' => __( 'HubSpot', 'augmented-ed' ),
			'date'                 => __( 'Date', 'augmented-ed' ),
		);
	}
);
add_action(
	'manage_' . AUGMENTED_ED_SIGNUP . '_posts_custom_column',
	function ( $column, $id ) {
		if ( 'augmented_ed_email' === $column ) {
			$email = (string) get_post_meta( $id, '_augmented_ed_email', true );
			echo '<a href="' . esc_url( 'mailto:' . $email ) . '">' . esc_html( $email ) . '</a>';
		} elseif ( 'augmented_ed_persona' === $column ) {
			echo esc_html( augmented_ed_signup_persona_label( (string) get_post_meta( $id, '_augmented_ed_persona', true ) ) );
		} elseif ( 'augmented_ed_hubspot' === $column ) {
			echo esc_html( (string) get_post_meta( $id, '_augmented_ed_hubspot', true ) );
		}
	},
	10,
	2
);

// The record itself, read-only: the title is the only field WordPress would let anyone type
// into, and the box below is what the visitor sent.
add_action(
	'add_meta_boxes_' . AUGMENTED_ED_SIGNUP,
	function () {
		remove_meta_box( 'submitdiv', AUGMENTED_ED_SIGNUP, 'side' );
		add_meta_box(
			'augmented-ed-signup',
			__( 'What they sent', 'augmented-ed' ),
			function ( $post ) {
				echo '<table class="form-table" role="presentation"><tbody>';
				foreach ( augmented_ed_signup_row( $post->ID ) as $label => $v ) {
					printf( '<tr><th scope="row">%s</th><td style="white-space:pre-wrap">%s</td></tr>', esc_html( $label ), esc_html( $v ) );
				}
				printf( '<tr><th scope="row">%s</th><td>%s</td></tr>', esc_html__( 'Received', 'augmented-ed' ), esc_html( get_the_date( 'j F Y, H:i', $post ) ) );
				echo '</tbody></table>';
			},
			AUGMENTED_ED_SIGNUP,
			'normal',
			'high'
		);
	}
);

// The CSV download, beside the list's filters.
add_action(
	'manage_posts_extra_tablenav',
	function ( $which ) {
		$screen = get_current_screen();
		if ( 'top' !== $which || ! $screen || AUGMENTED_ED_SIGNUP !== $screen->post_type ) {
			return;
		}
		printf(
			'<div class="alignleft actions"><a class="button" href="%s">%s</a></div>',
			esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=augmented_ed_signups_csv' ), 'augmented_ed_signups_csv' ) ),
			esc_html__( 'Download all as CSV', 'augmented-ed' )
		);
	}
);

add_action(
	'admin_post_augmented_ed_signups_csv',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Not allowed.' );
		}
		check_admin_referer( 'augmented_ed_signups_csv' );
		$ids = get_posts(
			array(
				'post_type'   => AUGMENTED_ED_SIGNUP,
				'post_status' => 'private',
				'numberposts' => -1,
				'orderby'     => 'date',
				'order'       => 'ASC',
				'fields'      => 'ids',
			)
		);
		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="augmented-follow-signups-' . gmdate( 'Y-m-d' ) . '.csv"' );
		$out = fopen( 'php://output', 'w' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen -- streaming the download.
		fwrite( $out, "\xEF\xBB\xBF" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- a BOM, so Excel reads the file as UTF-8.
		fputcsv( $out, array_merge( array( __( 'Received', 'augmented-ed' ) ), array_values( augmented_ed_signup_fields() ) ) );
		foreach ( $ids as $id ) {
			// A cell a spreadsheet would run as a formula (=, +, -, @) is written as text: the
			// values are what strangers typed into a public form.
			$cells = array_map(
				function ( $v ) {
					return preg_match( '/^[=+\-@\t\r]/', $v ) ? "'" . $v : $v;
				},
				array_merge( array( get_the_date( 'Y-m-d H:i', $id ) ), array_values( augmented_ed_signup_row( $id ) ) )
			);
			fputcsv( $out, $cells );
		}
		fclose( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
		exit;
	}
);

/** The records whose email is this address. */
function augmented_ed_signups_for( $email ) {
	return get_posts(
		array(
			'post_type'   => AUGMENTED_ED_SIGNUP,
			'post_status' => 'private',
			'numberposts' => -1,
			'fields'      => 'ids',
			'meta_key'    => '_augmented_ed_email', // phpcs:ignore WordPress.DB.SlowDBQuery -- a privacy request, run on demand.
			'meta_value'  => $email, // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
}

add_filter(
	'wp_privacy_personal_data_exporters',
	function ( $exporters ) {
		$exporters['augmented-ed-signups'] = array(
			'exporter_friendly_name' => __( 'AugmentED Follow sign-ups', 'augmented-ed' ),
			'callback'               => function ( $email ) {
				$data = array();
				foreach ( augmented_ed_signups_for( $email ) as $id ) {
					$items = array();
					foreach ( augmented_ed_signup_row( $id ) as $label => $v ) {
						$items[] = array( 'name' => $label, 'value' => $v );
					}
					$data[] = array(
						'group_id'    => 'augmented-ed-signups',
						'group_label' => __( 'AugmentED Follow sign-ups', 'augmented-ed' ),
						'item_id'     => 'augmented-ed-signup-' . $id,
						'data'        => $items,
					);
				}
				return array( 'data' => $data, 'done' => true );
			},
		);
		return $exporters;
	}
);

add_filter(
	'wp_privacy_personal_data_erasers',
	function ( $erasers ) {
		$erasers['augmented-ed-signups'] = array(
			'eraser_friendly_name' => __( 'AugmentED Follow sign-ups', 'augmented-ed' ),
			'callback'             => function ( $email ) {
				$removed = false;
				foreach ( augmented_ed_signups_for( $email ) as $id ) {
					$removed = (bool) wp_delete_post( $id, true ) || $removed;
				}
				return array( 'items_removed' => $removed, 'items_retained' => false, 'messages' => array(), 'done' => true );
			},
		);
		return $erasers;
	}
);

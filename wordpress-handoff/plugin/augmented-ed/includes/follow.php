<?php
/**
 * The Follow form's relay to HubSpot.
 *
 * Every form on aerdf.org submits to AERDF's HubSpot account, and this one does too — but
 * through the server, never from the browser straight to HubSpot, for two reasons:
 *
 * - HubSpot ends support for its v1-v3 APIs in September 2027 (developer changelog,
 *   2026-09-15), and the submission endpoint used today is a v3 one. With the call here, the
 *   migration is one class (Augmented_ED_HubSpot) rather than a script in every visitor's
 *   browser, and the date-versioned replacement may want a private-app token, which only a
 *   server can hold.
 * - A visitor with an ad blocker that stops api.hsforms.com still gets through, and a
 *   visitor with no JavaScript gets a real form post and a real answer.
 *
 * The form posts to admin-post.php. With script, js/follow-form.js sends the same POST with
 * Accept: application/json and shows the answer in place; without, this answers with a 303
 * back to the page and a status in the query string.
 *
 * There is NO NONCE, on purpose: WP Engine caches the Follow page, so a nonce printed into it
 * would be stale for most visitors and every submission would fail. The defences are the
 * honeypot field, a minimum time on the form (measured by the browser), and a per-address
 * rate limit.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

/**
 * The HubSpot call, and the only place that knows HubSpot's API.
 */
class Augmented_ED_HubSpot {

	/**
	 * Submits one form submission.
	 *
	 * @param array $fields  Field name => value, in HubSpot's names.
	 * @param array $context pageUri, pageName, ipAddress.
	 * @param array $consent null, or text => the consent sentence the visitor agreed to.
	 * @return array ok (bool), status (int), errors (HubSpot field name => message), message.
	 */
	public static function submit( $fields, $context, $consent = null ) {
		$s = augmented_ed_settings();
		if ( '' === $s['hubspot_portal'] || '' === $s['hubspot_form'] ) {
			return array( 'ok' => false, 'status' => 0, 'errors' => array(), 'message' => 'HubSpot is not configured (Settings → AugmentED).' );
		}
		$payload = array(
			'submittedAt' => (string) ( time() * 1000 ),
			'fields'      => array(),
			'context'     => array_filter( $context ),
		);
		foreach ( $fields as $name => $value ) {
			if ( '' !== (string) $value ) {
				$payload['fields'][] = array(
					'objectTypeId' => '0-1',
					'name'         => $name,
					'value'        => (string) $value,
				);
			}
		}
		if ( $consent ) {
			$payload['legalConsentOptions'] = array(
				'consent' => array_filter(
					array(
						'consentToProcess' => true,
						'text'             => $consent['text'],
						'communications'   => '' !== $s['subscription_type'] ? array(
							array(
								'value'              => true,
								'subscriptionTypeId' => (int) $s['subscription_type'],
								'text'               => $consent['text'],
							),
						) : null,
					)
				),
			);
		}
		// The authenticated variant of the same endpoint when a private-app token is set,
		// the public one otherwise. Both are v3; see the class comment for 2027.
		$token = trim( (string) $s['hubspot_token'] );
		$base  = $token ? 'https://api.hsforms.com/submissions/v3/integration/secure/submit/' : 'https://api.hsforms.com/submissions/v3/integration/submit/';
		$url   = (string) apply_filters( 'augmented_ed_hubspot_endpoint', $base . rawurlencode( $s['hubspot_portal'] ) . '/' . rawurlencode( $s['hubspot_form'] ), $s );
		$res   = wp_remote_post(
			$url,
			array(
				'timeout' => 15,
				'headers' => array_filter(
					array(
						'Content-Type'  => 'application/json',
						'Authorization' => $token ? 'Bearer ' . $token : null,
					)
				),
				'body'    => wp_json_encode( $payload ),
			)
		);
		if ( is_wp_error( $res ) ) {
			return array( 'ok' => false, 'status' => 0, 'errors' => array(), 'message' => $res->get_error_message() );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		$body = json_decode( (string) wp_remote_retrieve_body( $res ), true );
		if ( $code >= 200 && $code < 300 ) {
			return array( 'ok' => true, 'status' => $code, 'errors' => array(), 'message' => (string) ( $body['inlineMessage'] ?? '' ) );
		}
		// HubSpot names the field in each error ("...fields.email: ..."), which maps back
		// to ours; FIELD_NOT_IN_FORM_DEFINITION means AERDF's form lacks one of our fields.
		$errors = array();
		foreach ( (array) ( $body['errors'] ?? array() ) as $e ) {
			if ( preg_match( '/fields\.([a-z0-9_]+)/i', (string) ( $e['message'] ?? '' ), $m ) ) {
				$errors[ $m[1] ] = (string) ( $e['errorType'] ?? 'INVALID' );
			}
		}
		return array( 'ok' => false, 'status' => $code, 'errors' => $errors, 'message' => (string) ( $body['message'] ?? 'HubSpot rejected the submission.' ) );
	}
}

/** Our field name => HubSpot's contact property name. */
function augmented_ed_hubspot_names() {
	$s = augmented_ed_settings();
	return (array) apply_filters(
		'augmented_ed_hubspot_fields',
		array(
			'firstname' => 'firstname',
			'lastname'  => 'lastname',
			'email'     => 'email',
			'phone'     => 'phone',
			'message'   => 'message',
			'persona'   => '' !== $s['hubspot_persona'] ? $s['hubspot_persona'] : 'augmented_persona',
		)
	);
}

/** The consent sentence as plain text, and as HTML with the privacy policy linked. */
function augmented_ed_consent_text() {
	$s = augmented_ed_settings();
	return '' !== trim( (string) $s['consent_text'] ) ? (string) $s['consent_text'] : 'I agree to the privacy policy';
}
function augmented_ed_consent_label() {
	$text = esc_html( augmented_ed_consent_text() );
	$url  = augmented_ed_settings()['privacy_url'];
	if ( $url && false !== stripos( $text, 'privacy policy' ) ) {
		$text = preg_replace( '/privacy policy/i', '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener" style="text-decoration: underline;">$0</a>', $text, 1 );
	}
	return $text;
}

/** What the no-script visitor sees after the redirect back. */
function augmented_ed_follow_messages() {
	return array(
		'ok'      => __( 'Thank you — you are on the list. We will be in touch with updates on our work.', 'augmented-ed' ),
		'invalid' => __( 'Please fill in the required fields and try again.', 'augmented-ed' ),
		'error'   => __( 'Sorry — that did not go through. Please try again in a moment.', 'augmented-ed' ),
		'busy'    => __( 'Too many attempts from here. Please try again in a few minutes.', 'augmented-ed' ),
	);
}
function augmented_ed_follow_notice() {
	$key = isset( $_GET['aug_follow'] ) ? sanitize_key( wp_unslash( $_GET['aug_follow'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification -- a display flag, nothing is changed.
	$all = augmented_ed_follow_messages();
	return isset( $all[ $key ] ) ? esc_html( $all[ $key ] ) : '';
}

/** The visitor's address, for the rate limit and HubSpot's context. */
function augmented_ed_client_ip() {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	// Behind Cloudflare the connecting address is Cloudflare's; it passes the visitor's.
	if ( isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
		$ip = sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ) );
	}
	return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '';
}

function augmented_ed_follow_handle() {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- no nonce on purpose; see the file comment.
	$json    = isset( $_SERVER['HTTP_ACCEPT'] ) && false !== strpos( sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT'] ) ), 'application/json' );
	$back    = wp_get_referer() ? wp_get_referer() : augmented_ed_url( 'follow' );
	$respond = function ( $code, $extra = array() ) use ( $json, $back ) {
		$messages = augmented_ed_follow_messages();
		if ( $json ) {
			wp_send_json( array_merge( array( 'ok' => 'ok' === $code, 'code' => $code, 'message' => $messages[ $code ] ?? '' ), $extra ), 'ok' === $code ? 200 : ( 'busy' === $code ? 429 : 400 ) );
		}
		wp_safe_redirect( add_query_arg( 'aug_follow', $code, remove_query_arg( 'aug_follow', $back ) ) . '#aug-follow-status', 303 );
		exit;
	};

	// A filled honeypot or a form sent faster than a person can type: answer as if it
	// worked, and send nothing. Telling a bot it was caught only teaches it.
	//
	// The time is a DURATION the browser measured on its own clock (js/follow-form.js), not
	// a start time held up against this server's. That comparison lost real sign-ups: a
	// visitor whose device clock ran ahead of the server's appeared to have sent the form
	// before opening it, was taken for a bot, was thanked, and was never sent to HubSpot.
	// Empty without JavaScript, and then there is no time to judge.
	$elapsed = isset( $_POST['aug_elapsed'] ) && '' !== $_POST['aug_elapsed'] ? (int) $_POST['aug_elapsed'] : -1;
	if ( ! empty( $_POST['aug_website'] ) || ( $elapsed >= 0 && $elapsed < 3000 ) ) {
		$respond( 'ok' );
	}

	$ip  = augmented_ed_client_ip();
	$key = 'augmented_ed_rl_' . md5( $ip );
	$n   = (int) get_transient( $key );
	if ( $n >= 5 ) {
		$respond( 'busy' );
	}
	set_transient( $key, $n + 1, 10 * MINUTE_IN_SECONDS );

	$spec   = augmented_ed_data( 'form' );
	$values = array();
	$bad    = array();
	foreach ( (array) ( $spec['fields'] ?? array() ) as $f ) {
		$name = $f['name'];
		$raw  = isset( $_POST[ $name ] ) ? wp_unslash( $_POST[ $name ] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitised per field below.
		$v    = 'message' === $name ? sanitize_textarea_field( $raw ) : sanitize_text_field( $raw );
		if ( 'email' === $name && '' !== $v && ! is_email( $v ) ) {
			$bad[] = $name;
		}
		if ( 'persona' === $name && '' !== $v && ! in_array( $v, wp_list_pluck( $f['options'] ?? array(), 'value' ), true ) ) {
			$v = '';
		}
		if ( ! empty( $f['required'] ) && '' === $v ) {
			$bad[] = $name;
		}
		$values[ $name ] = $v;
	}
	if ( $bad ) {
		$respond( 'invalid', array( 'fields' => array_values( array_unique( $bad ) ) ) );
	}

	$names  = augmented_ed_hubspot_names();
	$fields = array();
	foreach ( $names as $ours => $theirs ) {
		if ( isset( $values[ $ours ] ) && '' !== $theirs ) {
			$fields[ $theirs ] = $values[ $ours ];
		}
	}
	$result = Augmented_ED_HubSpot::submit(
		$fields,
		array(
			'pageUri'   => $back,
			'pageName'  => 'Follow Our Work | AugmentED',
			'ipAddress' => $ip,
		),
		! empty( $values['consent'] ) ? array( 'text' => augmented_ed_consent_text() ) : null
	);
	if ( ! $result['ok'] ) {
		// Logged for whoever maintains the site; the visitor gets the generic message.
		error_log( 'AugmentED Follow form: HubSpot said ' . $result['status'] . ' ' . $result['message'] . ' ' . wp_json_encode( $result['errors'] ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions
		$ours = array_search( key( $result['errors'] ), $names, true );
		$respond( $result['errors'] ? 'invalid' : 'error', $ours ? array( 'fields' => array( $ours ) ) : array() );
	}
	$respond( 'ok' );
	// phpcs:enable
}
add_action( 'admin_post_nopriv_augmented_ed_follow', 'augmented_ed_follow_handle' );
add_action( 'admin_post_augmented_ed_follow', 'augmented_ed_follow_handle' );

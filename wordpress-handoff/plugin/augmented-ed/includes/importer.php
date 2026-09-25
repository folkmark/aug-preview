<?php
/**
 * The team import: generated/data/team.json into team posts, safely, as often as needed.
 *
 * The engine behind both Tools → AugmentED team and `wp augmented-ed team import`. What it
 * will and will not do, because it runs against a live site with 199 other people in the
 * same post type:
 *
 * - It creates the "AugmentED Team" category and one child per Who We Are group, and puts
 *   each person in their group. It matches people by slug, and only by slug.
 * - A new person becomes a new team post, with the bio as its content.
 * - An EXISTING post is only attached: it gains the AugmentED categories and the plugin's
 *   card fields. Its title, slug, status and featured image are never touched, and its
 *   content only when it is empty or --overwrite-content is given. Sherry Lachman and
 *   Caitlin Mills are expected to exist already (AERDF's own leadership).
 * - Any OTHER slug that already exists stops the import, unless it is named in --attach.
 *   A different person who happens to share a name must never be merged into ours.
 * - A post whose card fields an editor has changed since the last import is skipped,
 *   unless --force. The import never undoes work done in WordPress.
 * - It never deletes anything, and a second run with nothing changed changes nothing.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

/** The card fields, as the import writes them from one person's record. */
function augmented_ed_import_meta( $p ) {
	return array(
		'augmented_ed_role'        => (string) $p['role'],
		'augmented_ed_affiliation' => (string) $p['affiliation'],
		'augmented_ed_location'    => (string) $p['location'],
		'augmented_ed_linkedin'    => (string) $p['linkedin'],
		'augmented_ed_website'     => (string) $p['website'],
		'augmented_ed_sort'        => (string) $p['sort'],
		'augmented_ed_photo'       => (string) $p['photo'],
	);
}

function augmented_ed_meta_hash( $post_id ) {
	$now = array();
	foreach ( array_keys( augmented_ed_import_meta( array_fill_keys( array( 'role', 'affiliation', 'location', 'linkedin', 'website', 'sort', 'photo' ), '' ) ) ) as $key ) {
		$now[ $key ] = (string) get_post_meta( $post_id, $key, true );
	}
	return md5( (string) wp_json_encode( $now ) );
}

/** The bio as post content: the paragraphs, escaped, as the block editor would store them. */
function augmented_ed_bio_html( $bio ) {
	if ( empty( $bio['paragraphs'] ) ) {
		return '';
	}
	return implode(
		"\n\n",
		array_map(
			function ( $t ) {
				return '<p>' . esc_html( $t ) . '</p>';
			},
			$bio['paragraphs']
		)
	);
}

/**
 * Runs the import.
 *
 * @param array $args {
 *     @type bool     $dry_run           Report only; write nothing.
 *     @type string   $status            Status for NEW posts: 'publish' (default) or 'draft'.
 *     @type bool     $overwrite_content Replace existing posts' content with the bio.
 *     @type string[] $attach            Slugs that may be attached although not expected.
 *     @type string   $title_meta_key    The site's own job-title field, filled when empty.
 *     @type bool     $force             Update posts edited in WordPress since import.
 * }
 * @return array Report: 'terms', 'people' (slug => [action, note]), 'counts', 'errors'.
 */
function augmented_ed_import_team( $args = array() ) {
	$args   = wp_parse_args(
		$args,
		array(
			'dry_run'           => false,
			'status'            => 'publish',
			'overwrite_content' => false,
			'attach'            => array(),
			'title_meta_key'    => '',
			'force'             => false,
		)
	);
	$data   = augmented_ed_data( 'team' );
	$type   = augmented_ed_post_type();
	$report = array(
		'dry_run' => (bool) $args['dry_run'],
		'terms'   => array(),
		'people'  => array(),
		'counts'  => array(),
		'errors'  => array(),
	);
	if ( ! $data ) {
		$report['errors'][] = 'generated/data/team.json is missing or unreadable.';
		return $report;
	}
	if ( ! post_type_exists( $type ) ) {
		$report['errors'][] = sprintf( 'There is no "%s" post type on this site. On aerdf.org it is registered by the site; for a test install, turn on the testing shim in Settings → AugmentED.', $type );
		return $report;
	}
	$status = 'draft' === $args['status'] ? 'draft' : 'publish';
	$attach = array_map( 'sanitize_title', (array) $args['attach'] );

	// Refuse before writing anything: every unexpected existing slug, in one message.
	$unexpected = array();
	$found      = array();
	foreach ( $data['people'] as $p ) {
		$existing = get_posts(
			array(
				'post_type'        => $type,
				'name'             => $p['slug'],
				'post_status'      => 'any',
				'numberposts'      => 1,
				'suppress_filters' => true,
			)
		);
		if ( $existing ) {
			$found[ $p['slug'] ] = $existing[0];
			$already_ours        = (bool) get_post_meta( $existing[0]->ID, '_augmented_ed_import_hash', true );
			if ( ! $already_ours && ! in_array( $p['slug'], $data['existing'], true ) && ! in_array( $p['slug'], $attach, true ) ) {
				$unexpected[] = $p['slug'];
			}
		}
	}
	if ( $unexpected ) {
		$report['errors'][] = sprintf(
			'These slugs already belong to team posts that are not AugmentED\'s: %s. Check each is the same person, then run again with them listed under "Attach" (--attach=%s). Nothing was changed.',
			implode( ', ', $unexpected ),
			implode( ',', $unexpected )
		);
		return $report;
	}

	// The categories.
	$term_ids = array();
	$parent   = get_term_by( 'slug', $data['parent']['slug'], 'category' );
	if ( ! $parent ) {
		$report['terms'][ $data['parent']['slug'] ] = 'create';
		if ( ! $args['dry_run'] ) {
			$made   = wp_insert_term( $data['parent']['name'], 'category', array( 'slug' => $data['parent']['slug'] ) );
			$parent = is_wp_error( $made ) ? null : get_term( $made['term_id'], 'category' );
		}
	} else {
		$report['terms'][ $data['parent']['slug'] ] = 'exists';
	}
	foreach ( $data['groups'] as $g ) {
		$term = get_term_by( 'slug', $g['slug'], 'category' );
		if ( ! $term ) {
			$report['terms'][ $g['slug'] ] = 'create';
			if ( ! $args['dry_run'] && $parent ) {
				$made = wp_insert_term( $g['name'], 'category', array( 'slug' => $g['slug'], 'parent' => $parent->term_id ) );
				$term = is_wp_error( $made ) ? null : get_term( $made['term_id'], 'category' );
			}
		} else {
			$report['terms'][ $g['slug'] ] = 'exists';
		}
		if ( $term && ! $args['dry_run'] ) {
			update_term_meta( $term->term_id, 'augmented_ed_order', (int) $g['order'] );
		}
		$term_ids[ $g['slug'] ] = $term ? (int) $term->term_id : 0;
	}

	// The people.
	foreach ( $data['people'] as $p ) {
		$meta   = augmented_ed_import_meta( $p );
		$bio    = augmented_ed_bio_html( $p['bio'] );
		$terms  = array_filter( array( $parent ? (int) $parent->term_id : 0, $term_ids[ $p['group'] ] ?? 0 ) );
		$post   = $found[ $p['slug'] ] ?? null;
		$action = 'unchanged';
		$note   = '';

		if ( ! $post ) {
			$action = 'create';
			if ( ! $args['dry_run'] ) {
				$id = wp_insert_post(
					array(
						'post_type'    => $type,
						'post_status'  => $status,
						'post_title'   => $p['name'],
						'post_name'    => $p['slug'],
						'post_content' => $bio,
					),
					true
				);
				if ( is_wp_error( $id ) ) {
					$report['people'][ $p['slug'] ] = array( 'error', $id->get_error_message() );
					continue;
				}
				$post = get_post( $id );
			}
		} else {
			$stored = (string) get_post_meta( $post->ID, '_augmented_ed_import_hash', true );
			if ( $stored && augmented_ed_meta_hash( $post->ID ) !== $stored && ! $args['force'] ) {
				$report['people'][ $p['slug'] ] = array( 'skipped', 'its card was edited in WordPress since the last import (use Force to overwrite)' );
				continue;
			}
		}

		if ( $post ) {
			$changes = array();
			$current = wp_get_post_terms( $post->ID, 'category', array( 'fields' => 'ids' ) );
			if ( array_diff( $terms, is_wp_error( $current ) ? array() : $current ) ) {
				$changes[] = 'categories';
				if ( ! $args['dry_run'] ) {
					wp_set_post_terms( $post->ID, $terms, 'category', true );
				}
			}
			foreach ( $meta as $key => $value ) {
				if ( (string) get_post_meta( $post->ID, $key, true ) !== $value ) {
					$changes[] = $key;
					if ( ! $args['dry_run'] ) {
						if ( '' === $value ) {
							delete_post_meta( $post->ID, $key );
						} else {
							update_post_meta( $post->ID, $key, $value );
						}
					}
				}
			}
			if ( 'create' !== $action && '' !== $bio && ( '' === trim( (string) $post->post_content ) || $args['overwrite_content'] ) && trim( (string) $post->post_content ) !== trim( $bio ) ) {
				$changes[] = 'content';
				if ( ! $args['dry_run'] ) {
					wp_update_post( array( 'ID' => $post->ID, 'post_content' => $bio ) );
				}
			} elseif ( 'create' !== $action && '' !== $bio && '' !== trim( (string) $post->post_content ) && trim( (string) $post->post_content ) !== trim( $bio ) ) {
				$note = 'its existing content was kept (Overwrite content replaces it with the AugmentED bio)';
			}
			// Yoast's description for the bio page: the bio's first sentence, as the site's
			// own bio pages use, only where Yoast has none.
			if ( ! empty( $p['bio']['description'] ) && ! get_post_meta( $post->ID, '_yoast_wpseo_metadesc', true ) ) {
				$changes[] = 'yoast description';
				if ( ! $args['dry_run'] ) {
					update_post_meta( $post->ID, '_yoast_wpseo_metadesc', $p['bio']['description'] );
				}
			}
			if ( '' !== $args['title_meta_key'] && '' !== $p['role'] ) {
				$key  = sanitize_key( $args['title_meta_key'] );
				$have = function_exists( 'get_field' ) ? get_field( $key, $post->ID, false ) : get_post_meta( $post->ID, $key, true );
				if ( '' === (string) $have ) {
					$changes[] = $key;
					if ( ! $args['dry_run'] ) {
						if ( function_exists( 'update_field' ) && function_exists( 'get_field_object' ) && get_field_object( $key, $post->ID ) ) {
							update_field( $key, $p['role'], $post->ID );
						} else {
							update_post_meta( $post->ID, $key, $p['role'] );
						}
					}
				}
			}
			if ( ! $args['dry_run'] ) {
				update_post_meta( $post->ID, '_augmented_ed_import_hash', augmented_ed_meta_hash( $post->ID ) );
			}
			if ( 'create' !== $action && $changes ) {
				$action = ! get_post_meta( $post->ID, '_augmented_ed_import_hash', true ) || in_array( $p['slug'], $data['existing'], true ) ? 'attach' : 'update';
				$note   = trim( implode( ', ', $changes ) . ( $note ? '; ' . $note : '' ) );
			}
		}
		$report['people'][ $p['slug'] ] = array( $action, $note );
	}

	foreach ( $report['people'] as $row ) {
		$report['counts'][ $row[0] ] = ( $report['counts'][ $row[0] ] ?? 0 ) + 1;
	}
	if ( ! $args['dry_run'] ) {
		update_option(
			'augmented_ed_import',
			array(
				'time'   => time(),
				'counts' => $report['counts'],
				'source' => augmented_ed_data( 'team' ) ? md5( (string) wp_json_encode( $data ) ) : '',
			),
			false
		);
		delete_option( 'augmented_ed_template_pages' );
		do_action( 'augmented_ed_team_changed', 0 );
	}
	return $report;
}

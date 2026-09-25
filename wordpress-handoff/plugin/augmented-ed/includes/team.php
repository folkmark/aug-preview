<?php
/**
 * The AugmentED team, as posts of AERDF's own team type.
 *
 * aerdf.org already has a `team` post type — 199 people, a single page each at
 * /team/<slug>/, grouped by programme with the ordinary category taxonomy — and two of
 * AugmentED's 29 (Sherry Lachman and Caitlin Mills) are already in it. So AugmentED's team
 * are team posts too, in an "AugmentED Team" category with one child per Who We Are group.
 * Nothing new is registered, and AERDF's other 199 people are not touched.
 *
 * What a card needs beyond a title, a bio and a photo is kept in the plugin's own post meta
 * (augmented_ed_*), edited in an "AugmentED card" box on the team edit screen. AERDF's own
 * job-title field is ACF or JetEngine, with a key nobody outside can see; a setting names it
 * if AERDF wants the role written there too, and the card falls back to it when ours is
 * empty.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

const AUGMENTED_ED_PARENT_TERM = 'augmented-team';

/** The post type, filterable for an install that calls it something else. */
function augmented_ed_post_type() {
	return (string) apply_filters( 'augmented_ed_post_type', 'team' );
}

/** The card's fields, stored as post meta. */
const AUGMENTED_ED_META = array(
	'augmented_ed_role'        => 'Role',
	'augmented_ed_affiliation' => 'Affiliation (a Fellow\'s school)',
	'augmented_ed_location'    => 'Location (a Fellow\'s city)',
	'augmented_ed_linkedin'    => 'LinkedIn URL',
	'augmented_ed_website'     => 'Website URL',
	'augmented_ed_sort'        => 'Position within the group (1 = first)',
	'augmented_ed_photo'       => 'Bundled headshot',
	'augmented_ed_template'    => 'Bio page style',
);

add_action(
	'init',
	function () {
		foreach ( array_keys( AUGMENTED_ED_META ) as $key ) {
			register_post_meta(
				augmented_ed_post_type(),
				$key,
				array(
					'type'              => 'augmented_ed_sort' === $key ? 'integer' : 'string',
					'single'            => true,
					'show_in_rest'      => false,
					'sanitize_callback' => 'augmented_ed_linkedin' === $key || 'augmented_ed_website' === $key ? 'esc_url_raw' : null,
					'auth_callback'     => function ( $allowed, $meta_key, $post_id ) {
						return current_user_can( 'edit_post', $post_id );
					},
				)
			);
		}
	},
	30
);

/** The AugmentED group terms, in page order: term objects keyed by slug. */
function augmented_ed_group_terms() {
	$parent = get_term_by( 'slug', AUGMENTED_ED_PARENT_TERM, 'category' );
	if ( ! $parent ) {
		return array();
	}
	$terms = get_terms(
		array(
			'taxonomy'   => 'category',
			'parent'     => $parent->term_id,
			'hide_empty' => false,
		)
	);
	if ( is_wp_error( $terms ) ) {
		return array();
	}
	usort(
		$terms,
		function ( $a, $b ) {
			return (int) get_term_meta( $a->term_id, 'augmented_ed_order', true ) <=> (int) get_term_meta( $b->term_id, 'augmented_ed_order', true );
		}
	);
	$out = array();
	foreach ( $terms as $t ) {
		$out[ $t->slug ] = $t;
	}
	return $out;
}

/** Whether a post is in the AugmentED team (the parent category or any of its groups). */
function augmented_ed_is_member( $post ) {
	$post = get_post( $post );
	if ( ! $post || augmented_ed_post_type() !== $post->post_type ) {
		return false;
	}
	$slugs = array_merge( array( AUGMENTED_ED_PARENT_TERM ), array_keys( augmented_ed_group_terms() ) );
	return has_term( $slugs, 'category', $post );
}

/** Whether the post has a bio: any text at all in its content. */
function augmented_ed_has_bio( $post ) {
	$post = get_post( $post );
	return $post && '' !== trim( wp_strip_all_tags( (string) $post->post_content ) );
}

/**
 * Whether this member's single page is drawn by the plugin's bio template.
 *
 * 'augmented' always, 'site' never, and 'auto' — the default — when AugmentED is their
 * only programme. Sherry Lachman and Caitlin Mills are also AERDF's own leadership, and
 * AERDF's pages link to their existing /team/ pages; in auto those keep AERDF's template.
 */
function augmented_ed_bio_mode( $post ) {
	$mode = (string) get_post_meta( $post->ID, 'augmented_ed_template', true );
	if ( 'augmented' === $mode || 'site' === $mode ) {
		return $mode;
	}
	$ours  = array_merge( array( AUGMENTED_ED_PARENT_TERM ), array_keys( augmented_ed_group_terms() ) );
	$terms = wp_get_post_terms( $post->ID, 'category', array( 'fields' => 'slugs' ) );
	$other = is_wp_error( $terms ) ? array() : array_diff( $terms, $ours, array( 'uncategorized' ) );
	return $other ? 'site' : 'augmented';
}

function augmented_ed_serves_bio( $post ) {
	return augmented_ed_is_member( $post ) && augmented_ed_has_bio( $post ) && 'augmented' === augmented_ed_bio_mode( $post );
}

/** The bundled headshot for a member, as a URL into the plugin, or ''. */
function augmented_ed_bundled_photo( $post, $colour = false ) {
	$photo = sanitize_file_name( (string) get_post_meta( $post->ID, 'augmented_ed_photo', true ) );
	if ( '' === $photo ) {
		return '';
	}
	$rel = 'team/' . ( $colour ? 'colour/' : '' ) . $photo . '.webp';
	return is_readable( AUGMENTED_ED_DIR . 'assets/' . $rel ) ? augmented_ed_asset( $rel ) : '';
}

/** The role: ours, else the site's own job-title field if Settings names it. */
function augmented_ed_role( $post ) {
	$role = (string) get_post_meta( $post->ID, 'augmented_ed_role', true );
	$key  = augmented_ed_settings()['title_meta_key'];
	if ( '' === $role && '' !== $key ) {
		$role = function_exists( 'get_field' ) ? (string) get_field( $key, $post->ID, false ) : (string) get_post_meta( $post->ID, $key, true );
	}
	return $role;
}

function augmented_ed_links( $post ) {
	$links = array();
	foreach ( array( 'LinkedIn' => 'augmented_ed_linkedin', 'Website' => 'augmented_ed_website' ) as $label => $key ) {
		$url = (string) get_post_meta( $post->ID, $key, true );
		if ( '' !== $url ) {
			$links[] = array( 'label' => $label, 'url' => $url );
		}
	}
	return $links;
}

/**
 * What one tile is drawn from (generated/templates/partials/team-tile.php).
 *
 * The photo is the bundled duotone when there is one — the colour bloom on hover finds its
 * twin by rewriting that URL (assets/team/x.webp -> assets/team/colour/x.webp) — and
 * otherwise the post's featured image, which draws but does not bloom. A person with
 * neither gets the grid's placeholder square.
 */
function augmented_ed_tile_data( $post ) {
	$photo = augmented_ed_bundled_photo( $post );
	if ( '' === $photo && has_post_thumbnail( $post ) ) {
		$photo = (string) get_the_post_thumbnail_url( $post, 'medium_large' );
	}
	return array(
		'slug'        => $post->post_name,
		'name'        => $post->post_title,
		'role'        => augmented_ed_role( $post ),
		'affiliation' => (string) get_post_meta( $post->ID, 'augmented_ed_affiliation', true ),
		'location'    => (string) get_post_meta( $post->ID, 'augmented_ed_location', true ),
		'photo'       => $photo,
		'bio_url'     => augmented_ed_has_bio( $post ) ? (string) get_permalink( $post ) : '',
		'links'       => augmented_ed_links( $post ),
	);
}

/** Draws one group's tiles, in their sort order. Called from the generated team template. */
function augmented_ed_render_team_group( $term_slug ) {
	$term = get_term_by( 'slug', $term_slug, 'category' );
	if ( ! $term ) {
		return;
	}
	$posts = get_posts(
		array(
			'post_type'   => augmented_ed_post_type(),
			'post_status' => 'publish',
			'numberposts' => -1,
			'category'    => $term->term_id,
			'orderby'     => 'title',
			'order'       => 'ASC',
		)
	);
	// Sorted here, not by a meta query: ordering by meta_value_num silently drops every post
	// that lacks the key, and a person added by hand in WordPress without a position would
	// vanish from the grid. Unpositioned people go last, alphabetically.
	usort(
		$posts,
		function ( $a, $b ) {
			$sa = (int) get_post_meta( $a->ID, 'augmented_ed_sort', true );
			$sb = (int) get_post_meta( $b->ID, 'augmented_ed_sort', true );
			return ( $sa ? $sa : PHP_INT_MAX ) <=> ( $sb ? $sb : PHP_INT_MAX );
		}
	);
	foreach ( $posts as $p ) {
		$m = augmented_ed_tile_data( $p );
		include AUGMENTED_ED_DIR . 'generated/templates/partials/team-tile.php';
	}
}

/**
 * What the bio template is drawn from (generated/templates/bio.php).
 *
 * The body is the post's content as HTML — wpautop()'d and run through wp_kses_post() —
 * so a link or an emphasis an editor adds survives, and nothing unsafe does.
 */
function augmented_ed_bio_data( $post ) {
	$photo = augmented_ed_bundled_photo( $post );
	if ( '' === $photo && has_post_thumbnail( $post ) ) {
		$photo = (string) get_the_post_thumbnail_url( $post, 'large' );
	}
	$meta = array_values(
		array_filter(
			array(
				(string) get_post_meta( $post->ID, 'augmented_ed_affiliation', true ),
				(string) get_post_meta( $post->ID, 'augmented_ed_location', true ),
			)
		)
	);
	return array(
		'back'  => augmented_ed_url( 'team' ),
		'photo' => $photo,
		'name'  => $post->post_title,
		'role'  => augmented_ed_role( $post ),
		'meta'  => $meta,
		'paras' => wp_kses_post( wpautop( (string) $post->post_content ) ),
		'links' => augmented_ed_links( $post ),
	);
}

/**
 * The eight without a bio: their team post exists to fill a grid, not to be a page.
 *
 * Their single page would be a name and nothing else, so it redirects to Who We Are — 302,
 * not 301, because a bio can arrive later and a permanent redirect would be cached against
 * it — and it is kept out of Yoast's sitemap. Members AERDF also shows elsewhere (bio mode
 * 'site') are left entirely alone.
 */
add_action(
	'template_redirect',
	function () {
		if ( ! is_singular( augmented_ed_post_type() ) ) {
			return;
		}
		$post = get_queried_object();
		if ( $post instanceof WP_Post && augmented_ed_is_member( $post ) && ! augmented_ed_has_bio( $post ) && 'augmented' === augmented_ed_bio_mode( $post ) ) {
			wp_safe_redirect( augmented_ed_url( 'team' ), 302 );
			exit;
		}
	}
);

function augmented_ed_bioless_ids() {
	$parent = get_term_by( 'slug', AUGMENTED_ED_PARENT_TERM, 'category' );
	if ( ! $parent ) {
		return array();
	}
	$ids = get_posts(
		array(
			'post_type'   => augmented_ed_post_type(),
			'post_status' => 'publish',
			'numberposts' => -1,
			'category'    => $parent->term_id,
			'fields'      => 'ids',
		)
	);
	return array_values(
		array_filter(
			$ids,
			function ( $id ) {
				$p = get_post( $id );
				return ! augmented_ed_has_bio( $p ) && 'augmented' === augmented_ed_bio_mode( $p );
			}
		)
	);
}

add_filter(
	'wpseo_exclude_from_sitemap_by_post_ids',
	function ( $ids ) {
		return array_merge( (array) $ids, augmented_ed_bioless_ids() );
	}
);

// On a bio page, tell search engines what it is: a profile of one person. Yoast builds the
// graph when it is active; without it, the plugin prints the same thing itself. The fields
// follow the site's own bio pages (tools/lib/bio-page.mjs, build-site.mjs).
function augmented_ed_person( $post ) {
	$bio    = augmented_ed_bio_data( $post );
	$groups = wp_get_post_terms( $post->ID, 'category', array( 'fields' => 'slugs' ) );
	$org    = array(
		'@type' => 'Organization',
		'name'  => 'AugmentED',
		'url'   => augmented_ed_url( 'home' ),
	);
	$person = array(
		'@type' => 'Person',
		'name'  => $post->post_title,
		'url'   => get_permalink( $post ),
	);
	if ( $bio['role'] ) {
		$person['jobTitle'] = $bio['role'];
	}
	$desc = (string) get_post_meta( $post->ID, '_yoast_wpseo_metadesc', true );
	if ( $desc ) {
		$person['description'] = $desc;
	}
	if ( $bio['photo'] ) {
		$person['image'] = $bio['photo'];
	}
	if ( $bio['links'] ) {
		$person['sameAs'] = wp_list_pluck( $bio['links'], 'url' );
	}
	// Only Leadership works FOR AugmentED; everyone else is a member of it, with their own
	// institution as the affiliation where their card names one.
	if ( ! is_wp_error( $groups ) && in_array( 'augmented-leadership', $groups, true ) ) {
		$person['worksFor'] = $org;
	} else {
		$person['memberOf'] = $org;
		if ( ! empty( $bio['meta'][0] ) ) {
			$person['affiliation'] = array(
				'@type' => 'Organization',
				'name'  => $bio['meta'][0],
			);
		}
	}
	return $person;
}

add_filter(
	'wpseo_schema_webpage_type',
	function ( $type ) {
		return 'bio' === augmented_ed_current_template() ? 'ProfilePage' : $type;
	}
);
add_filter(
	'wpseo_schema_webpage',
	function ( $data ) {
		if ( 'bio' === augmented_ed_current_template() ) {
			$data['mainEntity'] = augmented_ed_person( get_queried_object() );
		}
		return $data;
	}
);
add_action(
	'wp_head',
	function () {
		if ( 'bio' !== augmented_ed_current_template() || defined( 'WPSEO_VERSION' ) ) {
			return;
		}
		$ld = array(
			'@context'   => 'https://schema.org',
			'@type'      => 'ProfilePage',
			'url'        => get_permalink(),
			'mainEntity' => augmented_ed_person( get_queried_object() ),
		);
		echo '<script type="application/ld+json">' . wp_json_encode( $ld, JSON_UNESCAPED_SLASHES ) . "</script>\n";
	}
);

/**
 * When a member changes, the Who We Are page has changed too — and WP Engine's page cache
 * does not know that. It purges a post's own URL on save, not the page that lists it, so
 * without this the grid keeps showing the old card until the cache expires.
 */
add_action(
	'save_post',
	function ( $post_id, $post ) {
		if ( augmented_ed_post_type() !== $post->post_type || wp_is_post_revision( $post_id ) || ! augmented_ed_is_member( $post ) ) {
			return;
		}
		$map = augmented_ed_template_pages();
		if ( ! empty( $map['team'][0] ) && class_exists( 'WpeCommon' ) && method_exists( 'WpeCommon', 'purge_varnish_cache' ) ) {
			WpeCommon::purge_varnish_cache( (int) $map['team'][0] );
		}
		do_action( 'augmented_ed_team_changed', $post_id );
	},
	20,
	2
);

// ---------------------------------------------------------------- the card box

add_action(
	'add_meta_boxes',
	function () {
		add_meta_box( 'augmented-ed-card', __( 'AugmentED card', 'augmented-ed' ), 'augmented_ed_card_box', augmented_ed_post_type(), 'normal', 'high' );
	}
);

/** The bundled headshots, by slug, for the card box's menu. */
function augmented_ed_bundled_photos() {
	$files = glob( AUGMENTED_ED_DIR . 'assets/team/*.webp' );
	return array_map(
		function ( $f ) {
			return basename( $f, '.webp' );
		},
		$files ? $files : array()
	);
}

function augmented_ed_card_box( $post ) {
	wp_nonce_field( 'augmented_ed_card', 'augmented_ed_card_nonce' );
	echo '<p>' . esc_html__( 'Shown on the AugmentED Who We Are page when this person is in an AugmentED Team group (Categories). The bio is this post\'s content; a person with no content gets no bio page.', 'augmented-ed' ) . '</p><table class="form-table" role="presentation">';
	foreach ( AUGMENTED_ED_META as $key => $label ) {
		$value = get_post_meta( $post->ID, $key, true );
		echo '<tr><th scope="row"><label for="' . esc_attr( $key ) . '">' . esc_html( $label ) . '</label></th><td>';
		if ( 'augmented_ed_photo' === $key ) {
			echo '<select id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '"><option value="">' . esc_html__( '(none — use the featured image)', 'augmented-ed' ) . '</option>';
			foreach ( augmented_ed_bundled_photos() as $slug ) {
				echo '<option value="' . esc_attr( $slug ) . '"' . selected( $value, $slug, false ) . '>' . esc_html( $slug ) . '</option>';
			}
			echo '</select>';
		} elseif ( 'augmented_ed_template' === $key ) {
			echo '<select id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '">';
			foreach ( array(
				''          => __( 'Automatic — AugmentED\'s style unless they are also in another AERDF programme', 'augmented-ed' ),
				'augmented' => __( 'AugmentED\'s bio page', 'augmented-ed' ),
				'site'      => __( 'AERDF\'s own team page', 'augmented-ed' ),
			) as $v => $l ) {
				echo '<option value="' . esc_attr( $v ) . '"' . selected( $value, $v, false ) . '>' . esc_html( $l ) . '</option>';
			}
			echo '</select>';
		} else {
			$type = 'augmented_ed_sort' === $key ? 'number' : ( str_ends_with( $key, '_linkedin' ) || str_ends_with( $key, '_website' ) ? 'url' : 'text' );
			echo '<input class="regular-text" type="' . esc_attr( $type ) . '" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '" value="' . esc_attr( (string) $value ) . '">';
		}
		echo '</td></tr>';
	}
	echo '</table>';
}

add_action(
	'save_post',
	function ( $post_id, $post ) {
		if ( augmented_ed_post_type() !== $post->post_type || ! isset( $_POST['augmented_ed_card_nonce'] ) ) {
			return;
		}
		if ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['augmented_ed_card_nonce'] ) ), 'augmented_ed_card' ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		foreach ( array_keys( AUGMENTED_ED_META ) as $key ) {
			if ( ! isset( $_POST[ $key ] ) ) {
				continue;
			}
			$raw   = sanitize_text_field( wp_unslash( $_POST[ $key ] ) );
			$value = in_array( $key, array( 'augmented_ed_linkedin', 'augmented_ed_website' ), true ) ? esc_url_raw( $raw ) : $raw;
			if ( 'augmented_ed_sort' === $key ) {
				$value = '' === $raw ? '' : (string) absint( $raw );
			}
			if ( '' === $value ) {
				delete_post_meta( $post_id, $key );
			} else {
				update_post_meta( $post_id, $key, $value );
			}
		}
	},
	10,
	2
);

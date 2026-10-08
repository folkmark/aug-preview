<?php
/**
 * The share card: the picture Slack, LinkedIn, iMessage and the rest show when someone pastes
 * a link to an AugmentED page.
 *
 * Yoast takes that picture from the page's own Social image, then its featured image, then the
 * first image in its content box, then the site-wide default. The AugmentED pages have none of
 * the first three — the content box is empty and the page is drawn by the template — and the
 * bio photographs ship inside the plugin, not in the Media Library. Measured in the plugin's
 * harness on 2026-10-08: no og:image at all on any of them, so on aerdf.org every one would
 * have shared AERDF's default picture.
 *
 * This hands Yoast each page's own card (tools/build-og.mjs draws them; generated/data/
 * share.json lists them) at the point it has looked at the page and found nothing, and before
 * it falls back to the default — so a Social image set on the page in Yoast still wins.
 * Without Yoast it prints the tags itself.
 *
 * A bio card has the person's name and role drawn into it, as they were when the plugin was
 * built. If a role is changed in WordPress, set a Social image on that person's post in Yoast,
 * or ask AugmentED for a new zip.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

/** The card for the page being shown, or null when it is not an AugmentED page. */
function augmented_ed_share_card() {
	$key   = augmented_ed_current_template();
	$share = augmented_ed_data( 'share' );
	if ( null === $key || ! is_array( $share ) ) {
		return null;
	}
	$card = null;
	if ( 'bio' === $key ) {
		$post = get_queried_object();
		// The card is named for the person's slug in the roster, which is the photo key the
		// import writes, and the post's slug unless someone has since renamed it.
		foreach ( array( (string) get_post_meta( $post->ID, 'augmented_ed_photo', true ), $post->post_name ) as $slug ) {
			if ( '' !== $slug && ! empty( $share['bios'][ $slug ] ) ) {
				$card = $share['bios'][ $slug ];
				break;
			}
		}
		if ( null === $card ) {
			$card = $share['fallback'] ?? null;
		}
	} else {
		$card = $share['pages'][ $key ] ?? null;
	}
	if ( ! is_array( $card ) || empty( $card['image'] ) || ! is_readable( AUGMENTED_ED_DIR . 'assets/' . $card['image'] ) ) {
		return null;
	}
	$card['url'] = augmented_ed_asset( $card['image'] );
	return $card;
}

add_filter(
	// Not wpseo_add_opengraph_images: Yoast applies that one before it reads the page's own
	// Social image, so an image added there would come first and outrank an editor's choice.
	// This one runs after the page has been read and before the site-wide default.
	'wpseo_add_opengraph_additional_images',
	function ( $images ) {
		if ( is_object( $images ) && method_exists( $images, 'has_images' ) && ! $images->has_images() ) {
			$card = augmented_ed_share_card();
			if ( $card ) {
				$images->add_image(
					array(
						'url'    => $card['url'],
						'width'  => (int) $card['width'],
						'height' => (int) $card['height'],
						'type'   => $card['type'],
					)
				);
			}
		}
		return $images;
	}
);

// Yoast prints no og:image:alt for an image it was handed by URL; the card's own alt text
// goes in beside its tags, for the clients that read it to a screen-reader user.
add_action(
	'wpseo_head',
	function () {
		$card = augmented_ed_share_card();
		if ( $card && ! empty( $card['alt'] ) ) {
			echo '<meta property="og:image:alt" content="' . esc_attr( $card['alt'] ) . '" />' . "\n";
		}
	},
	40
);

// Without Yoast, nothing else on the page names a share image.
add_action(
	'wp_head',
	function () {
		if ( defined( 'WPSEO_VERSION' ) ) {
			return;
		}
		$card = augmented_ed_share_card();
		if ( ! $card ) {
			return;
		}
		printf( '<meta property="og:image" content="%s" />' . "\n", esc_url( $card['url'] ) );
		printf( '<meta property="og:image:type" content="%s" />' . "\n", esc_attr( $card['type'] ) );
		printf( '<meta property="og:image:width" content="%d" />' . "\n", (int) $card['width'] );
		printf( '<meta property="og:image:height" content="%d" />' . "\n", (int) $card['height'] );
		printf( '<meta property="og:image:alt" content="%s" />' . "\n", esc_attr( $card['alt'] ) );
		echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
	}
);

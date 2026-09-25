<?php
/**
 * WP-CLI: `wp augmented-ed team import` and `wp augmented-ed team status`.
 *
 * WP Engine gives SSH access with WP-CLI, and this is the same engine as Tools → AugmentED
 * team (includes/importer.php), for whoever prefers a terminal or wants to script staging.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;

/**
 * Imports and inspects the AugmentED team.
 */
class Augmented_ED_Team_Command {

	/**
	 * Imports generated/data/team.json as team posts.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : Report what would change; write nothing.
	 *
	 * [--status=<status>]
	 * : Status for new posts.
	 * ---
	 * default: publish
	 * options:
	 *   - publish
	 *   - draft
	 * ---
	 *
	 * [--overwrite-content]
	 * : Replace existing posts' content with the AugmentED bio.
	 *
	 * [--attach=<slugs>]
	 * : Comma-separated slugs that already exist and are the same person.
	 *
	 * [--title-meta-key=<key>]
	 * : The site's own job-title field, filled with the role where empty.
	 *
	 * [--force]
	 * : Update posts whose card was edited in WordPress since the last import.
	 *
	 * @param array $args  Positional arguments.
	 * @param array $assoc Named arguments.
	 */
	public function import( $args, $assoc ) {
		$report = augmented_ed_import_team(
			array(
				'dry_run'           => isset( $assoc['dry-run'] ),
				'status'            => $assoc['status'] ?? 'publish',
				'overwrite_content' => isset( $assoc['overwrite-content'] ),
				'attach'            => isset( $assoc['attach'] ) ? explode( ',', $assoc['attach'] ) : array(),
				'title_meta_key'    => $assoc['title-meta-key'] ?? '',
				'force'             => isset( $assoc['force'] ),
			)
		);
		foreach ( $report['errors'] as $e ) {
			WP_CLI::error( $e, false );
		}
		if ( $report['errors'] ) {
			WP_CLI::halt( 1 );
		}
		foreach ( $report['terms'] as $slug => $what ) {
			WP_CLI::log( sprintf( 'category %-45s %s', $slug, $what ) );
		}
		$rows = array();
		foreach ( $report['people'] as $slug => $row ) {
			$rows[] = array(
				'slug'   => $slug,
				'action' => $row[0],
				'note'   => $row[1],
			);
		}
		WP_CLI\Utils\format_items( 'table', $rows, array( 'slug', 'action', 'note' ) );
		$counts = array();
		foreach ( $report['counts'] as $k => $n ) {
			$counts[] = "$n $k";
		}
		WP_CLI::success( ( $report['dry_run'] ? 'Dry run: ' : '' ) . implode( ', ', $counts ) );
	}

	/**
	 * Shows which page uses each template, and the team per group.
	 */
	public function status() {
		foreach ( augmented_ed_template_pages( true ) as $key => $ids ) {
			WP_CLI::log( sprintf( '%-10s %s', $key, $ids ? implode( ', ', array_map( 'get_permalink', $ids ) ) : '(no published page)' ) );
		}
		foreach ( augmented_ed_group_terms() as $slug => $term ) {
			WP_CLI::log( sprintf( '%-45s %d', $slug, $term->count ) );
		}
	}
}

WP_CLI::add_command( 'augmented-ed team', 'Augmented_ED_Team_Command' );

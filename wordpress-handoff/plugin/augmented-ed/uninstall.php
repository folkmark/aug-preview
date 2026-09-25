<?php
/**
 * Removing the plugin removes its settings, and nothing else.
 *
 * The team posts, their categories and their card fields are content: they belong to the
 * site, AERDF's own pages may link to them, and deleting a plugin is not a decision to
 * delete people. They stay, and a reinstall picks them up where they were.
 *
 * @package AugmentED
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

foreach ( array( 'augmented_ed_settings', 'augmented_ed_template_pages', 'augmented_ed_import' ) as $option ) {
	delete_option( $option );
}

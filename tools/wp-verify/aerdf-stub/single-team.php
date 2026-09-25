<?php get_header(); ?>
<div class="elementor elementor-3899 elementor-location-single" data-aerdf-stub="team-single">
<?php while ( have_posts() ) : the_post(); ?>
	<h2 class="elementor-heading-title"><?php the_title(); ?></h2>
	<div class="elementor-widget-theme-post-content"><?php the_content(); ?></div>
<?php endwhile; ?>
</div>
<?php get_footer();

<?php get_header(); ?>
<div class="aerdf-content" data-aerdf-stub="content">
<?php while ( have_posts() ) : the_post(); ?>
	<h1><?php the_title(); ?></h1>
	<div class="entry"><?php the_content(); ?></div>
<?php endwhile; ?>
</div>
<?php get_footer();

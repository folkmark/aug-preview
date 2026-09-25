/* The colour bloom on the Who We Are headshots: the photograph's own colour pours back
   into the navy duotone from wherever the pointer comes in, and drains out where it
   leaves.

   The two images are one person twice. assets/team/<slug>.webp is the duotone the page
   shows; assets/team/colour/<slug>.webp is the same cut-out, same framing, same matte,
   in its own colour on the same background — tools/encode-images.mjs writes both from
   one pass, so the only thing that changes under the bloom is colour. This file lays the
   colour one over the duotone and team-colour.css reveals it through a radial mask whose
   centre is the pointer's way in.

   NOT A CUSTOM ELEMENT, unlike the other components, and it adds nothing to the markup.
   Three reasons, each of which rules out the obvious alternative:
   - The team page is mounted only when a reader goes to it, and rebuilt from scratch
     every time they come back. Listeners on the document do not care; an element
     booted against the first copy of the grid would be holding a detached one.
   - A colour <img> in the markup would be downloaded by every phone, which has no
     hover to show it with. Here the layers are only created once a mouse crosses a
     team grid, so a touch device never fetches the colour set (554 KB for 30).
   - tools/export-content.mjs reads each person's photo as the first team <img> in the
     card, and the handoff pages are a snapshot of the DOM. Nothing here exists until a
     pointer moves, and tools/export-static.mjs removes it if it ever does.

   The layer is inserted as a SIBLING after the duotone, never around it. The host is
   React, and re-parenting a node it owns is how you get reconcile errors; a node it does
   not know about is left alone on re-render and unmounted with its tile. For the same
   reason every piece of state — the on flag, the centre, the reach — lives on the layer
   and not on the tile: the host reconciles its own nodes' attributes back to what it
   rendered (see the note on this in falling-blocks.js).

   Hover counts over the whole tile, not just the photo. On a tile with a bio the whole
   tile is the link (THE BIO TILES in index.html) and the pointer never touches the
   <img> at all; the other tiles follow suit so the page behaves one way. A pointer that
   comes in through the name starts the bloom at the photo's bottom edge — the entry
   point is clamped to the photo, so the colour always comes from the side the reader
   came from.

   Leaving drains the colour out where the pointer left, but only from a finished bloom.
   At full coverage the old centre and the new one both cover the whole photo, so moving
   the centre is invisible; mid-bloom it would jump, so an interrupted bloom recedes the
   way it came. Re-entering mid-drain picks up where it is rather than restarting.

   Keyboard focus on a "Read bio" link blooms from the face: 50% across, 38% down, which
   is where the eye lines on the page sit; a photo cropped too tight sits up to 6% lower
   (THE REACH in tools/cutout-headshots.py), still well inside the bloom's first frames. Only
   :focus-visible, so a mouse click on the link does not leave a tile coloured.
*/
(function () {
  if (window.__teamColour) return;
  window.__teamColour = true;

  // What colour-capable means: a mouse or trackpad. A phone reports hover: none, and a
  // tablet with a pencil reports a fine pointer but no hover, and both would be shown a
  // bloom they can only trigger by tapping — which on a bio tile also navigates.
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const PHOTO = ':scope > img[src*="assets/team/"]:not([data-team-colour])';
  const FEATHER = 0.35; // of the photo's width; the soft band the front is drawn with
  const FACE = [0.5, 0.38];
  const armed = new WeakSet();

  const tileOf = (node) => {
    const tile = node && node.closest ? node.closest('.team-grid-3 > *') : null;
    return tile && tile.querySelector(PHOTO) ? tile : null;
  };
  const layerOf = (tile) => tile.querySelector(':scope > [data-team-colour]');

  // Every grid on the page at once, the first time a pointer reaches any of them: the
  // layers are lazy images, so this costs nothing until each photo is near the viewport,
  // and by the time a reader has moved from one group to the next its colour is there.
  function arm(from) {
    const grid = from.closest('.team-grid-3');
    if (!grid || armed.has(grid)) return;
    (grid.closest('main') || document).querySelectorAll('.team-grid-3').forEach((g) => {
      armed.add(g);
      g.querySelectorAll(':scope > *').forEach((tile) => {
        const photo = tile.querySelector(PHOTO);
        if (!photo || layerOf(tile)) return;
        const layer = document.createElement('img');
        layer.setAttribute('data-team-colour', '');
        layer.setAttribute('alt', '');
        layer.setAttribute('aria-hidden', 'true');
        layer.setAttribute('decoding', 'async');
        layer.setAttribute('loading', 'lazy');
        layer.addEventListener('error', () => layer.remove());
        // From the attribute, not .src: the property is the resolved absolute URL, and
        // in a serialised copy of the page that would be one machine's localhost.
        layer.setAttribute('src', photo.getAttribute('src').replace('assets/team/', 'assets/team/colour/'));
        photo.after(layer);
      });
    });
  }

  const bloomOf = (layer) => parseFloat(getComputedStyle(layer).getPropertyValue('--bloom')) || 0;

  // Centre the bloom at (x, y) in the photo's own pixels, and reach far enough that the
  // opaque part of the front clears the farthest corner.
  function aim(layer, box, x, y) {
    const feather = box.width * FEATHER;
    const far = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    layer.style.setProperty('--x', x + 'px');
    layer.style.setProperty('--y', y + 'px');
    layer.style.setProperty('--reach', far + feather + 'px');
    layer.style.setProperty('--feather', feather + 'px');
  }

  function pointAt(tile, e) {
    const box = tile.querySelector(PHOTO).getBoundingClientRect();
    if (!e) return { box, x: box.width * FACE[0], y: box.height * FACE[1] };
    const clamp = (v, hi) => (v < 0 ? 0 : v > hi ? hi : v);
    return { box, x: clamp(e.clientX - box.left, box.width), y: clamp(e.clientY - box.top, box.height) };
  }

  function fill(tile, e) {
    const layer = layerOf(tile);
    if (!layer) return;
    // Mid-drain: carry on from the current centre and radius rather than restart.
    if (bloomOf(layer) < 0.01) {
      const p = pointAt(tile, e);
      aim(layer, p.box, p.x, p.y);
    }
    layer.setAttribute('data-on', '');
  }

  function drain(tile, e) {
    const layer = layerOf(tile);
    if (!layer || !layer.hasAttribute('data-on')) return;
    if (e && bloomOf(layer) > 0.995) {
      const p = pointAt(tile, e);
      aim(layer, p.box, p.x, p.y);
    }
    layer.removeAttribute('data-on');
  }

  document.addEventListener('pointerover', (e) => {
    if (!canHover.matches || e.pointerType === 'touch') return;
    const tile = tileOf(e.target);
    if (e.target.closest) arm(e.target);
    if (!tile || tile.contains(e.relatedTarget)) return;
    fill(tile, e);
  });
  document.addEventListener('pointerout', (e) => {
    const tile = tileOf(e.target);
    if (!tile || tile.contains(e.relatedTarget)) return;
    drain(tile, e);
  });

  document.addEventListener('focusin', (e) => {
    if (!e.target.matches || !e.target.matches('[data-variant="link"]:focus-visible')) return;
    const tile = tileOf(e.target);
    if (!tile) return;
    arm(tile);
    fill(tile, null);
  });
  document.addEventListener('focusout', (e) => {
    const tile = tileOf(e.target);
    if (tile && !tile.contains(e.relatedTarget)) drain(tile, null);
  });
})();

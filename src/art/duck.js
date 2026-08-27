/* duck.js — a duck floating in the onsen.
 *
 * The app's duck is always drawn dry: on a tile, on a hang tag, in a washtub.
 * Sitting one IN open water needs two additions, both borrowed rather than
 * invented — a soft cast ellipse (the lantern's base shadow) and a wave crossing
 * the body (the washtub's wave, which is exactly how the app icon already says
 * "this duck is floating").
 */

import { duckBody, A, INK } from './ddkit.js';

// Sprite art space is the shop's accessory-bust framing: 32×33 duck-units with
// headroom above the head for a hat. The duck's visual centre is (47.5, 31).
export const DUCK_VIEWBOX = { x: 31.5, y: 14.5, w: 32, h: 33 };

const WATERLINE =
  '<path d="M 33,43.2 C 36.5,41.4 39.5,42.4 42.5,43.4 C 45.5,44.4 48.5,44.2 51.5,42.6 C 54,41.3 56,41.5 58,42.8" ' +
  'fill="none" stroke="#D2DCDB" stroke-width="1.15" stroke-linecap="round" stroke-opacity="0.9"/>' +
  '<path d="M 35.5,45.6 C 39,44.4 43,45 47,45.4 C 50.5,45.7 53,45.2 55.5,44.4" ' +
  'fill="none" stroke="#D2DCDB" stroke-width="0.8" stroke-linecap="round" stroke-opacity="0.5"/>';

/**
 * @param {string} fill    the duck's colourway hex (from LogoCatalog)
 * @param {string} accKey  a key of `A` — 'crown' | 'scarf' | 'tophat' | 'bucket'
 */
// The cast shadow, as its own sprite.
//
// It is NOT part of the duck, for the same reason the wake is not: a shadow
// falls ON the river, so it has to be able to pass UNDER the bank stone. Drawn
// inside the duck it rode in the duck's layer, which sits above all the stone
// because the duck is the thing you pick up — so a duck drifting close to the
// shore laid a dark ellipse straight across the boulders.
//
// Same viewBox as the sprite, deliberately: the layer that draws it reuses the
// duck's own box and margins, so the ellipse lands exactly where it always did
// and there is no second set of offsets to keep in step with the art.
export const SHADOW_SVG = (() => {
  const vb = DUCK_VIEWBOX;
  return `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
    '<g class="dd-wet">' +
      '<ellipse cx="46.4" cy="45.4" rx="11.4" ry="2.4" fill="#1E2830" fill-opacity="0.22"/>' +
    '</g>' +
  '</svg>';
})();

export function duckSprite(fill, accKey) {
  const acc = A[accKey] || '';
  const vb = DUCK_VIEWBOX;
  // The waterline stays `.dd-wet` so it can be taken away the moment the duck
  // leaves the water — lifted out on a finger, or perched on the board. A duck
  // sitting on a wooden rail with a wave crossing its chest is the sort of
  // detail that makes the whole thing read as decoration rather than as a
  // scene. The cast shadow used to be grouped here too; it is SHADOW_SVG now.
  return (
    `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
      duckBody(fill, 1.55, INK) +
      acc +
      `<g class="dd-wet">${WATERLINE}</g>` +
    '</svg>'
  );
}

// The duck-shaped hole in the board: what the stall shows before anything is on
// it. The same silhouette, drained to a pale sage so it reads as a place rather
// than as a fifth project — a duck goes here, and none is here yet.
export const GHOST_DUCK = (() => {
  const vb = DUCK_VIEWBOX;
  return `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
    '<ellipse cx="46.4" cy="45.4" rx="11.4" ry="2.4" fill="#4A7A6B" fill-opacity="0.1"/>' +
    duckBody('#E4EBE8', 0.9, '#C8D9D2') +
  '</svg>';
})();

// The wake that trails a moving duck — the spa lilypad's arc, scaled down.
// Drawn as its own element so it can be rotated to the heading without turning
// the duck itself. The viewBox is centred on the duck's waterline and the arcs
// sit at negative x, so rotating to atan2(vy,vx) always trails behind.
//
// The kit draws two arcs at fixed distances and drives their OPACITY off speed,
// which is right for a lilypad that gets shoved and then stops. A duck under a
// steady current would just wear a decal. So the same arc is emitted three times
// on one staggered loop: each is born small at the tail, spreads, drifts back
// and dies, which is what a wake actually does. Speed still gates the whole
// element's opacity, so the app's 0.16 ceiling is untouched.
const WAKE_ARC =
  'd="M -8,-10 Q -18,0 -8,10" fill="none" stroke="#D2DCDB" stroke-width="1.6" stroke-linecap="round"';

export const WAKE_SVG =
  '<svg viewBox="-24 -24 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<path class="dd-wk" style="animation-delay:-1.133s" ' + WAKE_ARC + '/>' +
    '<path class="dd-wk" style="animation-delay:-0.567s" ' + WAKE_ARC + '/>' +
    '<path class="dd-wk" ' + WAKE_ARC + '/>' +
  '</svg>';

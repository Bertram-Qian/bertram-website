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
 * @param {string} accKey  a key of `A` — 'crown' | 'chef' | 'scarf' | 'tophat' | 'bucket'
 */
export function duckSprite(fill, accKey) {
  const acc = A[accKey] || '';
  const vb = DUCK_VIEWBOX;
  // The cast shadow and the waterline are grouped as `.dd-wet` so they can be
  // taken away the moment the duck leaves the water — lifted out on a finger,
  // or perched on the board. A duck sitting on a wooden rail with a wave
  // crossing its chest is the sort of detail that makes the whole thing read
  // as decoration rather than as a scene.
  return (
    `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
      '<g class="dd-wet">' +
        '<ellipse cx="46.4" cy="45.4" rx="11.4" ry="2.4" fill="#1E2830" fill-opacity="0.22"/>' +
      '</g>' +
      duckBody(fill, 1.55, INK) +
      acc +
      `<g class="dd-wet">${WATERLINE}</g>` +
    '</svg>'
  );
}

// The wake that trails a moving duck — the spa lilypad's two arcs, scaled down.
// Drawn as its own element so it can be rotated to the heading without turning
// the duck itself. The viewBox is centred on the duck's centre and the arcs sit
// at negative x, so rotating to atan2(vy,vx) always trails behind.
export const WAKE_SVG =
  '<svg viewBox="-24 -24 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<path d="M -8,-10 Q -18,0 -8,10" fill="none" stroke="#D2DCDB" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M -16,-6.5 Q -24,0 -16,6.5" fill="none" stroke="#D2DCDB" stroke-width="1.2" stroke-linecap="round" stroke-opacity="0.6"/>' +
  '</svg>';

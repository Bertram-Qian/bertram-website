/* ddkit.js — the dilly&dally art kit, as ES modules.
 *
 * An ESM port of /Users/bertramqian/dally/dillydallywebsite/assets/dd-landing-kit.js,
 * which is itself a 1:1 port of the app's SwiftUI drawing code. Every path `d`
 * string, coordinate and colour here is copied verbatim from that chain, so the
 * silhouettes match the app exactly:
 *
 *   duck + accessories  ← Components/Shop/DuckMark.swift, Notifications/OutWithYouMark.swift
 *   onsen               ← Components/Spa/SpaGeometry.swift, SpaSceneDraw.swift
 *   folded garment      ← Components/Items/IconShared.swift (FoldedShell)
 *
 * House rules, inherited and non-negotiable:
 *   · No gradients. Depth is 3-plane tonal stacking (rock3) and flat clipped washes.
 *   · Ink is #1A1A1A — near-black, never pure black.
 *   · Accessory colours are FIXED by design; only the duck body reads the colourway.
 */

export const INK = '#1A1A1A';
export const BUTTER = '#F2C94C';

/* ---------------------------------------------------------------- duck ---- */
// The duck itself: beak, head, body, eye — in the app's 0..100 art space.
export function duckBody(fill, sw = 1.5, ink = INK) {
  return (
    '<path d="M52.8,27.9 L58.2,28.3 C60.5,28.3 60.5,30.5 58.2,30.5 L52.8,30.7" fill="' + fill + '" stroke="' + ink + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="50.8" cy="29.3" r="5" fill="' + fill + '" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
    '<path d="M51.5,34.5 C46,34 41,34.2 37.6,34.9 C35.9,35.2 34.7,35.1 34.7,36.5 C34.7,38.3 35.4,40.9 37.4,42.9 C40.6,46.3 50.4,46.3 53.8,42.5 C56.4,39.5 55.7,34.9 51.5,34.5 Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
    '<circle cx="52.2" cy="28.2" r="1.35" fill="' + ink + '"/>'
  );
}

// The washtub + water wave the duck floats in (the app icon).
export function tub(ink = INK, sw = 1.7) {
  return (
    '<path d="M19,31 L30,73 L70,73 L81,31" fill="none" stroke="' + ink + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="M21.6,41 C26.5,37.5 31,38 38,42 C42,44.5 46,44.5 50,41 C55,37.5 60,37.5 65,41 C69,44.5 73.5,44.5 78.4,41" fill="none" stroke="' + ink + '" stroke-width="' + sw + '" stroke-linecap="round"/>'
  );
}

// The app icon (duck in a washtub) — the "14 11 72 72" art at 84% of the tile.
export function appIcon(fill = BUTTER, ink = INK) {
  return '<svg class="mk" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<g transform="translate(8,8) scale(1.16667) translate(-14,-11)">' + tub(ink, 1.7) + duckBody(fill, 1.35) + '</g></svg>';
}

// A bare duck "bust" (head + shoulders) with headroom above for an accessory.
export function duckBust(fill, acc) {
  return '<svg viewBox="31.5 14.5 32 33" xmlns="http://www.w3.org/2000/svg">' + duckBody(fill, 1.55) + (acc || '') + '</svg>';
}

/* --------------------------------------------------------- accessories ---- */
// The shop's real duck SETS, drawn in the duck's 0..100 art space over the
// shared head geometry (head centre 50.8,29.3 r≈5). Colours are fixed by design.
function acc(inner, fill, sw = 1.2) {
  return '<g fill="' + fill + '" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round">' + inner + '</g>';
}

export const A = {};

// crown — the three-spike crown (butter), resting on the head
A.crown = acc('<path d="M47.9,25.2 L47.4,21.9 L49.4,23.4 L50.9,21.3 L52.4,23.4 L54.4,21.9 L53.9,25.2 Z"/>', '#F2C94C');

// chef — the cream toque: puffed lobes over a band
A.chef = acc('<path d="M46.9,24 Q44.7,19.2 48.4,18.7 Q48.7,15.9 51.4,16.5 Q54.6,15.9 54.7,19 Q57.9,19.6 55,24 Z"/><rect x="46.4" y="23.4" width="8.8" height="2.8" rx="1"/>', '#FBF4E6');

// scarf — a rust band at the neck + a short hanging tail
A.scarf = acc('<rect x="46.5" y="32.6" width="8.6" height="2.9" rx="1.45"/><rect x="51.4" y="35.2" width="2.7" height="4.4" rx="1.3"/>', '#B5512E');

// tophat — charcoal cylinder + brim with a coral band across it.
// Ported from OutWithYouMark.swift:162-178. The band is fill-only: laid flush it
// would overpaint the inner half of both vertical ink outlines, so it sits inset
// 0.6 each side (the 2026-07-28 art audit).
A.tophat = acc(
  '<ellipse cx="50.8" cy="24.5" rx="6.6" ry="1.6"/>' +
  '<path d="M47,24.4 L47,18.5 Q47,17.7 47.8,17.7 L53.8,17.7 Q54.6,17.7 54.6,18.5 L54.6,24.4 Z"/>',
  '#26262A'
) + '<rect x="47.6" y="21.7" width="6.4" height="1.7" fill="#DB8A6A"/>';

// bucket — the beige bucket hat: flat-top crown + flared brim, tilted -6° about
// the crown pivot (50.8, 24.1) with a small leftward nudge, then a cream stitch
// riding the mid-band. Ported from OutWithYouMark.swift:242-282 with r = 5.2.
A.bucket = '<g transform="translate(-0.468,0) rotate(-6 50.8 24.1)">' +
  acc(
    '<path d="M46.952,24.1 L47.491,21.084 Q47.491,20.564 47.952,20.564 L53.648,20.564 Q54.109,20.564 54.109,21.084 L54.648,24.1 Z"/>' +
    '<path d="M46.848,22.956 L44.04,25.972 Q44.04,26.544 44.612,26.544 L56.988,26.544 Q57.56,26.544 57.56,25.972 L54.752,22.956 Z"/>',
    '#D4C3A3'
  ) +
  '<path d="M45.08,25.348 L56.52,25.348" fill="none" stroke="#FBF4E6" stroke-width="0.74" stroke-linecap="round"/>' +
  '</g>';

/* ------------------------------------------------------------- sparkle ---- */
const STAR = 'M0,-5 C0.4,-1.5 1.5,-0.4 5,0 1.5,0.4 0.4,1.5 0,5 -0.4,1.5 -1.5,0.4 -5,0 -1.5,-0.4 -0.4,-1.5 0,-5 Z';
export function spark(size = 11, color = BUTTER) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="-6 -6 12 12" xmlns="http://www.w3.org/2000/svg"><path d="' + STAR + '" fill="' + color + '"/></svg>';
}

/* --------------------------------------------------------------- chair ---- */
// The pile tab's dining chair, flat-fill papercraft.
//
// ⚠️ The tonal washes are ONE FLAT BLOCK each, CLIPPED to the member they
// shade — never a gradient, and never a separate rounded strip laid on top (a
// thin one takes r = w/2 and renders as a capsule "pill" sitting on the wood).
// Ported from `ChairArt.drawBar` / `drawPad`; keep the two in step.
const CS = '#1F1612', CL = '#FFFFFF', CG = '#1A1610';
let clipN = 0;

function bar(x, y, w, h, f, r) {
  r = r == null ? 1.6 : r;
  const id = 'cw' + ++clipN;
  const sw = Math.min(w * 0.36, w / 2), lw = Math.min(w * 0.24, w / 2);
  const body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`;
  return `<clipPath id="${id}">${body}/></clipPath>` +
    `${body} fill="${f}"/>` +
    `<g clip-path="url(#${id})">` +
      `<rect x="${x + w - sw}" y="${y}" width="${sw}" height="${h}" fill="${CS}" opacity="0.15"/>` +
      `<rect x="${x}" y="${y}" width="${lw}" height="${h}" fill="${CL}" opacity="0.10"/>` +
    '</g>';
}

function padBar(x, y, w, h, f, r) {
  r = r == null ? 4 : r;
  const id = 'cw' + ++clipN;
  const welt = Math.min(2.0, h * 0.42);
  const body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`;
  return `<clipPath id="${id}">${body}/></clipPath>` +
    `${body} fill="${f}"/>` +
    `<g clip-path="url(#${id})">` +
      `<rect x="${x}" y="${y + h - welt}" width="${w}" height="${welt}" fill="${CS}" opacity="0.13"/>` +
    '</g>';
}

/** The dining chair. `f` frame, `c` cushion. */
export function chair(f = '#5F4A38', c = '#F0997B') {
  const grd = `<ellipse cx="50" cy="93" rx="30" ry="2.8" fill="${CG}" opacity="0.18"/>`;
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    grd +
    bar(24, 15, 4, 44, f) + bar(72, 15, 4, 44, f) +
    `<path d="M24,18 Q50,11 76,18 L76,21.5 Q50,14.5 24,21.5 Z" fill="${f}"/>` +
    `<path d="M28,38 Q50,40.5 72,38 L72,41 Q50,43.5 28,41 Z" fill="${f}"/>` +
    bar(25, 58, 50, 5, f) + padBar(24, 54, 52, 4.5, c, 2.2) +
    bar(25, 62, 4, 30, f) + bar(71, 62, 4, 30, f) + bar(27, 84, 46, 2.6, f) +
  '</svg>';
}

/* ------------------------------------------------------------ garment ---- */
// The app's exact folded garment — `FoldedShell` (IconShared.swift): the chunky
// papercraft stack, a darker top-fold band, and a fold-edge highlight. Flat
// fills, no outline — like the app.
export function garment(cloth) {
  return `<svg viewBox="15 33 70 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${garmentInner(cloth)}</svg>`;
}

export function garmentInner(cloth) {
  return '<path d="M 18,38 C 18,36 20,35 22,35 L 78,35 C 80,35 82,36 82,38 L 82,62 C 82,64 80,65 78,65 L 22,65 C 20,65 18,64 18,62 Z" fill="' + cloth + '"/>' +
    '<path d="M 18,38 C 18,36 20,35 22,35 L 78,35 C 80,35 82,36 82,38 L 82,46 C 60,48 40,48 18,46 Z" fill="#1F1612" fill-opacity="0.2"/>' +
    '<path d="M 18,46 C 40,47 60,47 82,46 L 82,48 C 60,49 40,49 18,48 Z" fill="#FFFFFF" fill-opacity="0.14"/>';
}

/* ------------------------------------------------- small svg helpers ----- */
export function rc(x, y, w, h, f, r, op) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' +
    (r ? ' rx="' + r + '"' : '') + ' fill="' + f + '"' + (op != null ? ' fill-opacity="' + op + '"' : '') + '/>';
}
export function ln(x1, y1, x2, y2, c, w, op) {
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + w + '"' +
    (op != null ? ' stroke-opacity="' + op + '"' : '') + '/>';
}
export function el(cx, cy, rx, ry, f, op) {
  return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (op != null ? ' fill-opacity="' + op + '"' : '') + '/>';
}

/* ================================ the onsen ============================== */
// Day palette, verbatim from SpaSceneDraw.swift.
export const SPA_DAY = {
  water: '#3F525A', rockDark: '#5C4A38', rockMid: '#826F5C', rockLit: '#A89580',
  lD: '#6E6457', lM: '#948876', lH: '#B7AC98', lWin: '#3A3128', sky: '#FAFAF8'
};

// Wood, from the onsen bucket (oke).
export const WOOD = { body: '#C99B5C', stave: '#8B6A3A', rim: '#7A5A30', lit: '#A89580' };

export const WATER_PATH = 'M 0,340 Q 95,318 190,312 Q 285,318 380,340 L 380,448 Q 320,445 250,460 Q 160,485 80,452 Q 30,444 0,454 Z';

export const CAST_SHADOWS = [
  'M 0,338 C 18,342 38,344 50,344 C 70,344 90,343 102,340 C 108,335 112,332 120,334 C 130,336 138,336 144,335 C 150,332 156,328 162,334 C 180,336 200,338 218,336 C 238,336 252,333 264,334 C 278,336 286,336 290,334 C 296,332 300,329 304,334 C 316,338 334,342 350,344 C 366,344 376,342 380,338 L 380,348 C 366,352 350,352 332,348 C 314,344 300,340 296,340 C 294,340 292,340 290,343 C 286,344 278,344 264,342 C 254,343 240,345 218,346 C 198,346 178,344 162,342 C 158,342 152,344 144,346 C 138,346 130,346 120,344 C 116,344 110,346 102,350 C 90,353 70,354 50,353 C 36,352 16,350 0,346 Z',
  'M 28,338 C 38,343 49,352 51,360 C 53,366 49,373 35,374 C 20,376 11,377 11,380 C 18,386 25,392 28,398 C 30,402 27,404 22,406 C 12,410 5,412 5,415 C 9,418 18,420 28,422 C 40,430 50,442 52,448 C 54,456 50,462 44,462 L 56,460 C 60,452 60,442 56,434 C 50,424 38,422 32,422 C 22,422 16,418 22,412 C 30,406 38,402 38,395 C 39,390 37,386 33,382 C 24,378 18,380 28,376 C 38,376 50,374 54,366 C 58,358 60,350 58,344 C 50,340 40,340 28,338 Z'
];

export const BACK_ROCKS = [
  ['M 0,340 C 0,332 6,326 14,320 C 30,306 40,302 56,302 C 76,302 92,306 104,312 C 114,316 120,318 118,322 C 118,334 112,340 102,342 C 84,346 64,346 50,346 C 32,346 16,344 6,342 C 2,341 0,341 0,340 Z','M 0,340 C 0,332 6,326 14,320 C 30,306 40,302 56,302 C 76,302 92,306 104,312 C 114,316 120,318 118,322 C 117,333 111,338 101,340 C 83,344 64,344 50,344 C 32,344 16,342 6,340 C 2,340 0,340 0,340 Z','M 0,340 C 0,332 6,326 14,320 C 30,306 40,302 56,302 C 76,302 92,306 104,312 C 114,316 120,318 118,322 C 116,332 110,336 100,338 C 82,342 64,342 50,342 C 32,342 16,340 6,338 C 2,338 0,338 0,340 Z'],
  ['M 110,318 C 110,312 116,308 122,308 C 130,304 138,304 144,306 C 152,308 160,310 162,316 C 162,326 156,332 150,335 C 140,338 128,338 120,336 C 112,332 110,326 110,318 Z','M 110,318 C 110,312 116,308 122,308 C 130,304 138,304 144,306 C 152,308 160,310 162,316 C 161,325 155,331 149,334 C 139,336 128,336 120,335 C 113,331 110,326 110,318 Z','M 110,318 C 110,312 116,308 122,308 C 130,304 138,304 144,306 C 152,308 160,310 162,316 C 160,324 154,330 148,332 C 138,334 128,334 120,333 C 113,329 110,325 110,318 Z'],
  ['M 154,316 C 154,308 162,302 170,302 C 188,298 200,298 210,298 C 226,298 240,302 248,306 C 258,310 266,312 264,316 C 264,328 252,336 240,338 C 220,340 204,340 190,340 C 174,340 162,336 154,330 C 152,326 152,322 154,316 Z','M 154,316 C 154,308 162,302 170,302 C 188,298 200,298 210,298 C 226,298 240,302 248,306 C 258,310 266,312 264,316 C 263,326 251,334 239,337 C 220,338 204,338 190,338 C 174,338 162,334 154,328 C 152,324 152,321 154,316 Z','M 154,316 C 154,308 162,302 170,302 C 188,298 200,298 210,298 C 226,298 240,302 248,306 C 258,310 266,312 264,316 C 262,324 250,332 237,335 C 219,336 204,336 190,336 C 174,336 162,332 154,326 C 152,322 152,320 154,316 Z'],
  ['M 256,316 C 256,310 262,306 270,306 C 278,304 286,304 290,306 C 296,308 302,310 304,316 C 304,326 298,334 290,336 C 280,338 270,338 264,336 C 258,332 256,326 256,316 Z','M 256,316 C 256,310 262,306 270,306 C 278,304 286,304 290,306 C 296,308 302,310 304,316 C 303,325 297,332 290,334 C 280,336 270,336 264,335 C 259,331 256,326 256,316 Z','M 256,316 C 256,310 262,306 270,306 C 278,304 286,304 290,306 C 296,308 302,310 304,316 C 302,324 296,330 289,332 C 279,334 270,334 264,333 C 259,329 256,324 256,316 Z'],
  ['M 296,316 C 296,308 304,304 314,304 C 328,302 340,304 348,306 C 364,310 374,314 376,318 C 380,326 380,334 380,340 C 368,344 350,346 334,344 C 318,342 304,338 300,334 C 296,328 294,322 296,316 Z','M 296,316 C 296,308 304,304 314,304 C 328,302 340,304 348,306 C 364,310 374,314 376,318 C 379,325 379,332 379,338 C 367,342 350,344 334,342 C 318,340 304,336 300,333 C 296,327 294,321 296,316 Z','M 296,316 C 296,308 304,304 314,304 C 328,302 340,304 348,306 C 364,310 374,314 376,318 C 378,324 378,330 378,336 C 366,340 350,342 334,340 C 318,338 304,335 300,332 C 296,326 294,320 296,316 Z']
];

export const LEFT_ROCKS = [
  ['M 0,340 C 14,336 22,336 28,338 C 40,342 48,346 50,354 C 54,366 52,372 44,374 C 30,378 16,380 8,376 C 2,374 0,372 0,340 Z','M 0,340 C 14,336 22,336 28,338 C 40,342 46,346 48,354 C 52,365 50,370 42,372 C 29,375 15,377 8,373 C 2,371 0,369 0,340 Z','M 0,340 C 14,336 22,336 28,338 C 40,342 46,346 48,354 C 50,364 48,368 40,370 C 28,372 14,374 8,370 C 2,368 0,366 0,340 Z'],
  ['M 0,372 C 12,374 22,378 26,382 C 32,392 32,398 26,402 C 18,408 10,410 4,410 C 2,408 0,406 0,372 Z','M 0,372 C 12,374 20,378 24,382 C 30,391 30,396 24,400 C 16,405 9,407 4,407 C 2,405 0,403 0,372 Z','M 0,372 C 12,374 20,378 24,382 C 28,390 28,394 22,398 C 14,402 8,404 4,404 C 2,402 0,400 0,372 Z'],
  ['M 0,406 C 14,414 22,418 28,420 C 40,428 50,438 52,446 C 54,458 50,462 42,462 C 26,462 12,462 6,460 C 2,460 0,460 0,406 Z','M 0,406 C 14,414 22,418 28,420 C 40,428 48,437 50,445 C 52,456 48,460 41,460 C 26,460 12,460 6,458 C 2,458 0,458 0,406 Z','M 0,406 C 14,414 22,418 28,420 C 40,428 46,436 48,444 C 50,454 46,458 40,458 C 26,458 12,458 6,456 C 2,456 0,456 0,406 Z']
];

export const RIGHT_ROCKS = [
  ['M 380,340 C 366,336 354,338 352,340 C 336,344 326,348 322,354 C 318,366 318,374 322,380 C 332,388 344,392 354,394 C 368,394 376,392 380,388 C 380,386 380,360 380,340 Z','M 380,340 C 366,336 354,338 352,340 C 336,344 326,348 322,354 C 319,365 319,373 324,378 C 334,386 344,390 354,392 C 368,392 376,390 380,387 C 380,385 380,360 380,340 Z','M 380,340 C 366,336 354,338 352,340 C 336,344 326,348 322,354 C 320,364 320,372 326,376 C 336,384 344,388 354,390 C 368,390 376,388 380,386 C 380,384 380,360 380,340 Z'],
  ['M 380,386 C 368,394 362,398 358,402 C 350,412 348,420 352,426 C 360,430 370,432 376,432 C 380,430 380,420 380,386 Z','M 380,386 C 368,394 362,398 358,402 C 351,411 349,419 353,424 C 360,428 370,430 376,430 C 380,428 380,419 380,386 Z','M 380,386 C 368,394 362,398 358,402 C 352,410 350,418 354,422 C 360,426 370,428 376,428 C 380,426 380,418 380,386 Z'],
  ['M 380,428 C 366,432 358,436 354,438 C 348,446 348,452 350,456 C 358,460 368,462 374,462 C 380,460 380,448 380,428 Z','M 380,428 C 366,432 358,436 354,438 C 349,445 349,451 351,454 C 358,458 368,460 373,460 C 380,458 380,448 380,428 Z','M 380,428 C 366,432 358,436 354,438 C 350,444 350,450 352,452 C 358,456 368,458 372,458 C 380,456 380,448 380,428 Z']
];

export const FRONT_ROCKS = [
  ['M 0,452 C 24,448 56,446 80,450 C 110,453 130,455 140,458 C 144,464 138,470 130,475 C 100,478 70,478 50,476 C 24,474 8,472 0,470 Z','M 0,452 C 24,448 56,446 80,450 C 110,453 130,455 140,458 C 143,463 137,468 128,472 C 100,475 70,475 50,473 C 24,472 8,471 0,468 Z','M 0,452 C 24,448 56,446 80,450 C 110,453 130,455 140,458 C 142,462 136,466 126,470 C 100,473 70,473 50,471 C 24,470 8,469 0,466 Z'],
  ['M 130,460 C 160,452 200,450 232,453 C 252,454 262,454 265,455 C 268,470 256,482 220,486 C 184,488 152,484 138,478 C 130,474 128,468 130,460 Z','M 130,460 C 160,452 200,450 232,453 C 252,454 262,454 265,455 C 267,468 254,480 219,484 C 184,486 152,482 138,477 C 131,473 128,467 130,460 Z','M 130,460 C 160,452 200,450 232,453 C 252,454 262,454 265,455 C 266,466 252,478 218,482 C 184,484 152,480 138,475 C 131,471 128,466 130,460 Z'],
  ['M 258,470 C 254,462 260,450 274,446 C 292,442 310,442 322,444 C 348,446 372,449 380,450 C 380,456 380,461 378,466 C 360,472 332,472 318,470 C 296,468 274,470 260,472 C 258,471 258,470 258,470 Z','M 258,470 C 254,462 260,450 274,446 C 292,442 310,442 322,444 C 348,446 372,449 380,450 C 380,455 380,460 378,465 C 359,471 332,471 318,469 C 296,467 274,469 260,470 C 258,470 258,470 258,470 Z','M 258,470 C 254,462 260,450 274,446 C 292,442 310,442 322,444 C 348,446 372,449 380,450 C 380,454 380,458 378,463 C 358,469 332,469 318,468 C 296,466 274,468 260,469 C 258,469 258,470 258,470 Z']
];

const MOSS_DOTS = [[2.2, 0, 0, '#4A8A6D'], [1.8, 3.4, 0.6, '#3B7A5D'], [1.5, -2.8, 0.4, '#4A8A6D'], [1.6, 1.2, -1.8, '#5DA181'], [1.3, -1, -1.6, '#3B7A5D']];

// A boulder: three stacked planes sharing one top curve. This is the whole
// papercraft trick — it is what gives depth without a single gradient.
export function rock3(r) {
  return '<path d="' + r[0] + '" fill="' + SPA_DAY.rockDark + '"/><path d="' + r[1] + '" fill="' + SPA_DAY.rockMid + '"/><path d="' + r[2] + '" fill="' + SPA_DAY.rockLit + '"/>';
}

export function mossTuft(m) {
  let g = '<g transform="translate(' + m[0] + ',' + m[1] + ') scale(' + m[2] + ')">';
  for (const d of MOSS_DOTS) g += '<circle cx="' + d[1] + '" cy="' + d[2] + '" r="' + d[0] + '" fill="' + d[3] + '"/>';
  return g + '</g>';
}

// The stone lantern (yukimi-dōrō). Authored at (330,308); parameterised here so
// the wide scene can stand one on each bank.
export function lantern(x = 330, y = 308, scale = 1) {
  const D = SPA_DAY.lD, M = SPA_DAY.lM, H = SPA_DAY.lH, W = SPA_DAY.lWin;
  return '<g transform="translate(' + x + ',' + y + ')' + (scale !== 1 ? ' scale(' + scale + ')' : '') + '">' +
    el(0, 3, 22, 3.8, '#1A1610', 0.32) +
    '<path d="M -17,2 L -17,-1 L -15,-4 L 15,-4 L 17,-1 L 17,2 Z" fill="' + D + '"/>' +
    '<path d="M -16,1 L -16,-1 L -14,-3.5 L 14,-3.5 L 16,-1 L 16,1 Z" fill="' + M + '"/>' +
    '<path d="M -14,0 L -14,-1 L -13,-3 L 13,-3 L 14,-1 L 14,0 Z" fill="' + H + '"/>' +
    rc(-11, -7, 22, 3, D) + rc(-10, -7, 20, 2, M) +
    rc(-5, -19, 10, 12, D) + rc(-4, -19, 8, 12, M) + rc(-2, -19, 4, 12, H, 0, 0.85) +
    rc(-12, -22, 24, 3, D) + rc(-11, -22.5, 22, 2, M) +
    rc(-11, -39, 22, 17, D, 2) + rc(-10, -39, 20, 17, M, 1.8) + rc(-9, -39, 18, 17, H, 1.5, 0.95) +
    rc(-4, -36, 8, 11, W, 0.6) +
    rc(-13, -41, 26, 2, D) + rc(-12, -41.5, 24, 1.5, M) +
    '<path d="M -20,-41 C -22,-44 -20,-48 -16,-50 C -10,-52 -5,-53 0,-53 C 5,-53 10,-52 16,-50 C 20,-48 22,-44 20,-41 L -20,-41 Z" fill="' + D + '"/>' +
    '<path d="M -19,-41.5 C -21,-44 -19,-47.5 -15,-49.5 C -10,-51.5 -5,-52.5 0,-52.5 C 5,-52.5 10,-51.5 15,-49.5 C 19,-47.5 21,-44 19,-41.5 L -19,-41.5 Z" fill="' + M + '"/>' +
    '<path d="M -17,-42 C -19,-44 -17,-47 -13,-49 C -8,-50.5 -4,-51.5 0,-51.5 C 4,-51.5 8,-50.5 13,-49 C 17,-47 19,-44 17,-42 L -17,-42 Z" fill="' + H + '"/>' +
    rc(-1.2, -54.5, 2.4, 2, D) +
    el(0, -56.5, 2, 2.2, D) + el(0, -56.8, 1.6, 1.8, M) + el(-0.4, -57.4, 0.6, 0.7, H) +
    '<path d="M -0.4,-58.7 L 0.4,-58.7 L 0,-60 Z" fill="' + D + '"/>' +
  '</g>';
}

// The wooden bucket (oke). Authored at (96,443); parameterised for the wide scene.
export function bucket(x = 96, y = 443, scale = 1) {
  return '<g transform="translate(' + x + ',' + y + ')' + (scale !== 1 ? ' scale(' + scale + ')' : '') + '">' +
    el(1, 12, 15, 3.2, '#2A2520', 0.18) + el(0, -9, 12, 3, '#A89580') +
    '<path d="M -12,-9 Q -13,0 -10,11 L 10,11 Q 13,0 12,-9 Z" fill="#C99B5C"/>' +
    ln(-7, -9, -6, 11, '#8B6A3A', 0.6, 0.75) + ln(-2.5, -9, -2, 11, '#8B6A3A', 0.6, 0.75) +
    ln(2.5, -9, 2, 11, '#8B6A3A', 0.6, 0.75) + ln(7, -9, 6, 11, '#8B6A3A', 0.6, 0.75) +
    '<ellipse cx="0" cy="-9" rx="12" ry="3" fill="none" stroke="#7A5A30" stroke-width="0.8"/>' +
    '<path d="M -10,9 Q 0,12 10,9" fill="none" stroke="#7A5A30" stroke-width="0.8"/>' +
    el(0, -9, 11, 2.4, '#3F525A') +
    '<path d="M -5,-9.5 Q 0,-10.4 5,-9.5" fill="none" stroke="#6A7E86" stroke-width="0.5" stroke-opacity="0.7"/>' +
  '</g>';
}

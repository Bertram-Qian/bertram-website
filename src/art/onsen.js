/* onsen.js — the pond Bertram's ducks live in.
 *
 * The app's onsen is authored in a 380×600 portrait art space for a phone. A
 * laptop needs something roughly twice as wide, and stretching the scene would
 * smear the papercraft rocks — the whole point of rock3() is three crisp planes
 * sharing one top curve. So the wide scene is COMPOSED from the same primitives
 * instead: the rock banks are emitted twice, the second copy mirrored about the
 * midline and nudged in y, with the moss hand-placed (never mirrored) so the
 * repeat doesn't read as a mirror. Mirroring is safe here because rock3 stacks
 * its planes vertically — the lit plane is the top face, not a side face — so a
 * horizontal flip doesn't invert the light.
 *
 * Two compositions, one builder:
 *   wide  — 760 art units across, the station board standing on the far bank
 *   phone — the app's own 380-wide pond, with the board below the water instead
 *
 * Everything the rest of the app needs to position HTML over the scene comes
 * back in the return value, already expressed in FINAL scene coordinates (i.e.
 * with the onsen group's shift + squash baked in). The scene renders with
 * preserveAspectRatio="xMidYMid meet" into a container whose aspect-ratio
 * matches the viewBox, which makes viewBox → container a pure linear map:
 *     left% = (x - vb.x) / vb.w * 100
 * No getScreenCTM, no resize maths, exact co-registration with the SVG.
 */

import {
  SPA_DAY, WOOD, WATER_PATH, CAST_SHADOWS,
  BACK_ROCKS, LEFT_ROCKS, RIGHT_ROCKS, FRONT_ROCKS,
  rock3, mossTuft, lantern, bucket, rc,
} from './ddkit.js';

/* ------------------------------------------------------------- the wide bank */

// A wide pond, authored in the same idiom as WATER_PATH: a shallow far shore
// that dips toward the middle distance, and an irregular near shore.
const WIDE_WATER =
  'M 0,342 Q 90,322 190,316 Q 290,310 380,308 Q 470,310 570,316 Q 670,322 760,342 ' +
  'L 760,452 Q 700,448 640,458 Q 560,472 480,462 Q 400,452 320,464 Q 240,480 160,468 Q 90,456 40,458 Q 16,459 0,456 Z';

// The far-bank cast shadow, widened. Same low-contrast strip that keeps the
// rocks from floating on the water.
const WIDE_CAST =
  'M 0,340 C 40,346 90,349 140,348 C 200,347 250,343 300,341 C 340,339 370,338 380,338 ' +
  'C 400,338 440,340 490,342 C 550,345 610,348 670,348 C 710,348 740,345 760,340 ' +
  'L 760,350 C 730,356 690,358 650,357 C 590,356 530,352 480,350 C 440,348 400,347 380,347 ' +
  'C 355,347 310,349 260,352 C 200,355 140,357 90,356 C 50,355 20,350 0,346 Z';

// Moss, placed by hand across the full width. This is the single thing that
// breaks the mirror — six tufts on the left bank, five on the right, none of
// them at reflected coordinates.
const WIDE_MOSS = [
  [38, 306, 1], [78, 304, 0.85], [186, 300, 1], [244, 303, 0.9], [318, 299, 1],
  [402, 302, 0.8], [466, 300, 0.95], [536, 305, 0.85], [614, 301, 1], [688, 307, 0.9],
  [22, 340, 0.7], [14, 410, 0.8], [740, 344, 0.75], [750, 402, 0.7],
  [46, 448, 0.85], [170, 458, 0.9], [268, 452, 0.75], [372, 462, 0.85],
  [468, 455, 0.8], [582, 460, 0.9], [700, 450, 0.8],
];

// No steam in this pond. The app's wisps rise 56 units off the water, which
// here puts them straight across the face of the project board — the one thing
// on the page that has to stay legible. The glints below keep the water alive
// without ever crossing the frame.

// Slow water glints for the wide frame — a wide pond with nothing moving on it
// reads as a painting rather than water.
function wideGlints() {
  const g = [[96, 402, 30], [206, 424, 38], [330, 410, 30], [452, 428, 34], [566, 408, 30], [672, 422, 26]];
  return g.map((v, i) =>
    `<path class="dd-glint" style="animation-delay:${(i * 1.9).toFixed(1)}s" d="M ${v[0]},${v[1]} q ${v[2] / 2},-3 ${v[2]},0" fill="none" stroke="#D2DCDB" stroke-width="1.2" stroke-linecap="round" stroke-opacity="0"/>`
  ).join('');
}

/* ------------------------------------------------------- the station board */

// Papercraft wood: a flat body with one shade block down the shaded edge and one
// light block down the lit edge. Not a gradient — two flat rects at low opacity,
// which is the same trick bar()/pad() use for the chair.
function woodPanel(x, y, w, h, r = 3) {
  const sw = Math.min(w * 0.13, 24);
  const lw = Math.min(w * 0.09, 16);
  return rc(x, y, w, h, WOOD.body, r) +
    rc(x + w - sw, y, sw, h, '#1F1612', r, 0.14) +
    rc(x, y, lw, h, '#FFFFFF', r, 0.09);
}

// A few grain lines, borrowed from the bucket's staves.
function grain(x, y, w, h, n = 4) {
  let s = '';
  for (let i = 1; i <= n; i++) {
    const gx = x + (w * i) / (n + 1);
    s += `<line x1="${gx.toFixed(1)}" y1="${y + 2}" x2="${(gx + 0.8).toFixed(1)}" y2="${y + h - 2}" stroke="${WOOD.stave}" stroke-width="0.6" stroke-opacity="0.32"/>`;
  }
  return s;
}

// The board: a roof rail, a frame built from four separate members, a paper
// well, and (on the wide scene) two posts planted behind the far-bank rocks.
//
// The frame is four members rather than one rectangle because each member needs
// its OWN shade and light band — that is what makes joinery read as joinery.
// One big panel with one wash puts a 24-unit dark band down a 9-unit stile and
// the frame looks lopsided rather than lit.
function board(b, withPosts) {
  const { roof, frame, media, posts } = b;
  const t = media.y - frame.y;                     // rail thickness
  const rightStileX = frame.x + frame.w - t;
  const bottomRailY = media.y + media.h;
  let s = '';
  if (withPosts) {
    for (const p of posts) s += woodPanel(p.x, p.y, p.w, p.h, 2);
  }
  s += woodPanel(roof.x, roof.y, roof.w, roof.h, 3);
  s += woodPanel(frame.x, frame.y, t, frame.h, 2);                       // left stile
  s += woodPanel(rightStileX, frame.y, t, frame.h, 2);                   // right stile
  s += woodPanel(frame.x, frame.y, frame.w, t, 2);                       // top rail
  s += woodPanel(frame.x, bottomRailY, frame.w, frame.y + frame.h - bottomRailY, 2);
  s += grain(frame.x, bottomRailY, frame.w, frame.y + frame.h - bottomRailY, 7);
  // The well is a sheet of paper pinned in the frame — an onsen notice board,
  // not a television. A clip brings its own dark background when one plays; an
  // empty board should not be a black void in the middle of a pale page.
  s += rc(media.x, media.y, media.w, media.h, SPA_DAY.sky, 2);
  s += `<rect x="${media.x + 0.5}" y="${media.y + 0.5}" width="${media.w - 1}" height="${media.h - 1}" rx="2" fill="none" stroke="${WOOD.rim}" stroke-width="1" stroke-opacity="0.4"/>`;
  // two pins, top corners
  for (const px of [media.x + 14, media.x + media.w - 14]) {
    s += `<circle cx="${px}" cy="${media.y + 12}" r="2.1" fill="${WOOD.rim}" fill-opacity="0.55"/>`;
  }
  return s;
}

/* --------------------------------------------------------------- layouts */

// Final scene coordinates: the onsen group is translated down by DY and squashed
// 0.95 about y=400, so an art-space y renders at  DY + 20 + 0.95·y.
const WIDE = {
  // Only a small shift: the pond sits close under the board so the whole scene
  // stays a landscape band (~1.9:1) rather than growing taller than a laptop
  // viewport. The near bank is cropped to a lip at the bottom of the frame.
  dy: 10,
  viewBox: { x: 0, y: 88, w: 760, h: 398 },
  // The pond is the WATER, not the frame. Rocks are drawn over the water path,
  // so the swimmable band is only what shows between the two banks — final y
  // ~360 to ~454 here. An ellipse any taller lets ducks ride up onto the rocks,
  // which is exactly what ry:70 did. The app keeps the same tight fit: pond
  // ry 46 against a pad radius of 26, so pads move in a very thin band.
  pond: { cx: 380, cy: 397, rx: 300, ry: 56 },
  duckR: 26,
  duckScale: 1.5,
  homes: [{ x: 200, y: 385 }, { x: 330, y: 410 }, { x: 470, y: 388 }, { x: 595, y: 405 }],
  board: {
    roof: { x: 226, y: 134, w: 308, h: 12 },
    frame: { x: 236, y: 146, w: 288, h: 171 },
    media: { x: 245, y: 155, w: 270, h: 153 },
    // No posts: the board's bottom rail meets the far bank, and the rocks are
    // drawn after it, so it reads as planted in the bank rather than propped.
    posts: [],
    drop: { x: 220, y: 122, w: 320, h: 200 },
    // The duck sits astride the roof rail rather than clear above it — a few
    // units of overlap, so the frame doesn't need a band of empty sky above it.
    perch: { x: 380, y: 115 },
  },
};

// The phone keeps the app's own portrait pond and moves the board BELOW the
// water: you drag a duck down to the shore instead of up to the far bank. Ducks
// are proportionally larger here — a 34px duck is not a tap target.
const PHONE = {
  dy: 0,
  viewBox: { x: 0, y: 300, w: 380, h: 400 },
  pond: { cx: 190, cy: 390, rx: 134, ry: 44 },
  duckR: 20,
  duckScale: 1.2,
  homes: [{ x: 120, y: 378 }, { x: 190, y: 402 }, { x: 250, y: 378 }, { x: 295, y: 394 }],
  board: {
    roof: { x: 26, y: 494, w: 328, h: 12 },
    frame: { x: 36, y: 506, w: 308, h: 182 },
    media: { x: 45, y: 515, w: 290, h: 164 },
    posts: [],
    drop: { x: 20, y: 480, w: 340, h: 212 },
    perch: { x: 190, y: 483 },
  },
};

export const LAYOUTS = { wide: WIDE, phone: PHONE };

/* ----------------------------------------------------------- the builder */

function wideInner() {
  let s = '';
  s += `<path d="${WIDE_WATER}" fill="${SPA_DAY.water}"/>`;
  s += `<path d="${WIDE_CAST}" fill="#1E2830" fill-opacity="0.26"/>`;
  // the left-bank vertical shadow, and its mirror on the right
  s += `<path d="${CAST_SHADOWS[1]}" fill="#1E2830" fill-opacity="0.26"/>`;
  s += `<g transform="translate(760,0) scale(-1,1)"><path d="${CAST_SHADOWS[1]}" fill="#1E2830" fill-opacity="0.26"/></g>`;

  s += lantern(92, 314, 0.9);
  s += lantern(668, 316, 0.96);

  // The banks are THREE overlapping runs of the authored set, not two mirrored
  // halves. A single mirror about the midline puts the same big boulder on both
  // sides of centre and the whole scene folds like a butterfly; three runs at
  // uneven offsets, one of them flipped, and each nudged in y, overlap into a
  // bank with no readable period.
  // Each run is also scaled vertically about the bank line, because offsetting
  // alone leaves a bank of identically-tall bumps — height variation is what
  // actually reads as different rocks.
  const back = BACK_ROCKS.map(rock3).join('');
  s += back;                                                        // 0 → 380
  s += `<g transform="matrix(-1,0,0,1.08,590,-25.6)">${back}</g>`;  // 210 → 590, flipped, 8% taller
  s += `<g transform="matrix(1,0,0,0.93,400,22.4)">${back}</g>`;    // 400 → 780, 7% shorter

  // Side banks stay where they were authored — LEFT at the left edge, RIGHT
  // pushed out to the new right edge. (Drawing RIGHT_ROCKS untranslated in a
  // 760-wide space is what parked a boulder in the middle of the water.)
  s += LEFT_ROCKS.map(rock3).join('');
  s += `<g transform="translate(380,0)">${RIGHT_ROCKS.map(rock3).join('')}</g>`;

  const front = FRONT_ROCKS.map(rock3).join('');
  s += front;                                                        // 0 → 380
  s += `<g transform="matrix(-1,0,0,1.06,620,-27.6)">${front}</g>`;  // 240 → 620, flipped
  s += `<g transform="matrix(1,0,0,0.95,390,23)">${front}</g>`;      // 390 → 770

  s += WIDE_MOSS.map(mossTuft).join('');
  s += bucket(96, 443);
  s += bucket(672, 449, 0.85);
  s += wideGlints();
  return s;
}

function phoneInner() {
  let s = '';
  s += `<path d="${WATER_PATH}" fill="${SPA_DAY.water}"/>`;
  for (const c of CAST_SHADOWS) s += `<path d="${c}" fill="#1E2830" fill-opacity="0.26"/>`;
  s += lantern();
  s += BACK_ROCKS.map(rock3).join('');
  s += [[38, 306, 1], [78, 304, 0.85], [186, 300, 1], [218, 302, 1], [328, 304, 1], [358, 310, 0.9]].map(mossTuft).join('');
  s += LEFT_ROCKS.map(rock3).join('');
  s += RIGHT_ROCKS.map(rock3).join('');
  s += [[22, 340, 0.7], [14, 410, 0.8], [346, 340, 0.8], [368, 400, 0.7]].map(mossTuft).join('');
  s += FRONT_ROCKS.map(rock3).join('');
  s += [[46, 448, 0.85], [170, 458, 0.9], [232, 454, 0.75], [298, 447, 0.85]].map(mossTuft).join('');
  s += bucket();
  s += [[70, 396, 26], [166, 418, 30], [268, 404, 24]]
    .map((v, i) => `<path class="dd-glint" style="animation-delay:${i * 2.4}s" d="M ${v[0]},${v[1]} q ${v[2] / 2},-3 ${v[2]},0" fill="none" stroke="#D2DCDB" stroke-width="1.2" stroke-linecap="round" stroke-opacity="0"/>`)
    .join('');
  return s;
}

/**
 * Build a scene.
 * @param {'wide'|'phone'} layout
 * @returns the SVG markup plus every coordinate the overlay needs, in final
 *          scene space.
 */
export function buildOnsen(layout = 'wide') {
  const L = layout === 'phone' ? PHONE : WIDE;
  const vb = L.viewBox;
  const inner = layout === 'phone' ? phoneInner() : wideInner();

  // Draw order matters: the board goes down BEFORE the onsen group, so the
  // far-bank rocks overlap the bottoms of its posts and the board reads as
  // planted behind them rather than pasted on top.
  const svg =
    `<svg class="dd-scene" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
      `<rect x="${vb.x - 40}" y="${vb.y - 40}" width="${vb.w + 80}" height="${vb.h + 80}" fill="${SPA_DAY.sky}"/>` +
      board(L.board, layout !== 'phone') +
      `<g class="dd-og" transform="translate(0,${L.dy}) translate(0,400) scale(1,0.95) translate(0,-400)">${inner}</g>` +
    '</svg>';

  return {
    svg,
    layout,
    viewBox: vb,
    pond: L.pond,
    duckR: L.duckR,
    duckScale: L.duckScale,
    homes: L.homes,
    board: L.board,
    aspect: vb.w / vb.h,
  };
}

/** viewBox coordinate → percentage of the scene container. */
export function toPct(vb, x, y) {
  return { left: ((x - vb.x) / vb.w) * 100, top: ((y - vb.y) / vb.h) * 100 };
}

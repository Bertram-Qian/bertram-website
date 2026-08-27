/* voicelines.js — what the ducks say.
 *
 * Dilly&Dally's clothes talk (GarmentCharacter.swift). Its tone contract is
 * explicit about two things that look like typos and are not:
 *
 *   · lowercase by default, "but ALL-CAPS allowed for shouting"
 *   · "contractions often written without an apostrophe at all (im, dont,
 *     didnt) — that is deliberate, don't 'fix' it"
 *
 * So `PICK ME PICK ME` shouts and `dont` keeps its missing apostrophe. These
 * six are Bertram's, verbatim, and nothing here should tidy them.
 */

export const VOICELINES = [
  'PICK ME PICK ME',
  'take a peeek',
  'meow',
  'quack',
  'dont pick me please i like the water',
  'can we order takeout',
];

// The app's own picker (GarmentCharacter.pick(from:)): remember the last two
// lines and prefer anything else, so back-to-back taps never land the same line
// twice. A pool this small repeats visibly without it.
let recent = [];

export function pickLine() {
  const fresh = VOICELINES.filter((l) => !recent.includes(l));
  const pool = fresh.length ? fresh : VOICELINES;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  recent.push(choice);
  if (recent.length > 2) recent = recent.slice(-2);
  return choice;
}

/* projects.js — the cast.
 *
 * One duck per project. Colourways come from the shop's LogoCatalog and
 * accessories from DuckSetCatalog, so every duck here is one a Dilly&Dally
 * player could actually own. Accessory colours are fixed by design — only
 * `colour` varies.
 */

const base = import.meta.env.BASE_URL;

export const PROJECTS = [
  {
    id: 'dillydally',
    name: 'dilly&dally',
    colour: '#F2C94C',   // butter — the app-icon duck
    accessory: 'crown',
    kind: 'toy',         // a live onsen, not a clip
    eyebrow: 'ios · swiftui',
    blurb: 'a cozy home for your closet. log what you wear, befriend your favourite clothes, and let your week become a keepsake.',
    // the station renders the app's own spa scene, live and swipeable
    links: [
      { label: 'visit dilly-dally.app', href: 'https://dilly-dally.app', primary: true },
    ],
  },
  {
    id: 'trim',
    name: 'trim',
    colour: '#8FA66C',   // sage
    accessory: 'chef',
    kind: 'video',
    src: `${base}media/trim.mp4`,
    poster: `${base}media/trim.jpg`,
    eyebrow: 'product design',
    blurb: 'need some help with cutting? trim the calories down. a nutrition tracker built around one honest number a day.',
    links: [
      { label: 'try the live demo', href: `${base}trim.html`, primary: true },
    ],
  },
  {
    id: 'guitar',
    name: 'auto guitar tab scroller',
    colour: '#5B7A99',   // denim
    accessory: 'tophat',
    kind: 'video',
    src: `${base}media/guitar.mp4`,
    poster: `${base}media/guitar.jpg`,
    eyebrow: 'ios · swift',
    blurb: 'a music sheet scroller that runs at a set speed, or listens, and follows along with your playing.',
    links: [
      { label: 'view on github', href: 'https://github.com/Bertram-Qian/GuitarTabScroller', primary: true },
    ],
  },
  {
    id: 'studycrew',
    name: 'study crew',
    colour: '#B5512E',   // rust
    accessory: 'bucket',
    kind: 'video',
    src: `${base}media/study-crew.mp4`,
    poster: `${base}media/study-crew.jpg`,
    eyebrow: 'chrome extension',
    blurb: 'a mini construction crew that builds barriers over distracting tabs, so the focus is somebody else’s job for once.',
    links: [
      { label: 'view on github', href: 'https://github.com/Bertram-Qian/Study-Crew', primary: true },
    ],
  },
];

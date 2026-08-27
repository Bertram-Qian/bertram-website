/* Station.jsx — what fills the stall's well.
 *
 * Nothing here is a lightbox or an overlay: the media sits inside the wooden
 * stall that is already part of the scene, and the duck perched on the beam is
 * the one that put it there. The out-then-in swap lives one level up in
 * Stall.jsx, so the media and the copy beside it change on the same beat.
 */

import { useEffect, useRef, useState } from 'react';
import ChairPileToy from './ChairPileToy.jsx';

// The old site autoplayed three clips the moment the page opened. Here the
// element does not exist until a duck is on the beam, which is a stronger
// guarantee than any preload hint — and `preload="none"` is actively wrong:
// Chrome honours it over `autoplay` and never fetches, leaving a blank frame.
function Clip({ src, poster, name }) {
  const ref = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    setBlocked(false);
    setFailed(false);
    // React sets `muted` as a DOM property but does not always emit the
    // attribute, and an autoplay policy that reads the attribute will refuse to
    // start — leaving the poster up forever, which looks exactly like "the
    // video is broken". Set it on the element before asking to play.
    v.muted = true;
    v.defaultMuted = true;

    const go = () => { v.play?.().catch(() => {}); };
    go();
    // A first attempt can land before there are frames to show; try again once
    // the browser says it has some.
    v.addEventListener('loadeddata', go);
    v.addEventListener('canplay', go);

    // Muted inline autoplay is *usually* allowed, but not always: macOS and iOS
    // Low Power Mode refuse it outright, and some data-saver modes do too. When
    // that happens the poster sits there looking like a bug, so after a beat we
    // offer the one thing that always works — a real user gesture.
    const check = setTimeout(() => {
      if (v.paused) setBlocked(true);
    }, 1600);

    return () => {
      clearTimeout(check);
      v.removeEventListener('loadeddata', go);
      v.removeEventListener('canplay', go);
    };
  }, [src]);

  // If the clip itself can't be decoded or fetched, fall back to the still.
  // The well should never be a black rectangle — that reads as broken, where a
  // frame of the project reads as a photo pinned to a notice board.
  if (failed) return <img className="dd-clip" src={poster} alt={`${name} — still`} />;

  return (
    <div className="dd-clip-wrap">
      <video
        className="dd-clip"
        ref={ref}
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        tabIndex={-1}
        aria-hidden="true"
        onPlaying={() => setBlocked(false)}
        onError={() => setFailed(true)}
      />
      {blocked && (
        <button
          type="button"
          className="dd-play"
          aria-label={`play the ${name} demo`}
          onClick={() => { const v = ref.current; v.muted = true; v.play?.().catch(() => {}); }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5 18 12 9 17.5 Z" /></svg>
        </button>
      )}
    </div>
  );
}

export default function Station({ project, reduce }) {
  if (!project) return null;
  return project.kind === 'toy'
    ? <ChairPileToy key={project.id} reduce={reduce} />
    : <Clip key={project.id} src={project.src} poster={project.poster} name={project.name} />;
}

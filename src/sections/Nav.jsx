import { useEffect, useState } from 'react';
import { appIcon, BUTTER } from '../art/ddkit.js';

const MARK = appIcon(BUTTER);

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  // The hero is one duck and two lines and nothing else on the screen. A bar
  // across the top of it is exactly the "nothing else" it is trying not to have,
  // so the nav waits until the hero has faded before it arrives.
  //
  // The threshold is read off the hero wrapper rather than hard-coded: it is
  // 200vh tall and pins for the first half, and its copy is gone by ~0.82 of
  // that pin, which is 0.41 of the wrapper.
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      const hero = document.getElementById('top');
      setScrolled(y > 20);
      setPast(y > (hero ? hero.offsetHeight * 0.41 : window.innerHeight * 0.82));
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}${past ? ' shown' : ''}`}>
      <div className="inner">
        <a className="nav-brand" href="#top" aria-label="bertram, top of page">
          <span className="nav-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MARK }} />
          <span className="wordmark">bertram</span>
        </a>
        <ul className="nav-links">
          <li><a href="#work">work</a></li>
          <li className="nav-cta">
            <a className="pill pill-sage" href="mailto:b4qian@uwaterloo.ca">say hello</a>
          </li>
        </ul>
      </div>
    </nav>
  );
}

import { useEffect, useState } from 'react';
import { appIcon, BUTTER } from '../art/ddkit.js';

const MARK = appIcon(BUTTER);

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="inner">
        <a className="nav-brand" href="#top" aria-label="bertram — top of page">
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

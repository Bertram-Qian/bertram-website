import Reveal from '../components/Reveal.jsx';

export default function Contact() {
  return (
    <section className="section contact" id="contact">
      <div className="wrap">
        <Reveal>
          <h2>let&rsquo;s build something<br /><b>together.</b></h2>
        </Reveal>
        <Reveal><p>open to work, collaborations, and good conversations.</p></Reveal>
        <Reveal>
          <div className="contact-links">
            <a className="pill pill-sage" href="mailto:b4qian@uwaterloo.ca">say hello</a>
            <a className="pill pill-ghost" href="https://github.com/Bertram-Qian" target="_blank" rel="noopener">github</a>
            <a className="pill pill-ghost" href="https://www.linkedin.com/in/bertram-qian/" target="_blank" rel="noopener">linkedin</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

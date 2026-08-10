import Nav from './sections/Nav.jsx';
import Hero from './sections/Hero.jsx';
import Pond from './sections/Pond.jsx';
import Contact from './sections/Contact.jsx';
import Footer from './sections/Footer.jsx';

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      {/* Sits above the pinned hero and scrolls over it — the whole reason the
          hero fades rather than slides away. */}
      <main className="page">
        <Pond />
        <Contact />
        <Footer />
      </main>
    </>
  );
}

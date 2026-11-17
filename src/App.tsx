import { Navigation } from "./components/layout/Navigation";
import { Hero } from "./components/sections/Hero";
import { About } from "./components/sections/About";
import { Skills } from "./components/sections/Skills";
import { Experience } from "./components/sections/Experience";
import { Testimonials } from "./components/sections/Testimonials";
import { Community } from "./components/sections/Community";
import { Blog } from "./components/sections/Blog";
import { Booking } from "./components/booking/Booking";
import { Contact } from "./components/sections/Contact";
import { useRevealObserver } from "./hooks/useReveal";
// Last, so it can re-colour every section: violet page + white cards in the light theme
import "./styles/theme-violet.css";

export default function App() {
  useRevealObserver();
  return (
    <>
      <a className='skip' href='#main'>
        Skip to content
      </a>
      <Navigation />
      <main id='main'>
        <Hero />
        <About />
        <Skills />
        <Experience />

        <Blog />
        <Testimonials />
        <Community />
        <Booking />
        <Contact />
      </main>
    </>
  );
}

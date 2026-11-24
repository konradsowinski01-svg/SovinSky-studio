import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { About } from "./components/About";
import { AmbientFractals } from "./components/AmbientFractals";
import { Contact } from "./components/Contact";
import { DnaField } from "./components/DnaField";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Portfolio } from "./components/Portfolio";
import { Preloader } from "./components/Preloader";
import { Topbar } from "./components/Topbar";
import { Work } from "./components/Work";
import { useLenis } from "./hooks/useLenis";
import { usePageMotion } from "./hooks/usePageMotion";
import { getLenis } from "./lib/lenisStore";
import { useRoute } from "./lib/router";
import styles from "./App.module.css";

export default function App() {
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);
  const onDone = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setReady(true);
  }, []);
  const route = useRoute();
  useLenis(ready);
  usePageMotion(ready && route === "home");

  const firstRoute = useRef(true);
  useLayoutEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    const target = route === "home" ? document.querySelector(window.location.hash || "#top") : null;
    const lenis = getLenis();
    lenis?.resize();
    ScrollTrigger.refresh();
    if (target && target.id !== "top") {
      if (lenis) lenis.scrollTo(target as HTMLElement, { immediate: true, force: true });
      else target.scrollIntoView();
    } else if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [route]);

  return (
    <>
      {!ready ? <Preloader onDone={onDone} /> : null}
      <div
        id="top"
        className={`${styles.app} ${ready ? styles.revealed : styles.hidden}`}
        aria-hidden={!ready}
      >
        <AmbientFractals />
        <Topbar route={route} />
        {route === "portfolio" ? (
          <Portfolio />
        ) : (
          <main id="main">
            <Hero />
            <DnaField>
              <Work />
              <About />
              <Contact />
            </DnaField>
          </main>
        )}
        <Footer />
      </div>
    </>
  );
}

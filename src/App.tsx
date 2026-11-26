import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { About } from "./components/About";
import { AboutPage } from "./components/AboutPage";
import { CardIntro } from "./components/CardIntro";
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
import { isCardEntry, useRoute } from "./lib/router";
import styles from "./App.module.css";

export default function App() {
  const cardEntry = useRef(isCardEntry()).current;
  /** Systemy (Lenis, motion, WebGL) — na #/w od razu pod czarnym intro. */
  const [booted, setBooted] = useState(cardEntry);
  /** Wizualny reveal home (fade z intro). */
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const doneRef = useRef(false);
  const revealHome = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setBooted(true);
    setReady(true);
  }, []);
  const dismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);
  const finishPreloader = useCallback(() => {
    revealHome();
    dismissIntro();
  }, [dismissIntro, revealHome]);
  const route = useRoute();
  // Lenis + DOM/WebGL pod czarnym ekranem; animacje wejścia dopiero przy reveal.
  useLenis(booted);
  usePageMotion(ready && route === "home");

  // Po bootcie dograj layout — home ma być „na gotowo” zanim zniknie czarny ekran.
  useLayoutEffect(() => {
    if (!booted) return;
    const lenis = getLenis();
    lenis?.resize();
    ScrollTrigger.refresh();
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true, force: true });
  }, [booted]);

  useEffect(() => {
    if (!booted) return;
    const id = window.setTimeout(() => {
      getLenis()?.resize();
      ScrollTrigger.refresh();
    }, 450);
    return () => window.clearTimeout(id);
  }, [booted]);

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
      {showIntro ? (
        cardEntry ? (
          <CardIntro onReveal={revealHome} onDone={dismissIntro} />
        ) : (
          <Preloader onDone={finishPreloader} />
        )
      ) : null}
      <div
        id="top"
        className={`${styles.app} ${ready ? styles.revealed : booted ? styles.warming : styles.hidden}`}
        aria-hidden={!ready}
      >
        <Topbar route={route} />
        {route === "portfolio" ? (
          <Portfolio />
        ) : route === "about" ? (
          <AboutPage />
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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Portfolio } from "./components/Portfolio";
import { Preloader } from "./components/Preloader";
import { Topbar } from "./components/Topbar";
import { Work } from "./components/Work";
import { useLenis } from "./hooks/useLenis";
import { usePageMotion } from "./hooks/usePageMotion";
import { burnTo, registerBurnHooks } from "./lib/burn";
import { getLenis } from "./lib/lenisStore";
import { type Route, useRoute } from "./lib/router";
import styles from "./App.module.css";

function RouteView({ route, mainId }: { route: Route; mainId?: string }) {
  return (
    <>
      <Topbar route={route} />
      {route === "portfolio" ? (
        <Portfolio />
      ) : (
        <main id={mainId}>
          <Hero />
          <Work />
          <About />
          <Contact />
        </main>
      )}
      <Footer />
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);
  const onDone = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setReady(true);
  }, []);
  const route = useRoute();
  const [burnCover, setBurnCover] = useState<{ from: Route; scrollY: number } | null>(null);
  const coverResolver = useRef<((el: HTMLElement) => void) | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useLenis(ready && !burnCover);
  usePageMotion(ready && route === "home" && !burnCover);

  useLayoutEffect(() => {
    if (!burnCover || !overlayRef.current || !coverResolver.current) return;
    const resolve = coverResolver.current;
    coverResolver.current = null;
    resolve(overlayRef.current);
  }, [burnCover]);

  useEffect(() => {
    registerBurnHooks({
      prepare: (from) =>
        new Promise<HTMLElement>((resolve) => {
          coverResolver.current = resolve;
          flushSync(() => {
            setBurnCover({ from, scrollY: window.scrollY });
          });
        }),
      finish: () => setBurnCover(null),
    });
    return () => registerBurnHooks(null);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        "a[data-burn], a[href^='#/']",
      );
      if (!link) return;
      const hash = link.getAttribute("href") ?? "";
      if (hash === window.location.hash) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      void burnTo(hash, { x: event.clientX, y: event.clientY });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const firstRoute = useRef(true);
  useLayoutEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    if (burnCover) return;
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
  }, [route, burnCover]);

  return (
    <>
      {!ready ? <Preloader onDone={onDone} /> : null}
      <div
        id="top"
        className={`${styles.app} ${ready ? styles.revealed : styles.hidden}`}
        aria-hidden={!ready}
      >
        <RouteView route={route} mainId="main" />
      </div>

      {burnCover ? (
        <div
          ref={overlayRef}
          className={styles.burnOverlay}
          data-burn-overlay=""
          aria-hidden="true"
        >
          <div
            className={styles.burnSheet}
            style={{ transform: `translateY(-${burnCover.scrollY}px)` }}
          >
            <RouteView route={burnCover.from} />
          </div>
        </div>
      ) : null}
    </>
  );
}

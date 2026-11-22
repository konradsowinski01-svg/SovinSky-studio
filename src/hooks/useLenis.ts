import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { emitVelocity, setLenis } from "../lib/lenisStore";

gsap.registerPlugin(ScrollTrigger);

export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    setLenis(lenis);

    document.documentElement.classList.add("lenis", "lenis-smooth");

    lenis.on("scroll", (e: Lenis) => {
      ScrollTrigger.update();
      emitVelocity(e.velocity);
    });

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(ticker);
      lenis.destroy();
      setLenis(null);
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };
  }, [enabled]);
}

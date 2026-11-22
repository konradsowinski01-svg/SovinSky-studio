import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onVelocity } from "../lib/lenisStore";

gsap.registerPlugin(ScrollTrigger);

const DARK = { "--black": "#050505", "--ink": "#ffffff", "--accent": "#ff6a00" };
const LIGHT = { "--black": "#cdb6a4", "--ink": "#0b0b0b", "--accent": "#e04e00" };

export function usePageMotion(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const ease = "power3.out";

      // --- Hero intro: each letter exists in both blend layers, animate pairs
      const wordmark = document.querySelector<HTMLElement>("[data-wordmark]");
      const letterCount = wordmark
        ? wordmark.querySelectorAll("[data-wm-letter]").length / 2
        : 0;
      const pairs = Array.from({ length: letterCount }, (_, i) =>
        gsap.utils.toArray<HTMLElement>(`[data-wm-letter="${i}"]`),
      );
      pairs.forEach((pair, i) => {
        gsap.fromTo(
          pair,
          { yPercent: 105 },
          {
            yPercent: 0,
            duration: 1.6,
            ease: "expo.out",
            delay: 0.1 + Math.abs(i - (letterCount - 1) / 2) * 0.06,
          },
        );
      });

      gsap.to("[data-split-hero] .charInner", {
        y: "0%",
        duration: 1,
        ease,
        stagger: 0.016,
        delay: 0.45,
      });
      gsap.fromTo(
        "[data-hero-meta] > *",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.1, delay: 0.8 },
      );
      gsap.fromTo(
        "[data-topbar] > *",
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.08, delay: 0.3 },
      );

      // --- Hero scroll: inner layer lags at 0.4x, bottom fade ramps in ----
      const hero = document.getElementById("hero");
      const inner = document.querySelector<HTMLElement>("[data-hero-inner]");
      const fade = document.querySelector<HTMLElement>("[data-hero-fade]");
      if (hero && inner) {
        const onScroll = () => {
          const h = hero.offsetHeight || window.innerHeight;
          const y = Math.max(0, Math.min(window.scrollY, h));
          inner.style.transform = y ? `translate3d(0, ${(y * 0.4).toFixed(2)}px, 0)` : "";
          if (fade) {
            const t = (y / h - 0.03) / (0.22 - 0.03);
            fade.style.opacity = String(Math.min(1, Math.max(0, t)));
          }
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));
      }

      // --- Pointer: letters lean slightly toward the cursor, pairs in sync
      const movers = pairs.map((pair, i) => ({
        x: gsap.quickTo(pair, "x", { duration: 1.4, ease: "power3.out" }),
        y: gsap.quickTo(pair, "y", { duration: 1.4, ease: "power3.out" }),
        depth: 6 + (i % 3) * 4,
      }));
      const onMove = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        movers.forEach((m) => {
          m.x(nx * m.depth);
          m.y(ny * m.depth * 0.6);
        });
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", onMove));

      // --- Liquid headings: melted in, settle when visible, melt on speed --
      gsap.utils.toArray<HTMLElement>("[data-liquid]").forEach((heading) => {
        const filterId = heading.style.filter.match(/#([^)"']+)/)?.[1];
        const filter = filterId ? document.getElementById(filterId) : null;
        const blur = filter?.querySelector("[data-liquid-blur]");
        const matrix = filter?.querySelector("[data-liquid-matrix]");
        const characters = heading.querySelectorAll<HTMLElement>("[data-liquid-char]");
        if (!blur || !matrix || !characters.length) return;

        const state = { blur: 18, base: 18 };
        const apply = () => {
          blur.setAttribute("stdDeviation", state.blur.toFixed(2));
          const settled = state.blur < 0.8;
          const alpha = settled ? 1 : Math.max(6, 18 - state.blur * 0.62);
          const threshold = settled ? 0 : -Math.max(0.45, state.blur * 0.055);
          matrix.setAttribute(
            "values",
            `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${alpha.toFixed(2)} ${threshold.toFixed(3)}`,
          );
        };
        apply();

        gsap.fromTo(
          characters,
          {
            yPercent: (i) => (i % 3 === 0 ? 70 : i % 3 === 1 ? -55 : 35),
            xPercent: (i) => (i % 2 ? -18 : 18),
            scaleY: 1.45,
          },
          {
            yPercent: 0,
            xPercent: 0,
            scaleY: 1,
            duration: 1.6,
            ease: "expo.out",
            stagger: 0.025,
            scrollTrigger: { trigger: heading, start: "top 88%", once: true },
          },
        );
        gsap.to(state, {
          base: 0,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: heading, start: "top 85%", once: true },
        });
        gsap.to(heading, {
          color: "var(--ink)",
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: { trigger: heading, start: "top 85%", once: true },
        });

        let boost = 0;
        cleanups.push(
          onVelocity((v) => {
            boost = Math.min(12, Math.abs(v) * 0.42);
          }),
        );

        const tick = () => {
          boost *= 0.9;
          state.blur += (state.base + boost - state.blur) * 0.14;
          apply();
        };
        gsap.ticker.add(tick);
        cleanups.push(() => gsap.ticker.remove(tick));
      });

      // --- Work cards ---------------------------------------------------
      gsap.utils.toArray<HTMLElement>("[data-proj]").forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 110 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: "expo.out",
            scrollTrigger: { trigger: card, start: "top 92%", once: true },
          },
        );

        const cap = card.querySelector<HTMLElement>("[data-proj-cap]");
        const visual = card.querySelector<HTMLElement>("[data-proj-visual]");
        if (cap && visual) {
          const away = () => -(card.getBoundingClientRect().left + cap.offsetWidth + 40);
          gsap.fromTo(
            cap,
            { x: away, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              ease: "power2.out",
              immediateRender: true,
              scrollTrigger: {
                trigger: visual,
                start: "top 72%",
                end: "center 50%",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            },
          );
          gsap.fromTo(
            cap,
            { x: 0, opacity: 1 },
            {
              x: away,
              opacity: 0,
              ease: "power2.in",
              immediateRender: false,
              scrollTrigger: {
                trigger: visual,
                start: "bottom 52%",
                end: "bottom 24%",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        const sun = card.querySelector<HTMLElement>("[data-proj-sun]");
        if (sun) {
          gsap.fromTo(
            sun,
            { yPercent: 35, scale: 0.85 },
            {
              yPercent: -18,
              scale: 1.1,
              ease: "none",
              scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }
      });

      // --- Generic reveals ---------------------------------------------
      gsap.utils.toArray<HTMLElement>("[data-split-scroll]").forEach((el) => {
        gsap.to(el.querySelectorAll(".charInner"), {
          y: "0%",
          duration: 0.9,
          ease,
          stagger: 0.014,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-fade]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 40, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            ease,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      });

      // --- Theme morph: page turns light around About -------------------
      const toLight = () => gsap.to(root, { ...LIGHT, duration: 0.9, ease: "power2.inOut", overwrite: true });
      const toDark = () => gsap.to(root, { ...DARK, duration: 0.9, ease: "power2.inOut", overwrite: true });
      ScrollTrigger.create({
        trigger: "#about",
        start: "top 55%",
        end: "bottom 45%",
        onEnter: toLight,
        onEnterBack: toLight,
        onLeave: toDark,
        onLeaveBack: toDark,
      });

      // --- Contact glow breathes ---------------------------------------
      gsap.to("[data-contact-glow]", {
        scale: 1.15,
        xPercent: 6,
        duration: 5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
      gsap.set(root, DARK);
    };
  }, [ready]);
}

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

      // --- Hero intro: animate the whole mark once (cheap on a huge masked layer)
      const wordmark = document.querySelector<HTMLElement>("[data-wordmark]");
      if (wordmark) {
        gsap.fromTo(
          wordmark,
          { yPercent: 18, opacity: 0 },
          { yPercent: 0, opacity: 0.2, duration: 1.6, ease: "expo.out", delay: 0.1 },
        );
      }

      gsap.to("[data-split-hero] .charInner", {
        y: "0%",
        duration: 1,
        ease,
        stagger: 0.016,
        delay: 0.45,
      });
      gsap.fromTo(
        "[data-hero-lead], [data-hero-meta] > *",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.1, delay: 0.8 },
      );
      gsap.fromTo(
        "[data-topbar] > *",
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.08, delay: 0.3 },
      );
      gsap.fromTo(
        "[data-hero-scroll]",
        { opacity: 0 },
        {
          opacity: 0.9,
          duration: 0.9,
          ease,
          delay: 1.15,
          onComplete: () => {
            const cue = document.querySelector<HTMLElement>("[data-hero-scroll]");
            if (!cue) return;
            cue.dataset.ready = "true";
            gsap.set(cue, { clearProps: "opacity" });
          },
        },
      );

      // --- Hero scroll: fade + scroll cue (no parallax lag) ----
      const hero = document.getElementById("hero");
      const fade = document.querySelector<HTMLElement>("[data-hero-fade]");
      const scrollCue = document.querySelector<HTMLElement>("[data-hero-scroll]");
      if (hero) {
        const onScroll = () => {
          const h = hero.offsetHeight || window.innerHeight;
          const y = Math.max(0, Math.min(window.scrollY, h));
          if (fade) {
            const t = (y / h - 0.03) / (0.22 - 0.03);
            fade.style.opacity = String(Math.min(1, Math.max(0, t)));
          }
          if (scrollCue) {
            scrollCue.dataset.hidden = y > h * 0.08 ? "true" : "false";
          }
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));
      }

      // --- Pointer: whole mark leans lightly (one transform, not per-layer)
      if (wordmark) {
        const moveX = gsap.quickTo(wordmark, "x", { duration: 1.4, ease: "power3.out" });
        const moveY = gsap.quickTo(wordmark, "y", { duration: 1.4, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          moveX(nx * 10);
          moveY(ny * 6);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        cleanups.push(() => window.removeEventListener("pointermove", onMove));
      }

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

    });

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
      gsap.set(root, DARK);
    };
  }, [ready]);
}

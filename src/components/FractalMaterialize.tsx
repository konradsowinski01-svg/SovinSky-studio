import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./FractalMaterialize.module.css";

type Particle = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  size: number;
  delay: number;
  seed: number;
  unit: number;
};

function hash(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

function fbm(x: number, octaves = 4) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum / norm;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

type Props = {
  className?: string;
  logo?: ReactNode;
  text: string;
  srLabel?: string;
};

export function FractalMaterialize({ className = "", logo, text, srLabel }: Props) {
  const hostRef = useRef<HTMLParagraphElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [phase, setPhase] = useState<"pending" | "done">("pending");

  const words = text.trim().split(/\s+/);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const units = Array.from(host.querySelectorAll<HTMLElement>("[data-fractal-unit]"));

    if (reduceMotion) {
      setPhase("done");
      return;
    }

    let played = false;
    let raf = 0;
    let running = true;
    let particles: Particle[] = [];
    let startTs = 0;
    const revealed = new Set<number>();
    const DURATION = 1650;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.style.left = "0";
      canvas.style.top = "0";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const isLightBg = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--black").trim();
      const hex = raw.startsWith("#") ? raw.slice(1) : "";
      if (hex.length < 6) return false;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some((n) => Number.isNaN(n))) return false;
      return 0.299 * r + 0.587 * g + 0.114 * b > 140;
    };

    const buildParticles = () => {
      const hr = host.getBoundingClientRect();
      const next: Particle[] = [];
      const hostW = hr.width;

      units.forEach((unit, ui) => {
        const ur = unit.getBoundingClientRect();
        const left = ur.left - hr.left;
        const top = ur.top - hr.top;
        const w = Math.max(ur.width, 4);
        const h = Math.max(ur.height, 4);
        const isLogo = unit.dataset.fractalLogo !== undefined;
        const count = isLogo ? 18 : 5;

        for (let i = 0; i < count; i++) {
          const seed = ui * 97.1 + i * 13.7 + 3.3;
          const nx = fbm(seed);
          const ny = fbm(seed + 19.2);
          const nz = fbm(seed + 41.8);
          const tx = left + w * (0.15 + nx * 0.7);
          const ty = top + h * (0.2 + ny * 0.6);
          // Start toward the DNA cloud (right), with fractal scatter.
          const x0 = hostW * (0.55 + nz * 0.45) + (nx - 0.5) * 160 + 40;
          const y0 = top + h * 0.5 + (ny - 0.5) * 220 + (hash(seed + 7) - 0.5) * 90;

          next.push({
            x0,
            y0,
            x1: tx,
            y1: ty,
            size: isLogo ? 1.05 + hash(seed) * 1.35 : 0.7 + hash(seed) * 1.05,
            delay: ui * 0.0075 + i * 0.012 + hash(seed + 2) * 0.08,
            seed,
            unit: ui,
          });
        }
      });

      particles = next;
    };

    const finish = () => {
      setPhase("done");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = "0";
    };

    const tick = (ts: number) => {
      if (!running) return;
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const rect = host.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const light = isLightBg();
      let allDone = true;

      for (const p of particles) {
        const local = Math.max(0, Math.min(1, (elapsed / DURATION - p.delay) / 0.72));
        if (local < 1) allDone = false;
        const e = easeOutCubic(local);
        const swirl = (1 - e) * (fbm(p.seed + elapsed * 0.0018) - 0.5) * 28;
        const x = p.x0 + (p.x1 - p.x0) * e + swirl;
        const y = p.y0 + (p.y1 - p.y0) * e + swirl * 0.65;
        const s = p.size * (1.2 - e * 0.45);
        const a =
          (local < 0.08 ? local / 0.08 : 1 - Math.max(0, (local - 0.78) / 0.22)) * 0.95;

        if (a > 0.02) {
          ctx.fillStyle = light
            ? `rgba(28, 8, 2, ${(a * 0.9).toFixed(3)})`
            : `rgba(255, 140, 40, ${a.toFixed(3)})`;
          ctx.fillRect(x, y, Math.max(0.55, s), Math.max(0.55, s));
        }

        if (local > 0.52 && !revealed.has(p.unit)) {
          revealed.add(p.unit);
          units[p.unit]?.style.setProperty("opacity", "1");
        }
      }

      if (allDone && elapsed > DURATION * 0.55) {
        units.forEach((u) => u.style.setProperty("opacity", "1"));
        finish();
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    const play = () => {
      if (played || !running) return;
      played = true;
      resize();
      buildParticles();
      units.forEach((u) => {
        u.style.setProperty("opacity", "0");
      });
      startTs = 0;
      raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(() => {
      if (!running || canvas.style.opacity === "0") return;
      resize();
    });
    ro.observe(host);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0.18) {
          play();
          io.disconnect();
        }
      },
      { threshold: [0.18, 0.35], rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(host);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [text, uid]);

  return (
    <p
      ref={hostRef}
      className={`${styles.root} ${className}`.trim()}
      data-fractal-copy=""
      data-state={phase}
    >
      <span className="sr-only">{srLabel ?? text}</span>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <span className={styles.live} aria-hidden="true">
        {logo}
        {words.map((word, wi) => (
          <span key={`${word}-${wi}`} className={styles.word}>
            {Array.from(word).map((char, ci) => (
              <span key={`${char}-${ci}`} className={styles.char} data-fractal-unit="">
                {char}
              </span>
            ))}
            {wi < words.length - 1 ? <span className={styles.space}> </span> : null}
          </span>
        ))}
      </span>
    </p>
  );
}

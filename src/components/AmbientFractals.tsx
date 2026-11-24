import { useEffect, useRef } from "react";
import styles from "./AmbientFractals.module.css";

const COUNT = 120;

type Speck = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  seed: number;
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

function fbm(x: number, octaves = 3) {
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

function makeSpecks(w: number, h: number): Speck[] {
  const list: Speck[] = [];
  for (let i = 0; i < COUNT; i++) {
    const seed = i * 19.17 + 3.1;
    list.push({
      x: hash(seed) * w,
      y: hash(seed + 2.4) * h,
      vx: (hash(seed + 5) - 0.5) * 36,
      vy: (hash(seed + 8) - 0.5) * 28,
      r: 0.55 + hash(seed + 11) * 1.15,
      a: 0.28 + hash(seed + 14) * 0.42,
      seed,
    });
  }
  return list;
}

export function AmbientFractals() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      canvas.style.display = "none";
      return;
    }

    let specks: Speck[] = [];
    let raf = 0;
    let running = true;
    let lastTs = performance.now();
    let w = 0;
    let h = 0;

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

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!specks.length) specks = makeSpecks(w, h);
    };

    const wrap = (v: number, max: number) => {
      if (v < -12) return max + 12;
      if (v > max + 12) return -12;
      return v;
    };

    const tick = (ts: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const t = ts * 0.001;
      const light = isLightBg();

      ctx.clearRect(0, 0, w, h);

      for (const s of specks) {
        const ax = (fbm(t * 0.4 + s.seed) - 0.5) * 98;
        const ay = (fbm(t * 0.36 + s.seed + 21.4) - 0.5) * 86;
        s.vx += ax * dt;
        s.vy += ay * dt;
        s.vx *= 0.992;
        s.vy *= 0.992;
        const spd = Math.hypot(s.vx, s.vy);
        if (spd > 62) {
          s.vx = (s.vx / spd) * 62;
          s.vy = (s.vy / spd) * 62;
        }
        s.x = wrap(s.x + s.vx * dt, w);
        s.y = wrap(s.y + s.vy * dt, h);

        const pulse = 0.75 + fbm(t * 0.35 + s.seed + 9) * 0.45;
        const alpha = Math.min(1, s.a * pulse * (light ? 0.85 : 0.7));
        const size = Math.max(0.55, s.r * (0.9 + pulse * 0.15));

        ctx.fillStyle = light
          ? `rgba(28, 8, 2, ${alpha.toFixed(3)})`
          : `rgba(255, 140, 40, ${alpha.toFixed(3)})`;
        ctx.fillRect(s.x, s.y, size, size);
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className={styles.layer} aria-hidden="true" />;
}

import { useEffect, useRef } from "react";
import styles from "./PortfolioSand.module.css";

const COUNT = 160;

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
  const cx = w * 0.38;
  const cy = h * 0.32;
  for (let i = 0; i < COUNT; i++) {
    const seed = i * 23.41 + 7.2;
    const ang = hash(seed) * Math.PI * 2;
    const rad = (0.12 + hash(seed + 1.7) * 0.55) * Math.min(w, h);
    list.push({
      x: cx + Math.cos(ang) * rad + (hash(seed + 3) - 0.5) * w * 0.2,
      y: cy + Math.sin(ang) * rad * 0.55 + (hash(seed + 4.2) - 0.5) * h * 0.25,
      vx: (hash(seed + 5) - 0.5) * 48,
      vy: (hash(seed + 8) - 0.5) * 38,
      r: 0.45 + hash(seed + 11) * 1.35,
      a: 0.22 + hash(seed + 14) * 0.5,
      seed,
    });
  }
  return list;
}

export function PortfolioSand() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    if (!host || !ctx) return;

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

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      specks = makeSpecks(w, h);
    };

    const wrap = (v: number, max: number) => {
      if (v < -16) return max + 16;
      if (v > max + 16) return -16;
      return v;
    };

    const tick = (ts: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const t = ts * 0.001;
      const cx = w * 0.38;
      const cy = h * 0.32;

      ctx.clearRect(0, 0, w, h);

      for (const s of specks) {
        const dx = s.x - cx;
        const dy = s.y - cy;
        const dist = Math.hypot(dx, dy) + 1;
        // Soft orbit + fractal drift around the wordmark.
        const orbit = 22 / dist;
        const ax = (fbm(t * 0.45 + s.seed) - 0.5) * 110 - dy * orbit * 0.35;
        const ay = (fbm(t * 0.4 + s.seed + 18.2) - 0.5) * 95 + dx * orbit * 0.35;
        s.vx += ax * dt;
        s.vy += ay * dt;
        s.vx *= 0.99;
        s.vy *= 0.99;
        const spd = Math.hypot(s.vx, s.vy);
        if (spd > 78) {
          s.vx = (s.vx / spd) * 78;
          s.vy = (s.vy / spd) * 78;
        }
        s.x = wrap(s.x + s.vx * dt, w);
        s.y = wrap(s.y + s.vy * dt, h);

        const pulse = 0.7 + fbm(t * 0.4 + s.seed + 9) * 0.55;
        const alpha = Math.min(1, s.a * pulse);
        const size = Math.max(0.45, s.r * (0.85 + pulse * 0.25));

        ctx.fillStyle = `rgba(255, 150, 55, ${alpha.toFixed(3)})`;
        ctx.fillRect(s.x, s.y, size, size);
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={styles.layer} aria-hidden="true" />;
}

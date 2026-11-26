import { useEffect, useRef } from "react";
import { canvasDpr, getMotionTier } from "../lib/motionTier";
import { onPageActivity } from "../lib/pageActivity";
import styles from "./PortfolioFractals.module.css";

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

function makeSpecks(w: number, h: number, count: number): Speck[] {
  const list: Speck[] = [];
  // Cluster around the wordmark: left-anchored, mid-height of the mark.
  const cx = w * 0.42;
  const cy = h * 0.42;
  for (let i = 0; i < count; i++) {
    const seed = i * 21.7 + 4.2;
    const ang = hash(seed) * Math.PI * 2;
    const rad = (0.08 + hash(seed + 1.3) * 0.62) * Math.min(w, h);
    list.push({
      x: cx + Math.cos(ang) * rad * 1.35 + (hash(seed + 3) - 0.5) * w * 0.25,
      y: cy + Math.sin(ang) * rad * 0.55 + (hash(seed + 4.1) - 0.5) * h * 0.3,
      vx: (hash(seed + 5) - 0.5) * 42,
      vy: (hash(seed + 8) - 0.5) * 34,
      r: 0.4 + hash(seed + 11) * 1.25,
      a: 0.2 + hash(seed + 14) * 0.48,
      seed,
    });
  }
  return list;
}

export function PortfolioFractals() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    if (!host || !ctx) return;

    const tier = getMotionTier();
    const reduceMotion =
      tier === "low" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      canvas.style.display = "none";
      return;
    }

    const count = tier === "medium" ? 70 : 180;
    let specks: Speck[] = [];
    let raf = 0;
    let running = true;
    let visible = true;
    let pageOn = true;
    let lastTs = performance.now();
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = canvasDpr(tier);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      specks = makeSpecks(w, h, count);
    };

    const wrap = (v: number, max: number) => {
      if (v < -18) return max + 18;
      if (v > max + 18) return -18;
      return v;
    };

    const tick = (ts: number) => {
      if (!running) return;
      raf = 0;
      if (!visible || !pageOn) return;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const t = ts * 0.001;
      const cx = w * 0.42;
      const cy = h * 0.42;

      ctx.clearRect(0, 0, w, h);

      for (const s of specks) {
        const dx = s.x - cx;
        const dy = s.y - cy;
        const dist = Math.hypot(dx, dy) + 1;
        const orbit = 28 / dist;
        const ax = (fbm(t * 0.48 + s.seed) - 0.5) * 120 - dy * orbit * 0.4;
        const ay = (fbm(t * 0.42 + s.seed + 17.5) - 0.5) * 100 + dx * orbit * 0.4;
        s.vx += ax * dt;
        s.vy += ay * dt;
        s.vx *= 0.989;
        s.vy *= 0.989;
        const spd = Math.hypot(s.vx, s.vy);
        if (spd > 72) {
          s.vx = (s.vx / spd) * 72;
          s.vy = (s.vy / spd) * 72;
        }
        s.x = wrap(s.x + s.vx * dt, w);
        s.y = wrap(s.y + s.vy * dt, h);

        const pulse = 0.7 + fbm(t * 0.38 + s.seed + 8) * 0.5;
        const alpha = Math.min(1, s.a * pulse);
        const size = Math.max(0.4, s.r * (0.85 + pulse * 0.2));

        ctx.fillStyle = `rgba(255, 140, 50, ${alpha.toFixed(3)})`;
        ctx.fillRect(s.x, s.y, size, size);
      }

      raf = requestAnimationFrame(tick);
    };

    const stopRaf = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const kick = () => {
      if (!running || raf || !visible || !pageOn) return;
      lastTs = performance.now();
      raf = requestAnimationFrame(tick);
    };

    resize();
    kick();

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible && pageOn) kick();
        else stopRaf();
      },
      { rootMargin: "40px" },
    );
    io.observe(host);

    const offActivity = onPageActivity((active) => {
      pageOn = active;
      if (active) kick();
      else stopRaf();
    });

    return () => {
      running = false;
      stopRaf();
      ro.disconnect();
      io.disconnect();
      offActivity();
    };
  }, []);

  return <canvas ref={ref} className={styles.layer} aria-hidden="true" />;
}

import { useEffect, useRef } from "react";
import styles from "./AmbientFractals.module.css";

const COUNT = 140;
const MAGNET_R = 220;
const CLUSTER = 28;

type Speck = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
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
    const x = hash(seed) * w;
    const y = hash(seed + 2.4) * h;
    list.push({
      x,
      y,
      homeX: x,
      homeY: y,
      vx: (hash(seed + 5) - 0.5) * 36,
      vy: (hash(seed + 8) - 0.5) * 28,
      r: 0.35 + hash(seed + 11) * 0.7,
      a: 0.28 + hash(seed + 14) * 0.42,
      seed,
    });
  }
  return list;
}

function drawShard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number,
  rot: number,
) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const tip = size * (1.4 + hash(seed) * 1.2);
  const wing = size * (0.35 + hash(seed + 1) * 0.45);
  ctx.beginPath();
  const pts = [
    [0, -tip],
    [wing, size * 0.35],
    [wing * 0.2, size * 0.9],
    [-wing * 0.85, size * 0.45],
    [-wing, -size * 0.1],
  ];
  for (let i = 0; i < pts.length; i++) {
    const px = x + pts[i][0] * c - pts[i][1] * s;
    const py = y + pts[i][0] * s + pts[i][1] * c;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
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

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let specks: Speck[] = [];
    let raf = 0;
    let running = true;
    let lastTs = performance.now();
    let w = 0;
    let h = 0;
    let pointerOn = false;
    let ptrX = 0;
    let ptrY = 0;
    let magnet = 0;

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
      const targetMagnet = pointerOn ? 1 : 0;
      magnet += (targetMagnet - magnet) * Math.min(1, dt * 6);

      ctx.clearRect(0, 0, w, h);

      for (const s of specks) {
        const ax = (fbm(t * 0.4 + s.seed) - 0.5) * 98;
        const ay = (fbm(t * 0.36 + s.seed + 21.4) - 0.5) * 86;
        s.vx += ax * dt;
        s.vy += ay * dt;

        if (magnet > 0.02) {
          const dx = ptrX - s.x;
          const dy = ptrY - s.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < MAGNET_R * 1.35) {
            const falloff = 1 - Math.min(1, dist / (MAGNET_R * 1.35));
            const pull = falloff * falloff * (2.8 + magnet * 3.4);
            // orbit-ish: pull inward + tangential swirl
            const tx = -dy / dist;
            const ty = dx / dist;
            const swirl = falloff * (0.9 + hash(s.seed) * 0.8) * magnet;
            s.vx += (dx / dist) * pull * 55 * dt + tx * swirl * 42 * dt;
            s.vy += (dy / dist) * pull * 55 * dt + ty * swirl * 42 * dt;
          }
        } else {
          // soft return toward original field when cursor leaves
          s.vx += (s.homeX - s.x) * 0.35 * dt;
          s.vy += (s.homeY - s.y) * 0.35 * dt;
        }

        s.vx *= 0.988;
        s.vy *= 0.988;
        const spd = Math.hypot(s.vx, s.vy);
        const maxSpd = magnet > 0.2 ? 110 : 62;
        if (spd > maxSpd) {
          s.vx = (s.vx / spd) * maxSpd;
          s.vy = (s.vy / spd) * maxSpd;
        }
        s.x = wrap(s.x + s.vx * dt, w);
        s.y = wrap(s.y + s.vy * dt, h);

        const near =
          magnet > 0.05
            ? Math.max(0, 1 - Math.hypot(ptrX - s.x, ptrY - s.y) / MAGNET_R)
            : 0;
        const pulse = 0.75 + fbm(t * 0.35 + s.seed + 9) * 0.45;
        const alpha = Math.min(1, s.a * pulse * (light ? 0.85 : 0.7) * (1 + near * 0.55 * magnet));
        const size = Math.max(0.35, s.r * (0.85 + pulse * 0.1 + near * 0.2 * magnet));
        const rot = s.seed + t * (0.4 + near * 2.2);

        ctx.fillStyle = light
          ? `rgba(28, 8, 2, ${alpha.toFixed(3)})`
          : `rgba(255, 140, 40, ${alpha.toFixed(3)})`;

        if (near > 0.35 && magnet > 0.4) {
          drawShard(ctx, s.x, s.y, size * 0.85, s.seed, rot);
        } else {
          ctx.fillRect(s.x, s.y, size, size);
        }
      }

      // dense cluster glued to the cursor
      if (magnet > 0.08) {
        for (let i = 0; i < CLUSTER; i++) {
          const seed = i * 7.13 + 2.2;
          const ang = hash(seed) * Math.PI * 2 + t * (0.6 + hash(seed + 1) * 1.4);
          const rad =
            4 +
            hash(seed + 2) * 26 * (1 - magnet * 0.25) +
            Math.sin(t * 2.4 + seed) * 2.5;
          const x = ptrX + Math.cos(ang) * rad;
          const y = ptrY + Math.sin(ang) * rad * 0.85;
          const a = (0.3 + hash(seed + 3) * 0.4) * magnet;
          const size = 0.35 + hash(seed + 4) * 0.75;
          ctx.fillStyle = light
            ? `rgba(28, 8, 2, ${a.toFixed(3)})`
            : `rgba(255, 150, 50, ${a.toFixed(3)})`;
          if (hash(seed + 5) > 0.45) {
            drawShard(ctx, x, y, size, seed, ang + t);
          } else {
            ctx.fillRect(x, y, size, size);
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);

    /** Only magnetize over empty page background — not tiles, copy, UI. */
    const isOpenBackground = (x: number, y: number) => {
      const hit = document.elementFromPoint(x, y);
      if (!hit) return false;
      if (
        hit === document.documentElement ||
        hit === document.body ||
        hit === canvas ||
        hit.id === "top" ||
        hit.id === "main"
      ) {
        return true;
      }
      // Anything that reads as content / chrome blocks the swarm.
      const blocked = hit.closest(
        [
          "a",
          "button",
          "input",
          "textarea",
          "select",
          "label",
          "article",
          "nav",
          "header",
          "footer",
          "h1",
          "h2",
          "h3",
          "h4",
          "p",
          "li",
          "figure",
          "img",
          "video",
          "svg",
          "[data-proj]",
          "[data-proj-bend]",
          "[data-proj-visual]",
          "[data-proj-cap]",
          "[data-hero-copy]",
          "[data-hero-meta]",
          "[data-hero-scroll]",
          "[data-wordmark]",
          "[data-no-fractal]",
          '[role="link"]',
          '[role="button"]',
          "canvas:not([aria-hidden='true'])",
        ].join(","),
      );
      if (blocked) return false;
      // Layout shells (section / main wrappers) count as background.
      return Boolean(hit.closest("main, section, #top, #main"));
    };

    const onPointerMove = (e: PointerEvent) => {
      ptrX = e.clientX;
      ptrY = e.clientY;
      const active =
        (canHover && e.pointerType === "mouse") || (!canHover && e.buttons > 0);
      pointerOn = active && isOpenBackground(ptrX, ptrY);
    };
    const onPointerLeave = () => {
      pointerOn = false;
    };
    const onPointerUp = () => {
      if (!canHover) pointerOn = false;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("resize", resize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={styles.layer} aria-hidden="true" />;
}

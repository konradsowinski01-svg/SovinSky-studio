import { useEffect, useRef } from "react";
import { canvasDpr, getMotionTier } from "../lib/motionTier";
import styles from "./PortraitCloud.module.css";

const SRC = `${import.meta.env.BASE_URL}dna-helix.obj`;
const IDLE_SPEED = 0.24;
const PITCH = 0.12;
const DRIFT = 0.01;
const SAMPLES_PER_TRI = 9;
const MAX_DOTS_HIGH = 18000;
const MAX_DOTS_MEDIUM = 5500;
const MAX_DOTS_LOW = 2800;

type Vec3 = [number, number, number];
type Dot = {
  x: number;
  y: number;
  z: number;
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

function parseObj(text: string) {
  const verts: Vec3[] = [];
  const faces: number[][] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("v ")) {
      const p = line.split(/\s+/);
      verts.push([Number(p[1]), Number(p[2]), Number(p[3])]);
    } else if (line.startsWith("f ")) {
      const ids = line
        .slice(2)
        .trim()
        .split(/\s+/)
        .map((token) => Number(token.split("/")[0]) - 1)
        .filter((n) => Number.isFinite(n));
      if (ids.length >= 3) faces.push(ids);
    }
  }
  return { verts, faces };
}

function mix3(a: Vec3, b: Vec3, c: Vec3, u: number, v: number): Vec3 {
  const w = 1 - u - v;
  return [
    a[0] * w + b[0] * u + c[0] * v,
    a[1] * w + b[1] * u + c[1] * v,
    a[2] * w + b[2] * u + c[2] * v,
  ];
}

/** Sample Embossify CC0 DNA helix mesh into a sand point cloud. */
function buildDotsFromObj(text: string, maxDots: number): Dot[] {
  const { verts, faces } = parseObj(text);
  if (!verts.length || !faces.length) return [];

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const [x, y, z] of verts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;

  const toLocal = (p: Vec3): Vec3 => {
    const x = (p[0] - cx) / extent;
    const y = (p[1] - cy) / extent;
    const z = (p[2] - cz) / extent;
    return [x, z, -y];
  };

  const dots: Dot[] = [];
  let seed = 0;

  for (const v of verts) {
    if (hash(seed++) > 0.88) continue;
    const p = toLocal(v);
    dots.push({
      x: p[0],
      y: p[1],
      z: p[2],
      r: 0.48 + hash(seed) * 0.42,
      a: 0.8 + hash(seed + 2) * 0.2,
      seed: seed * 12.9898,
    });
  }

  for (const face of faces) {
    for (let i = 1; i < face.length - 1; i++) {
      const a0 = verts[face[0]!];
      const b0 = verts[face[i]!];
      const c0 = verts[face[i + 1]!];
      if (!a0 || !b0 || !c0) continue;
      const a = toLocal(a0);
      const b = toLocal(b0);
      const c = toLocal(c0);
      for (let s = 0; s < SAMPLES_PER_TRI; s++) {
        let u = Math.random();
        let v = Math.random();
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        const p = mix3(a, b, c, u, v);
        seed++;
        dots.push({
          x: p[0],
          y: p[1],
          z: p[2],
          r: 0.38 + hash(seed) * 0.4,
          a: 0.68 + hash(seed + 5) * 0.32,
          seed: seed * 12.9898,
        });
      }
    }
  }

  if (dots.length <= maxDots) return dots;
  const stride = Math.ceil(dots.length / maxDots);
  return dots.filter((_, i) => i % stride === 0).slice(0, maxDots);
}

function project(
  x: number,
  y: number,
  z: number,
  cosY: number,
  sinY: number,
  cosP: number,
  sinP: number,
) {
  const rx = x * cosY - z * sinY;
  const rz = x * sinY + z * cosY;
  const y2 = y * cosP - rz * sinP;
  const z2 = y * sinP + rz * cosP;
  const perspective = 1.45 / (1.45 + z2);
  return { x: rx, y: y2, z: z2, p: perspective };
}

export function PortraitCloud() {
  const hostRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = hostRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots: Dot[] = [];
    let visible = false;
    let raf = 0;
    let running = true;
    let angle = 0.35;
    let lastTs = performance.now();
    let lastDrawTs = 0;
    const tier = getMotionTier();
    const reduceMotion =
      tier === "low" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const maxDots =
      tier === "low" ? MAX_DOTS_LOW : tier === "medium" ? MAX_DOTS_MEDIUM : MAX_DOTS_HIGH;
    const frameBudgetMs = tier === "low" ? 48 : tier === "medium" ? 33 : 0;

    // Cursor / finger magnet — only on the DNA region.
    let pointerX = 0;
    let pointerY = 0;
    let pointerOn = false;
    let pointerPressed = false;
    let magnet = 0;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const magnetsEnabled = tier === "high" && !reduceMotion;
    type Spark = { x: number; y: number; vx: number; vy: number; life: number; seed: number; r: number };
    const sparks: Spark[] = [];
    const SPARK_CAP = magnetsEnabled ? (coarse ? 70 : 70) : 0;

    // Cache expensive layout / theme reads — avoid layout thrash every rAF.
    let layoutCache = {
      aboutW: 0,
      aboutH: 0,
      fadeAnchor: 0,
      contactTop: 0,
      light: false,
      at: 0,
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

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = canvasDpr(tier);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutCache.at = 0;
    };

    const refreshLayout = (rect: DOMRect, w: number, h: number, force = false) => {
      const now = performance.now();
      if (!force && now - layoutCache.at < 120) return layoutCache;
      const about = document.getElementById("about");
      const aboutRect = about?.getBoundingClientRect();
      const lastProj = document.querySelector<HTMLElement>("#work [data-proj]:last-of-type");
      const fadeAnchor = lastProj
        ? lastProj.getBoundingClientRect().bottom - rect.top
        : (document.getElementById("work")?.getBoundingClientRect().bottom ?? 0) - rect.top;
      const contact = document.getElementById("contact");
      const contactTop = contact
        ? contact.getBoundingClientRect().top - rect.top
        : h * 0.85;
      layoutCache = {
        aboutW: aboutRect?.width || w,
        aboutH: aboutRect?.height || Math.min(h, window.innerHeight),
        fadeAnchor,
        contactTop,
        light: isLightBg(),
        at: now,
      };
      return layoutCache;
    };

    const driftOf = (d: Dot, t: number) => {
      const amp = DRIFT;
      return {
        x: d.x + (fbm(t * 0.4 + d.seed) - 0.5) * 2 * amp,
        y: d.y + (fbm(t * 0.36 + d.seed + 17.2) - 0.5) * 2 * amp,
        z: d.z + (fbm(t * 0.33 + d.seed + 41.7) - 0.5) * 2 * amp,
      };
    };

    const draw = (tSec = 0) => {
      if (!dots.length) return false;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
      const cosP = Math.cos(PITCH);
      const sinP = Math.sin(PITCH);

      // Size from About; pin helix to viewport mid on every breakpoint so
      // DNA holds still while Work / About / Contact scroll past it.
      const layout = refreshLayout(rect, w, h);
      const mobile = w < 810;
      const refW = layout.aboutW;
      const refH = layout.aboutH;
      const scale = Math.min(refW, Math.min(refH, window.innerHeight)) * (mobile ? 1.85 : 2.55);
      const ox = w * (mobile ? 0.62 : 0.74);
      const oy = window.innerHeight * 0.5 - rect.top;
      const light = layout.light;

      // Soft reveal starting around the last Work tile ("Kampania SMS"),
      // so DNA gently appears as the project list ends.
      const fadeAnchor = layout.fadeAnchor;
      const fadeInStart = fadeAnchor - Math.min(220, h * 0.1);
      const fadeInEnd = fadeInStart + Math.min(h * 0.42, window.innerHeight * 0.85);

      const contactTop = layout.contactTop;
      // Soft bottom trim only — helix anchor (oy) unchanged, just shorter below.
      const bottomTrim = 270;
      const fadeOutStart = contactTop + Math.min(h * 0.08, 100) - bottomTrim;
      const fadeOutEnd = h * 0.98 - bottomTrim;

      const edgeFadeAt = (py: number) => {
        let f = 1;
        if (py <= fadeInStart) f = 0;
        else if (py < fadeInEnd) {
          const t = (py - fadeInStart) / Math.max(1, fadeInEnd - fadeInStart);
          // Slow ease-in over a long stretch — stays ghostly, then fills in.
          f = t * t * (3 - 2 * t);
          f *= f;
        }
        if (py >= fadeOutEnd) f = 0;
        else if (py > fadeOutStart) {
          const t = (py - fadeOutStart) / Math.max(1, fadeOutEnd - fadeOutStart);
          f *= 1 - t * t * (3 - 2 * t);
        }
        return f;
      };

      const magnetR = Math.min(w, h) * (coarse ? 0.4 : 0.28);
      const dnaHitR = Math.min(refW, refH) * (coarse ? 0.85 : 0.62);
      const wantMagnet =
        magnetsEnabled &&
        pointerOn &&
        Math.hypot(pointerX - ox, pointerY - oy) < dnaHitR &&
        pointerY > fadeInStart - (coarse ? 40 : 0) &&
        pointerY < fadeOutEnd;

      const projected = dots
        .map((d) => {
          const drifted = reduceMotion ? d : driftOf(d, tSec);
          const p = project(drifted.x, drifted.y, drifted.z, cosY, sinY, cosP, sinP);
          const depth = Math.max(0, Math.min(1, (p.z + 0.55) / 1.1));
          let px = ox + p.x * scale * p.p;
          let py = oy - p.y * scale * p.p;
          let pr = d.r * p.p * (1.05 + depth * 0.4) * (light ? 1.2 : 1.1);
          // Mobile: dial DNA down so About copy stays readable over the helix.
          const opacityMul = mobile ? (light ? 0.42 : 0.48) : 1;
          let pa =
            d.a * (0.7 + depth * 0.45) * (light ? 1.35 : 1.15) * edgeFadeAt(py) * opacityMul;

          if (magnet > 0.02) {
            const dx = pointerX - px;
            const dy = pointerY - py;
            const dist = Math.hypot(dx, dy);
            if (dist < magnetR && dist > 0.001) {
              const t = 1 - dist / magnetR;
              const pull = t * t * (coarse ? 0.72 : 0.55) * magnet;
              px += dx * pull;
              py += dy * pull;
              pa *= 1 + t * (coarse ? 0.9 : 0.65) * magnet;
              pr *= 1 + t * 0.25 * magnet;
            }
          }

          return { px, py, pr, pa, z: p.z };
        })
        .sort((a, b) => a.z - b.z);

      for (const d of projected) {
        if (d.px < -8 || d.py < -8 || d.px > w + 8 || d.py > h + 8) continue;
        if (d.pa < 0.04) continue;
        const alpha = Math.min(1, d.pa);
        ctx.fillStyle = light
          ? `rgba(28, 8, 2, ${alpha.toFixed(3)})`
          : `rgba(255, 140, 40, ${alpha.toFixed(3)})`;
        ctx.fillRect(d.px, d.py, Math.max(0.85, d.pr), Math.max(0.85, d.pr));
      }

      // Extra fractals that gather around the cursor like filings on a magnet.
      if (magnet > 0.05 || sparks.length) {
        const target = Math.floor(SPARK_CAP * magnet);
        while (sparks.length < target) {
          const seed = sparks.length * 12.9898 + tSec * 3.1;
          const ang = hash(seed) * Math.PI * 2;
          const rad = 24 + hash(seed + 2) * magnetR * 0.85;
          sparks.push({
            x: pointerX + Math.cos(ang) * rad,
            y: pointerY + Math.sin(ang) * rad,
            vx: 0,
            vy: 0,
            life: 0.5 + hash(seed + 4) * 0.5,
            seed,
            r: 0.55 + hash(seed + 6) * 1.1,
          });
        }
        while (sparks.length > target) sparks.pop();

        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i]!;
          const dx = pointerX - s.x;
          const dy = pointerY - s.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = (coarse ? 3.6 : 2.8) * magnet;
          s.vx += (dx / dist) * pull * 0.55 + (fbm(tSec * 1.2 + s.seed) - 0.5) * 1.4;
          s.vy += (dy / dist) * pull * 0.55 + (fbm(tSec * 1.1 + s.seed + 9) - 0.5) * 1.4;
          s.vx *= 0.86;
          s.vy *= 0.86;
          s.x += s.vx;
          s.y += s.vy;
          s.life -= wantMagnet ? 0.004 : 0.035;
          if (s.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }
          const a = Math.min(1, s.life * (0.55 + magnet * 0.55) * (light ? 0.95 : 0.8));
          if (a < 0.04) continue;
          ctx.fillStyle = light
            ? `rgba(28, 8, 2, ${a.toFixed(3)})`
            : `rgba(255, 140, 40, ${a.toFixed(3)})`;
          ctx.fillRect(s.x, s.y, Math.max(0.55, s.r), Math.max(0.55, s.r));
        }
      }

      return wantMagnet;
    };

    const tick = (ts: number) => {
      if (!running) return;
      raf = 0;
      if (!visible) return;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (!reduceMotion) angle -= IDLE_SPEED * dt;
      const due = frameBudgetMs <= 0 || ts - lastDrawTs >= frameBudgetMs;
      let wantMagnet = false;
      if (due) {
        lastDrawTs = ts;
        wantMagnet = draw(ts * 0.001);
      }
      // Snap on under a finger; linger a bit after lift so the effect reads on mobile.
      const magnetLerp = wantMagnet ? (coarse ? 10 : 7) : coarse ? 2.2 : 5;
      magnet += ((wantMagnet ? 1 : 0) - magnet) * Math.min(1, dt * magnetLerp);
      raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!running || raf || !visible || !dots.length) return;
      lastTs = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (visible) draw(performance.now() * 0.001);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible) kick();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "80px" },
    );
    io.observe(canvas);

    const syncPointer = (e: PointerEvent, pressed?: boolean) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      const inBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (typeof pressed === "boolean") pointerPressed = pressed;
      // Desktop: hover. Touch: only while finger is down (under the finger).
      pointerOn = canHover && e.pointerType === "mouse" ? inBounds : pointerPressed && inBounds;
    };
    const onPointerMove = (e: PointerEvent) => syncPointer(e);
    const onPointerDown = (e: PointerEvent) => syncPointer(e, true);
    const onPointerUp = (e: PointerEvent) => {
      syncPointer(e, false);
      if (!canHover || e.pointerType !== "mouse") pointerOn = false;
    };
    const onPointerLeave = () => {
      if (canHover) pointerOn = false;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("blur", onPointerLeave);

    let cancelled = false;
    fetch(SRC)
      .then((r) => {
        if (!r.ok) throw new Error("dna obj fetch failed");
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        dots = buildDotsFromObj(text, maxDots);
        resize();
        kick();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onPointerLeave);
    };
  }, []);

  return <canvas ref={hostRef} className={styles.cloud} aria-hidden="true" />;
}

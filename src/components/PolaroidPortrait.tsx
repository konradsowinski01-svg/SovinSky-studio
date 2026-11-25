import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./PolaroidPortrait.module.css";

const SRC = `${import.meta.env.BASE_URL}about-portrait.jpg`;
const DURATION = 2800;
/** Crossfade particle mosaic → crisp bake only at the end. */
const SETTLE_FADE = 0.88;
const DISSOLVE_R = 36;
const ORBIT_COUNT = 72;
const SAND_COUNT = 280;

type Vert = { dx: number; dy: number };

type Grain = {
  x0: number;
  y0: number;
  lx: number;
  ly: number;
  r: number;
  g: number;
  b: number;
  cell: number;
  delay: number;
  seed: number;
  rot0: number;
  spin: number;
  verts: Vert[];
};

type OrbitShard = {
  seed: number;
  radius: number;
  speed: number;
  phase: number;
  elev: number;
  r: number;
  g: number;
  b: number;
  verts: Vert[];
  spin: number;
  rot0: number;
  scale: number;
};

type DissolveBit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  verts: Vert[];
  rot: number;
  spin: number;
  scale: number;
};

type SandGrain = {
  ox: number;
  oy: number;
  seed: number;
  verts: Vert[];
  rot: number;
  spin: number;
  scale: number;
};

/** Sharp irregular shard — jagged triangle / dagger / splinter. */
function makeShard(seed: number, cell: number): Vert[] {
  const kind = hash(seed);
  const scale = cell * (0.32 + hash(seed + 0.2) * 0.45);
  const verts: Vert[] = [];

  if (kind < 0.34) {
    const tip = 1.4 + hash(seed + 1) * 1.6;
    const wing = 0.25 + hash(seed + 2) * 0.45;
    const skew = (hash(seed + 3) - 0.5) * 0.7;
    verts.push(
      { dx: 0, dy: -scale * tip },
      { dx: scale * wing, dy: scale * (0.15 + skew) },
      { dx: scale * wing * 0.35, dy: scale * 0.85 },
      { dx: -scale * wing * (0.5 + hash(seed + 4) * 0.5), dy: scale * 0.55 },
      { dx: -scale * wing, dy: scale * (-0.05 + skew * 0.4) },
    );
  } else if (kind < 0.68) {
    const a = 2.6 + hash(seed + 1) * 1.2;
    const b = 2.2 + hash(seed + 2) * 1.4;
    const c = 1.8 + hash(seed + 3) * 1.6;
    verts.push(
      { dx: 0, dy: -scale * a * 0.55 },
      { dx: scale * b * 0.5, dy: scale * (0.2 + hash(seed + 4) * 0.35) },
      { dx: scale * (hash(seed + 5) - 0.3) * 0.4, dy: scale * c * 0.5 },
      { dx: -scale * b * (0.35 + hash(seed + 6) * 0.35), dy: scale * 0.15 },
    );
  } else {
    const n = 5 + Math.floor(hash(seed + 1) * 2);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + hash(seed + i * 0.7) * 0.55;
      const rad =
        scale *
        (0.35 + hash(seed + i + 2) * 1.1) *
        (i % 2 === 0 ? 1.15 + hash(seed + i) * 0.7 : 0.4 + hash(seed + i + 3) * 0.35);
      verts.push({ dx: Math.cos(ang) * rad, dy: Math.sin(ang) * rad });
    }
  }

  return verts;
}

function drawShard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  verts: Vert[],
  scale: number,
  rot: number,
) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  ctx.beginPath();
  for (let i = 0; i < verts.length; i++) {
    const vx = verts[i].dx * scale;
    const vy = verts[i].dy * scale;
    const px = x + vx * c - vy * s;
    const py = y + vx * s + vy * c;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

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

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function bakePolaroid(
  photo: HTMLImageElement,
  W: number,
  H: number,
  dpr: number,
): HTMLCanvasElement {
  const baked = document.createElement("canvas");
  baked.width = Math.max(1, Math.floor(W * dpr));
  baked.height = Math.max(1, Math.floor(H * dpr));
  const ctx = baked.getContext("2d");
  if (!ctx) return baked;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const side = Math.round(W * 0.048);
  const top = side;
  const bottom = Math.round(W * 0.2);
  const winX = side;
  const winY = top;
  const winW = W - side * 2;
  const winH = H - top - bottom;

  ctx.fillStyle = "#f6f1e6";
  roundRect(ctx, 0, 0, W, H, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 2.5);
  ctx.stroke();

  const ir = photo.naturalWidth / photo.naturalHeight;
  const wr = winW / winH;
  let dw = winW;
  let dh = winH;
  let dx = winX;
  let dy = winY;
  if (ir > wr) {
    dw = winH * ir;
    dx = winX + (winW - dw) / 2;
  } else {
    dh = winW / ir;
    dy = winY + (winH - dh) * 0.28;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(winX, winY, winW, winH);
  ctx.clip();
  ctx.filter = "contrast(0.96) brightness(1.02) saturate(0.85) sepia(0.12)";
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.filter = "none";
  ctx.restore();

  ctx.strokeStyle = "rgba(30, 22, 14, 0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(winX + 0.5, winY + 0.5, winW - 1, winH - 1);
  return baked;
}

/** Chaotic spawn across full page — edges, corners, scattered field. */
function spawnStart(seed: number, viewW: number, viewH: number) {
  const mode = hash(seed);
  if (mode < 0.4) {
    const side = Math.floor(hash(seed + 0.3) * 4);
    if (side === 0) return { x: -60 - hash(seed + 1) * viewW * 0.7, y: hash(seed + 2) * viewH };
    if (side === 1) return { x: viewW + 60 + hash(seed + 1) * viewW * 0.7, y: hash(seed + 2) * viewH };
    if (side === 2) return { x: hash(seed + 1) * viewW, y: -60 - hash(seed + 2) * viewH * 0.55 };
    return { x: hash(seed + 1) * viewW, y: viewH + 60 + hash(seed + 2) * viewH * 0.55 };
  }
  if (mode < 0.62) {
    const cx = hash(seed + 1) < 0.5 ? -80 - hash(seed + 2) * 120 : viewW + 80 + hash(seed + 2) * 120;
    const cy = hash(seed + 3) < 0.5 ? -80 - hash(seed + 4) * 100 : viewH + 80 + hash(seed + 4) * 100;
    return { x: cx, y: cy };
  }
  return {
    x: (hash(seed + 1) * 1.6 - 0.3) * viewW,
    y: (hash(seed + 2) * 1.5 - 0.25) * viewH,
  };
}

function sampleGrains(
  baked: HTMLCanvasElement,
  dpr: number,
  viewW: number,
  viewH: number,
): Grain[] {
  const ctx = baked.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const data = ctx.getImageData(0, 0, baked.width, baked.height).data;
  const step = Math.max(2, Math.floor(2.2 * dpr));
  const cell = step / dpr;
  const grains: Grain[] = [];
  let i = 0;

  for (let py = 0; py < baked.height; py += step) {
    for (let px = 0; px < baked.width; px += step) {
      const idx = (py * baked.width + px) * 4;
      if (data[idx + 3] < 20) continue;
      const seed = i * 17.3 + hash(i * 0.13) * 40 + 2.1;
      if (hash(seed + 11) < 0.12) {
        i += 1;
        continue;
      }
      const start = spawnStart(seed, viewW, viewH);
      const cellMul = 0.45 + hash(seed + 5) * 0.55;
      grains.push({
        x0: start.x,
        y0: start.y,
        lx: px / dpr + (hash(seed + 12) - 0.5) * cell * 0.35,
        ly: py / dpr + (hash(seed + 13) - 0.5) * cell * 0.35,
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        cell: cell * cellMul,
        delay: hash(seed + 4) * 0.48,
        seed,
        rot0: hash(seed + 6) * Math.PI * 2,
        spin: (hash(seed + 7) - 0.5) * 7.5,
        verts: makeShard(seed + 8, cell * cellMul),
      });
      i += 1;
    }
  }

  for (let k = 0; k < 160; k++) {
    const seed = k * 23.9 + 9;
    const pick = grains[Math.floor(hash(seed) * Math.max(grains.length, 1))];
    if (!pick) continue;
    const start = spawnStart(seed + 1, viewW, viewH);
    const cellMul = 0.35 + hash(seed + 8) * 0.55;
    const c = cell * cellMul;
    grains.push({
      x0: start.x,
      y0: start.y,
      lx: pick.lx + (hash(seed + 4) - 0.5) * 18,
      ly: pick.ly + (hash(seed + 5) - 0.5) * 18,
      r: 255,
      g: 110 + Math.floor(hash(seed + 6) * 70),
      b: 35 + Math.floor(hash(seed + 7) * 40),
      cell: c,
      delay: hash(seed + 9) * 0.55,
      seed,
      rot0: hash(seed + 10) * Math.PI * 2,
      spin: (hash(seed + 11) - 0.5) * 10,
      verts: makeShard(seed + 12, c),
    });
  }

  return grains;
}

function buildOrbitShards(count: number): OrbitShard[] {
  const list: OrbitShard[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 19.7 + 3.3;
    const accent = hash(seed + 1) > 0.72;
    const cell = 1.1 + hash(seed + 2) * 1.6;
    list.push({
      seed,
      radius: 0.58 + hash(seed + 3) * 0.55,
      speed: (0.18 + hash(seed + 4) * 0.55) * (hash(seed + 5) < 0.5 ? -1 : 1),
      phase: hash(seed + 6) * Math.PI * 2,
      elev: (hash(seed + 7) - 0.5) * 0.55,
      r: accent ? 255 : 200 + Math.floor(hash(seed + 8) * 55),
      g: accent ? 120 + Math.floor(hash(seed + 9) * 60) : 170 + Math.floor(hash(seed + 9) * 50),
      b: accent ? 40 + Math.floor(hash(seed + 10) * 40) : 140 + Math.floor(hash(seed + 10) * 50),
      verts: makeShard(seed + 11, cell),
      spin: (hash(seed + 12) - 0.5) * 2.2,
      rot0: hash(seed + 13) * Math.PI * 2,
      scale: 0.55 + hash(seed + 14) * 0.7,
    });
  }
  return list;
}

function localToScreen(
  lx: number,
  ly: number,
  rect: DOMRect,
  localW: number,
  localH: number,
) {
  const rad = (-2 * Math.PI) / 180;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const scaleX = rect.width / localW;
  const scaleY = rect.height / localH;
  const x = (lx - localW / 2) * scaleX;
  const y = (ly - localH / 2) * scaleY;
  return {
    x: cx + x * Math.cos(rad) - y * Math.sin(rad),
    y: cy + x * Math.sin(rad) + y * Math.cos(rad),
  };
}

/** Screen point → local bake coords (unwrap CSS rotate(-2deg)). */
function screenToLocal(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  localW: number,
  localH: number,
) {
  const rad = (2 * Math.PI) / 180;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const ux = dx * Math.cos(rad) - dy * Math.sin(rad);
  const uy = dx * Math.sin(rad) + dy * Math.cos(rad);
  return {
    lx: localW / 2 + (ux / rect.width) * localW,
    ly: localH / 2 + (uy / rect.height) * localH,
  };
}

type Props = {
  alt?: string;
  className?: string;
};

export function PolaroidPortrait({ alt = "Portret", className = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!wrap || !canvas || !overlay) return;
    const ctx = canvas.getContext("2d");
    const octx = overlay.getContext("2d");
    if (!ctx || !octx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let raf = 0;
    let started = false;
    let idle = false;
    let baked: HTMLCanvasElement | null = null;
    let bakeData: ImageData | null = null;
    let grains: Grain[] = [];
    let orbiters: OrbitShard[] = [];
    let dissolve: DissolveBit[] = [];
    let sandPool: SandGrain[] = [];
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let viewW = 0;
    let viewH = 0;
    let pointerOn = false;
    let ptrX = 0;
    let ptrY = 0;
    let ptrLx = 0;
    let ptrLy = 0;
    let lastSpawn = 0;
    let idleStart = 0;

    const photo = new Image();
    photo.decoding = "async";
    photo.src = SRC;

    const sizePolaroid = () => {
      cssW = wrap.clientWidth || 340;
      cssH = Math.round(cssW * 1.22);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const sizeOverlay = (force = false) => {
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;
      if (!force && nextW === viewW && nextH === viewH) return;
      viewW = nextW;
      viewH = nextH;
      const odpr = Math.min(window.devicePixelRatio || 1, 2);
      overlay.width = Math.max(1, Math.floor(viewW * odpr));
      overlay.height = Math.max(1, Math.floor(viewH * odpr));
      overlay.style.width = `${viewW}px`;
      overlay.style.height = `${viewH}px`;
      octx.setTransform(odpr, 0, 0, odpr, 0, 0);
    };

    const sampleColorAt = (lx: number, ly: number) => {
      if (!bakeData) return { r: 220, g: 180, b: 120 };
      const px = Math.max(0, Math.min(bakeData.width - 1, Math.floor(lx * dpr)));
      const py = Math.max(0, Math.min(bakeData.height - 1, Math.floor(ly * dpr)));
      const i = (py * bakeData.width + px) * 4;
      return { r: bakeData.data[i], g: bakeData.data[i + 1], b: bakeData.data[i + 2] };
    };

    const ensureSandPool = () => {
      if (sandPool.length) return;
      for (let i = 0; i < SAND_COUNT; i++) {
        const seed = i * 13.7 + 4.2;
        const cell = 0.7 + hash(seed) * 1.1;
        sandPool.push({
          ox: (hash(seed + 1) - 0.5) * 2,
          oy: (hash(seed + 2) - 0.5) * 2,
          seed,
          verts: makeShard(seed + 3, cell),
          rot: hash(seed + 4) * Math.PI * 2,
          spin: (hash(seed + 5) - 0.5) * 0.12,
          scale: 0.4 + hash(seed + 6) * 0.55,
        });
      }
    };

    /** Soften photo under cursor, then pack the disc with living sand shards. */
    const paintPolaroid = (now: number) => {
      if (!baked) return;
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(baked, 0, 0, cssW, cssH);
      if (!pointerOn) return;

      ensureSandPool();
      const t = now * 0.001;

      // soft fade of sharp photo — replaced visually by sand, not a see-through hole
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const fade = ctx.createRadialGradient(ptrLx, ptrLy, 0, ptrLx, ptrLy, DISSOLVE_R);
      fade.addColorStop(0, "rgba(0,0,0,0.92)");
      fade.addColorStop(0.7, "rgba(0,0,0,0.55)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fade;
      ctx.beginPath();
      ctx.arc(ptrLx, ptrLy, DISSOLVE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(ptrLx, ptrLy, DISSOLVE_R, 0, Math.PI * 2);
      ctx.clip();

      for (let i = 0; i < sandPool.length; i++) {
        const g = sandPool[i];
        const ang = hash(g.seed + 8) * Math.PI * 2;
        const dist = Math.sqrt(hash(g.seed + 9)) * DISSOLVE_R;
        const jx = (fbm(g.seed + t * 2.4) - 0.5) * 5.5;
        const jy = (fbm(g.seed + 20 + t * 2.1) - 0.5) * 5.5;
        const lx = ptrLx + Math.cos(ang) * dist + g.ox + jx;
        const ly = ptrLy + Math.sin(ang) * dist + g.oy + jy;
        const col = sampleColorAt(
          ptrLx + Math.cos(ang) * dist,
          ptrLy + Math.sin(ang) * dist,
        );
        const edge = Math.min(1, (DISSOLVE_R - dist) / 8);
        const alpha = 0.55 + edge * 0.4;
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha.toFixed(3)})`;
        drawShard(ctx, lx, ly, g.verts, g.scale, g.rot + t * g.spin * 10);
      }

      // denser speck fill so no empty gaps show through
      for (let i = 0; i < 160; i++) {
        const seed = i * 9.1 + t * 3;
        const ang = hash(seed) * Math.PI * 2;
        const dist = Math.sqrt(hash(seed + 1)) * DISSOLVE_R * 0.98;
        const lx = ptrLx + Math.cos(ang) * dist + (fbm(seed + t) - 0.5) * 3;
        const ly = ptrLy + Math.sin(ang) * dist + (fbm(seed + 5 + t) - 0.5) * 3;
        const col = sampleColorAt(lx, ly);
        const sz = 0.8 + hash(seed + 2) * 1.6;
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${(0.55 + hash(seed + 3) * 0.4).toFixed(3)})`;
        ctx.fillRect(lx, ly, sz, sz);
      }
      ctx.restore();
    };

    const spawnDissolveBits = (now: number) => {
      if (!pointerOn || now - lastSpawn < 28) return;
      lastSpawn = now;
      const live = wrap.getBoundingClientRect();
      for (let n = 0; n < 3; n++) {
        const seed = now * 0.01 + n * 7.3;
        const ang = hash(seed) * Math.PI * 2;
        const dist = hash(seed + 1) * DISSOLVE_R * 0.7;
        const lx = ptrLx + Math.cos(ang) * dist;
        const ly = ptrLy + Math.sin(ang) * dist;
        if (lx < 0 || ly < 0 || lx > cssW || ly > cssH) continue;
        const col = sampleColorAt(lx, ly);
        const screen = localToScreen(lx, ly, live, cssW, cssH);
        const outAng = Math.atan2(ly - ptrLy, lx - ptrLx) + (hash(seed + 2) - 0.5) * 0.9;
        const speed = 0.25 + hash(seed + 3) * 0.9;
        const cell = 0.8 + hash(seed + 4) * 1.0;
        dissolve.push({
          x: screen.x,
          y: screen.y,
          vx: Math.cos(outAng) * speed,
          vy: Math.sin(outAng) * speed - 0.15,
          life: 0,
          maxLife: 380 + hash(seed + 5) * 320,
          r: col.r,
          g: col.g,
          b: col.b,
          verts: makeShard(seed + 6, cell),
          rot: hash(seed + 7) * Math.PI * 2,
          spin: (hash(seed + 8) - 0.5) * 0.16,
          scale: 0.4 + hash(seed + 9) * 0.5,
        });
      }
      if (dissolve.length > 140) dissolve.splice(0, dissolve.length - 140);
    };

    const drawOrbiters = (now: number, live: DOMRect) => {
      const cx = live.left + live.width / 2;
      const cy = live.top + live.height / 2;
      const baseR = Math.max(live.width, live.height) * 0.55;
      const t = (now - idleStart) / 1000;

      for (const o of orbiters) {
        const ang = o.phase + t * o.speed;
        const wobble = fbm(o.seed + t * 0.35) - 0.5;
        const rr = baseR * o.radius * (1 + wobble * 0.08);
        const x = cx + Math.cos(ang) * rr * 1.05;
        const y = cy + Math.sin(ang) * rr * 0.72 + o.elev * live.height;
        const alpha = 0.28 + hash(o.seed + Math.floor(t * 2)) * 0.35;
        octx.fillStyle = `rgba(${o.r},${o.g},${o.b},${alpha.toFixed(3)})`;
        drawShard(octx, x, y, o.verts, o.scale, o.rot0 + t * o.spin);
      }
    };

    const drawDissolveBits = (dt: number) => {
      for (let i = dissolve.length - 1; i >= 0; i--) {
        const b = dissolve[i];
        b.life += dt;
        b.x += b.vx * (dt * 0.06);
        b.y += b.vy * (dt * 0.06);
        b.vy += 0.012 * dt * 0.06;
        b.rot += b.spin * dt * 0.06;
        const u = b.life / b.maxLife;
        if (u >= 1) {
          dissolve.splice(i, 1);
          continue;
        }
        const alpha = (1 - u) * 0.85;
        octx.fillStyle = `rgba(${b.r},${b.g},${b.b},${alpha.toFixed(3)})`;
        drawShard(octx, b.x, b.y, b.verts, b.scale * (0.7 + (1 - u) * 0.5), b.rot);
      }
    };

    let lastIdleTs = 0;
    const idleTick = (now: number) => {
      if (cancelled || !baked || !idle) return;
      const dt = lastIdleTs ? Math.min(40, now - lastIdleTs) : 16;
      lastIdleTs = now;
      const live = wrap.getBoundingClientRect();

      sizeOverlay(false);
      octx.clearRect(0, 0, viewW, viewH);
      drawOrbiters(now, live);

      paintPolaroid(now);
      if (pointerOn) spawnDissolveBits(now);
      drawDissolveBits(dt);
      raf = requestAnimationFrame(idleTick);
    };

    const enterIdle = () => {
      if (!baked || cancelled) return;
      wrap.dataset.state = "done";
      idle = true;
      idleStart = performance.now();
      lastIdleTs = 0;
      orbiters = buildOrbitShards(ORBIT_COUNT);
      const bctx = baked.getContext("2d", { willReadFrequently: true });
      bakeData = bctx ? bctx.getImageData(0, 0, baked.width, baked.height) : null;
      overlay.classList.add(styles.overlayLive);
      ensureSandPool();
      paintPolaroid(performance.now());
      raf = requestAnimationFrame(idleTick);
    };

    const setup = () => {
      if (cancelled || !photo.naturalWidth) return;
      sizePolaroid();
      baked = bakePolaroid(photo, cssW, cssH, dpr);
      if (!started) {
        ctx.clearRect(0, 0, cssW, cssH);
        wrap.dataset.state = "pending";
      } else if (idle) {
        const bctx = baked.getContext("2d", { willReadFrequently: true });
        bakeData = bctx ? bctx.getImageData(0, 0, baked.width, baked.height) : null;
        paintPolaroid(performance.now());
      }
    };

    const play = () => {
      if (started || cancelled || !baked) return;
      started = true;

      if (reduceMotion) {
        wrap.dataset.state = "done";
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.drawImage(baked, 0, 0, cssW, cssH);
        return;
      }

      sizeOverlay();
      grains = sampleGrains(baked, dpr, viewW, viewH);
      wrap.dataset.state = "forming";
      overlay.classList.add(styles.overlayLive);
      const start = performance.now();

      const tick = (now: number) => {
        if (cancelled || !baked) return;
        const elapsed = now - start;
        const globalT = Math.min(1, elapsed / DURATION);
        const live = wrap.getBoundingClientRect();
        const settle = easeInOut(Math.max(0, (globalT - SETTLE_FADE) / (1 - SETTLE_FADE)));

        octx.clearRect(0, 0, viewW, viewH);

        if (settle > 0) {
          octx.save();
          octx.globalAlpha = settle;
          octx.translate(live.left + live.width / 2, live.top + live.height / 2);
          octx.rotate((-2 * Math.PI) / 180);
          octx.drawImage(baked, -cssW / 2, -cssH / 2, cssW, cssH);
          octx.restore();
        }

        const grainAlpha = 1 - settle;
        if (grainAlpha > 0.01) {
          for (const g of grains) {
            const span = Math.max(0.22, 1 - g.delay * 0.6);
            const local = Math.min(1, Math.max(0, (elapsed / DURATION - g.delay) / span));
            const t = easeOutCubic(local);
            const target = localToScreen(g.lx, g.ly, live, cssW, cssH);
            const wobble = (1 - t) * (1 - t);
            const jx = (fbm(g.seed + elapsed * 0.0024) - 0.5) * wobble * 48;
            const jy = (fbm(g.seed + 40 + elapsed * 0.0019) - 0.5) * wobble * 42;
            const bend = Math.sin(local * Math.PI) * (hash(g.seed + 3) - 0.5) * 70 * (1 - t);
            const x = g.x0 + (target.x - g.x0) * t + jx + bend;
            const y = g.y0 + (target.y - g.y0) * t + jy - bend * 0.35;
            const flight = 1 - t;
            const scale = 0.4 + flight * (0.35 + hash(g.seed + 15) * 0.45);
            const rot = g.rot0 + g.spin * flight + (1 - t) * 0.4;
            const alpha = grainAlpha * (0.5 + t * 0.5);
            octx.fillStyle = `rgba(${g.r},${g.g},${g.b},${alpha.toFixed(3)})`;
            drawShard(octx, x, y, g.verts, scale, rot);
          }
        }

        if (globalT < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          enterIdle();
        }
      };

      raf = requestAnimationFrame(tick);
    };

    const onReady = () => {
      setup();
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          if (!started) play();
        }, 60);
      });
    };

    photo.onload = onReady;
    if (photo.complete) onReady();

    const onPointerMove = (e: PointerEvent) => {
      if (!idle) return;
      pointerOn = true;
      ptrX = e.clientX;
      ptrY = e.clientY;
      const live = wrap.getBoundingClientRect();
      const local = screenToLocal(ptrX, ptrY, live, cssW, cssH);
      ptrLx = local.lx;
      ptrLy = local.ly;
    };

    const onPointerLeave = () => {
      pointerOn = false;
    };

    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerenter", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);

    const onResize = () => {
      setup();
      sizeOverlay();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      idle = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerenter", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <>
      <div ref={wrapRef} className={`${styles.wrap} ${className}`} data-state="pending">
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={alt} />
      </div>
      {createPortal(
        <canvas ref={overlayRef} className={styles.overlay} aria-hidden="true" />,
        document.body,
      )}
    </>
  );
}

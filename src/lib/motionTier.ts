export type MotionTier = "high" | "medium" | "low";

type NavigatorMem = Navigator & { deviceMemory?: number };

let cached: MotionTier | null = null;

function isIOSLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS desktop UA
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isAndroid() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
}

/**
 * Quality ladder for continuous effects (canvas / WebGL / Lenis).
 * Apple Silicon / desktop keep full fidelity; Android mid-range
 * (Edge 50 class) gets medium/low so the page stays scrollable.
 */
export function getMotionTier(): MotionTier {
  if (cached) return cached;
  if (typeof window === "undefined") return "high";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cached = "low";
    return cached;
  }

  // Flagship phones that already feel great — don't strip the look.
  if (isIOSLike()) {
    cached = "high";
    return cached;
  }

  const cores = navigator.hardwareConcurrency || 8;
  const mem = (navigator as NavigatorMem).deviceMemory;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const weakCpu = cores <= 6;
  const weakRam = typeof mem === "number" && mem <= 4;
  const smallPhone = shortSide > 0 && shortSide < 430;

  if (isAndroid()) {
    // Adreno/Mali + this stack (DNA points + multi-WebGL + Lenis) needs
    // the light path even on "flagship" Android — Apple GPU is the outlier.
    cached = weakCpu || weakRam || smallPhone ? "low" : "medium";
    return cached;
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && (weakCpu || weakRam)) {
    cached = "medium";
    return cached;
  }
  if (weakCpu || weakRam) {
    cached = "medium";
    return cached;
  }
  cached = "high";
  return cached;
}

/** Cap backing-store resolution for 2D/WebGL canvases. */
export function canvasDpr(tier: MotionTier = getMotionTier()): number {
  const raw = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (tier === "low") return 1;
  if (tier === "medium") return Math.min(raw, 1.25);
  return Math.min(raw, 2);
}

export function isTouchMotion(): boolean {
  return getMotionTier() !== "high";
}

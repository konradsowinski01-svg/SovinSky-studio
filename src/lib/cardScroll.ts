import { getLenis } from "./lenisStore";

/**
 * Autoscroll `#/w` zsynchronizowany z piosenką.
 * Czasy w `CUES` są w sekundach piosenki (bez 1 s ciszy na początku pliku).
 */

/** Cisza wklejona na początku card-intro.mp3. */
const LEAD_IN_SEC = 1;
/** Odstęp nagłówka od dolnej krawędzi topbara. */
const ANCHOR_GAP_PX = 24;
/** „Bardzo powoli” po dojechaniu do celu. */
const DRIFT_PX_PER_SEC = 22;

type Cue = {
  /** Sekunda piosenki, w której rusza zjazd. */
  at: number;
  /** Czas zjazdu w sekundach. */
  duration: number;
  /** `data-card-anchor` elementu docelowego. */
  anchor?: string;
  /** `top` — tuż pod topbarem, `center` — środek elementu na środku ekranu. */
  align?: "top" | "center";
  /** Korekta pozycji w px (ujemne = wyżej). */
  offsetPx?: number;
  /** Relatywny zjazd od bieżącej pozycji (np. +150). */
  deltaPx?: number;
  /** Wróć na samą górę strony. */
  toTop?: boolean;
  /** Po dojechaniu nie dryfuj dalej. */
  hold?: boolean;
  /** Krzywa: out = szybki zjazd + miękki stop, inout = wolniejszy powrót. */
  ease?: "out" | "inout";
};

const CUES: Cue[] = [
  { at: 6, duration: 1.4, anchor: "work-heading", align: "top" },
  { at: 8.8, duration: 1.4, anchor: "firma-online", align: "top" },
  { at: 11, duration: 1.4, anchor: "kampania-sms", align: "center" },
  { at: 13.4, duration: 1.4, anchor: "about", align: "center", offsetPx: -220 },
  { at: 16, duration: 1.4, deltaPx: 400 },
  // 18.5 − 50 ms; po dojechaniu (+1.4) + 1 s pauzy → powrót na górę
  { at: 18.45, duration: 1.4, deltaPx: 800 },
  { at: 20.85, duration: 3.0, toTop: true, hold: true, ease: "inout" },
];

const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const BLOCKED_KEYS = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

function maxScroll() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

/** Pozycja z layoutu (offsetTop), nie z rect — kafelki mają scrollowany transform y. */
function layoutTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

function anchorY(cue: Cue, fromY: number): number | null {
  if (cue.toTop) return 0;
  if (cue.deltaPx != null) return fromY + cue.deltaPx;
  if (!cue.anchor) return null;
  const el = document.querySelector<HTMLElement>(`[data-card-anchor="${cue.anchor}"]`);
  if (!el) return null;
  const top = layoutTop(el);
  const extra = cue.offsetPx ?? 0;
  if (cue.align === "center") {
    return top + el.offsetHeight / 2 - window.innerHeight / 2 + extra;
  }
  const topbar = document.querySelector<HTMLElement>("[data-topbar]");
  const offset = (topbar?.getBoundingClientRect().bottom ?? 0) + ANCHOR_GAP_PX;
  return top - offset + extra;
}

function setScroll(y: number) {
  const clamped = Math.min(maxScroll(), Math.max(0, y));
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(clamped, { immediate: true, force: true });
  else window.scrollTo(0, clamped);
}

let running = false;

export function runCardScroll(audio: HTMLAudioElement) {
  if (running) return;
  running = true;

  // stopPropagation — Lenis słucha wheel/touch na window i inaczej by się szarpał.
  const block = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const blockKeys = (e: KeyboardEvent) => {
    if (!BLOCKED_KEYS.has(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const opts: AddEventListenerOptions = { passive: false, capture: true };
  window.addEventListener("wheel", block, opts);
  window.addEventListener("touchmove", block, opts);
  window.addEventListener("keydown", blockKeys, opts);

  // Płynny zegar: currentTime w Safari skacze co kilkadziesiąt ms.
  let clockAudio = audio.currentTime;
  let clockPerf = performance.now();
  const songTime = () => {
    const now = performance.now();
    const est = audio.paused ? clockAudio : clockAudio + (now - clockPerf) / 1000;
    if (Math.abs(audio.currentTime - est) > 0.12) {
      clockAudio = audio.currentTime;
      clockPerf = now;
      return clockAudio - LEAD_IN_SEC;
    }
    return est - LEAD_IN_SEC;
  };

  let cueIndex = -1;
  let fromY = 0;
  let toY = 0;
  let restY = 0;
  let restAt = 0;
  let raf = 0;
  let done = false;

  const release = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("wheel", block, opts);
    window.removeEventListener("touchmove", block, opts);
    window.removeEventListener("keydown", blockKeys, opts);
    audio.removeEventListener("ended", release);
    running = false;
  };
  audio.addEventListener("ended", release);

  const tick = () => {
    if (done) return;
    const t = songTime();

    const next = CUES[cueIndex + 1];
    if (next && t >= next.at) {
      cueIndex += 1;
      fromY = window.scrollY;
      toY = anchorY(next, fromY) ?? fromY;
    }

    const cue = CUES[cueIndex];
    if (cue) {
      const p = (t - cue.at) / cue.duration;
      if (p < 1) {
        const e = cue.ease === "inout" ? easeInOutCubic : easeOutQuart;
        setScroll(fromY + (toY - fromY) * e(Math.max(0, p)));
        restY = toY;
        restAt = cue.at + cue.duration;
      } else if (cue.hold || cue.toTop) {
        setScroll(toY);
        if (cue.toTop) release();
      } else {
        setScroll(restY + (t - restAt) * DRIFT_PX_PER_SEC);
      }
    }

    if (!done) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

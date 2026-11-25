/**
 * Muzyka tylko dla `#/w` — wycinek 2:45–3:10.
 * Głośność przez Web Audio GainNode (Safari ignoruje HTMLAudioElement.volume).
 */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
export const CARD_MUSIC_START = 2 * 60 + 45;
export const CARD_MUSIC_FADE_AT = 3 * 60 + 6;
export const CARD_MUSIC_END = 3 * 60 + 10;
const TARGET_VOL = 0.42;
const FADE_IN_MS = 1600;
const FADE_OUT_MS = (CARD_MUSIC_END - CARD_MUSIC_FADE_AT) * 1000;
export const CARD_MUSIC_TAP_DELAY_MS = 1130;

let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let routed = false;
let started = false;
let readyPromise: Promise<void> | null = null;
let startTimer = 0;
let fadeTimer = 0;
let endTimer = 0;

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.preload = "auto";
  audio.loop = false;
  audio.volume = 1;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  return audio;
}

function ensureGraph(): { ctx: AudioContext; gain: GainNode; el: HTMLAudioElement } {
  const el = ensureAudio();
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!ctx) ctx = new AC();
  if (!gain) gain = ctx.createGain();
  if (!routed) {
    const src = ctx.createMediaElementSource(el);
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0;
    routed = true;
  }
  return { ctx, gain, el };
}

function whenReady(el: HTMLAudioElement): Promise<void> {
  if (el.readyState >= 1) return Promise.resolve();
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const bad = () => {
      cleanup();
      reject(new Error("audio load failed"));
    };
    const cleanup = () => {
      el.removeEventListener("loadedmetadata", ok);
      el.removeEventListener("canplay", ok);
      el.removeEventListener("error", bad);
    };
    el.addEventListener("loadedmetadata", ok, { once: true });
    el.addEventListener("canplay", ok, { once: true });
    el.addEventListener("error", bad, { once: true });
    el.load();
  });
  return readyPromise;
}

function clearClipTimers() {
  if (fadeTimer) {
    window.clearTimeout(fadeTimer);
    fadeTimer = 0;
  }
  if (endTimer) {
    window.clearTimeout(endTimer);
    endTimer = 0;
  }
}

function setGainNow(value: number) {
  if (!ctx || !gain) return;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(value, ctx.currentTime);
}

function rampGainTo(value: number, ms: number) {
  if (!ctx || !gain) return;
  const now = ctx.currentTime;
  const dur = Math.max(0.05, ms / 1000);
  const from = gain.gain.value;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(from, now);
  gain.gain.linearRampToValueAtTime(value, now + dur);
}

function finishClip(el: HTMLAudioElement) {
  clearClipTimers();
  setGainNow(0);
  el.pause();
  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore */
  }
}

/** Fade-out od FADE_AT → END na GainNode + timerach (nie na HTML volume). */
function armClipEnvelope(el: HTMLAudioElement) {
  clearClipTimers();

  const msUntil = (target: number) =>
    Math.max(0, (target - el.currentTime) * 1000);

  fadeTimer = window.setTimeout(() => {
    fadeTimer = 0;
    rampGainTo(0, FADE_OUT_MS);
  }, msUntil(CARD_MUSIC_FADE_AT));

  endTimer = window.setTimeout(() => {
    endTimer = 0;
    finishClip(el);
  }, msUntil(CARD_MUSIC_END) + 40);
}

async function playClip(): Promise<void> {
  const { ctx: audioCtx, el } = ensureGraph();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  await whenReady(el);

  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore */
  }
  if (Math.abs(el.currentTime - CARD_MUSIC_START) > 0.35) {
    await new Promise<void>((r) => {
      const onSeek = () => {
        el.removeEventListener("seeked", onSeek);
        r();
      };
      el.addEventListener("seeked", onSeek);
      try {
        el.currentTime = CARD_MUSIC_START;
      } catch {
        /* ignore */
      }
      window.setTimeout(r, 180);
    });
  }

  el.muted = false;
  setGainNow(0);
  await el.play();
  started = true;
  rampGainTo(TARGET_VOL, FADE_IN_MS);
  // currentTime bywa niestabilne tuż po play — dograj envelope w następnej klatce
  requestAnimationFrame(() => {
    if (Math.abs(el.currentTime - CARD_MUSIC_START) > 1.5) {
      try {
        el.currentTime = CARD_MUSIC_START;
      } catch {
        /* ignore */
      }
    }
    armClipEnvelope(el);
  });
}

/** Preload na starcie czarnego ekranu. */
export function armCardMusic(): () => void {
  const el = ensureAudio();
  void whenReady(el).catch(() => undefined);
  return () => {
    if (startTimer) window.clearTimeout(startTimer);
    clearClipTimers();
  };
}

/**
 * W pointerdown: odblokuj AudioContext + element, po delay odpal wycinek.
 */
export function startCardMusicFromTap(): void {
  if (started && audio && !audio.paused) return;
  if (startTimer) window.clearTimeout(startTimer);

  const { ctx: audioCtx, el } = ensureGraph();
  void audioCtx.resume();

  el.muted = true;
  setGainNow(0);
  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore */
  }

  const unlock = el.play();
  if (unlock) {
    void unlock
      .then(() => {
        el.pause();
        el.muted = false;
        try {
          el.currentTime = CARD_MUSIC_START;
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  }

  startTimer = window.setTimeout(() => {
    startTimer = 0;
    void playClip().catch(() => undefined);
  }, CARD_MUSIC_TAP_DELAY_MS);
}

export function isCardMusicPlaying(): boolean {
  return Boolean(started && audio && !audio.paused);
}

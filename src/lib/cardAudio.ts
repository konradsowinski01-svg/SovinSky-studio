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
/** Stała długość wycinka od START — niezależna od kapryśnego currentTime przy starcie. */
const CLIP_TO_FADE_MS = (CARD_MUSIC_FADE_AT - CARD_MUSIC_START) * 1000;
const CLIP_TO_END_MS = (CARD_MUSIC_END - CARD_MUSIC_START) * 1000;
export const CARD_MUSIC_TAP_DELAY_MS = 1130;

let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let routed = false;
let started = false;
let fadingOut = false;
let readyPromise: Promise<void> | null = null;
let startTimer = 0;
let fadeTimer = 0;
let endTimer = 0;
let watchRaf = 0;

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
  if (watchRaf) {
    cancelAnimationFrame(watchRaf);
    watchRaf = 0;
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
  const from = Math.max(0, gain.gain.value);
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(from, now);
  gain.gain.linearRampToValueAtTime(value, now + dur);
}

function finishClip(el: HTMLAudioElement) {
  clearClipTimers();
  fadingOut = false;
  setGainNow(0);
  el.pause();
  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore */
  }
}

function beginFadeOut() {
  if (fadingOut) return;
  fadingOut = true;
  rampGainTo(0, FADE_OUT_MS);
}

/**
 * Timery od momentu startu wycinka (wall-clock) + watchdog na currentTime.
 * Nie liczymy msUntil(END - currentTime) gdy currentTime bywa jeszcze 0 po seeku.
 */
function armClipEnvelope(el: HTMLAudioElement) {
  clearClipTimers();
  fadingOut = false;

  fadeTimer = window.setTimeout(() => {
    fadeTimer = 0;
    beginFadeOut();
  }, CLIP_TO_FADE_MS);

  endTimer = window.setTimeout(() => {
    endTimer = 0;
    finishClip(el);
  }, CLIP_TO_END_MS);

  const watch = () => {
    if (!started) {
      watchRaf = 0;
      return;
    }
    const t = el.currentTime;
    // Dopiero gdy jesteśmy w okolicy wycinka — chroni przed fałszywym currentTime=0
    if (t >= CARD_MUSIC_FADE_AT - 0.05) beginFadeOut();
    if (t >= CARD_MUSIC_END) {
      finishClip(el);
      return;
    }
    if (!el.paused || fadingOut) {
      watchRaf = requestAnimationFrame(watch);
      return;
    }
    watchRaf = 0;
  };
  watchRaf = requestAnimationFrame(watch);
}

function seekToStart(el: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      el.removeEventListener("seeked", done);
      resolve();
    };
    el.addEventListener("seeked", done);
    try {
      el.currentTime = CARD_MUSIC_START;
    } catch {
      /* ignore */
    }
    window.setTimeout(done, 220);
  });
}

async function playClip(): Promise<void> {
  const { ctx: audioCtx, el } = ensureGraph();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  await whenReady(el);
  await seekToStart(el);

  // Jeśli seek nadal nie złapał — jeszcze raz
  if (Math.abs(el.currentTime - CARD_MUSIC_START) > 0.75) {
    await seekToStart(el);
  }

  el.muted = false;
  setGainNow(0);
  await el.play();
  started = true;
  rampGainTo(TARGET_VOL, FADE_IN_MS);
  armClipEnvelope(el);
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

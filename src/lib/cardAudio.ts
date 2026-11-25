/** Muzyka tylko dla `#/w`. Start od 2:45 przy ostatnim słowie intro. */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
export const CARD_MUSIC_START = 2 * 60 + 45;
const TARGET_VOL = 0.42;
const FADE_MS = 1600;

let audio: HTMLAudioElement | null = null;
let started = false;
let fading = false;
/** Cue już padł (ostatnie słowo), ale play mógł być zablokowany. */
let pendingCue = false;
let readyPromise: Promise<void> | null = null;

function ensure(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.preload = "auto";
  audio.loop = false;
  audio.volume = 0;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  return audio;
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

function fadeIn(el: HTMLAudioElement) {
  if (fading) return;
  fading = true;
  const t0 = performance.now();
  const from = el.volume;
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / FADE_MS);
    el.volume = from + (TARGET_VOL - from) * (1 - (1 - t) ** 2);
    if (t < 1) requestAnimationFrame(tick);
    else fading = false;
  };
  requestAnimationFrame(tick);
}

async function seekAndPlay(): Promise<boolean> {
  const el = ensure();
  if (started && !el.paused) return true;

  try {
    await whenReady(el);
    el.currentTime = CARD_MUSIC_START;
    // mały delay pomaga Safari dogonić seek
    if (Math.abs(el.currentTime - CARD_MUSIC_START) > 1) {
      await new Promise<void>((r) => {
        const onSeek = () => {
          el.removeEventListener("seeked", onSeek);
          r();
        };
        el.addEventListener("seeked", onSeek);
        window.setTimeout(r, 120);
      });
      el.currentTime = CARD_MUSIC_START;
    }
    el.volume = 0;
    await el.play();
    started = true;
    pendingCue = false;
    fadeIn(el);
    return true;
  } catch {
    pendingCue = true;
    return false;
  }
}

/** Preload na starcie czarnego ekranu. */
export function armCardMusic(): () => void {
  const el = ensure();
  void whenReady(el).catch(() => undefined);
  return () => undefined;
}

/** Wołane przy pierwszym znaku „zbudować”. */
export async function cueCardMusic(): Promise<boolean> {
  pendingCue = true;
  return seekAndPlay();
}

/**
 * Wołane z pointerdown na intro — Safari wymaga gestu.
 * Jeśli cue już padł, odpala od razu od 2:45.
 */
export async function gestureCardMusic(): Promise<boolean> {
  if (started && audio && !audio.paused) return true;
  if (pendingCue || started) return seekAndPlay();

  // Samo odblokowanie silnika (cicho), bez słyszalnego startu przed cue.
  const el = ensure();
  try {
    await whenReady(el);
    el.muted = true;
    el.currentTime = CARD_MUSIC_START;
    await el.play();
    el.pause();
    el.muted = false;
    el.currentTime = CARD_MUSIC_START;
    return true;
  } catch {
    return false;
  }
}

export function isCardMusicPlaying(): boolean {
  return Boolean(started && audio && !audio.paused);
}

export function isCardMusicPending(): boolean {
  return pendingCue && !isCardMusicPlaying();
}

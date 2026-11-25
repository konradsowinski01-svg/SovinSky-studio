/** Muzyka tylko dla `#/w`. Start od 2:45; cue ~1 s przed „zbudować”. */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
export const CARD_MUSIC_START = 2 * 60 + 45;
const TARGET_VOL = 0.42;
const FADE_MS = 1600;

let audio: HTMLAudioElement | null = null;
let started = false;
let fading = false;
let unlocked = false;
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
    try {
      el.currentTime = CARD_MUSIC_START;
    } catch {
      /* Safari bywa kapryśny przed pełnym loadem */
    }
    if (Math.abs(el.currentTime - CARD_MUSIC_START) > 1) {
      await new Promise<void>((r) => {
        const onSeek = () => {
          el.removeEventListener("seeked", onSeek);
          r();
        };
        el.addEventListener("seeked", onSeek);
        window.setTimeout(r, 150);
      });
      try {
        el.currentTime = CARD_MUSIC_START;
      } catch {
        /* ignore */
      }
    }
    el.muted = false;
    el.volume = 0;
    await el.play();
    started = true;
    fadeIn(el);
    return true;
  } catch {
    return false;
  }
}

/** Preload na starcie czarnego ekranu. */
export function armCardMusic(): () => void {
  const el = ensure();
  void whenReady(el).catch(() => undefined);
  return () => undefined;
}

/**
 * Synchronicznie w pointerdown — odblokowuje silnik Safari/Chrome.
 * Bez await, żeby nie stracić user activation.
 */
export function unlockCardMusic(): void {
  if (unlocked && audio) return;
  const el = ensure();
  el.muted = true;
  el.volume = 0;
  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore */
  }
  const playAttempt = el.play();
  unlocked = true;
  if (playAttempt) {
    void playAttempt
      .then(() => {
        el.pause();
        el.muted = false;
        try {
          el.currentTime = CARD_MUSIC_START;
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        unlocked = false;
      });
  }
}

/** Wołane ~1 s przed pierwszym znakiem „zbudować”. */
export async function cueCardMusic(): Promise<boolean> {
  return seekAndPlay();
}

export function isCardMusicPlaying(): boolean {
  return Boolean(started && audio && !audio.paused);
}

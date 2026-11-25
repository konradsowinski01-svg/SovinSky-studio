/** Muzyka tylko dla `#/w` — wyłącznie wycinek 2:45–3:10, start przy tap. */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
/** Stały fragment utworu — nic poza tym nie gra. */
export const CARD_MUSIC_START = 2 * 60 + 45;
/** Początek wyciszania — do END trwa ~4 s. */
export const CARD_MUSIC_FADE_AT = 3 * 60 + 6;
export const CARD_MUSIC_END = 3 * 60 + 10;
const TARGET_VOL = 0.42;
const FADE_IN_MS = 1600;
const FADE_OUT_MS = (CARD_MUSIC_END - CARD_MUSIC_FADE_AT) * 1000;

let audio: HTMLAudioElement | null = null;
let started = false;
let readyPromise: Promise<void> | null = null;
let endWatch: (() => void) | null = null;

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

function clearEndWatch() {
  endWatch?.();
  endWatch = null;
}

function fadeVolume(el: HTMLAudioElement, to: number, ms: number, onDone?: () => void) {
  const t0 = performance.now();
  const from = el.volume;
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    el.volume = from + (to - from) * (1 - (1 - t) ** 2);
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }
    onDone?.();
  };
  requestAnimationFrame(tick);
}

function stopAtEnd(el: HTMLAudioElement) {
  clearEndWatch();
  const finish = () => {
    clearEndWatch();
    el.pause();
    try {
      el.currentTime = CARD_MUSIC_START;
    } catch {
      /* ignore */
    }
  };

  let fadingOut = false;
  const onTime = () => {
    if (el.currentTime >= CARD_MUSIC_END) {
      el.removeEventListener("timeupdate", onTime);
      finish();
      return;
    }
    if (!fadingOut && el.currentTime >= CARD_MUSIC_FADE_AT) {
      fadingOut = true;
      el.removeEventListener("timeupdate", onTime);
      const leftMs = Math.max(200, (CARD_MUSIC_END - el.currentTime) * 1000);
      fadeVolume(el, 0, Math.min(FADE_OUT_MS, leftMs), finish);
    }
  };

  el.addEventListener("timeupdate", onTime);
  endWatch = () => el.removeEventListener("timeupdate", onTime);
}

function markPlaying(el: HTMLAudioElement) {
  if (started) return;
  started = true;
  stopAtEnd(el);
  fadeVolume(el, TARGET_VOL, FADE_IN_MS);
}

/** Preload na starcie czarnego ekranu. */
export function armCardMusic(): () => void {
  const el = ensure();
  void whenReady(el).catch(() => undefined);
  return () => undefined;
}

/**
 * Start wycinka 2:44–3:10 synchronicznie w pointerdown (tap to start).
 * play() musi pójść w geście użytkownika — bez await.
 */
export function startCardMusicFromTap(): void {
  if (started && audio && !audio.paused) return;
  const el = ensure();
  el.muted = false;
  el.volume = 0;
  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore — poprawimy po metadata */
  }

  const playAttempt = el.play();
  if (!playAttempt) {
    markPlaying(el);
    return;
  }

  void playAttempt
    .then(async () => {
      try {
        await whenReady(el);
        if (Math.abs(el.currentTime - CARD_MUSIC_START) > 1) {
          el.currentTime = CARD_MUSIC_START;
          await new Promise<void>((r) => {
            const onSeek = () => {
              el.removeEventListener("seeked", onSeek);
              r();
            };
            el.addEventListener("seeked", onSeek);
            window.setTimeout(r, 150);
          });
          if (el.paused) await el.play();
        }
      } catch {
        /* już gra z przybliżonego seeka */
      }
      markPlaying(el);
    })
    .catch(() => {
      /* autoplay zablokowany — tap powinien to odblokować; zostawiamy begun UI */
    });
}

export function isCardMusicPlaying(): boolean {
  return Boolean(started && audio && !audio.paused);
}

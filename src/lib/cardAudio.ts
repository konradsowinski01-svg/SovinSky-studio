/**
 * Muzyka tylko dla `#/w`.
 * Plik ma już gotowy początek/koniec (crop + bake fade) — gramy od 0, bez seek/fade.
 */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
const TARGET_VOL = 0.42;
/** Cisza po tapie, zanim poleci plik. */
export const CARD_MUSIC_TAP_DELAY_MS = 1130;

let audio: HTMLAudioElement | null = null;
let started = false;
let readyPromise: Promise<void> | null = null;
let startTimer = 0;

function ensure(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.preload = "auto";
  audio.loop = false;
  audio.volume = TARGET_VOL;
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

async function playClip(): Promise<void> {
  const el = ensure();
  await whenReady(el);
  el.muted = false;
  el.volume = TARGET_VOL;
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
  await el.play();
  started = true;
}

/** Preload na starcie czarnego ekranu. */
export function armCardMusic(): () => void {
  const el = ensure();
  void whenReady(el).catch(() => undefined);
  return () => {
    if (startTimer) window.clearTimeout(startTimer);
  };
}

/**
 * W pointerdown: odblokuj silnik, po delay odpal gotowy plik od początku.
 */
export function startCardMusicFromTap(): void {
  if (started && audio && !audio.paused) return;
  if (startTimer) window.clearTimeout(startTimer);

  const el = ensure();
  el.muted = true;
  el.volume = 0;
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }

  const unlock = el.play();
  if (unlock) {
    void unlock
      .then(() => {
        el.pause();
        el.muted = false;
        el.volume = TARGET_VOL;
        try {
          el.currentTime = 0;
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

/** Muzyka tylko dla `#/w` — wycinek 2:45–3:10, start 900 ms po tapie. */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
/** Stały fragment utworu — nic poza tym nie gra. */
export const CARD_MUSIC_START = 2 * 60 + 45;
/** Początek wyciszania — do END trwa 4 s. */
export const CARD_MUSIC_FADE_AT = 3 * 60 + 6;
export const CARD_MUSIC_END = 3 * 60 + 10;
const TARGET_VOL = 0.42;
const FADE_IN_MS = 1600;
const FADE_OUT_MS = (CARD_MUSIC_END - CARD_MUSIC_FADE_AT) * 1000;
/** Cisza po tapie, zanim poleci wycinek. */
export const CARD_MUSIC_TAP_DELAY_MS = 1060;

let audio: HTMLAudioElement | null = null;
let started = false;
let readyPromise: Promise<void> | null = null;
let endRaf = 0;
let fadeRaf = 0;
let fadeGen = 0;
let startTimer = 0;

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

function cancelFade() {
  fadeGen += 1;
  if (fadeRaf) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  }
}

function clearEndWatch() {
  if (endRaf) {
    cancelAnimationFrame(endRaf);
    endRaf = 0;
  }
}

function fadeVolume(el: HTMLAudioElement, to: number, ms: number, onDone?: () => void) {
  cancelFade();
  const gen = fadeGen;
  const t0 = performance.now();
  const from = el.volume;
  const tick = (now: number) => {
    if (gen !== fadeGen) return;
    const t = Math.min(1, (now - t0) / Math.max(1, ms));
    el.volume = from + (to - from) * (1 - (1 - t) ** 2);
    if (t < 1) {
      fadeRaf = requestAnimationFrame(tick);
      return;
    }
    fadeRaf = 0;
    onDone?.();
  };
  fadeRaf = requestAnimationFrame(tick);
}

function finishClip(el: HTMLAudioElement) {
  clearEndWatch();
  cancelFade();
  el.volume = 0;
  el.pause();
  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore */
  }
}

/** rAF zamiast timeupdate — precyzyjny start fade od 3:06, bez twardego cuta. */
function watchClipEnd(el: HTMLAudioElement) {
  clearEndWatch();
  let fadingOut = false;

  const tick = () => {
    if (el.paused && !fadingOut) {
      endRaf = 0;
      return;
    }

    const t = el.currentTime;

    if (!fadingOut && t >= CARD_MUSIC_FADE_AT) {
      fadingOut = true;
      // Zawsze pełne ~4 s do END — nie ucinaj fade wcześniejszym finish.
      const leftMs = Math.max(FADE_OUT_MS, (CARD_MUSIC_END - t) * 1000);
      fadeVolume(el, 0, leftMs, () => finishClip(el));
    }

    // Po END tylko domykamy, jeśli fade z jakiegoś powodu nie wystartował.
    if (!fadingOut && t >= CARD_MUSIC_END) {
      fadingOut = true;
      fadeVolume(el, 0, 500, () => finishClip(el));
    }

    endRaf = requestAnimationFrame(tick);
  };

  endRaf = requestAnimationFrame(tick);
}

async function playClip(el: HTMLAudioElement): Promise<void> {
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
  el.volume = 0;
  await el.play();
  started = true;
  watchClipEnd(el);
  fadeVolume(el, TARGET_VOL, FADE_IN_MS);
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
 * W pointerdown: odblokuj silnik, potem po 900 ms odpal wycinek 2:45–3:10.
 */
export function startCardMusicFromTap(): void {
  if (started && audio && !audio.paused) return;
  if (startTimer) window.clearTimeout(startTimer);

  const el = ensure();
  el.muted = true;
  el.volume = 0;
  try {
    el.currentTime = CARD_MUSIC_START;
  } catch {
    /* ignore */
  }

  // Odblokowanie autoplay w geście — cichy play/pause.
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
    void playClip(el).catch(() => undefined);
  }, CARD_MUSIC_TAP_DELAY_MS);
}

export function isCardMusicPlaying(): boolean {
  return Boolean(started && audio && !audio.paused);
}

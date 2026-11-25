/** Muzyka tylko dla wejścia z wizytówki (`#/w`). Start od 2:45. */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
/** Imogen Heap — Headlock (Slowed), wejście przy ostatnim słowie intro. */
export const CARD_MUSIC_START = 2 * 60 + 45;
const TARGET_VOL = 0.38;
const FADE_MS = 1800;

let audio: HTMLAudioElement | null = null;
let started = false;
let fading = false;
let unlockBound = false;
let pendingCue = false;
let unlocked = false;

function ensure(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.loop = false;
  audio.preload = "auto";
  audio.volume = 0;
  return audio;
}

function fadeIn(el: HTMLAudioElement) {
  if (fading) return;
  fading = true;
  const t0 = performance.now();
  const from = el.volume;
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / FADE_MS);
    const eased = 1 - (1 - t) ** 2;
    el.volume = from + (TARGET_VOL - from) * eased;
    if (t < 1) requestAnimationFrame(tick);
    else fading = false;
  };
  requestAnimationFrame(tick);
}

async function unlockSilent(el: HTMLAudioElement) {
  if (unlocked) return;
  const prev = el.volume;
  el.volume = 0;
  try {
    el.currentTime = CARD_MUSIC_START;
    await el.play();
    el.pause();
    el.currentTime = CARD_MUSIC_START;
    unlocked = true;
  } catch {
    // nadal czekamy na kolejny gest
  } finally {
    el.volume = prev;
  }
}

/** Preload + odblokowanie audio po pierwszym geście (Safari). Bez grania od razu. */
export function armCardMusic(): () => void {
  const el = ensure();
  el.load();

  if (unlockBound) return () => undefined;
  unlockBound = true;

  const unlock = () => {
    void unlockSilent(el).then(() => {
      if (pendingCue && !started) void cueCardMusic();
    });
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchend", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchend", unlock, { passive: true });

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchend", unlock);
  };
}

/** Odpal od 2:45 — wołane gdy typewriter wchodzi w ostatnie słowo. */
export async function cueCardMusic(): Promise<void> {
  const el = ensure();
  if (started && !el.paused) return;

  pendingCue = true;
  el.currentTime = CARD_MUSIC_START;

  try {
    await el.play();
    started = true;
    pendingCue = false;
    fadeIn(el);
  } catch {
    // Autoplay zablokowany — ruszy po geście (armCardMusic).
  }
}

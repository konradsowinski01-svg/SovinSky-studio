/**
 * Muzyka tylko dla `#/w`.
 * Gotowy crop — od 0, bez fade w kodzie.
 * GainNode trzyma głośność (Safari często ignoruje audio.volume).
 */

const SRC = `${import.meta.env.BASE_URL}card-theme.mp3`;
const TARGET_VOL = 0.42;
export const CARD_MUSIC_TAP_DELAY_MS = 1130;

let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let routed = false;
let started = false;
let startTimer = 0;

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
    const srcNode = ctx.createMediaElementSource(el);
    srcNode.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0;
    routed = true;
  }
  return { ctx, gain, el };
}

function setGain(value: number) {
  if (!ctx || !gain) return;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(value, ctx.currentTime);
}

/** Preload elementu — bez el.load(). */
export function armCardMusic(): () => void {
  ensureAudio();
  return () => {
    if (startTimer) window.clearTimeout(startTimer);
  };
}

/**
 * pointerdown: od razu cichy play (odblokowanie Safari),
 * po delay seek do 0 + głośność — bez drugiego play poza gestem, jeśli da się uniknąć.
 */
export function startCardMusicFromTap(): void {
  if (started && audio && !audio.paused) return;
  if (startTimer) window.clearTimeout(startTimer);

  const { ctx: audioCtx, el } = ensureGraph();
  void audioCtx.resume();

  el.muted = true;
  setGain(0);
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
  void el.play().catch(() => undefined);

  startTimer = window.setTimeout(() => {
    startTimer = 0;
    void (async () => {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
      el.muted = false;
      setGain(TARGET_VOL);
      if (el.paused) {
        try {
          await el.play();
        } catch {
          return;
        }
      }
      started = true;
    })();
  }, CARD_MUSIC_TAP_DELAY_MS);
}

export function isCardMusicPlaying(): boolean {
  return Boolean(started && audio && !audio.paused);
}

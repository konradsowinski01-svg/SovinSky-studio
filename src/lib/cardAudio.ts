/** `#/w` — play w geście, słyszalne dopiero po DELAY_MS. */

const SRC = `${import.meta.env.BASE_URL}card-intro.mp3`;
const DELAY_MS = 1100;

let audio: HTMLAudioElement | null = null;
let started = false;
let timer = 0;

export function armCardMusic(): () => void {
  const preload = new Audio(SRC);
  preload.preload = "auto";
  return () => {
    if (timer) window.clearTimeout(timer);
  };
}

export function isCardMusicPlaying(): boolean {
  return Boolean(audio && !audio.paused && !audio.muted);
}

export function startCardMusicFromTap(): void {
  if (started) return;
  started = true;

  const a = new Audio(SRC);
  audio = a;
  a.preload = "auto";
  a.volume = 1;
  a.muted = true;
  a.setAttribute("playsinline", "true");
  a.setAttribute("webkit-playsinline", "true");

  // Jedyny play() — w geście. Potem tylko unmute + seek, bez pause/play.
  void a.play().catch(() => {
    started = false;
  });

  timer = window.setTimeout(() => {
    timer = 0;
    try {
      a.currentTime = 0;
    } catch {
      /* ignore */
    }
    a.muted = false;
    a.volume = 1;
    if (a.paused) {
      void a.play().catch(() => undefined);
    }
  }, DELAY_MS);
}

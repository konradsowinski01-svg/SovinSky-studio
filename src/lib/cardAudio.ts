/** Prosty odtwarzacz dla `#/w` — zwykłe HTMLAudioElement, zero Web Audio. */

const SRC = `${import.meta.env.BASE_URL}card-intro.mp3`;
const DELAY_MS = 1130;

let el: HTMLAudioElement | null = null;
let timer = 0;
let started = false;

function getAudio(): HTMLAudioElement {
  if (el) return el;
  el = new Audio(SRC);
  el.preload = "auto";
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  return el;
}

/** Preload po wejściu na kartę. */
export function armCardMusic(): () => void {
  getAudio();
  return () => {
    if (timer) window.clearTimeout(timer);
  };
}

/**
 * Tap: cichy kick tylko do odblokowania autoplay,
 * słyszalny play dopiero po DELAY_MS (jeden raz).
 */
export function startCardMusicFromTap(): void {
  if (started) return;
  const a = getAudio();
  if (timer) window.clearTimeout(timer);

  // Cichy unlock w geście — nie ma być słyszalny.
  a.muted = true;
  a.volume = 0;
  try {
    a.currentTime = 0;
  } catch {
    /* ignore */
  }
  const kick = a.play();
  if (kick) {
    void kick
      .then(() => {
        if (started) return;
        a.pause();
        try {
          a.currentTime = 0;
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  }

  timer = window.setTimeout(() => {
    timer = 0;
    started = true;
    a.muted = false;
    a.volume = 1;
    try {
      a.currentTime = 0;
    } catch {
      /* ignore */
    }
    void a.play().catch(() => {
      started = false;
    });
  }, DELAY_MS);
}

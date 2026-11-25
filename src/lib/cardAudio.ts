/** Prosty odtwarzacz dla `#/w` — zwykłe HTMLAudioElement, zero Web Audio. */

const SRC = `${import.meta.env.BASE_URL}card-intro.mp3`;
const DELAY_MS = 1130;

let el: HTMLAudioElement | null = null;
let timer = 0;

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

/** Tap: odblokuj, po chwili play od 0. */
export function startCardMusicFromTap(): void {
  const a = getAudio();
  if (timer) window.clearTimeout(timer);

  // Odblokowanie autoplay w geście użytkownika
  a.muted = false;
  a.volume = 1;
  const kick = a.play();
  if (kick) {
    void kick
      .then(() => {
        a.pause();
        a.currentTime = 0;
      })
      .catch(() => undefined);
  }

  timer = window.setTimeout(() => {
    timer = 0;
    a.muted = false;
    a.volume = 1;
    a.currentTime = 0;
    void a.play().catch(() => undefined);
  }, DELAY_MS);
}

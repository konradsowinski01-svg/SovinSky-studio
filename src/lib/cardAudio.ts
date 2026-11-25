/** `#/w` — najprostszy możliwy play w geście tapnięcia. */

const SRC = `${import.meta.env.BASE_URL}card-intro.mp3`;

let started = false;

export function armCardMusic(): () => void {
  // lekki preload
  const preload = new Audio(SRC);
  preload.preload = "auto";
  return () => undefined;
}

export function startCardMusicFromTap(): void {
  if (started) return;
  started = true;

  const a = new Audio(SRC);
  a.preload = "auto";
  a.volume = 1;
  a.muted = false;
  a.setAttribute("playsinline", "true");
  a.setAttribute("webkit-playsinline", "true");

  const playAttempt = a.play();
  if (playAttempt) {
    void playAttempt.catch(() => {
      started = false;
    });
  }
}

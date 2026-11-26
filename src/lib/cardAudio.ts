/**
 * `#/w` — zwykły play() w geście tapnięcia.
 * Opóźnienie 900 ms jest wklejone w plik jako cisza: Safari blokuje
 * dźwięk odpalany/odciszany z timera poza gestem.
 */

import { runCardFx } from "./cardFx";
import { runCardScroll } from "./cardScroll";

const SRC = `${import.meta.env.BASE_URL}card-intro.mp3`;

let started = false;

export function armCardMusic(): () => void {
  const preload = new Audio(SRC);
  preload.preload = "auto";
  return () => undefined;
}

export function startCardMusicFromTap(): void {
  if (started) return;
  started = true;

  const a = new Audio(SRC);
  a.preload = "auto";
  a.setAttribute("playsinline", "true");
  a.setAttribute("webkit-playsinline", "true");

  const playAttempt = a.play();
  if (playAttempt) {
    void playAttempt.then(
      () => {
        runCardScroll(a);
        runCardFx(a);
      },
      () => {
        started = false;
      },
    );
  } else {
    runCardScroll(a);
    runCardFx(a);
  }
}

/**
 * `#/w` — play() w geście tapnięcia.
 * Opóźnienie 850 ms jest wklejone w plik jako cisza.
 *
 * Android Chrome lubi padać na `new Audio()` bez bufora — trzymamy
 * jeden element <audio> w DOM (preload), ten sam na arm + play.
 * Safari / desktop: ta sama ścieżka play() synchronicznie w geście.
 */

import { runCardFx } from "./cardFx";
import { runCardScroll } from "./cardScroll";

const SRC = `${import.meta.env.BASE_URL}card-intro.mp3`;

let audio: HTMLAudioElement | null = null;
let started = false;
let timelineArmed = false;

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  const el = document.createElement("audio");
  el.preload = "auto";
  el.src = SRC;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  el.setAttribute("crossorigin", "anonymous");
  // W DOM — stabilniejsze na Androidzie niż sam `new Audio()`.
  el.style.display = "none";
  document.body.appendChild(el);
  audio = el;
  return el;
}

function armTimeline(el: HTMLAudioElement) {
  if (timelineArmed) return;
  timelineArmed = true;
  runCardScroll(el);
  runCardFx(el);
}

/** Preload po wejściu na kartę. */
export function armCardMusic(): () => void {
  const el = ensureAudio();
  try {
    el.load();
  } catch {
    /* ignore */
  }
  return () => undefined;
}

/**
 * Wywołać synchronicznie z pointerdown.
 * Resolves true gdy play wystartował (scroll/fx podpięte).
 */
export function startCardMusicFromTap(): Promise<boolean> {
  if (started && audio && !audio.paused) {
    armTimeline(audio);
    return Promise.resolve(true);
  }

  const el = ensureAudio();
  started = true;
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }

  const playAttempt = el.play();
  if (!playAttempt) {
    armTimeline(el);
    return Promise.resolve(true);
  }

  return playAttempt
    .then(() => {
      armTimeline(el);
      return true;
    })
    .catch(() => {
      // Android: czasem play przed canplay — jeden retry gdy bufor gotowy.
      // Bez el.load() — resetowałby pobieranie i psuł Safari.
      return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          el.removeEventListener("canplay", onReady);
          if (!ok) {
            started = false;
            timelineArmed = false;
          }
          resolve(ok);
        };
        const onReady = () => {
          void el.play().then(
            () => {
              armTimeline(el);
              finish(true);
            },
            () => finish(false),
          );
        };
        if (el.readyState >= 2) {
          onReady();
          return;
        }
        el.addEventListener("canplay", onReady, { once: true });
        window.setTimeout(() => finish(false), 2500);
      });
    });
}

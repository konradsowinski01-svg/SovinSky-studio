/**
 * Efekty wizualne `#/w` zsynchronizowane z piosenką
 * (czasy w sekundach utworu, bez ciszy LEAD_IN).
 */

export const CARD_LEAD_IN_SEC = 0.9;

type FxCue = {
  at: number;
  run: () => void;
};

const FX: FxCue[] = [
  { at: 4.84, run: () => sideEdgeFlash(1100) },
  { at: 7, run: () => sideEdgeFlash(1100) },
];

/** Prosty biały flash z lewej/prawej — tani CSS gradient. */
function sideEdgeFlash(durationMs: number) {
  const fadeIn = 160;
  const fadeStart = 700;
  const fadeOut = Math.max(280, durationMs - fadeStart);

  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    inset: "0",
    zIndex: "260",
    pointerEvents: "none",
    opacity: "0",
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.22) 8%, transparent 16%, transparent 84%, rgba(255,255,255,0.22) 92%, rgba(255,255,255,0.7) 100%)",
    transition: `opacity ${fadeIn}ms ease-in-out`,
  } as CSSStyleDeclaration);

  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });

  window.setTimeout(() => {
    el.style.transition = `opacity ${fadeOut}ms ease-in-out`;
    el.style.opacity = "0";
  }, fadeStart);

  window.setTimeout(() => {
    el.remove();
  }, durationMs + 40);
}

export function runCardFx(audio: HTMLAudioElement) {
  let clockAudio = audio.currentTime;
  let clockPerf = performance.now();
  let i = 0;
  let raf = 0;

  const songTime = () => {
    const now = performance.now();
    const est = audio.paused ? clockAudio : clockAudio + (now - clockPerf) / 1000;
    if (Math.abs(audio.currentTime - est) > 0.12) {
      clockAudio = audio.currentTime;
      clockPerf = now;
      return clockAudio - CARD_LEAD_IN_SEC;
    }
    return est - CARD_LEAD_IN_SEC;
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    audio.removeEventListener("ended", stop);
  };
  audio.addEventListener("ended", stop);

  const tick = () => {
    const t = songTime();
    while (i < FX.length && t >= FX[i]!.at) {
      FX[i]!.run();
      i += 1;
    }
    if (i >= FX.length) {
      stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

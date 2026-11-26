/**
 * Efekty wizualne `#/w` zsynchronizowane z piosenką
 * (czasy w sekundach utworu, bez ciszy LEAD_IN).
 */

export const CARD_LEAD_IN_SEC = 0.9;

type FxCue = {
  at: number;
  run: () => void;
};

const FX: FxCue[] = [{ at: 4.9, run: whiteVignetteFlash }];

function whiteVignetteFlash() {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    inset: "0",
    zIndex: "260",
    pointerEvents: "none",
    opacity: "0",
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.28) 12%, transparent 28%, transparent 72%, rgba(255,255,255,0.28) 88%, rgba(255,255,255,0.88) 100%)",
    transition: "opacity 140ms ease-out",
  } as CSSStyleDeclaration);

  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });

  // 700 ms łącznie: peak, potem zgaszenie.
  window.setTimeout(() => {
    el.style.transition = "opacity 420ms ease-in";
    el.style.opacity = "0";
  }, 260);

  window.setTimeout(() => {
    el.remove();
  }, 720);
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

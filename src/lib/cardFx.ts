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

/**
 * Biały flash z abstrakcyjnych plam przy lewej/prawej krawędzi.
 * Trwa durationMs; od 700 ms zaczyna się powolne gaszenie.
 */
function sideEdgeFlash(durationMs: number) {
  const fadeIn = 180;
  const fadeStart = 700;
  const fadeOut = Math.max(280, durationMs - fadeStart);

  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
      <defs>
        <filter id="cardFxSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>
      <g filter="url(#cardFxSoft)" fill="#fff" opacity="0.9">
        <!-- lewa krawędź — nieregularne „języki” -->
        <path d="M0 0 C8 6, 14 12, 11 22 C18 28, 9 34, 13 44 C6 52, 16 58, 10 68 C15 76, 7 84, 12 92 C6 96, 3 100, 0 100 Z" opacity="0.55" />
        <path d="M0 8 C10 14, 16 20, 12 30 C20 38, 8 46, 14 56 C5 64, 18 72, 9 80 C14 88, 6 94, 0 100 L0 8 Z" opacity="0.35" />
        <ellipse cx="3" cy="35" rx="5" ry="14" opacity="0.4" />
        <ellipse cx="4" cy="72" rx="4.5" ry="11" opacity="0.32" />
        <!-- prawa krawędź -->
        <path d="M100 0 C92 5, 86 14, 90 24 C82 32, 93 40, 87 50 C96 58, 84 66, 91 76 C85 84, 94 90, 88 96 C94 98, 98 100, 100 100 Z" opacity="0.55" />
        <path d="M100 10 C90 16, 84 24, 89 34 C80 42, 94 50, 86 60 C97 68, 82 76, 90 86 C85 92, 94 96, 100 100 L100 10 Z" opacity="0.35" />
        <ellipse cx="97" cy="28" rx="5" ry="13" opacity="0.4" />
        <ellipse cx="96" cy="64" rx="4.5" ry="12" opacity="0.32" />
      </g>
    </svg>
  `;

  Object.assign(el.style, {
    position: "fixed",
    inset: "0",
    zIndex: "260",
    pointerEvents: "none",
    opacity: "0",
    transition: `opacity ${fadeIn}ms ease-in-out`,
  } as CSSStyleDeclaration);

  // Unikalne id filtra przy każdym flashu (żeby nie kolidowały).
  const uid = `cardFxSoft-${Math.random().toString(36).slice(2, 8)}`;
  el.innerHTML = el.innerHTML.replace(/cardFxSoft/g, uid);

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

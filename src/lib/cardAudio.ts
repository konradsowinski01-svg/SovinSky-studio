/**
 * `#/w` — AudioBufferSourceNode, jedno source.start(now + delay).
 * resume() synchronicznie w geście; bez HTMLAudio mute/pause.
 */

const SRC = `${import.meta.env.BASE_URL}card-intro.mp3`;
const DELAY_SEC = 1.13;

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loadPromise: Promise<AudioBuffer> | null = null;
let started = false;

function getCtx(): AudioContext {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  return ctx;
}

function loadBuffer(): Promise<AudioBuffer> {
  if (buffer) return Promise.resolve(buffer);
  if (loadPromise) return loadPromise;
  const audioCtx = getCtx();
  loadPromise = fetch(SRC)
    .then((r) => {
      if (!r.ok) throw new Error(`audio fetch ${r.status}`);
      return r.arrayBuffer();
    })
    .then((raw) => audioCtx.decodeAudioData(raw.slice(0)))
    .then((decoded) => {
      buffer = decoded;
      return decoded;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

export function armCardMusic(): () => void {
  void getCtx();
  void loadBuffer().catch(() => undefined);
  return () => undefined;
}

export function startCardMusicFromTap(): void {
  if (started) return;
  started = true;

  const audioCtx = getCtx();
  // Musi być synchronicznie w pointerdown — inaczej Safari gubi gest.
  void audioCtx.resume();

  void loadBuffer()
    .then((buf) => {
      const play = () => {
        const source = audioCtx.createBufferSource();
        source.buffer = buf;
        source.connect(audioCtx.destination);
        source.start(audioCtx.currentTime + DELAY_SEC);
      };
      if (audioCtx.state === "running") {
        play();
        return;
      }
      return audioCtx.resume().then(play);
    })
    .catch(() => {
      started = false;
    });
}

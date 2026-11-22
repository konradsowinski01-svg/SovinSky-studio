import type Lenis from "lenis";

type Listener = (velocity: number) => void;

let instance: Lenis | null = null;
const listeners = new Set<Listener>();

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}

export function emitVelocity(velocity: number) {
  listeners.forEach((fn) => fn(velocity));
}

export function onVelocity(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

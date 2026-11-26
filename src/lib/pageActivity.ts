/** True when the document is visible and (optionally) the page has revealed. */
export function isPageActive(requireReady = false): boolean {
  if (typeof document === "undefined") return false;
  if (document.hidden) return false;
  if (requireReady) {
    const top = document.getElementById("top");
    if (top?.dataset.ready !== "true") return false;
  }
  return true;
}

/**
 * Subscribe to tab visibility (+ optional #top[data-ready] mutations).
 * Fires immediately with the current active state.
 */
export function onPageActivity(
  cb: (active: boolean) => void,
  opts: { requireReady?: boolean } = {},
): () => void {
  const requireReady = opts.requireReady ?? false;
  const notify = () => cb(isPageActive(requireReady));

  document.addEventListener("visibilitychange", notify);

  let mo: MutationObserver | null = null;
  if (requireReady) {
    const top = document.getElementById("top");
    if (top) {
      mo = new MutationObserver(notify);
      mo.observe(top, { attributes: true, attributeFilter: ["data-ready"] });
    }
  }

  notify();

  return () => {
    document.removeEventListener("visibilitychange", notify);
    mo?.disconnect();
  };
}

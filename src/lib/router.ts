import { useEffect, useState } from "react";

export type Route = "home" | "portfolio";

export const PORTFOLIO_HASH = "#/portfolio";

/** Ukryte wejście z wizytówki — nie linkowane w UI. */
export const CARD_HASH = "#/w";

const readRoute = (): Route =>
  window.location.hash.startsWith(PORTFOLIO_HASH) ? "portfolio" : "home";

export function isCardEntry(): boolean {
  return window.location.hash === CARD_HASH || window.location.hash.startsWith(`${CARD_HASH}?`);
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

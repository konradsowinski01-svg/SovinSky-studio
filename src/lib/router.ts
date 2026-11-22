import { useEffect, useState } from "react";

export type Route = "home" | "portfolio";

export const PORTFOLIO_HASH = "#/portfolio";

const readRoute = (): Route =>
  window.location.hash.startsWith(PORTFOLIO_HASH) ? "portfolio" : "home";

export function useRoute() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

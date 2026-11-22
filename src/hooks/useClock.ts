import { useEffect, useState } from "react";

function formatPoznan(date: Date) {
  const parts = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "--";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "--";
  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC+1";

  return `${hour}:${minute} ${offset}`;
}

export function useClock(location: string) {
  const [label, setLabel] = useState(() => `${formatPoznan(new Date())} ${location}`);

  useEffect(() => {
    const tick = () => setLabel(`${formatPoznan(new Date())} ${location}`);
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [location]);

  return label;
}

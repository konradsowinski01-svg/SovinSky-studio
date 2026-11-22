import { useEffect, useState } from "react";
import { site } from "../data/site";
import styles from "./Preloader.module.css";

type Props = {
  onDone: () => void;
};

export function Preloader({ onDone }: Props) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let frame = 0;
    let value = 0;
    const start = performance.now();
    const duration = 1600;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      value = Math.round(eased * 100);
      setProgress(value);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setLeaving(true);
        window.setTimeout(onDone, 480);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onDone]);

  const pct = String(progress).padStart(3, "0");

  return (
    <div className={`${styles.root} ${leaving ? styles.leaving : ""}`} aria-busy="true" aria-live="polite">
      <div className={styles.sheet} />
      <div className={styles.panel}>
        <div className={styles.mark} aria-hidden="true">
          <span className={styles.markGhost}>{site.brandShort}</span>
          <span
            className={styles.markFill}
            style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
          >
            {site.brandShort}
          </span>
        </div>
        <div className={styles.labels}>
          <span>LOAD</span>
        </div>
        <p className={styles.count}>
          <span>{pct}</span>
          <span className={styles.pct}>%</span>
        </p>
        <div className={styles.bar} style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
    </div>
  );
}

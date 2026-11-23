import { useEffect, useState } from "react";
import { logoParts } from "../data/logo";
import styles from "./Preloader.module.css";

const mark = logoParts[0];
const markMask = `image-set(url("${mark.src}") 1x, url("${mark.src2x}") 2x)`;


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
        <div
          className={styles.mark}
          aria-hidden="true"
          style={{ aspectRatio: `${mark.width} / ${mark.height}` }}
        >
          <span
            className={styles.markGhost}
            style={{ WebkitMaskImage: markMask, maskImage: markMask }}
          />
          <span
            className={styles.markFill}
            style={{
              clipPath: `inset(0 ${100 - progress}% 0 0)`,
              WebkitMaskImage: markMask,
              maskImage: markMask,
            }}
          />
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

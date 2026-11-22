import { useLayoutEffect, useRef } from "react";
import styles from "./Wordmark.module.css";

type Props = {
  text: string;
  /** Rendered width relative to the viewport; >1 bleeds off both edges. */
  widthRatio?: number;
};

export function Wordmark({ text, widthRatio = 1.1 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const letters = text.split("");

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    const fit = () => {
      wrap.style.fontSize = "100px";
      const w = measure.getBoundingClientRect().width;
      if (!w) return;
      wrap.style.fontSize = `${(100 * window.innerWidth * widthRatio) / w}px`;
      wrap.style.left = `${(window.innerWidth - measure.getBoundingClientRect().width) / 2}px`;

      const box = wrap.getBoundingClientRect();
      wrap.querySelectorAll<HTMLElement>("[data-wm-letter]").forEach((el) => {
        el.style.backgroundSize = `${box.width}px ${box.height}px`;
        el.style.backgroundPosition = `${-el.offsetLeft}px ${-el.offsetTop}px`;
      });
    };

    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text, widthRatio]);

  const row = (layer: "blend" | "silhouette") => (
    <div className={`${styles.layer} ${styles[layer]}`}>
      {letters.map((ch, i) => (
        <span key={`${layer}-${i}`} className={styles.letter} data-wm-letter={i}>
          {ch}
        </span>
      ))}
    </div>
  );

  return (
    <div ref={wrapRef} className={styles.wrap} aria-hidden="true" data-wordmark="">
      <span ref={measureRef} className={styles.measure}>
        {text}
      </span>
      {row("blend")}
      {row("silhouette")}
    </div>
  );
}

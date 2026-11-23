import { useLayoutEffect, useRef } from "react";
import { logoMark } from "../data/logo";
import styles from "./Wordmark.module.css";

type Props = {
  /** Rendered width relative to the viewport; >1 bleeds off the right edge. */
  widthRatio?: number;
};

const maskImage = `image-set(url("${logoMark.src}") 1x, url("${logoMark.src2x}") 2x)`;

export function Wordmark({ widthRatio = 1.48 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const fit = () => {
      const vw = window.innerWidth;
      const target = vw * widthRatio;
      const height = target * (logoMark.height / logoMark.width);
      const left = Math.min(vw * 0.02, 18);
      wrap.style.width = `${target}px`;
      wrap.style.height = `${height}px`;
      wrap.style.left = `${left}px`;
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [widthRatio]);

  const maskStyle = {
    WebkitMaskImage: maskImage,
    maskImage,
  } as const;

  return (
    <div ref={wrapRef} className={styles.wrap} aria-hidden="true" data-wordmark="">
      {/* Cheap thin contour: slightly larger solid ink, no filters */}
      <span className={`${styles.part} ${styles.outline}`} style={maskStyle} />
      <span className={`${styles.part} ${styles.ink}`} style={maskStyle} data-wm-letter={0} />
    </div>
  );
}

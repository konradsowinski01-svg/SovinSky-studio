import { useId } from "react";
import styles from "./LiquidHeading.module.css";

type Props = {
  text: string;
  as?: "h2" | "h3" | "p";
  className?: string;
};

export function LiquidHeading({ text, as: Tag = "h2", className = "" }: Props) {
  const id = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const words = text.split(" ");

  return (
    <>
      <svg className={styles.defs} aria-hidden="true" focusable="false">
        <filter
          id={id}
          x="-22%"
          y="-80%"
          width="144%"
          height="260%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="18"
            result="blur"
            data-liquid-blur=""
          />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 7 -1"
            data-liquid-matrix=""
          />
        </filter>
      </svg>
      <Tag
        className={`${styles.heading} ${className}`}
        style={{ filter: `url(#${id})` }}
        data-liquid=""
      >
        {words.map((word, wordIndex) => (
          <span key={`${word}-${wordIndex}`} className={styles.word} aria-hidden="true">
            {word.split("").map((character, characterIndex) => (
              <span
                key={`${character}-${characterIndex}`}
                className={styles.character}
                data-liquid-char=""
              >
                {character}
              </span>
            ))}
            {wordIndex < words.length - 1 ? "\u00a0" : null}
          </span>
        ))}
        <span className="sr-only">{text}</span>
      </Tag>
    </>
  );
}

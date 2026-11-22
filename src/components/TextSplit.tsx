import type { HTMLAttributes } from "react";
import styles from "./TextSplit.module.css";

type Props = {
  text: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  ariaLabel?: string;
} & HTMLAttributes<HTMLElement>;

export function TextSplit({
  text,
  as: Tag = "span",
  className = "",
  ariaLabel,
  ...rest
}: Props) {
  const words = text.split(" ");

  return (
    <Tag
      className={`${styles.root} ${className}`}
      aria-label={ariaLabel ?? text}
      {...rest}
    >
      {words.map((word, wi) => (
        <span key={`${word}-${wi}`} className={styles.word} aria-hidden="true">
          {word.split("").map((char, ci) => (
            <span key={`${char}-${ci}`} className={styles.char}>
              <span className="charInner">{char}</span>
            </span>
          ))}
          {wi < words.length - 1 ? <span className={styles.space}> </span> : null}
        </span>
      ))}
    </Tag>
  );
}

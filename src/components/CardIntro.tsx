import { useEffect, useRef, useState } from "react";
import { logoParts } from "../data/logo";
import { armCardMusic, startCardMusicFromTap } from "../lib/cardAudio";
import topbarStyles from "./Topbar.module.css";
import styles from "./CardIntro.module.css";

const MESSAGE = "Miło Cię poznać, zobacz co możemy razem zbudować";
const HOLD_MS = 1500;
const FADE_MS = 1100;

type Props = {
  /** Home pojawia się pod czarnym ekranem, gdy zaczyna się fade. */
  onReveal: () => void;
  /** Po zakończeniu fade — odmontuj intro. */
  onDone: () => void;
};

export function CardIntro({ onReveal, onDone }: Props) {
  const [begun, setBegun] = useState(false);
  const [visible, setVisible] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [doneTyping, setDoneTyping] = useState(false);
  const starting = useRef(false);

  useEffect(() => {
    return armCardMusic();
  }, []);

  useEffect(() => {
    if (!begun) return;

    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const finish = (hold: number) => {
      setDoneTyping(true);
      later(() => {
        if (cancelled) return;
        setLeaving(true);
        onReveal();
        later(onDone, FADE_MS);
      }, hold);
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setVisible(MESSAGE);
      finish(900);
      return () => {
        cancelled = true;
        timers.forEach(clearTimeout);
      };
    }

    let i = 0;
    const tick = () => {
      if (cancelled) return;
      if (i < MESSAGE.length) {
        i += 1;
        setVisible(MESSAGE.slice(0, i));
        later(tick, 36 + Math.random() * 42);
        return;
      }
      finish(HOLD_MS);
    };

    later(tick, 420);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [begun, onDone, onReveal]);

  const onPointerDown = () => {
    if (begun || starting.current) return;
    starting.current = true;
    startCardMusicFromTap();
    setBegun(true);
  };

  return (
    <div
      className={`${styles.root} ${leaving ? styles.leaving : ""}`}
      aria-live="polite"
      aria-busy={begun && !doneTyping}
      onPointerDown={onPointerDown}
    >
      <div className={styles.sheet} aria-hidden="true" />
      <div className={`${styles.logoSlot} ${topbarStyles.logo}`} aria-hidden="true">
        {logoParts.map((part) => (
          <span
            key={part.id}
            className={`${topbarStyles.logoPart} ${topbarStyles[part.id]}`}
            style={{
              aspectRatio: `${part.width} / ${part.height}`,
              WebkitMaskImage: `image-set(url("${part.src}") 1x, url("${part.src2x}") 2x)`,
              maskImage: `image-set(url("${part.src}") 1x, url("${part.src2x}") 2x)`,
            }}
          />
        ))}
      </div>
      {begun ? (
        <p className={styles.line}>
          <span>{visible}</span>
          <span
            className={`${styles.caret} ${doneTyping ? styles.caretIdle : ""}`}
            aria-hidden="true"
          />
        </p>
      ) : (
        <p className={styles.tapStart}>
          Dotknij, żeby zacząć
          <span className={styles.tapStartPulse} aria-hidden="true" />
        </p>
      )}
    </div>
  );
}

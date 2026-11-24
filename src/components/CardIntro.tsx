import { useEffect, useState } from "react";
import styles from "./CardIntro.module.css";

const MESSAGE = "Miło Cię poznać, zobacz co możemy razem zbudować";
const HOLD_MS = 3000;
const FADE_MS = 1100;

type Props = {
  /** Home pojawia się pod czarnym ekranem, gdy zaczyna się fade. */
  onReveal: () => void;
  /** Po zakończeniu fade — odmontuj intro. */
  onDone: () => void;
};

export function CardIntro({ onReveal, onDone }: Props) {
  const [visible, setVisible] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [doneTyping, setDoneTyping] = useState(false);

  useEffect(() => {
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
      finish(1200);
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

    later(tick, 720);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [onDone, onReveal]);

  return (
    <div
      className={`${styles.root} ${leaving ? styles.leaving : ""}`}
      aria-live="polite"
      aria-busy={!doneTyping}
    >
      <p className={styles.line}>
        <span>{visible}</span>
        <span
          className={`${styles.caret} ${doneTyping ? styles.caretIdle : ""}`}
          aria-hidden="true"
        />
      </p>
    </div>
  );
}

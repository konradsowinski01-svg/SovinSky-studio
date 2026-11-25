import { useEffect, useRef, useState } from "react";
import { logoParts } from "../data/logo";
import {
  armCardMusic,
  cueCardMusic,
  gestureCardMusic,
  isCardMusicPending,
  isCardMusicPlaying,
} from "../lib/cardAudio";
import topbarStyles from "./Topbar.module.css";
import styles from "./CardIntro.module.css";

const MESSAGE = "Miło Cię poznać, zobacz co możemy razem zbudować";
/** Pierwszy znak ostatniego słowa — tu startuje muzyka od 2:45. */
const LAST_WORD_AT = MESSAGE.lastIndexOf("zbudować");
const HOLD_MS = 1500;
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
  const [tapHint, setTapHint] = useState(false);
  const musicCued = useRef(false);

  useEffect(() => {
    return armCardMusic();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const cueMusicOnce = () => {
      if (musicCued.current) return;
      musicCued.current = true;
      void cueCardMusic().then((ok) => {
        if (!cancelled && !ok) setTapHint(true);
      });
    };

    const finish = (hold: number) => {
      setDoneTyping(true);
      later(() => {
        if (cancelled) return;
        setLeaving(true);
        setTapHint(false);
        onReveal();
        later(onDone, FADE_MS);
      }, hold);
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setVisible(MESSAGE);
      cueMusicOnce();
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
        if (i - 1 === LAST_WORD_AT) cueMusicOnce();
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

  const onPointerDown = () => {
    void gestureCardMusic().then((ok) => {
      if (ok || isCardMusicPlaying() || !isCardMusicPending()) setTapHint(false);
    });
  };

  return (
    <div
      className={`${styles.root} ${leaving ? styles.leaving : ""}`}
      aria-live="polite"
      aria-busy={!doneTyping}
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
      <p className={styles.line}>
        <span>{visible}</span>
        <span
          className={`${styles.caret} ${doneTyping ? styles.caretIdle : ""}`}
          aria-hidden="true"
        />
      </p>
      {tapHint ? (
        <p className={styles.tapHint} aria-live="polite">
          Dotknij ekranu, żeby włączyć dźwięk
        </p>
      ) : null}
    </div>
  );
}

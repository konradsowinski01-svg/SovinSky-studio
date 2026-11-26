import { site } from "../data/site";
import { useClock } from "../hooks/useClock";
import { HeroWave } from "./HeroWave";
import { TextSplit } from "./TextSplit";
import { Wordmark } from "./Wordmark";
import styles from "./Hero.module.css";

type Props = {
  /** Mount WebGL wave only after intro reveal — avoid GPU burn under black screen. */
  effectsReady?: boolean;
};

export function Hero({ effectsReady = true }: Props) {
  const clock = useClock(site.location);

  return (
    <section id="hero" className={styles.hero} aria-label="Wstęp">
      <div className={styles.inner} data-hero-inner="">
        {effectsReady ? <HeroWave className={styles.wave} /> : null}
        <Wordmark widthRatio={1.48} />
        <div className={styles.fade} aria-hidden="true" data-hero-fade="" />
        <div className={styles.copy} data-hero-copy="">
          <h1 className={styles.title}>
            <span className="sr-only">
              {site.brand} — {site.tagline.join(" ")}
            </span>
            {site.tagline.map((line) => (
              <TextSplit
                key={line}
                text={line}
                className={styles.titleSplit}
                data-split-hero=""
              />
            ))}
          </h1>
          <p className={styles.lead} data-hero-lead="">
            {site.lead}
          </p>
          <div className={styles.meta} data-hero-meta="">
            <p>{clock}</p>
            <p className={styles.status}>
              <span className={styles.dot} aria-hidden="true" />
              {site.status}
            </p>
          </div>
        </div>
      </div>
      <div className={styles.scrollCue} data-hero-scroll="" aria-hidden="true">
        <svg
          className={styles.scrollCueIcon}
          viewBox="0 0 14 28"
          fill="none"
        >
          <defs>
            <filter
              id="hero-scroll-grain"
              x="-50%"
              y="-20%"
              width="200%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="2.4"
                numOctaves="3"
                stitchTiles="stitch"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="0.7"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
          <path
            d="M7 1.5v20.5M2.5 17.5 7 22.5l4.5-5"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#hero-scroll-grain)"
          />
        </svg>
      </div>
    </section>
  );
}

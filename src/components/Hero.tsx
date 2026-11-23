import { site } from "../data/site";
import { useClock } from "../hooks/useClock";
import { HeroWave } from "./HeroWave";
import { TextSplit } from "./TextSplit";
import { Wordmark } from "./Wordmark";
import styles from "./Hero.module.css";

export function Hero() {
  const clock = useClock(site.location);

  return (
    <section id="hero" className={styles.hero} aria-label="Wstęp">
      <div className={styles.inner} data-hero-inner="">
        <HeroWave className={styles.wave} />
        <Wordmark widthRatio={1.48} />
        <div className={styles.fade} aria-hidden="true" data-hero-fade="" />
        <div className={styles.copy} data-hero-copy="">
          <h1 className={styles.title}>
            <span className="sr-only">{site.brand} — strony internetowe i aplikacje</span>
            <TextSplit text={site.tagline} className={styles.titleSplit} data-split-hero="" />
          </h1>
          <div className={styles.meta} data-hero-meta="">
            <p>{clock}</p>
            <p className={styles.status}>
              <span className={styles.dot} aria-hidden="true" />
              {site.status}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

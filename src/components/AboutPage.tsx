import { site } from "../data/site";
import { AboutTitle } from "./AboutTitle";
import { PolaroidPortrait } from "./PolaroidPortrait";
import { PortfolioFractals } from "./PortfolioFractals";
import styles from "./AboutPage.module.css";

export function AboutPage() {
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent("Cześć")}`;
  let index = 0;

  return (
    <main id="main" className={styles.page}>
      <header className={styles.head}>
        <div className={styles.mark} aria-hidden="true">
          <AboutTitle />
          <PortfolioFractals />
        </div>
        <h1 className="sr-only">O mnie</h1>
        <div className={styles.intro}>
          {site.aboutPage.intro ? <p>{site.aboutPage.intro}</p> : null}
          <a href={mailto} className={styles.cta}>
            {site.aboutPage.cta} <span aria-hidden="true">→</span>
          </a>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.story}>
          <PolaroidPortrait alt={`${site.brandShort}, portret`} className={styles.portrait} />
          {site.aboutPage.story ? <p className={styles.lead}>{site.aboutPage.story}</p> : null}
        </div>

        <div className={styles.services}>
          <p className={styles.servicesLabel}>Czym się zajmuję</p>
          <div className={styles.servicesGrid}>
            {site.serviceGroups.map((group) => (
              <div key={group.title} className={styles.serviceGroup}>
                <p className={styles.groupTitle}>{group.title}</p>
                <ul className={styles.groupList}>
                  {group.items.map((item) => {
                    index += 1;
                    const n = String(index).padStart(2, "0");
                    return (
                      <li key={item}>
                        <span className={styles.num} aria-hidden="true">
                          {n}
                        </span>
                        <span className={styles.item}>{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

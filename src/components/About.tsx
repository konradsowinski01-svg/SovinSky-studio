import { site } from "../data/site";
import { RollLink } from "./RollLink";
import styles from "./About.module.css";

export function About() {
  return (
    <section id="about" className={styles.about}>
      <div className={styles.band}>
        <p className={styles.heading} data-fade="">
          O studio
        </p>
        <p className={styles.lede} data-fade="">
          <span className={styles.brandInline}>{site.brand}</span>
          {site.about[0].replace(site.brand, "")}
        </p>
        <div className={styles.copy} data-fade="">
          {site.about.slice(1).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <ul className={styles.services} data-fade="">
          {site.services.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>
        <div data-fade="">
          <RollLink href="#contact" arrow className={styles.cta}>
            Napisz o projekcie
          </RollLink>
        </div>
      </div>
    </section>
  );
}

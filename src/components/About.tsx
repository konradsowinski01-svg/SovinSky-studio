import { site } from "../data/site";
import { logoParts } from "../data/logo";
import { FractalMaterialize } from "./FractalMaterialize";
import { RollLink } from "./RollLink";
import styles from "./About.module.css";

export function About() {
  const body = site.about.replace(site.brand, "").trimStart();

  return (
    <section id="about" className={styles.about}>
      <div className={styles.band}>
        <p className={styles.heading} data-fade="">
          O studio
        </p>
        <FractalMaterialize
          className={styles.body}
          srLabel={site.about}
          text={body}
          logo={
            <span className={styles.brandLogo}>
              {logoParts.map((part) => (
                <span
                  key={part.id}
                  className={styles.brandPart}
                  data-fractal-unit=""
                  data-fractal-logo=""
                  style={{
                    aspectRatio: `${part.width} / ${part.height}`,
                    WebkitMaskImage: `image-set(url("${part.src}") 1x, url("${part.src2x}") 2x)`,
                    maskImage: `image-set(url("${part.src}") 1x, url("${part.src2x}") 2x)`,
                  }}
                />
              ))}
            </span>
          }
        />
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

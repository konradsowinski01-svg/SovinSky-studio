import { site } from "../data/site";
import { logoParts } from "../data/logo";
import { FractalMaterialize } from "./FractalMaterialize";
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
        <div className={styles.services} data-fade="">
          <p className={styles.servicesLabel}>Usługi</p>
          <ul className={styles.servicesList}>
            {site.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

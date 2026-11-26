import { site } from "../data/site";
import { logoParts } from "../data/logo";
import { FractalMaterialize } from "./FractalMaterialize";
import styles from "./About.module.css";

export function About() {
  const body = site.about.replace(site.brand, "").trimStart();
  let index = 0;

  return (
    <section id="about" className={styles.about} data-card-anchor="about">
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
        <div className={styles.services} data-services="" data-card-anchor="services">
          <p className={styles.servicesLabel} data-fade="">
            Usługi
          </p>
          <div className={styles.servicesGrid}>
            {site.serviceGroups.map((group) => (
              <div key={group.title} className={styles.serviceGroup} data-service-group="">
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
      </div>
    </section>
  );
}

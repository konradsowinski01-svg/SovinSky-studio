import { projects } from "../data/site";
import { LiquidHeading } from "./LiquidHeading";
import { ProjectWarp } from "./ProjectWarp";
import { RollLink } from "./RollLink";
import styles from "./Work.module.css";

export function Work() {
  return (
    <section id="work" className={styles.work} aria-label="Wybrane projekty">
      <div className={styles.head} data-card-anchor="work-heading">
        <LiquidHeading text="Wybrane prace" className={styles.heading} />
        <RollLink href="#/portfolio" arrow className={styles.showAll}>
          pokaż wszystkie
        </RollLink>
      </div>

      <div className={styles.list}>
        {projects.map((project, index) => (
          <article
            key={project.slug}
            className={styles.proj}
            data-proj=""
            data-card-anchor={project.slug}
          >
            <a
              className={styles.card}
              href="#contact"
              aria-label={`${project.title}: napisz w sprawie podobnego projektu`}
            >
              <div className={styles.bend} data-proj-bend="">
                <div className={`${styles.visual} ${styles[project.tone]}`} data-proj-visual="">
                  <ProjectWarp title={project.title} index={index} />
                  <div className={styles.sun} aria-hidden="true" data-proj-sun="" />
                  <div className={styles.frame} aria-hidden="true">
                    <div className={styles.chrome}>
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={styles.screen}>
                      <p className={styles.screenBrand}>{project.title}</p>
                      <div className={styles.screenLines}>
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className={styles.screenCta} />
                    </div>
                  </div>
                  <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
                </div>
              </div>
            </a>
            <div className={styles.cap} data-proj-cap="">
              <h3 className={styles.title}>{project.title}</h3>
              <p className={styles.kind}>
                {project.kind}, {project.year}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

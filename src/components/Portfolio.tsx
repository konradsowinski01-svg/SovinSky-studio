import { useMemo } from "react";
import { projects } from "../data/site";
import { makeTexture } from "./ProjectWarp";
import styles from "./Portfolio.module.css";

export function Portfolio() {
  const shots = useMemo(
    () => projects.map((project, index) => makeTexture(project.title, index).toDataURL("image/jpeg", 0.86)),
    [],
  );

  return (
    <main id="main" className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>portfolio</h1>
        <div className={styles.intro}>
          <p>
            Wybrane realizacje: strony firmowe, landingi pod kampanie i lekkie aplikacje webowe.
            Każdy projekt zaprojektowałem i zbudowałem od zera, z myślą o telefonie i szybkim
            kontakcie.
          </p>
          <a href="#contact" className={styles.cta}>
            Napisz w sprawie projektu <span aria-hidden="true">→</span>
          </a>
        </div>
      </header>

      <ul className={styles.grid}>
        {projects.map((project, index) => (
          <li
            key={project.slug}
            className={styles.item}
            style={{ animationDelay: `${0.15 + index * 0.08}s` }}
          >
            <div className={styles.shot}>
              <img src={shots[index]} alt={`${project.title}, podgląd projektu`} loading="lazy" />
            </div>
            <div className={styles.meta}>
              <span className={styles.num}>{String(index + 1).padStart(2, "0")}</span>
              <h2 className={styles.name}>{project.title}</h2>
              <p className={styles.kind}>
                {project.kind}, {project.year}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

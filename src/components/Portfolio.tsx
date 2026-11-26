import { useMemo } from "react";
import { projects, site } from "../data/site";
import { makeTexture } from "./ProjectWarp";
import { PortfolioFractals } from "./PortfolioFractals";
import { PortfolioTitle } from "./PortfolioTitle";
import styles from "./Portfolio.module.css";

export function Portfolio() {
  const shots = useMemo(
    () =>
      projects.map((project, index) =>
        project.cover
          ? `${import.meta.env.BASE_URL}${project.cover}`
          : makeTexture(project.title, index).toDataURL("image/jpeg", 0.86),
      ),
    [],
  );
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent("Sprawa projektu")}`;

  return (
    <main id="main" className={styles.page}>
      <header className={styles.head}>
        <div className={styles.mark} aria-hidden="true">
          <PortfolioTitle />
          <PortfolioFractals />
        </div>
        <h1 className="sr-only">Portfolio</h1>
        <div className={styles.intro}>
          <p>
            Wybrane realizacje: aplikacje mobilne, strony firmowe i landingi. Każdy projekt
            zaprojektowałem i zbudowałem od zera — od szkicu po wdrożenie.
          </p>
          <a href={mailto} className={styles.cta}>
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

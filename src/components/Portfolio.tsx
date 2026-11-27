import { useMemo, type CSSProperties, type ReactNode } from "react";
import { projects, site, type Project } from "../data/site";
import { makeTexture } from "./ProjectWarp";
import { PortfolioFractals } from "./PortfolioFractals";
import { PortfolioTitle } from "./PortfolioTitle";
import styles from "./Portfolio.module.css";

function TileShell({
  project,
  className,
  style,
  children,
}: {
  project: Project;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (project.href) {
    return (
      <a
        className={className}
        style={style}
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${project.title}: otwórz projekt`}
      >
        {children}
      </a>
    );
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

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
          <li key={project.slug}>
            <TileShell
              project={project}
              className={`${styles.item}${project.href ? ` ${styles.linked}` : ""}`}
              style={{ animationDelay: `${0.15 + index * 0.08}s` }}
            >
              <div className={styles.shot}>
                <img src={shots[index]} alt={`${project.title}, podgląd projektu`} loading="lazy" />
                {project.blurb ? (
                  <div className={styles.overlay}>
                    <p>{project.blurb}</p>
                  </div>
                ) : null}
              </div>
              <div className={styles.meta}>
                <span className={styles.num}>{String(index + 1).padStart(2, "0")}</span>
                <h2 className={styles.name}>{project.title}</h2>
                <p className={styles.kind}>
                  {project.kind}, {project.year}
                </p>
              </div>
            </TileShell>
          </li>
        ))}
      </ul>
    </main>
  );
}

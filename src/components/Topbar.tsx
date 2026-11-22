import { site } from "../data/site";
import styles from "./Topbar.module.css";

const links = [
  { href: "#work", label: "work" },
  { href: "#about", label: "about" },
  { href: "#contact", label: "contact" },
] as const;

export function Topbar() {
  return (
    <header className={styles.topbar} data-topbar>
      <a className={styles.logo} href="#top" aria-label={`${site.brand}, wróć na górę`}>
        <span className={styles.logoMark}>{site.brandShort.toLowerCase()}</span>
        <span className={styles.logoRest}>studio</span>
      </a>
      <nav className={styles.nav} aria-label="Główne">
        {links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

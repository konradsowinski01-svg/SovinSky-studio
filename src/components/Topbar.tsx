import { site } from "../data/site";
import { logoParts } from "../data/logo";
import { ABOUT_HASH, PORTFOLIO_HASH, type Route } from "../lib/router";
import styles from "./Topbar.module.css";

const links = [
  { href: PORTFOLIO_HASH, label: "portfolio" },
  { href: ABOUT_HASH, label: "o mnie" },
  { href: "#contact", label: "kontakt" },
] as const;

type Props = {
  route: Route;
};

export function Topbar({ route }: Props) {
  return (
    <header className={styles.topbar} data-topbar>
      <a className={styles.logo} href="#top" aria-label={`${site.brand}, wróć na górę`}>
        {logoParts.map((part) => (
          <span
            key={part.id}
            className={`${styles.logoPart} ${styles[part.id]}`}
            style={{
              aspectRatio: `${part.width} / ${part.height}`,
              WebkitMaskImage: `image-set(url("${part.src}") 1x, url("${part.src2x}") 2x)`,
              maskImage: `image-set(url("${part.src}") 1x, url("${part.src2x}") 2x)`,
            }}
            aria-hidden="true"
          />
        ))}
      </a>
      <nav className={styles.nav} aria-label="Główne">
        {links.map((link) => {
          const current =
            (route === "portfolio" && link.href === PORTFOLIO_HASH) ||
            (route === "about" && link.href === ABOUT_HASH);
          return (
            <a key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
              {link.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}

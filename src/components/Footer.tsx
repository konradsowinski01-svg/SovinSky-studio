import { site } from "../data/site";
import styles from "./Footer.module.css";

export function Footer() {
  const year = new Date().getFullYear();
  const tel = site.phone.replace(/\s+/g, "");

  return (
    <footer id="foot" className={styles.foot}>
      <div className={styles.col}>
        <p className={styles.label}>Kontakt</p>
        <ul>
          <li>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </li>
          <li>
            <a href={`tel:${tel}`}>{site.phone}</a>
          </li>
          <li>
            <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </li>
        </ul>
      </div>
      <p className={styles.copy}>
        © {year} {site.brand}
      </p>
    </footer>
  );
}

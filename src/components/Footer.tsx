import { site } from "../data/site";
import styles from "./Footer.module.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="foot" className={styles.foot}>
      <div className={styles.col}>
        <p className={styles.label}>Usługi</p>
        <ul>
          {site.services.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>
      </div>
      <div className={styles.col}>
        <p className={styles.label}>Kontakt</p>
        <ul>
          <li>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </li>
          <li>
            <a href={`tel:${site.phone.replace(/\s+/g, "")}`}>{site.phone}</a>
          </li>
        </ul>
      </div>
      <p className={styles.copy}>
        © {year} {site.brand}
      </p>
    </footer>
  );
}

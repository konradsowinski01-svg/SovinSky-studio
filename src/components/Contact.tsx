import { site } from "../data/site";
import { RollLink } from "./RollLink";
import { TextSplit } from "./TextSplit";
import styles from "./Contact.module.css";

export function Contact() {
  const mailto = `mailto:${site.email}`;
  const tel = `tel:${site.phone.replace(/\s+/g, "")}`;
  const wa = `https://wa.me/${site.whatsapp}`;

  return (
    <section id="contact" className={styles.contact}>
      <div className={styles.grain} aria-hidden="true" />
      <h2 className="sr-only">Kontakt</h2>
      <p className={styles.label} data-fade="">
        Kontakt
      </p>
      <a className={styles.mailWrap} href={mailto}>
        <TextSplit
          as="span"
          text={site.email}
          className={styles.mailSplit}
          data-split-scroll=""
        />
      </a>
      <div className={styles.actions} data-fade="">
        <RollLink href={mailto} arrow>
          Napisz maila
        </RollLink>
        <RollLink href={tel} arrow>
          Zadzwoń
        </RollLink>
        <RollLink href={wa} arrow>
          WhatsApp
        </RollLink>
      </div>
      <p className={styles.status} data-fade="">
        <span className={styles.dot} aria-hidden="true" />
        {site.status}
      </p>
    </section>
  );
}

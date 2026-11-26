import { useEffect, useRef } from "react";
import { site } from "../data/site";
import { RollLink } from "./RollLink";
import { TextSplit } from "./TextSplit";
import styles from "./Contact.module.css";

const LINE_DELAY_MS = 1000;

export function Contact() {
  const mailto = `mailto:${site.email}`;
  const tel = `tel:${site.phone.replace(/\s+/g, "")}`;
  const wa = `https://wa.me/${site.whatsapp}`;
  const sectionRef = useRef<HTMLElement>(null);
  const mailRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const mail = mailRef.current;
    if (!section || !mail) return;

    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (timer || mail.dataset.lined === "true") return;
          timer = window.setTimeout(() => {
            timer = 0;
            mail.dataset.lined = "true";
          }, LINE_DELAY_MS);
          return;
        }
        if (timer) {
          window.clearTimeout(timer);
          timer = 0;
        }
      },
      { threshold: 0.45 },
    );

    io.observe(section);
    return () => {
      if (timer) window.clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  return (
    <section id="contact" ref={sectionRef} className={styles.contact}>
      <div className={styles.grain} aria-hidden="true" />
      <h2 className="sr-only">Kontakt</h2>
      <p className={styles.label} data-fade="">
        Kontakt
      </p>
      <a ref={mailRef} className={styles.mailWrap} href={mailto}>
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

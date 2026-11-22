import type { ReactNode } from "react";
import styles from "./RollLink.module.css";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
};

export function RollLink({ href, children, className = "", arrow = false }: Props) {
  return (
    <a className={`${styles.link} ${className}`} href={href}>
      <span className={styles.roll}>
        <span className={styles.rollIn}>
          <span className={styles.t}>{children}</span>
          <span className={`${styles.t} ${styles.tB}`} aria-hidden="true">
            {children}
          </span>
        </span>
      </span>
      {arrow ? <span className={styles.arrow} aria-hidden="true">→</span> : null}
    </a>
  );
}

import type { ReactNode } from "react";
import { PortraitCloud } from "./PortraitCloud";
import styles from "./DnaField.module.css";

/** Shared DNA backdrop spanning Work → About → Contact (not cropped to About). */
export function DnaField({ children }: { children: ReactNode }) {
  return (
    <div className={styles.field} data-dna-field="">
      <PortraitCloud />
      {children}
    </div>
  );
}

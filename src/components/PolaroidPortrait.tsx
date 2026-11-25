import styles from "./PolaroidPortrait.module.css";

const SRC = `${import.meta.env.BASE_URL}about-portrait.jpg`;

type Props = {
  alt?: string;
  className?: string;
};

export function PolaroidPortrait({ alt = "Portret", className = "" }: Props) {
  return (
    <figure className={`${styles.polaroid} ${className}`}>
      <div className={styles.shot}>
        <img src={SRC} alt={alt} loading="lazy" decoding="async" />
      </div>
    </figure>
  );
}

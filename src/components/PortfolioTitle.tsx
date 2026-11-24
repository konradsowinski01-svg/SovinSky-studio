import { useEffect, useRef, useState } from "react";
import {
  ShaderMount,
  getShaderColorFromString,
  getShaderNoiseTexture,
  grainGradientFragmentShader,
} from "@paper-design/shaders";
import styles from "./PortfolioTitle.module.css";

const COLORS = ["#7a2200", "#d45500", "#ff6a00", "#ff8a2b", "#ffb060"];

type Props = {
  className?: string;
};

export function PortfolioTitle({ className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setLive(!reduce.matches);
    sync();
    reduce.addEventListener("change", sync);
    return () => reduce.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!live) return;
    const host = hostRef.current;
    if (!host) return;
    let mount: ShaderMount | null = null;
    let cancelled = false;

    const noise = getShaderNoiseTexture();
    if (!noise) return;

    noise
      .decode()
      .then(() => {
        if (cancelled) return;
        mount = new ShaderMount(
          host,
          grainGradientFragmentShader,
          {
            u_colorBack: [0, 0, 0, 0],
            u_colors: COLORS.map((c) => getShaderColorFromString(c)),
            u_colorsCount: COLORS.length,
            u_softness: 0.55,
            u_intensity: 0.22,
            u_noise: 0.18,
            u_shape: 3,
            u_fit: 1,
            u_scale: 1.15,
            u_rotation: 0,
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0,
            u_offsetY: 0,
            u_worldWidth: 0,
            u_worldHeight: 0,
            u_noiseTexture: noise,
          },
          undefined,
          0.55,
          0,
          1,
          devicePixelRatio >= 2 ? 1.2e6 : 2e6,
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      mount?.dispose();
      host.querySelectorAll(":scope > canvas").forEach((c) => c.remove());
    };
  }, [live]);

  return (
    <div className={`${styles.stage} ${className}`}>
      {live ? <div ref={hostRef} className={styles.fill} aria-hidden="true" /> : null}
      <span className={live ? styles.mask : styles.solid}>portfolio</span>
    </div>
  );
}

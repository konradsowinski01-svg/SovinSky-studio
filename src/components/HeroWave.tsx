import { useEffect, useRef } from "react";
import {
  ShaderMount,
  getShaderColorFromString,
  getShaderNoiseTexture,
  grainGradientFragmentShader,
} from "@paper-design/shaders";

const COLORS = ["#d63a00", "#ff5a00", "#ff7417"];
const START_FRAME = 10500;
const WAVE_AMP = 0.25;

const WAVE_LINE =
  /float wave = cos\(\.5 \* shape_uv\.x - 4\. \* t\) \* sin\(1\.5 \* shape_uv\.x \+ 2\. \* t\) \* \(\.75 \+ \.25 \* cos\(6\. \* t\)\);/;

const glslFloat = (n: number) => (Number.isInteger(n) ? `${n}.` : String(n));

// Keeps the wave close to its START_FRAME pose: only WAVE_AMP of the motion is applied,
// so the black front breathes instead of sweeping across the hero.
function boundedWaveShader(source: string) {
  if (!WAVE_LINE.test(source)) return source;
  const rest = glslFloat(+(0.1 * (0.001 * START_FRAME + 7)).toFixed(6));
  return source
    .replace(
      "void main()",
      `float sovWave(float x, float t) { return cos(.5 * x - 4. * t) * sin(1.5 * x + 2. * t) * (.75 + .25 * cos(6. * t)); }
void main()`,
    )
    .replace(
      WAVE_LINE,
      `float wave = sovWave(shape_uv.x, ${rest}) + ${glslFloat(WAVE_AMP)} * (sovWave(shape_uv.x, t) - sovWave(shape_uv.x, ${rest}));`,
    );
}

type Props = {
  className?: string;
};

export function HeroWave({ className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
          boundedWaveShader(grainGradientFragmentShader),
          {
            u_colorBack: [0, 0, 0, 0],
            u_colors: COLORS.map((c) => getShaderColorFromString(c)),
            u_colorsCount: COLORS.length,
            u_softness: 1,
            u_intensity: 0.08,
            u_noise: 0,
            u_shape: 1,
            u_fit: 1,
            u_scale: 1.82,
            u_rotation: 180,
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0.04,
            u_offsetY: 0.02,
            u_worldWidth: 0,
            u_worldHeight: 0,
            u_noiseTexture: noise,
          },
          undefined,
          0.8,
          START_FRAME,
          2,
          devicePixelRatio >= 2 ? 1.6e6 : 2.6e6,
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      mount?.dispose();
      host.querySelectorAll(":scope > canvas").forEach((c) => c.remove());
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}

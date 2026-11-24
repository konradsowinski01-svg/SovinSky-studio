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
// Extra silhouette grain at the black/orange join only (does not touch orange fill bands).
const EDGE_GRAIN = 0.42;

const WAVE_LINE =
  /float wave = cos\(\.5 \* shape_uv\.x - 4\. \* t\) \* sin\(1\.5 \* shape_uv\.x \+ 2\. \* t\) \* \(\.75 \+ \.25 \* cos\(6\. \* t\)\);/;

const EDGE_GRAIN_BLOCK = `shape += u_intensity * 2. / u_colorsCount * (grainDist + .5);
  shape += u_noise * 10. / u_colorsCount * noise;

  float aa = fwidth(shape);

  shape = clamp(shape - .5 / u_colorsCount, 0., 1.);
  float totalShape = smoothstep(0., u_softness + 2. * aa, clamp(shape * u_colorsCount, 0., 1.));
  float mixer = shape * (u_colorsCount - 1.);`;

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

// Boost grain only on the transparent/orange silhouette; leave orange band mixing alone.
function edgeGrainShader(source: string) {
  if (!source.includes(EDGE_GRAIN_BLOCK)) return source;
  return source.replace(
    EDGE_GRAIN_BLOCK,
    `shape += u_intensity * 2. / u_colorsCount * (grainDist + .5);
  shape += u_noise * 10. / u_colorsCount * noise;

  float aa = fwidth(shape);

  shape = clamp(shape - .5 / u_colorsCount, 0., 1.);
  float mixer = shape * (u_colorsCount - 1.);

  float edgeField = clamp(shape * u_colorsCount, 0., 1.);
  float edgeMask = 1. - smoothstep(0., .5, edgeField);
  float edgeShape = clamp(shape + ${glslFloat(EDGE_GRAIN)} * grainDist * edgeMask, 0., 1.);
  float totalShape = smoothstep(0., u_softness + 2. * aa, clamp(edgeShape * u_colorsCount, 0., 1.));`,
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
          edgeGrainShader(boundedWaveShader(grainGradientFragmentShader)),
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

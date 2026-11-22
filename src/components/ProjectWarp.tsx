import { useEffect, useRef } from "react";
import { onVelocity } from "../lib/lenisStore";
import styles from "./ProjectWarp.module.css";

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(position, 0., 1.);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 uv;
uniform sampler2D image;
uniform float time;
uniform float aspect;
uniform float rectTop;
uniform float rectHeight;
uniform float velocity;

// The canvas bleeds past the card on every side so grains can fly freely.
const float CARD = 1. / 1.36;
const float BLEED_Y = 1.7;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3. - 2. * f);
  float a = hash(i);
  float b = hash(i + vec2(1., 0.));
  float c = hash(i + vec2(0., 1.));
  float d = hash(i + vec2(1., 1.));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 smear(vec2 q, vec2 dir) {
  vec3 acc = vec3(0.);
  for (int i = 0; i < 11; i++) {
    float t = float(i) / 10. - .5;
    acc += texture2D(image, clamp(q + dir * t, 0., 1.)).rgb;
  }
  return acc / 11.;
}

float roundedMask(vec2 t) {
  vec2 p = (t - .5) * vec2(aspect, 1.);
  vec2 b = vec2(aspect * .5, .5) - .028;
  vec2 d = abs(p) - b;
  float dist = length(max(d, 0.)) + min(max(d.x, d.y), 0.) - .028;
  return 1. - smoothstep(-.002, .002, dist);
}

void main() {
  float y = (uv.y - .5) * BLEED_Y + .5;
  float x = uv.x * 2. - 1.;
  float cardDist = max(max(-y, y - 1.), 0.);
  float canvasFade = smoothstep(0., .14, uv.y) * smoothstep(1., .86, uv.y)
    * smoothstep(0., .1, uv.x) * smoothstep(1., .9, uv.x);

  // Effect strength comes from the row's position on screen only: it
  // materialises near the bottom, stays clean in the middle and dissolves
  // again near the top, regardless of scroll speed.
  float sy = rectTop + (1. - y) * rectHeight;
  float bottom = smoothstep(.8, 1.04, sy);
  float top = smoothstep(.2, -.04, sy);
  float amount = max(bottom, top);
  float dir = bottom >= top ? 1. : -1.;
  float a2 = amount * amount;

  // Flying sand: round grains drifting upward around the card edge zones.
  vec2 fp = gl_FragCoord.xy - vec2(sin(gl_FragCoord.y * .05 + time) * 6., time * 70.);
  vec2 fc = floor(fp / 3.);
  vec2 ff = fract(fp / 3.) - .5;
  float radius = .16 + .16 * hash(fc + 3.);
  float dotMask = 1. - smoothstep(radius - .1, radius, length(ff));
  float sand = dotMask * step(hash(fc), amount * .55) * smoothstep(1.3, .95, abs(x / CARD));
  sand *= exp(-cardDist * 6.);

  // Sparse stray grains wandering around the sides while the card dissolves.
  vec2 sp = gl_FragCoord.xy - vec2(sin(time * .6 + gl_FragCoord.y * .008) * 50., time * 38.);
  vec2 sc = floor(sp / 7.);
  vec2 sf = fract(sp / 7.) - .5 + (vec2(hash(sc + 5.), hash(sc + 9.)) - .5) * .5;
  float sr = .08 + .14 * hash(sc + 13.);
  float stray = (1. - smoothstep(sr - .06, sr, length(sf))) * step(hash(sc + 21.), top * .09);
  stray *= exp(-cardDist * 2.);
  sand = max(sand, stray) * canvasFade;
  // Cyberpunk glitch: smooth noise-driven sideways slides with soft edges.
  float fine = vnoise(vec2(y * 22., time * 5.)) - .5;
  float broad = vnoise(vec2(y * 6., time * 1.8 + 10.)) - .5;
  float gate = smoothstep(.42, .72, vnoise(vec2(y * 9., time * 2.4 + 3.)));
  float slice = fine * gate;

  float u = x / CARD / (1. + .45 * a2);
  u += slice * amount * 1.1;
  u += broad * a2 * .5;
  u += sin(gl_FragCoord.y * .7 + time * 24.) * a2 * .008;
  u += sin(y * 11. + time * 2.6 * dir) * a2 * .09;

  vec3 sandColor = texture2D(image, clamp(vec2(u * .5 + .5, y), 0., 1.)).rgb;
  sandColor = sandColor * 1.35 + .06;

  float alpha = 1. - smoothstep(.994, 1.0, abs(u));
  if (alpha <= 0.) {
    gl_FragColor = vec4(sandColor * sand, sand);
    return;
  }

  vec2 t = vec2(u * .5 + .5, y);
  alpha *= roundedMask(t);

  float speed = smoothstep(0., 12., abs(velocity));
  float split = amount * (.05 + .06 * abs(u) + abs(slice) * .12) * dir;
  split += speed * (.005 + .006 * abs(u)) * sign(velocity) * (1. - amount);
  vec2 blurDir = vec2(a2 * .16 + speed * .006, 0.);
  vec3 r = smear(t + vec2(split, 0.), blurDir);
  vec3 cy = smear(t - vec2(split, 0.), blurDir);
  vec3 mid = smear(t, blurDir);
  vec3 color = vec3(r.r, min((mid.g + cy.g) * .5, max(r.r, cy.b)), cy.b);
  color += vec3(-.12, .22, .34) * smoothstep(0., .03, abs(split)) * (1. - mid.r);

  // Sand-grain dissolve: tiny screen-space grains, tinted cyan or red, where
  // the card is forming / breaking up.
  vec2 drift = vec2(sin(time * .7 + y * 5.) * 5., time * 14.);
  vec2 cell = floor((gl_FragCoord.xy - drift) / 1.5);
  float n = hash(cell + (dir > 0. ? 0. : 17.));
  n += sin(time * 2.2 + hash(cell + 3.) * 6.283) * .05;
  float d = amount * 1.25 - .12 - n;
  alpha *= 1. - step(0., d);
  float seam = (1. - smoothstep(0., .16, abs(d))) * smoothstep(0., .25, amount);
  color = mix(color, mid * 1.4 + .08, seam * .85);
  color *= 1. - .2 * amount * step(.5, fract(gl_FragCoord.y / 3.));
  color *= 1. + amount * .25;
  color *= .98 + .04 * sin(time * .25 + y * 4.);

  float outA = max(alpha, sand);
  vec3 outC = color * alpha + sandColor * sand * (1. - alpha);
  gl_FragColor = vec4(outC, outA);
}`;

const palettes = [
  ["#f43b16", "#78180e", "#100b09"],
  ["#ff7a19", "#542006", "#0d0906"],
  ["#ff9a3d", "#a52f08", "#130a05"],
  ["#e94f18", "#64180a", "#090706"],
];

function makeTexture(title: string, index: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const [hot, deep, dark] = palettes[index % palettes.length];
  const bg = ctx.createLinearGradient(0, 0, 1280, 720);
  bg.addColorStop(0, hot);
  bg.addColorStop(0.5, deep);
  bg.addColorStop(1, dark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 720);

  const orb = ctx.createRadialGradient(650, 360, 20, 650, 360, 430);
  orb.addColorStop(0, "#ffbd72");
  orb.addColorStop(0.25, "#ff6a00");
  orb.addColorStop(0.72, "#b82a08");
  orb.addColorStop(1, "rgba(74, 10, 2, 0)");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(650, 360, 430, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(12, 8, 7, .84)";
  ctx.strokeStyle = "rgba(255, 255, 255, .16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(150, 130, 980, 465, 24);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(150, 180);
  ctx.lineTo(1130, 180);
  ctx.stroke();
  ["#ff7254", "#ffb24e", "#d6d6d6"].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(180 + i * 27, 156, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#fff";
  ctx.font = "700 54px Georgia, serif";
  ctx.fillText(title, 205, 285);
  ctx.fillStyle = "rgba(255,255,255,.24)";
  [0, 1, 2].forEach((line) => {
    ctx.beginPath();
    ctx.roundRect(205, 330 + line * 38, line === 1 ? 680 : 560, 13, 8);
    ctx.fill();
  });
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(205, 475, 300, 58, 29);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.font = "500 20px monospace";
  ctx.fillText(String(index + 1).padStart(2, "0"), 35, 45);
  return canvas;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

type Props = {
  title: string;
  index: number;
};

export function ProjectWarp({ title, index }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      makeTexture(title, index),
    );

    const timeLocation = gl.getUniformLocation(program, "time");
    const aspectLocation = gl.getUniformLocation(program, "aspect");
    const rectTopLocation = gl.getUniformLocation(program, "rectTop");
    const rectHeightLocation = gl.getUniformLocation(program, "rectHeight");
    const velocityLocation = gl.getUniformLocation(program, "velocity");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let targetVelocity = 0;
    let smoothVelocity = 0;
    const unsubscribe = onVelocity((value) => {
      targetVelocity = Math.max(-14, Math.min(14, value));
    });

    const start = performance.now();
    let frame = 0;
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      smoothVelocity += (targetVelocity - smoothVelocity) * 0.12;
      targetVelocity *= 0.92;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > innerHeight) return;
      const rect = (canvas.parentElement ?? canvas).getBoundingClientRect();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLocation, (now - start) / 1000);
      gl.uniform1f(aspectLocation, rect.width / Math.max(1, rect.height));
      gl.uniform1f(rectTopLocation, rect.top / innerHeight);
      gl.uniform1f(rectHeightLocation, rect.height / innerHeight);
      gl.uniform1f(velocityLocation, smoothVelocity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [index, title]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-hidden="true"
      data-project-warp=""
    />
  );
}

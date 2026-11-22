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
uniform float twist;
uniform float velocity;

const float DEPTH = 1.8;
// Card half-width inside the canvas; the canvas bleeds sideways for the waves.
const float CARD = 1. / 1.36;

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
  float y = uv.y;
  float x = uv.x * 2. - 1.;

  // The whole card coils like a DNA strand; rows farther from the screen centre
  // turn more, so the twist reads as one continuous helix.
  float amount = abs(twist);
  float outer = twist > 0. ? 1. - y : y;
  float theta = sign(twist) * amount * (1.1 + 4.6 * outer);

  float width = CARD * (1. - .3 * amount);
  float px = x / width;
  px += sin(y * 7. + time * 2.4) * velocity * .014;
  px += sin(y * 19. - time * 3.1) * velocity * .004;

  float c = cos(theta);
  float s = sin(theta);
  float denom = c - px * s / DEPTH;
  if (abs(denom) < .015) {
    gl_FragColor = vec4(0.);
    return;
  }
  float u = px / denom;

  float alpha = 1. - smoothstep(.994, 1.0, abs(u));
  if (alpha <= 0.) {
    gl_FragColor = vec4(0.);
    return;
  }

  vec2 t = vec2(u * .5 + .5, y);
  alpha *= roundedMask(t);

  float distort = smoothstep(0., .7, amount) * (.4 + .6 * outer);
  float split = distort * (.012 + .02 * abs(u)) * sign(twist);
  vec2 blurDir = vec2(distort * .05, 0.);
  vec3 r = smear(t + vec2(split, 0.), blurDir);
  vec3 cy = smear(t - vec2(split, 0.), blurDir);
  vec3 mid = smear(t, blurDir);
  vec3 color = vec3(r.r, (mid.g + cy.g) * .5, cy.b);
  color += vec3(-.06, .1, .16) * smoothstep(0., .08, abs(split)) * (1. - mid.r);

  // Light falls off as a strip turns away; a soft highlight rides the fold.
  float facing = (.4 + .6 * abs(c)) * (c < 0. ? .6 : 1.);
  float sheen = pow(max(0., 1. - abs(px + s * .6)), 6.) * abs(s) * .25;
  color = color * facing + sheen;
  color *= .98 + .04 * sin(time * .25 + y * 4.);
  gl_FragColor = vec4(color * alpha, alpha);
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
    const twistLocation = gl.getUniformLocation(program, "twist");
    const velocityLocation = gl.getUniformLocation(program, "velocity");
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
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
      smoothVelocity += (targetVelocity - smoothVelocity) * 0.1;
      targetVelocity *= 0.92;
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const center = (rect.top + rect.height / 2) / innerHeight - 0.5;
      const t = Math.min(1, Math.max(0, (Math.abs(center) - 0.1) / 0.5));
      const twist = Math.sign(center) * t * t * (3 - 2 * t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLocation, (now - start) / 1000);
      gl.uniform1f(aspectLocation, (rect.width / 1.36) / Math.max(1, rect.height));
      gl.uniform1f(twistLocation, twist);
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

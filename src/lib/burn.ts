import type { Route } from "./router";

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(position, 0., 1.);
}`;

const SHARED = `
precision highp float;
varying vec2 uv;
uniform float progress;
uniform float aspect;
uniform float time;
uniform vec2 origin;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(hash(i), hash(i + vec2(1., 0.)), f.x),
    mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.;
  float a = .5;
  for (int i = 0; i < 5; i++) {
    v += noise(p) * a;
    p *= 2.03;
    a *= .5;
  }
  return v;
}

float field() {
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 o = vec2(origin.x * aspect, origin.y);
  float maxDist = length(max(o, vec2(aspect, 1.) - o)) + .001;
  float dist = length(p - o) / maxDist;
  float n = fbm(p * 2.8 + time * .04) * .22;
  return dist + n - progress * 1.28;
}
`;

// White = keep overlay, black = reveal page underneath (CSS mask alpha/luminance).
const MASK_FRAGMENT =
  SHARED +
  `
void main() {
  float d = field();
  float w = .11;
  float keep = smoothstep(-w * .12, w * .08, d);
  gl_FragColor = vec4(keep, keep, keep, keep);
}
`;

const FLAME_FRAGMENT =
  SHARED +
  `
vec3 flameCol(float d, float w) {
  vec3 hot = vec3(1., .86, .45);
  vec3 orange = vec3(1., .38, .02);
  vec3 ember = vec3(.32, .04, .0);
  float ad = abs(d);
  vec3 c = mix(hot, orange, smoothstep(0., w * .25, ad));
  c = mix(c, ember, smoothstep(w * .25, w * .7, ad));
  return mix(c, vec3(.02, .015, .012), smoothstep(w * .7, w, ad));
}

void main() {
  float d = field();
  float w = .11;
  float flicker = .92 + .08 * noise(vec2(uv.x * aspect, uv.y) * 36. + time * 4.);

  if (abs(d) > w * 1.15) {
    gl_FragColor = vec4(0.);
    return;
  }

  float band = 1. - smoothstep(0., w, abs(d));
  vec3 color = flameCol(d, w) * flicker;
  float spark = step(.988, hash(floor(gl_FragCoord.xy / 2.) + floor(time * 16.)));
  color += vec3(1., .55, .18) * spark * band;

  float alpha = band;
  if (d < 0.) alpha *= smoothstep(-w, -w * .15, d);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export type BurnHooks = {
  prepare: (from: Route) => Promise<HTMLElement>;
  finish: () => void;
};

let hooks: BurnHooks | null = null;
let running = false;

export function registerBurnHooks(next: BurnHooks | null) {
  hooks = next;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function createProgram(gl: WebGLRenderingContext, fragmentSource: string) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }
  return { program, vertex, fragment };
}

function bindQuad(gl: WebGLRenderingContext, program: WebGLProgram) {
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
  return buffer;
}

function wire(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  canvas: HTMLCanvasElement,
  origin: { x: number; y: number },
) {
  gl.useProgram(program);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const loc = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1f(loc("aspect"), innerWidth / innerHeight);
  gl.uniform2f(loc("origin"), origin.x / innerWidth, 1 - origin.y / innerHeight);
  return loc;
}

function draw(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  loc: (name: string) => WebGLUniformLocation | null,
  progress: number,
  time: number,
) {
  gl.useProgram(program);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(loc("progress"), progress);
  gl.uniform1f(loc("time"), time);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

const nextFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function readRouteFromHash(hash = window.location.hash): Route {
  return hash.startsWith("#/portfolio") ? "portfolio" : "home";
}

function applyMask(overlay: HTMLElement, dataUrl: string) {
  overlay.style.setProperty("-webkit-mask-image", `url(${dataUrl})`);
  overlay.style.setProperty("mask-image", `url(${dataUrl})`);
  overlay.style.setProperty("-webkit-mask-size", "100% 100%");
  overlay.style.setProperty("mask-size", "100% 100%");
  overlay.style.setProperty("-webkit-mask-repeat", "no-repeat");
  overlay.style.setProperty("mask-repeat", "no-repeat");
}

function clearMask(overlay: HTMLElement) {
  overlay.style.removeProperty("-webkit-mask-image");
  overlay.style.removeProperty("mask-image");
  overlay.style.removeProperty("-webkit-mask-size");
  overlay.style.removeProperty("mask-size");
  overlay.style.removeProperty("-webkit-mask-repeat");
  overlay.style.removeProperty("mask-repeat");
}

/**
 * Live React overlay of the leaving page, destination under it, CSS-masked
 * flame wave from the click. (WebGL mix-blend destination-out is unreliable.)
 */
export async function burnTo(hash: string, origin = { x: innerWidth / 2, y: innerHeight / 2 }) {
  if (running) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.hash = hash;
    return;
  }
  if (!hooks) {
    window.location.hash = hash;
    return;
  }

  running = true;
  const from = readRouteFromHash();

  let overlay: HTMLElement;
  try {
    overlay = await hooks.prepare(from);
  } catch {
    running = false;
    window.location.hash = hash;
    return;
  }

  window.location.hash = hash;
  await nextFrames();

  // Low-res mask — CSS stretches it; keeps toDataURL cheap enough for RAF.
  const maskCanvas = document.createElement("canvas");
  const maskW = 480;
  maskCanvas.width = maskW;
  maskCanvas.height = Math.max(1, Math.round((maskW * innerHeight) / innerWidth));

  const flameCanvas = document.createElement("canvas");
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  flameCanvas.width = Math.round(innerWidth * dpr);
  flameCanvas.height = Math.round(innerHeight * dpr);
  Object.assign(flameCanvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "201",
    pointerEvents: "none",
  });
  document.body.appendChild(flameCanvas);

  const maskGl = maskCanvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  const flameGl = flameCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: true });
  const maskProg = maskGl ? createProgram(maskGl, MASK_FRAGMENT) : null;
  const flameProg = flameGl ? createProgram(flameGl, FLAME_FRAGMENT) : null;

  if (!maskGl || !flameGl || !maskProg || !flameProg) {
    flameCanvas.remove();
    clearMask(overlay);
    hooks.finish();
    running = false;
    return;
  }

  const maskBuf = bindQuad(maskGl, maskProg.program);
  const flameBuf = bindQuad(flameGl, flameProg.program);
  const maskLoc = wire(maskGl, maskProg.program, maskCanvas, origin);
  const flameLoc = wire(flameGl, flameProg.program, flameCanvas, origin);

  const duration = 2200;
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const progress = easeOutCubic(t);
      const time = now / 1000;
      draw(maskGl, maskProg.program, maskLoc, progress, time);
      applyMask(overlay, maskCanvas.toDataURL("image/png"));
      draw(flameGl, flameProg.program, flameLoc, progress, time);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });

  maskGl.deleteBuffer(maskBuf);
  flameGl.deleteBuffer(flameBuf);
  maskGl.deleteProgram(maskProg.program);
  flameGl.deleteProgram(flameProg.program);
  maskGl.deleteShader(maskProg.vertex);
  maskGl.deleteShader(maskProg.fragment);
  flameGl.deleteShader(flameProg.vertex);
  flameGl.deleteShader(flameProg.fragment);
  flameCanvas.remove();
  clearMask(overlay);
  hooks.finish();
  running = false;
}

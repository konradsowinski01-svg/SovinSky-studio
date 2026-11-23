import { toCanvas } from "html-to-image";

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
uniform float progress;
uniform float aspect;
uniform float time;
uniform vec2 origin;
uniform sampler2D u_page;

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

vec3 flame(float d, float w) {
  vec3 hot = vec3(1., .86, .45);
  vec3 orange = vec3(1., .38, .02);
  vec3 ember = vec3(.32, .04, .0);
  vec3 c = mix(hot, orange, smoothstep(0., w * .25, d));
  c = mix(c, ember, smoothstep(w * .25, w * .7, d));
  return mix(c, vec3(.02, .015, .012), smoothstep(w * .7, w, d));
}

void main() {
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 o = vec2(origin.x * aspect, origin.y);

  float maxDist = length(max(o, vec2(aspect, 1.) - o)) + .001;
  float dist = length(p - o) / maxDist;
  float n = fbm(p * 2.8 + time * .04) * .22;
  float field = dist + n;

  float th = progress * 1.28;
  float d = field - th;
  float w = .11;
  float flicker = .92 + .08 * noise(p * 36. + time * 4.);

  // Inside the wave — clear, next page already underneath.
  if (d < 0.) {
    gl_FragColor = vec4(0.);
    return;
  }

  vec3 page = texture2D(u_page, uv).rgb;
  page *= mix(.12, 1., smoothstep(0., w * 1.6, d));

  vec3 fire = flame(d, w) * flicker;
  vec3 color = mix(fire, page, smoothstep(0., w * .95, d));

  float spark = step(.988, hash(floor(gl_FragCoord.xy / 2.) + floor(time * 16.)));
  color += vec3(1., .55, .18) * spark * (1. - smoothstep(0., w * .55, abs(d)));

  float alpha = 1.;
  if (d < w * .15) {
    alpha = smoothstep(0., w * .15, d);
    color *= alpha;
  }

  gl_FragColor = vec4(color, alpha);
}`;

let running = false;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function play(draw: (progress: number, time: number) => void, duration: number) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      draw(easeOutCubic(t), now / 1000);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

const nextFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Stamp live canvases (hero wave etc.) onto the DOM snapshot at viewport coords. */
function compositeCanvases(target: HTMLCanvasElement, root: HTMLElement) {
  const ctx = target.getContext("2d");
  if (!ctx) return;
  const scaleX = target.width / innerWidth;
  const scaleY = target.height / innerHeight;
  root.querySelectorAll("canvas").forEach((live) => {
    const rect = live.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) {
      return;
    }
    try {
      ctx.drawImage(
        live,
        rect.left * scaleX,
        rect.top * scaleY,
        rect.width * scaleX,
        rect.height * scaleY,
      );
    } catch {
      // WebGL read can fail — DOM chrome still burns correctly.
    }
  });
}

/** Snapshot the live viewport so the burn eats the real page, not a black sheet. */
async function captureViewport(): Promise<HTMLCanvasElement> {
  const node = document.getElementById("top");
  if (!node) throw new Error("missing #top");

  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  const pageCanvas = await toCanvas(node, {
    pixelRatio: ratio,
    width: innerWidth,
    height: innerHeight,
    canvasWidth: Math.round(innerWidth * ratio),
    canvasHeight: Math.round(innerHeight * ratio),
    backgroundColor: "#050505",
    style: {
      width: `${innerWidth}px`,
      height: `${innerHeight}px`,
      overflow: "hidden",
      transform: `translate(${-scrollX}px, ${-scrollY}px)`,
      background: "#050505",
    },
  });

  compositeCanvases(pageCanvas, node);
  return pageCanvas;
}

/** Freeze the current page, mount the next route under it, burn a wave from the click. */
export async function burnTo(hash: string, origin = { x: innerWidth / 2, y: innerHeight / 2 }) {
  if (running) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.hash = hash;
    return;
  }
  running = true;

  let pageCanvas: HTMLCanvasElement;
  try {
    pageCanvas = await captureViewport();
  } catch {
    running = false;
    window.location.hash = hash;
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.dataset.burnOverlay = "";
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "200",
    pointerEvents: "auto",
  });
  document.body.appendChild(canvas);
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);

  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true });
  const vertex = gl && compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl && vertex && fragment ? gl.createProgram() : null;
  if (!gl || !program || !vertex || !fragment) {
    canvas.remove();
    running = false;
    window.location.hash = hash;
    return;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
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
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pageCanvas);

  const loc = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1f(loc("aspect"), innerWidth / innerHeight);
  gl.uniform2f(loc("origin"), origin.x / innerWidth, 1 - origin.y / innerHeight);
  gl.uniform1i(loc("u_page"), 0);
  const progressLoc = loc("progress");
  const timeLoc = loc("time");

  const draw = (progress: number, time: number) => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(progressLoc, progress);
    gl.uniform1f(timeLoc, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  // Frozen current page on top → swap route under it → wave eats the freeze.
  draw(0, performance.now() / 1000);
  await nextFrames();
  window.location.hash = hash;
  await nextFrames();
  await play(draw, 2400);

  gl.deleteTexture(texture);
  gl.deleteBuffer(buffer);
  gl.deleteProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  canvas.remove();
  running = false;
}

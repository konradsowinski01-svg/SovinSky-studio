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
uniform float phase;
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
  float spread = length(p - o) / (aspect + 1.);
  float n = fbm(p * 3.2 + time * .05) * .55 + spread * .75;

  float th = progress * 1.6 - .12;
  float w = .09;
  float flicker = .9 + .1 * noise(p * 40. + time * 6.);

  vec3 color;
  float alpha;
  if (phase < .5) {
    // The page burns into ash, edge glowing orange.
    float d = th - n;
    if (d < -.05) {
      gl_FragColor = vec4(0.);
      return;
    }
    if (d < 0.) {
      float scorch = 1. - (-d / .05);
      gl_FragColor = vec4(vec3(.12, .04, .0) * scorch * .6, scorch * .6);
      return;
    }
    color = flame(d, w) * flicker;
    alpha = 1.;
  } else {
    // The ash burns away and reveals the new page.
    float d = n - th;
    if (d < 0.) {
      gl_FragColor = vec4(0.);
      return;
    }
    color = flame(d, w) * flicker;
    alpha = 1.;
  }
  float spark = step(.985, hash(floor(gl_FragCoord.xy / 2.) + floor(time * 20.)));
  color += vec3(1., .6, .2) * spark * (1. - smoothstep(0., w * .5, abs(th - n)));
  gl_FragColor = vec4(color * alpha, alpha);
}`;

let running = false;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function play(
  draw: (progress: number, phase: number, time: number) => void,
  phase: number,
  duration: number,
) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      draw(easeInOut(t), phase, now / 1000);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

const nextFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Burns the current page away, switches the hash, then burns the ash off the new page. */
export async function burnTo(hash: string, origin = { x: innerWidth / 2, y: innerHeight / 2 }) {
  if (running) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.hash = hash;
    return;
  }
  running = true;

  const canvas = document.createElement("canvas");
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

  const loc = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1f(loc("aspect"), innerWidth / innerHeight);
  gl.uniform2f(loc("origin"), origin.x / innerWidth, 1 - origin.y / innerHeight);
  const progressLoc = loc("progress");
  const phaseLoc = loc("phase");
  const timeLoc = loc("time");

  const draw = (progress: number, phase: number, time: number) => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(progressLoc, progress);
    gl.uniform1f(phaseLoc, phase);
    gl.uniform1f(timeLoc, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  await play(draw, 0, 1100);
  window.location.hash = hash;
  await nextFrames();
  await play(draw, 1, 1000);

  gl.deleteBuffer(buffer);
  gl.deleteProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  canvas.remove();
  running = false;
}

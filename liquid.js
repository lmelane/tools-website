(() => {
  // ============================================================
  // Patreon++ GPU Fluid (Webflow-safe, Desktop-only)
  // WebGL2 + ping-pong FBO:
  // - velocity advection + divergence + pressure (Jacobi)
  // - vorticity confinement
  // - dye advection dissipating toward base color
  // - mouse + scroll injection
  // - adaptive resolution + FPS cap
  // - does NOT touch body layout
  // ============================================================

  // ---------- Hard disable mobile ----------
  const isMobile =
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) return;

  // ---------- Canvas ----------
  const canvas = document.getElementById("liquid-canvas-global");
  if (!canvas) {
    console.warn("[liquid] Canvas #liquid-canvas-global not found");
    return;
  }

  console.log("[liquid] Canvas found");
  // show canvas (CSS may default display:none)
  canvas.style.display = "block";

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance"
  });

  if (!gl) {
    console.warn("[liquid] WebGL2 not available");
    return;
  }

  console.log("[liquid] WebGL2 context created");

  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("OES_texture_float_linear");

  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);

  // -------------------- Color helpers --------------------
  function parseColor(css) {
    css = (css || "").trim();
    if (!css) return null;

    if (css.startsWith("#")) {
      let hex = css.slice(1);
      if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
      const n = parseInt(hex, 16);
      return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
    }
    if (css.startsWith("rgb")) {
      const m = css.match(/rgba?\(([^)]+)\)/i);
      if (!m) return null;
      const p = m[1].split(",").map(s => parseFloat(s.trim()));
      return { r: (p[0] || 0) / 255, g: (p[1] || 0) / 255, b: (p[2] || 0) / 255 };
    }
    return null;
  }

  // Find a usable base color:
  // 1) <html data-liquid-color="#abb7f8">
  // 2) CSS var --liquid-color on :root
  // 3) body background
  // 4) fallback
  function getBaseColor() {
    const html = document.documentElement;
    const attr = html.getAttribute("data-liquid-color");
    if (attr) {
      const c = parseColor(attr);
      if (c) return c;
    }
    const cssVar = getComputedStyle(html).getPropertyValue("--liquid-color");
    if (cssVar) {
      const c = parseColor(cssVar);
      if (c) return c;
    }
    // body background
    const bg = getComputedStyle(document.body).backgroundColor;
    if (bg && bg !== "transparent" && !bg.endsWith(", 0)")) {
      const c = parseColor(bg);
      if (c) return c;
    }
    return { r: 0.67, g: 0.72, b: 0.97 };
  }

  function mix(a, b, t) { return a + (b - a) * t; }
  function tint(c, t) { return { r: mix(c.r, 1, t), g: mix(c.g, 1, t), b: mix(c.b, 1, t) }; }
  function shade(c, t) { return { r: mix(c.r, 0, t), g: mix(c.g, 0, t), b: mix(c.b, 0, t) }; }

  let BASE = getBaseColor();
  let PAL = {
    deep: shade(BASE, 0.35),
    mid: tint(BASE, 0.10),
    hi: tint(BASE, 0.28)
  };

  // -------------------- Performance knobs --------------------
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  // 0.45 low, 0.55 balanced, 0.70 high
  // If you want it heavier: set 0.65–0.75, but expect heat.
  let SIM_SCALE = 0.55;

  // Pressure iterations (more = smoother incompressibility, more cost)
  let PRESSURE_ITER = 16;

  const VELOCITY_DISS = 0.99;  // Less dissipation = smoother trails
  const DYE_DISS = 0.995; // Reduced from 0.998 for better fade

  const VORTICITY = 26.0;
  const FORCE = 700.0;
  const RADIUS = 0.06; // UV

  const FPS_CAP = 55;

  // Bloom settings
  const BLOOM_THRESHOLD = 0.25; // Lower = more bloom
  const BLOOM_INTENSITY = 0.5; // Stronger glow
  const BLOOM_ITERATIONS = 3; // More blur = softer

  // Pause when not visible
  let isVisible = true;
  document.addEventListener("visibilitychange", () => {
    isVisible = !document.hidden;
  });

  // -------------------- GL utils --------------------
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      console.log(src);
      throw new Error("Shader compile failed");
    }
    return s;
  }

  function program(vsSrc, fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      throw new Error("Program link failed");
    }
    return p;
  }

  function tex(w, h, internalFormat, format, type, filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return t;
  }

  function fbo(t) {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f;
  }

  function doubleFBO(w, h, internalFormat, format, type, filter) {
    const t0 = tex(w, h, internalFormat, format, type, filter);
    const t1 = tex(w, h, internalFormat, format, type, filter);
    const f0 = fbo(t0);
    const f1 = fbo(t1);
    return {
      read: { tex: t0, fbo: f0 },
      write: { tex: t1, fbo: f1 },
      swap() { const tmp = this.read; this.read = this.write; this.write = tmp; }
    };
  }

  // -------------------- Fullscreen quad --------------------
  const VAO = gl.createVertexArray();
  gl.bindVertexArray(VAO);

  const VBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1,  1,
    -1,  1,  1, -1,   1,  1
  ]), gl.STATIC_DRAW);

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // -------------------- Shaders --------------------
  const VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec2 aPos;
  out vec2 vUv;
  void main(){
    vUv = aPos*0.5 + 0.5;
    gl_Position = vec4(aPos,0.0,1.0);
  }`;

  const COMMON = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform vec2 uTexel;`;

  // Advect (velocity or dye). For dye we "return to base" to avoid black buildup.
  const FS_ADVECT = COMMON + `
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform float uDt;
  uniform float uDissipation;
  uniform vec3  uBase;
  uniform float uToBase;

  void main(){
    vec2 v = texture(uVelocity, vUv).xy;
    vec2 coord = vUv - uDt * v * uTexel;
    vec4 src = texture(uSource, coord);

    if (uToBase > 0.5) {
      vec3 rgb = mix(uBase, src.rgb, uDissipation);
      float a = src.a * uDissipation;
      outColor = vec4(rgb, a);
    } else {
      outColor = src * uDissipation;
    }
  }`;

  // Divergence
  const FS_DIVERGENCE = COMMON + `
  uniform sampler2D uVelocity;
  void main(){
    float L = texture(uVelocity, vUv - vec2(uTexel.x,0)).x;
    float R = texture(uVelocity, vUv + vec2(uTexel.x,0)).x;
    float B = texture(uVelocity, vUv - vec2(0,uTexel.y)).y;
    float T = texture(uVelocity, vUv + vec2(0,uTexel.y)).y;
    float div = 0.5*(R - L + T - B);
    outColor = vec4(div,0,0,1);
  }`;

  // Pressure Jacobi
  const FS_PRESSURE = COMMON + `
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main(){
    float L = texture(uPressure, vUv - vec2(uTexel.x,0)).x;
    float R = texture(uPressure, vUv + vec2(uTexel.x,0)).x;
    float B = texture(uPressure, vUv - vec2(0,uTexel.y)).x;
    float T = texture(uPressure, vUv + vec2(0,uTexel.y)).x;
    float div = texture(uDivergence, vUv).x;
    float p = (L + R + B + T - div) * 0.25;
    outColor = vec4(p,0,0,1);
  }`;

  // Subtract pressure gradient
  const FS_GRADIENT = COMMON + `
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main(){
    float L = texture(uPressure, vUv - vec2(uTexel.x,0)).x;
    float R = texture(uPressure, vUv + vec2(uTexel.x,0)).x;
    float B = texture(uPressure, vUv - vec2(0,uTexel.y)).x;
    float T = texture(uPressure, vUv + vec2(0,uTexel.y)).x;
    vec2 v = texture(uVelocity, vUv).xy;
    v -= vec2(R - L, T - B) * 0.5;
    outColor = vec4(v,0,1);
  }`;

  // Curl computation (scalar)
  const FS_CURL = COMMON + `
  uniform sampler2D uVelocity;
  void main(){
    float L = texture(uVelocity, vUv - vec2(uTexel.x,0)).y;
    float R = texture(uVelocity, vUv + vec2(uTexel.x,0)).y;
    float B = texture(uVelocity, vUv - vec2(0,uTexel.y)).x;
    float T = texture(uVelocity, vUv + vec2(0,uTexel.y)).x;
    float curl = 0.5*(R - L - (T - B));
    outColor = vec4(curl,0,0,1);
  }`;

  // Vorticity confinement force
  const FS_VORTICITY = COMMON + `
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float uVorticity;
  uniform float uDt;

  void main(){
    float L = abs(texture(uCurl, vUv - vec2(uTexel.x,0)).x);
    float R = abs(texture(uCurl, vUv + vec2(uTexel.x,0)).x);
    float B = abs(texture(uCurl, vUv - vec2(0,uTexel.y)).x);
    float T = abs(texture(uCurl, vUv + vec2(0,uTexel.y)).x);

    float C = texture(uCurl, vUv).x;

    vec2 grad = vec2(R - L, T - B);
    float lenG = max(length(grad), 1e-6);
    vec2 N = grad / lenG;

    vec2 force = vec2(N.y, -N.x) * C * uVorticity;

    vec2 v = texture(uVelocity, vUv).xy;
    v += force * uDt;

    outColor = vec4(v,0,1);
  }`;

  // Splat for dye/velocity
  const FS_SPLAT = COMMON + `
  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform vec3 uColor;
  uniform vec2 uForce;
  uniform float uMode; // 0 dye, 1 velocity

  void main(){
    vec4 cur = texture(uTarget, vUv);

    vec2 p = vUv - uPoint;
    // aspect fix
    p.x *= uTexel.y / uTexel.x;
    float d = dot(p,p);

    float influence = exp(-d / max(1e-6, uRadius*uRadius));

    if (uMode > 0.5) {
      vec2 v = cur.xy + uForce * influence;
      outColor = vec4(v,0,1);
    } else {
      vec3 rgb = cur.rgb + uColor * influence;
      float a = clamp(cur.a + influence * 3.0, 0.0, 1.0);
      outColor = vec4(rgb, a);
    }
  }`;

  // Bloom threshold (extract bright areas)
  const FS_BLOOM_THRESHOLD = COMMON + `
  uniform sampler2D uSource;
  uniform float uThreshold;
  void main(){
    vec4 c = texture(uSource, vUv);
    float brightness = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    float soft = smoothstep(uThreshold - 0.1, uThreshold + 0.1, brightness);
    outColor = vec4(c.rgb * soft, c.a);
  }`;

  // Gaussian blur (separable)
  const FS_BLUR = COMMON + `
  uniform sampler2D uSource;
  uniform vec2 uDirection; // (1,0) horizontal, (0,1) vertical
  void main(){
    vec4 sum = texture(uSource, vUv) * 0.227027;
    vec2 off1 = uDirection * uTexel * 1.3846153846;
    vec2 off2 = uDirection * uTexel * 3.2307692308;
    sum += texture(uSource, vUv + off1) * 0.3162162162;
    sum += texture(uSource, vUv - off1) * 0.3162162162;
    sum += texture(uSource, vUv + off2) * 0.0702702703;
    sum += texture(uSource, vUv - off2) * 0.0702702703;
    outColor = sum;
  }`;

  // Display dye + bloom
  const FS_DISPLAY = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform sampler2D uDye;
  uniform sampler2D uBloom;
  uniform float uOpacity;
  uniform float uBloomIntensity;
  void main(){
    vec4 c = texture(uDye, vUv);
    vec4 bloom = texture(uBloom, vUv);
    
    // Combine dye + bloom in RGB
    vec3 final = c.rgb + bloom.rgb * uBloomIntensity;
    
    // FORCE constant alpha for visibility
    float brightness = dot(final, vec3(0.299, 0.587, 0.114));
    float alpha = smoothstep(0.0001, 0.05, brightness) * 0.85;
    
    outColor = vec4(final, alpha);
  }`;

  const pAdvect = program(VS, FS_ADVECT);
  const pDiv = program(VS, FS_DIVERGENCE);
  const pPressure = program(VS, FS_PRESSURE);
  const pGrad = program(VS, FS_GRADIENT);
  const pCurl = program(VS, FS_CURL);
  const pVort = program(VS, FS_VORTICITY);
  const pSplat = program(VS, FS_SPLAT);
  const pBloomThreshold = program(VS, FS_BLOOM_THRESHOLD);
  const pBlur = program(VS, FS_BLUR);
  const pDisplay = program(VS, FS_DISPLAY);

  // -------------------- Buffers --------------------
  let simW = 2, simH = 2;
  let simTexel = [1, 1];

  const INTERNAL = gl.RGBA16F;
  const FORMAT = gl.RGBA;
  const TYPE = gl.HALF_FLOAT;
  const LINEAR = gl.LINEAR;
  const NEAREST = gl.NEAREST;

  let velocity, dye, pressure, divergence, curlTex, bloomFBO, bloomTemp;
  let bloomW, bloomH, bloomTexel;

  function alloc() {
    simW = Math.max(2, Math.floor(innerWidth * DPR * SIM_SCALE));
    simH = Math.max(2, Math.floor(innerHeight * DPR * SIM_SCALE));
    simTexel = [1 / simW, 1 / simH];

    canvas.width = Math.floor(innerWidth * DPR);
    canvas.height = Math.floor(innerHeight * DPR);

    velocity = doubleFBO(simW, simH, INTERNAL, FORMAT, TYPE, LINEAR);
    dye = doubleFBO(simW, simH, INTERNAL, FORMAT, TYPE, LINEAR);
    pressure = doubleFBO(simW, simH, INTERNAL, FORMAT, TYPE, NEAREST);

    divergence = { tex: tex(simW, simH, INTERNAL, FORMAT, TYPE, NEAREST), fbo: null };
    divergence.fbo = fbo(divergence.tex);

    curlTex = { tex: tex(simW, simH, INTERNAL, FORMAT, TYPE, NEAREST), fbo: null };
    curlTex.fbo = fbo(curlTex.tex);

    // Bloom buffers (downscaled from sim resolution, NOT canvas)
    bloomW = Math.max(2, Math.floor(simW / 2));
    bloomH = Math.max(2, Math.floor(simH / 2));
    bloomTexel = [1 / bloomW, 1 / bloomH];
    bloomFBO = doubleFBO(bloomW, bloomH, INTERNAL, FORMAT, TYPE, LINEAR);
    bloomTemp = { tex: tex(bloomW, bloomH, INTERNAL, FORMAT, TYPE, LINEAR), fbo: null };
    bloomTemp.fbo = fbo(bloomTemp.tex);

    clearAll();
  }

  function clearAll() {
    // Dye to base (not black)
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.read.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.clearColor(BASE.r, BASE.g, BASE.b, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.clearColor(BASE.r, BASE.g, BASE.b, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Velocity/Pressure
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.read.fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // realloc on resize (debounced)
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      BASE = getBaseColor();
      PAL = { deep: shade(BASE, 0.35), mid: tint(BASE, 0.10), hi: tint(BASE, 0.28) };
      alloc();
    }, 120);
  });

  alloc();

  console.log("[liquid] Initialized - Canvas:", canvas.width, "x", canvas.height, "Sim:", simW, "x", simH);

  // -------------------- Inputs (mouse + scroll) --------------------
  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, down: false };

  window.addEventListener("mousemove", (e) => {
    pointer.px = pointer.x; pointer.py = pointer.y;
    pointer.x = e.clientX / Math.max(1, innerWidth);
    pointer.y = 1 - (e.clientY / Math.max(1, innerHeight));
  }, { passive: true });

  window.addEventListener("mousedown", () => pointer.down = true);
  window.addEventListener("mouseup", () => pointer.down = false);

  // Scroll injection
  let scrollPrev = window.scrollY;
  let scrollVel = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    scrollVel = (y - scrollPrev);
    scrollPrev = y;
  }, { passive: true });

  // -------------------- Draw helpers --------------------
  function bindTex(p, name, t, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1i(gl.getUniformLocation(p, name), unit);
  }

  function drawTo(targetFBO, p, setUniforms) {
    gl.useProgram(p);
    gl.bindVertexArray(VAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.viewport(0, 0, simW, simH);

    const uTexel = gl.getUniformLocation(p, "uTexel");
    if (uTexel) gl.uniform2f(uTexel, simTexel[0], simTexel[1]);

    if (setUniforms) setUniforms(p);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  function splatVelocity(fx, fy) {
    drawTo(velocity.write.fbo, pSplat, (p) => {
      bindTex(p, "uTarget", velocity.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(p, "uPoint"), pointer.x, pointer.y);
      gl.uniform1f(gl.getUniformLocation(p, "uRadius"), RADIUS);
      gl.uniform3f(gl.getUniformLocation(p, "uColor"), 0, 0, 0);
      gl.uniform2f(gl.getUniformLocation(p, "uForce"), fx, fy);
      gl.uniform1f(gl.getUniformLocation(p, "uMode"), 1.0);
    });
    velocity.swap();
  }

  function splatDye(rgb) {
    drawTo(dye.write.fbo, pSplat, (p) => {
      bindTex(p, "uTarget", dye.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(p, "uPoint"), pointer.x, pointer.y);
      gl.uniform1f(gl.getUniformLocation(p, "uRadius"), RADIUS);
      gl.uniform3f(gl.getUniformLocation(p, "uColor"), rgb[0], rgb[1], rgb[2]);
      gl.uniform2f(gl.getUniformLocation(p, "uForce"), 0, 0);
      gl.uniform1f(gl.getUniformLocation(p, "uMode"), 0.0);
    });
    dye.swap();
  }

  // -------------------- Main loop --------------------
  let lastFrame = 0;
  let lastTime = performance.now();

  function frame(now) {
    if (!isVisible) { requestAnimationFrame(frame); return; }

    if (now - lastFrame < 1000 / FPS_CAP) {
      requestAnimationFrame(frame);
      return;
    }
    lastFrame = now;

    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    // update base color periodically (~1s)
    if ((now | 0) % 1000 < 18) {
      BASE = getBaseColor();
      PAL = { deep: shade(BASE, 0.35), mid: tint(BASE, 0.10), hi: tint(BASE, 0.28) };
    }

    // Scroll influence
    const sv = scrollVel * 0.002;
    scrollVel *= 0.86;

    // Pointer velocity
    const vx = (pointer.x - pointer.px) * FORCE;
    const vy = (pointer.y - pointer.py) * FORCE;

    // Inject on mouse movement (velocity threshold) OR mousedown OR scroll
    const pointerVelocity = Math.sqrt(vx * vx + vy * vy);
    const injecting = pointerVelocity > 2.0 || pointer.down || Math.abs(sv) > 0.0004;

    if (injecting) {
      if (Math.random() < 0.01) { // Log 1% of injections to avoid spam
        console.log("[liquid] Injecting at", pointer.x.toFixed(2), pointer.y.toFixed(2), "velocity:", pointerVelocity.toFixed(2));
      }
      splatVelocity(vx, vy - sv);

      // Rich color cycling (deep/mid/hi mix) without drifting to black
      const t = now * 0.001;
      const a = 0.5 + 0.5 * Math.sin(t * 1.2);
      const b = 0.5 + 0.5 * Math.sin(t * 0.9 + 2.0);
      const c = 0.5 + 0.5 * Math.sin(t * 0.7 + 4.0);

      const col = [
        clamp(PAL.deep.r * (0.55 + 0.45 * a) + PAL.hi.r * (0.10 * b) + PAL.mid.r * (0.08 * c)),
        clamp(PAL.mid.g  * (0.55 + 0.45 * b) + PAL.hi.g * (0.10 * c) + PAL.deep.g * (0.06 * a)),
        clamp(PAL.mid.b  * (0.55 + 0.45 * c) + PAL.hi.b * (0.10 * a) + PAL.deep.b * (0.06 * b))
      ];
      splatDye(col);
    }

    // 1) Advect velocity
    drawTo(velocity.write.fbo, pAdvect, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
      bindTex(p, "uSource", velocity.read.tex, 1);
      gl.uniform1f(gl.getUniformLocation(p, "uDt"), dt * 60.0);
      gl.uniform1f(gl.getUniformLocation(p, "uDissipation"), VELOCITY_DISS);
      gl.uniform3f(gl.getUniformLocation(p, "uBase"), 0, 0, 0);
      gl.uniform1f(gl.getUniformLocation(p, "uToBase"), 0.0);
    });
    velocity.swap();

    // 2) Curl
    drawTo(curlTex.fbo, pCurl, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
    });

    // 3) Vorticity confinement
    drawTo(velocity.write.fbo, pVort, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
      bindTex(p, "uCurl", curlTex.tex, 1);
      gl.uniform1f(gl.getUniformLocation(p, "uVorticity"), VORTICITY);
      gl.uniform1f(gl.getUniformLocation(p, "uDt"), dt * 60.0);
    });
    velocity.swap();

    // 4) Divergence
    drawTo(divergence.fbo, pDiv, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
    });

    // 5) Pressure solve
    for (let i = 0; i < PRESSURE_ITER; i++) {
      drawTo(pressure.write.fbo, pPressure, (p) => {
        bindTex(p, "uPressure", pressure.read.tex, 0);
        bindTex(p, "uDivergence", divergence.tex, 1);
      });
      pressure.swap();
    }

    // 6) Gradient subtract
    drawTo(velocity.write.fbo, pGrad, (p) => {
      bindTex(p, "uPressure", pressure.read.tex, 0);
      bindTex(p, "uVelocity", velocity.read.tex, 1);
    });
    velocity.swap();

    // 7) Advect dye (smooth fade)
    drawTo(dye.write.fbo, pAdvect, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
      bindTex(p, "uSource", dye.read.tex, 1);
      gl.uniform1f(gl.getUniformLocation(p, "uDt"), dt * 60.0);
      gl.uniform1f(gl.getUniformLocation(p, "uDissipation"), DYE_DISS);
      gl.uniform3f(gl.getUniformLocation(p, "uBase"), BASE.r, BASE.g, BASE.b);
      gl.uniform1f(gl.getUniformLocation(p, "uToBase"), 0.15); // Minimal return to base for smooth trails
    });
    dye.swap();

    // 8) Bloom pass
    // 8a) Extract bright areas (threshold)
    gl.useProgram(pBloomThreshold);
    gl.bindVertexArray(VAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFBO.write.fbo);
    gl.viewport(0, 0, bloomW, bloomH);
    bindTex(pBloomThreshold, "uSource", dye.read.tex, 0);
    gl.uniform2f(gl.getUniformLocation(pBloomThreshold, "uTexel"), bloomTexel[0], bloomTexel[1]);
    gl.uniform1f(gl.getUniformLocation(pBloomThreshold, "uThreshold"), BLOOM_THRESHOLD);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    bloomFBO.swap();

    // 8b) Blur passes (ping-pong horizontal/vertical)
    for (let i = 0; i < BLOOM_ITERATIONS; i++) {
      // Horizontal blur
      gl.useProgram(pBlur);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomTemp.fbo);
      gl.viewport(0, 0, bloomW, bloomH);
      bindTex(pBlur, "uSource", bloomFBO.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(pBlur, "uTexel"), bloomTexel[0], bloomTexel[1]);
      gl.uniform2f(gl.getUniformLocation(pBlur, "uDirection"), 1.0, 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Vertical blur
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFBO.write.fbo);
      bindTex(pBlur, "uSource", bloomTemp.tex, 0);
      gl.uniform2f(gl.getUniformLocation(pBlur, "uDirection"), 0.0, 1.0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      bloomFBO.swap();
    }

    // 9) Display (dye + bloom)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(pDisplay);
    gl.bindVertexArray(VAO);
    bindTex(pDisplay, "uDye", dye.read.tex, 0);
    bindTex(pDisplay, "uBloom", bloomFBO.read.tex, 1);
    gl.uniform1f(gl.getUniformLocation(pDisplay, "uOpacity"), 1.0);
    gl.uniform1f(gl.getUniformLocation(pDisplay, "uBloomIntensity"), BLOOM_INTENSITY);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    // update prev pointer
    pointer.px = pointer.x;
    pointer.py = pointer.y;

    requestAnimationFrame(frame);
  }

  console.log("[liquid] Starting render loop");
  requestAnimationFrame(frame);
})();
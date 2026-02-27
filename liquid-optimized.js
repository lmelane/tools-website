(() => {
  // ============================================================
  // OPTIMIZED GPU Fluid V2 - Adaptive Performance + Lazy Load
  // Auto-detects device capability and adjusts quality
  // Lazy loads only when visible (Intersection Observer)
  // ============================================================

  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    console.log('[liquid-optimized] Disabled on mobile for performance');
    return;
  }

  const canvas = document.getElementById("liquid-canvas-global");
  if (!canvas) return;

  // Lazy init with Intersection Observer
  let isInitialized = false;

  function initLiquid() {
    if (isInitialized) return;
    isInitialized = true;

    canvas.style.display = "block";

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
    desynchronized: true // Better performance
  });

  if (!gl) return;

  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("OES_texture_float_linear");

  // ============================================================
  // PERFORMANCE DETECTION
  // ============================================================
  
  function detectPerformanceTier() {
    // Check GPU info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let gpuTier = 'medium';
    
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
      
      // High-end GPUs
      if (renderer.includes('nvidia') && (renderer.includes('rtx') || renderer.includes('gtx 1'))) {
        gpuTier = 'high';
      } else if (renderer.includes('amd') && renderer.includes('rx')) {
        gpuTier = 'high';
      } else if (renderer.includes('apple') && (renderer.includes('m1') || renderer.includes('m2') || renderer.includes('m3'))) {
        gpuTier = 'high';
      }
      // Low-end GPUs
      else if (renderer.includes('intel') && !renderer.includes('iris')) {
        gpuTier = 'low';
      } else if (renderer.includes('integrated')) {
        gpuTier = 'low';
      }
    }
    
    // Check memory (if available)
    const memory = navigator.deviceMemory;
    if (memory && memory < 4) {
      gpuTier = 'low';
    } else if (memory && memory >= 8) {
      if (gpuTier === 'medium') gpuTier = 'high';
    }
    
    // Check hardware concurrency
    const cores = navigator.hardwareConcurrency;
    if (cores && cores < 4) {
      gpuTier = 'low';
    }
    
    console.log('[liquid] Performance tier:', gpuTier);
    return gpuTier;
  }

  const performanceTier = detectPerformanceTier();

  // ============================================================
  // ADAPTIVE SETTINGS
  // ============================================================
  
  const settings = {
    low: {
      SIM_SCALE: 0.35,
      PRESSURE_ITER: 8,
      DPR: 1.0,
      VORTICITY: 15.0,
      FPS_CAP: 30,
      ENABLE_GLOW: false
    },
    medium: {
      SIM_SCALE: 0.45,
      PRESSURE_ITER: 12,
      DPR: 1.2,
      VORTICITY: 20.0,
      FPS_CAP: 45,
      ENABLE_GLOW: false
    },
    high: {
      SIM_SCALE: 0.65,
      PRESSURE_ITER: 20,
      DPR: 1.5,
      VORTICITY: 30.0,
      FPS_CAP: 60,
      ENABLE_GLOW: true
    }
  };

  const config = settings[performanceTier];
  
  console.log('[liquid] Config:', config);

  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);

  // Color helpers (same as before)
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

  function getOpacity() {
    const html = document.documentElement;
    const attr = html.getAttribute("data-liquid-opacity");
    if (attr) {
      const val = parseFloat(attr);
      if (!isNaN(val)) return clamp(val, 0, 1);
    }
    const cssVar = getComputedStyle(html).getPropertyValue("--liquid-opacity");
    if (cssVar) {
      const val = parseFloat(cssVar.trim());
      if (!isNaN(val)) return clamp(val, 0, 1);
    }
    return 0.5;
  }

  let BASE = getBaseColor();
  let PAL = {
    deep: shade(BASE, 0.35),
    mid: tint(BASE, 0.10),
    hi: tint(BASE, 0.28)
  };

  const VELOCITY_DISS = 0.988;
  const DYE_DISS = 0.994;
  const FORCE = 500.0;
  const RADIUS = 0.018;
  let OPACITY = getOpacity();

  // Adaptive settings from config
  const DPR = Math.min(window.devicePixelRatio || 1, config.DPR);
  const SIM_SCALE = config.SIM_SCALE;
  const PRESSURE_ITER = config.PRESSURE_ITER;
  const VORTICITY = config.VORTICITY;
  const FPS_CAP = config.FPS_CAP;
  const ENABLE_GLOW = config.ENABLE_GLOW;

  // FPS throttling
  let lastFrameTime = 0;
  const frameInterval = 1000 / FPS_CAP;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
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

  const VAO = gl.createVertexArray();
  gl.bindVertexArray(VAO);
  const VBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

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

  const FS_ADVECT = COMMON + `
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform float uDt;
  uniform float uDissipation;
  uniform vec3 uBase;
  uniform float uToBase;
  void main(){
    vec2 v = texture(uVelocity, vUv).xy;
    vec2 coord = vUv - uDt * v * uTexel;
    vec4 src = texture(uSource, coord);
    if(uToBase > 0.5){
      vec3 rgb = mix(uBase, src.rgb, uDissipation);
      outColor = vec4(rgb, src.a * uDissipation);
    } else {
      outColor = src * uDissipation;
    }
  }`;

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

  const FS_CURL = COMMON + `
  uniform sampler2D uVelocity;
  void main(){
    float L = texture(uVelocity, vUv - vec2(uTexel.x,0)).y;
    float R = texture(uVelocity, vUv + vec2(uTexel.x,0)).y;
    float B = texture(uVelocity, vUv - vec2(0,uTexel.y)).x;
    float T = texture(uVelocity, vUv + vec2(0,uTexel.y)).x;
    float curl = (R - L - T + B) * 0.5;
    outColor = vec4(curl,0,0,1);
  }`;

  const FS_VORTICITY = COMMON + `
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float uVorticity;
  void main(){
    float L = texture(uCurl, vUv - vec2(uTexel.x,0)).x;
    float R = texture(uCurl, vUv + vec2(uTexel.x,0)).x;
    float B = texture(uCurl, vUv - vec2(0,uTexel.y)).x;
    float T = texture(uCurl, vUv + vec2(0,uTexel.y)).x;
    float C = texture(uCurl, vUv).x;
    vec2 force = vec2(abs(T) - abs(B), abs(L) - abs(R)) * 0.5;
    float len = length(force) + 1e-5;
    force = (force / len) * uVorticity * C * uTexel;
    vec2 v = texture(uVelocity, vUv).xy;
    outColor = vec4(v + force, 0, 1);
  }`;

  const FS_SPLAT = COMMON + `
  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main(){
    vec4 cur = texture(uTarget, vUv);
    vec2 p = vUv - uPoint;
    p.x *= uTexel.y / uTexel.x;
    float d = dot(p,p);
    float influence = exp(-d / max(1e-6, uRadius*uRadius)) * uIntensity;
    vec3 rgb = cur.rgb + uColor * influence;
    float a = clamp(cur.a + influence * 0.8, 0.0, 1.0);
    outColor = vec4(rgb, a);
  }`;

  // Display shader - conditional glow
  const FS_DISPLAY = ENABLE_GLOW ? `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform sampler2D uDye;
  uniform float uOpacity;
  uniform vec2 uTexel;
  
  vec4 sampleGlow(sampler2D tex, vec2 uv, float radius) {
    vec4 sum = vec4(0.0);
    float total = 0.0;
    for(float x = -1.0; x <= 1.0; x += 1.0) {
      for(float y = -1.0; y <= 1.0; y += 1.0) {
        vec2 offset = vec2(x, y) * uTexel * radius;
        float weight = 1.0 - length(vec2(x, y)) * 0.3;
        sum += texture(tex, uv + offset) * weight;
        total += weight;
      }
    }
    return sum / total;
  }
  
  void main(){
    vec4 c = texture(uDye, vUv);
    vec4 glow = sampleGlow(uDye, vUv, 2.5);
    float brightness = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec2 edgeDist = min(vUv, 1.0 - vUv);
    float edgeFade = smoothstep(0.0, 0.15, min(edgeDist.x, edgeDist.y));
    float baseAlpha = smoothstep(0.01, 0.85, c.a);
    float glowAlpha = smoothstep(0.05, 0.4, glow.a) * 0.4;
    float brightnessBoost = smoothstep(0.1, 0.6, brightness) * 0.25;
    vec3 finalColor = mix(glow.rgb * 1.2, c.rgb, 0.7);
    float depthFactor = 1.0 - brightness * 0.15;
    finalColor *= depthFactor;
    float finalAlpha = (baseAlpha + glowAlpha + brightnessBoost) * uOpacity * edgeFade;
    outColor = vec4(finalColor, clamp(finalAlpha, 0.0, 1.0));
  }` : `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform sampler2D uDye;
  uniform float uOpacity;
  void main(){
    vec4 c = texture(uDye, vUv);
    float brightness = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec2 edgeDist = min(vUv, 1.0 - vUv);
    float edgeFade = smoothstep(0.0, 0.15, min(edgeDist.x, edgeDist.y));
    float baseAlpha = smoothstep(0.01, 0.85, c.a);
    float brightnessBoost = smoothstep(0.1, 0.6, brightness) * 0.25;
    float finalAlpha = (baseAlpha + brightnessBoost) * uOpacity * edgeFade;
    outColor = vec4(c.rgb, clamp(finalAlpha, 0.0, 1.0));
  }`;

  const pAdvect = program(VS, FS_ADVECT);
  const pDiv = program(VS, FS_DIVERGENCE);
  const pPressure = program(VS, FS_PRESSURE);
  const pGrad = program(VS, FS_GRADIENT);
  const pCurl = program(VS, FS_CURL);
  const pVort = program(VS, FS_VORTICITY);
  const pSplat = program(VS, FS_SPLAT);
  const pDisplay = program(VS, FS_DISPLAY);

  let simW, simH, simTexel;
  let velocity, dye, pressure, divergence, curlTex;

  function alloc() {
    simW = Math.max(2, Math.floor(innerWidth * DPR * SIM_SCALE));
    simH = Math.max(2, Math.floor(innerHeight * DPR * SIM_SCALE));
    simTexel = [1 / simW, 1 / simH];

    canvas.width = Math.floor(innerWidth * DPR);
    canvas.height = Math.floor(innerHeight * DPR);

    const INTERNAL = gl.RGBA16F;
    const FORMAT = gl.RGBA;
    const TYPE = gl.HALF_FLOAT;
    const LINEAR = gl.LINEAR;

    velocity = doubleFBO(simW, simH, INTERNAL, FORMAT, TYPE, LINEAR);
    dye = doubleFBO(simW, simH, INTERNAL, FORMAT, TYPE, LINEAR);
    pressure = doubleFBO(simW, simH, INTERNAL, FORMAT, TYPE, LINEAR);
    curlTex = { tex: tex(simW, simH, INTERNAL, FORMAT, TYPE, gl.NEAREST), fbo: null };
    curlTex.fbo = fbo(curlTex.tex);
    divergence = { tex: tex(simW, simH, INTERNAL, FORMAT, TYPE, gl.NEAREST), fbo: null };
    divergence.fbo = fbo(divergence.tex);

    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.read.fbo);
    gl.clearColor(BASE.r, BASE.g, BASE.b, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.clearColor(BASE.r, BASE.g, BASE.b, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function drawTo(targetFBO, prog, fn) {
    gl.useProgram(prog);
    gl.bindVertexArray(VAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.viewport(0, 0, simW, simH);
    gl.uniform2f(gl.getUniformLocation(prog, "uTexel"), simTexel[0], simTexel[1]);
    if (fn) fn(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  function bindTex(prog, name, texture, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(prog, name), unit);
  }

  function splatVelocity(fx, fy, intensity = 1.0) {
    drawTo(velocity.write.fbo, pSplat, (p) => {
      bindTex(p, "uTarget", velocity.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(p, "uPoint"), pointer.x, pointer.y);
      gl.uniform1f(gl.getUniformLocation(p, "uRadius"), RADIUS);
      gl.uniform3f(gl.getUniformLocation(p, "uColor"), fx, fy, 0);
      gl.uniform1f(gl.getUniformLocation(p, "uIntensity"), intensity);
    });
    velocity.swap();
  }

  function splatDye(col, intensity = 1.0, radiusMultiplier = 1.0) {
    drawTo(dye.write.fbo, pSplat, (p) => {
      bindTex(p, "uTarget", dye.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(p, "uPoint"), pointer.x, pointer.y);
      gl.uniform1f(gl.getUniformLocation(p, "uRadius"), RADIUS * radiusMultiplier);
      gl.uniform3f(gl.getUniformLocation(p, "uColor"), col[0], col[1], col[2]);
      gl.uniform1f(gl.getUniformLocation(p, "uIntensity"), intensity);
    });
    dye.swap();
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      BASE = getBaseColor();
      PAL = { deep: shade(BASE, 0.35), mid: tint(BASE, 0.10), hi: tint(BASE, 0.28) };
      alloc();
    }, 120);
  });

  alloc();

  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, down: false };

  window.addEventListener("mousemove", (e) => {
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.x = e.clientX / Math.max(1, innerWidth);
    pointer.y = 1 - (e.clientY / Math.max(1, innerHeight));
    pointer.down = true;
  }, { passive: true });

  window.addEventListener("mouseleave", () => {
    pointer.down = false;
  });

  let scrollPrev = window.scrollY;
  let scrollVel = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    scrollVel = (y - scrollPrev);
    scrollPrev = y;
  }, { passive: true });

  function frame(now) {
    // FPS throttling
    if (now - lastFrameTime < frameInterval) {
      requestAnimationFrame(frame);
      return;
    }
    lastFrameTime = now;

    const dt = Math.min(0.033, frameInterval / 1000);

    const sv = scrollVel * 0.002;
    scrollVel *= 0.86;

    const vx = (pointer.x - pointer.px) * FORCE;
    const vy = (pointer.y - pointer.py) * FORCE;

    const injecting = pointer.down || Math.abs(sv) > 0.0005;

    if (injecting) {
      const velocityMag = Math.sqrt(vx * vx + vy * vy);
      const velocityIntensity = clamp(velocityMag / 50.0, 0.3, 1.0);
      
      splatVelocity(vx, vy - sv, velocityIntensity);

      const t = now * 0.001;
      const a = 0.5 + 0.5 * Math.sin(t * 1.2);
      const b = 0.5 + 0.5 * Math.sin(t * 0.9 + 2.0);
      const c = 0.5 + 0.5 * Math.sin(t * 0.7 + 4.0);

      const col = [
        clamp(PAL.deep.r * (0.55 + 0.45 * a) + PAL.hi.r * (0.10 * b) + PAL.mid.r * (0.08 * c)),
        clamp(PAL.mid.g * (0.55 + 0.45 * b) + PAL.hi.g * (0.10 * c) + PAL.deep.g * (0.06 * a)),
        clamp(PAL.mid.b * (0.55 + 0.45 * c) + PAL.hi.b * (0.10 * a) + PAL.deep.b * (0.06 * b))
      ];
      
      const radiusVar = 0.8 + 0.4 * Math.sin(t * 2.3);
      const intensityVar = 0.7 + 0.3 * velocityIntensity;
      
      splatDye(col, intensityVar, radiusVar);
    }

    drawTo(velocity.write.fbo, pAdvect, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
      bindTex(p, "uSource", velocity.read.tex, 1);
      gl.uniform1f(gl.getUniformLocation(p, "uDt"), dt * 60.0);
      gl.uniform1f(gl.getUniformLocation(p, "uDissipation"), VELOCITY_DISS);
      gl.uniform3f(gl.getUniformLocation(p, "uBase"), 0, 0, 0);
      gl.uniform1f(gl.getUniformLocation(p, "uToBase"), 0.0);
    });
    velocity.swap();

    drawTo(curlTex.fbo, pCurl, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
    });

    drawTo(velocity.write.fbo, pVort, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
      bindTex(p, "uCurl", curlTex.tex, 1);
      gl.uniform1f(gl.getUniformLocation(p, "uVorticity"), VORTICITY);
    });
    velocity.swap();

    drawTo(divergence.fbo, pDiv, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
    });

    for (let i = 0; i < PRESSURE_ITER; i++) {
      drawTo(pressure.write.fbo, pPressure, (p) => {
        bindTex(p, "uPressure", pressure.read.tex, 0);
        bindTex(p, "uDivergence", divergence.tex, 1);
      });
      pressure.swap();
    }

    drawTo(velocity.write.fbo, pGrad, (p) => {
      bindTex(p, "uPressure", pressure.read.tex, 0);
      bindTex(p, "uVelocity", velocity.read.tex, 1);
    });
    velocity.swap();

    drawTo(dye.write.fbo, pAdvect, (p) => {
      bindTex(p, "uVelocity", velocity.read.tex, 0);
      bindTex(p, "uSource", dye.read.tex, 1);
      gl.uniform1f(gl.getUniformLocation(p, "uDt"), dt * 60.0);
      gl.uniform1f(gl.getUniformLocation(p, "uDissipation"), DYE_DISS);
      gl.uniform3f(gl.getUniformLocation(p, "uBase"), BASE.r, BASE.g, BASE.b);
      gl.uniform1f(gl.getUniformLocation(p, "uToBase"), 1.0);
    });
    dye.swap();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(pDisplay);
    gl.bindVertexArray(VAO);
    bindTex(pDisplay, "uDye", dye.read.tex, 0);
    gl.uniform1f(gl.getUniformLocation(pDisplay, "uOpacity"), OPACITY);
    if (ENABLE_GLOW) {
      gl.uniform2f(gl.getUniformLocation(pDisplay, "uTexel"), 1.0 / canvas.width, 1.0 / canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    pointer.px = pointer.x;
    pointer.py = pointer.y;

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  }

  // Intersection Observer for lazy loading
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        initLiquid();
        observer.disconnect();
      }
    });
  }, { threshold: 0.1 });

  observer.observe(canvas);
})();

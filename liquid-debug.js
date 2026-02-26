(() => {
  // DEBUG VERSION - Shows exactly what's happening in the pipeline
  
  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) return;

  const canvas = document.getElementById("liquid-canvas-global");
  if (!canvas) {
    console.error("[DEBUG] Canvas #liquid-canvas-global NOT FOUND");
    return;
  }

  canvas.style.display = "block";
  console.log("[DEBUG] Canvas found and displayed");

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance"
  });

  if (!gl) {
    console.error("[DEBUG] WebGL2 not available");
    return;
  }

  console.log("[DEBUG] WebGL2 context created");

  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("OES_texture_float_linear");

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const SIM_SCALE = 0.55;

  let simW = Math.max(2, Math.floor(innerWidth * DPR * SIM_SCALE));
  let simH = Math.max(2, Math.floor(innerHeight * DPR * SIM_SCALE));
  let simTexel = [1 / simW, 1 / simH];

  canvas.width = Math.floor(innerWidth * DPR);
  canvas.height = Math.floor(innerHeight * DPR);

  console.log("[DEBUG] Canvas:", canvas.width, "x", canvas.height);
  console.log("[DEBUG] Sim:", simW, "x", simH);

  const INTERNAL = gl.RGBA16F;
  const FORMAT = gl.RGBA;
  const TYPE = gl.HALF_FLOAT;
  const LINEAR = gl.LINEAR;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("[DEBUG] Shader compile failed:", gl.getShaderInfoLog(s));
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
      console.error("[DEBUG] Program link failed:", gl.getProgramInfoLog(p));
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
    -1, -1,  1, -1,  -1,  1,
    -1,  1,  1, -1,   1,  1
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

  const FS_SPLAT = COMMON + `
  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform vec3 uColor;
  void main(){
    vec4 cur = texture(uTarget, vUv);
    vec2 p = vUv - uPoint;
    p.x *= uTexel.y / uTexel.x;
    float d = dot(p,p);
    float influence = exp(-d / max(1e-6, uRadius*uRadius));
    vec3 rgb = cur.rgb + uColor * influence;
    float a = clamp(cur.a + influence * 5.0, 0.0, 1.0);
    outColor = vec4(rgb, a);
  }`;

  // SIMPLE display - NO dissipation, NO advection
  const FS_DISPLAY = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform sampler2D uDye;
  void main(){
    vec4 c = texture(uDye, vUv);
    float brightness = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    float alpha = smoothstep(0.0001, 0.05, brightness) * 0.9;
    outColor = vec4(c.rgb, alpha);
  }`;

  const pSplat = program(VS, FS_SPLAT);
  const pDisplay = program(VS, FS_DISPLAY);

  let dye = doubleFBO(simW, simH, INTERNAL, FORMAT, TYPE, LINEAR);

  gl.bindFramebuffer(gl.FRAMEBUFFER, dye.read.fbo);
  gl.viewport(0, 0, simW, simH);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, down: false };

  window.addEventListener("mousemove", (e) => {
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.x = e.clientX / Math.max(1, innerWidth);
    pointer.y = 1 - (e.clientY / Math.max(1, innerHeight));
  }, { passive: true });

  window.addEventListener("mousedown", () => {
    pointer.down = true;
    console.log("[DEBUG] Mouse DOWN at", pointer.x.toFixed(2), pointer.y.toFixed(2));
  });

  window.addEventListener("mouseup", () => {
    pointer.down = false;
    console.log("[DEBUG] Mouse UP");
  });

  let frameCount = 0;

  function frame() {
    frameCount++;

    // Inject on mousedown
    if (pointer.down) {
      const vx = (pointer.x - pointer.px);
      const vy = (pointer.y - pointer.py);
      
      if (frameCount % 30 === 0) {
        console.log("[DEBUG] Injecting dye at", pointer.x.toFixed(2), pointer.y.toFixed(2), "velocity:", vx.toFixed(3), vy.toFixed(3));
      }

      gl.useProgram(pSplat);
      gl.bindVertexArray(VAO);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
      gl.viewport(0, 0, simW, simH);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
      gl.uniform1i(gl.getUniformLocation(pSplat, "uTarget"), 0);

      gl.uniform2f(gl.getUniformLocation(pSplat, "uTexel"), simTexel[0], simTexel[1]);
      gl.uniform2f(gl.getUniformLocation(pSplat, "uPoint"), pointer.x, pointer.y);
      gl.uniform1f(gl.getUniformLocation(pSplat, "uRadius"), 0.08);
      gl.uniform3f(gl.getUniformLocation(pSplat, "uColor"), 1.0, 0.3, 0.5); // Pink

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      dye.swap();
    }

    // Display (NO advection, NO dissipation)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(pDisplay);
    gl.bindVertexArray(VAO);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
    gl.uniform1i(gl.getUniformLocation(pDisplay, "uDye"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    pointer.px = pointer.x;
    pointer.py = pointer.y;

    requestAnimationFrame(frame);
  }

  console.log("[DEBUG] Starting render loop - click and drag to inject dye");
  console.log("[DEBUG] If you see NOTHING when clicking, the problem is CSS/stacking");
  console.log("[DEBUG] If you see PINK trails, the problem is dissipation/advection in liquid.js");

  requestAnimationFrame(frame);
})();

(() => {
  // TEST VERSION - Force red screen to verify display shader works
  
  const isMobile =
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) return;

  const canvas = document.getElementById("liquid-canvas-global");
  if (!canvas) return;

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
    console.warn("[liquid-test] WebGL2 not available");
    return;
  }

  canvas.width = Math.floor(innerWidth * Math.min(window.devicePixelRatio || 1, 1.5));
  canvas.height = Math.floor(innerHeight * Math.min(window.devicePixelRatio || 1, 1.5));

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

  const FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  void main(){
    // FORCE RED SCREEN - if you don't see this, display shader doesn't work
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
  }`;

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

  const prog = program(VS, FS);

  function frame() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(prog);
    gl.bindVertexArray(VAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    requestAnimationFrame(frame);
  }

  console.log("[liquid-test] Canvas dimensions:", canvas.width, "x", canvas.height);
  console.log("[liquid-test] If you see RED screen, display shader works");
  console.log("[liquid-test] If you see NOTHING, there's a stacking/CSS issue");

  requestAnimationFrame(frame);
})();

(() => {

  /* ============================================================
     DESKTOP ONLY GUARD
  ============================================================ */

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

  if (!gl) return;

  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("OES_texture_float_linear");

  /* ============================================================
     PERFORMANCE CONFIG
  ============================================================ */

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const SIM_SCALE = 0.65;
  const PRESSURE_ITER = 18;
  const VELOCITY_DISS = 0.985;
  const DYE_DISS = 0.992;
  const VORTICITY = 28.0;
  const FORCE = 700.0;
  const RADIUS = 0.07;
  const FPS_CAP = 60;

  let w, h, texel;

  /* ============================================================
     RESIZE
  ============================================================ */

  function resize() {
    w = Math.floor(innerWidth * DPR * SIM_SCALE);
    h = Math.floor(innerHeight * DPR * SIM_SCALE);

    canvas.width = Math.floor(innerWidth * DPR);
    canvas.height = Math.floor(innerHeight * DPR);

    texel = [1 / w, 1 / h];
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener("resize", resize);

  /* ============================================================
     BASE COLOR
  ============================================================ */

  function parseColor(css) {
    if (!css) return { r: 0.67, g: 0.72, b: 0.97 };

    if (css.startsWith("#")) {
      let hex = css.slice(1);
      if (hex.length === 3)
        hex = hex.split("").map(c => c + c).join("");
      const n = parseInt(hex, 16);
      return {
        r: ((n >> 16) & 255) / 255,
        g: ((n >> 8) & 255) / 255,
        b: (n & 255) / 255
      };
    }

    return { r: 0.67, g: 0.72, b: 0.97 };
  }

  function getBaseColor() {
    const bg = getComputedStyle(document.body).backgroundColor;
    return parseColor(bg);
  }

  let BASE = getBaseColor();

  /* ============================================================
     POINTER
  ============================================================ */

  const pointer = {
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    down: false
  };

  window.addEventListener("mousemove", e => {
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.x = e.clientX / innerWidth;
    pointer.y = 1 - e.clientY / innerHeight;
  }, { passive: true });

  window.addEventListener("mousedown", () => pointer.down = true);
  window.addEventListener("mouseup", () => pointer.down = false);

  /* ============================================================
     SCROLL INJECTION
  ============================================================ */

  let scrollPrev = window.scrollY;
  let scrollVel = 0;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    scrollVel = y - scrollPrev;
    scrollPrev = y;
  }, { passive: true });

  /* ============================================================
     SIMPLE RENDER LOOP
     (Structure prête pour injecter ton solver complet)
  ============================================================ */

  let lastFrame = 0;

  function frame(now) {

    if (now - lastFrame < 1000 / FPS_CAP) {
      requestAnimationFrame(frame);
      return;
    }

    lastFrame = now;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    /* ============================================================
       PLACEHOLDER CORE SIMULATION
       Ici tu peux replacer ton pipeline complet :
       - advect velocity
       - curl
       - vorticity
       - divergence
       - pressure solve
       - gradient subtract
       - advect dye
       - display
    ============================================================ */

    const vx = (pointer.x - pointer.px) * FORCE;
    const vy = (pointer.y - pointer.py) * FORCE;

    if (pointer.down || Math.abs(scrollVel) > 0.5) {
      // injection placeholder
    }

    scrollVel *= 0.9;

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

})();
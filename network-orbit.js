(() => {
  // ============================================================
  // NETWORK ORBIT - Orbital Animation with Pulsing Lines
  // Webflow Compatible - Logos orbit around center with animated connections
  // Requires: GSAP (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[network-orbit] GSAP not loaded. Add GSAP CDN to Webflow.');
    return;
  }

  console.log('[network-orbit] Initializing...');

  function initNetworkOrbit() {
    const wrapper = document.querySelector(".network-wrapper");
    const centerEl = document.querySelector(".logo-center");
    const logos = document.querySelectorAll(".network-logo");
    const svg = document.querySelector(".lines-svg");

    if (!wrapper) {
      console.error('[network-orbit] .network-wrapper not found');
      return;
    }

    if (!centerEl) {
      console.error('[network-orbit] .logo-center not found');
      return;
    }

    if (logos.length === 0) {
      console.error('[network-orbit] No .network-logo elements found');
      return;
    }

    if (!svg) {
      console.error('[network-orbit] .lines-svg not found');
      return;
    }

    console.log(`[network-orbit] Found ${logos.length} logos`);

    const svgNS = "http://www.w3.org/2000/svg";

    const radius = 240; // stable distance
    const total = logos.length;
    const angleSpacing = (Math.PI * 2) / total;

    let angles = [];
    let speeds = [];
    let lines = [];

    // --- INITIALIZATION: ANGLES AND SPEEDS ---
    logos.forEach((logo, i) => {
      angles[i] = i * angleSpacing;
      speeds[i] = 0.0025 + (i * 0.0004); // slightly different speeds

      // Create lines
      const baseLine = document.createElementNS(svgNS, "line");
      const pulseLine = document.createElementNS(svgNS, "line");

      baseLine.setAttribute("stroke", "rgba(255,255,255,0.12)");
      baseLine.setAttribute("stroke-width", "1");

      pulseLine.setAttribute("stroke", "white");
      pulseLine.setAttribute("stroke-width", "1");
      pulseLine.setAttribute("stroke-linecap", "round");
      pulseLine.setAttribute("opacity", "0.9");

      svg.appendChild(baseLine);
      svg.appendChild(pulseLine);

      lines.push({ logo, baseLine, pulseLine });

      // Independent pulse animation
      gsap.to(pulseLine, {
        strokeDashoffset: 1000,
        duration: 0.8 + Math.random() * 0.6,
        repeat: -1,
        ease: "none",
        delay: Math.random() * 2
      });

      gsap.to(pulseLine, {
        opacity: 0,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 2
      });

      console.log(`[network-orbit] Logo ${i + 1}: angle=${angles[i].toFixed(2)}, speed=${speeds[i].toFixed(4)}`);
    });

    // --- REAL-TIME TICKER ---
    gsap.ticker.add(() => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const centerRect = centerEl.getBoundingClientRect();

      const centerX = centerRect.left - wrapperRect.left + centerRect.width / 2;
      const centerY = centerRect.top - wrapperRect.top + centerRect.height / 2;

      logos.forEach((logo, i) => {
        // independent angular evolution
        angles[i] += speeds[i];

        const x = centerX + radius * Math.cos(angles[i]);
        const y = centerY + radius * Math.sin(angles[i]);

        // positioning without internal rotation
        gsap.set(logo, {
          x: x - wrapper.offsetWidth / 2,
          y: y - wrapper.offsetHeight / 2
        });

        // lines
        const { baseLine, pulseLine } = lines[i];

        baseLine.setAttribute("x1", centerX);
        baseLine.setAttribute("y1", centerY);
        baseLine.setAttribute("x2", x);
        baseLine.setAttribute("y2", y);

        pulseLine.setAttribute("x1", centerX);
        pulseLine.setAttribute("y1", centerY);
        pulseLine.setAttribute("x2", x);
        pulseLine.setAttribute("y2", y);

        const length = Math.sqrt(
          Math.pow(x - centerX, 2) +
          Math.pow(y - centerY, 2)
        );

        pulseLine.setAttribute("stroke-dasharray", `10 ${length}`);
      });
    });

    console.log('[network-orbit] ✅ Animation started');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetworkOrbit);
  } else {
    initNetworkOrbit();
  }
})();

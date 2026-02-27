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
    let baseSpeeds = []; // vitesses de base
    let lines = [];
    let connectionLines = []; // lignes entre logos
    let scrollMultiplier = 1.0; // multiplicateur de vitesse selon scroll
    let hoveredIndex = -1; // index du logo survolé

    // --- INITIALIZATION: ANGLES AND SPEEDS ---
    logos.forEach((logo, i) => {
      angles[i] = i * angleSpacing;
      baseSpeeds[i] = 0.0025 + (i * 0.0004); // vitesses de base
      speeds[i] = baseSpeeds[i];

      // --- HOVER INTERACTIONS ---
      logo.addEventListener('mouseenter', () => {
        hoveredIndex = i;
        gsap.to(logo, {
          scale: 1.3,
          duration: 0.4,
          ease: 'back.out(2)'
        });
        console.log(`[network-orbit] Logo ${i + 1} hovered`);
      });

      logo.addEventListener('mouseleave', () => {
        hoveredIndex = -1;
        gsap.to(logo, {
          scale: 1,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

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

    // --- CONNEXIONS ENTRE LOGOS ---
    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const connectionLine = document.createElementNS(svgNS, "line");
        connectionLine.setAttribute("stroke", "rgba(255,255,255,0.05)");
        connectionLine.setAttribute("stroke-width", "1");
        connectionLine.setAttribute("opacity", "0");
        svg.appendChild(connectionLine);
        connectionLines.push({ from: i, to: j, line: connectionLine });
      }
    }

    console.log(`[network-orbit] Created ${connectionLines.length} connection lines`);

    // --- SCROLL REACTIVITY ---
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);
      
      // Augmenter la vitesse pendant le scroll
      scrollMultiplier = 1.0 + Math.min(scrollDelta * 0.01, 2.0);
      
      // Retour progressif à la vitesse normale
      gsap.to({ value: scrollMultiplier }, {
        value: 1.0,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: function() {
          scrollMultiplier = this.targets()[0].value;
        }
      });
      
      lastScrollY = currentScrollY;
    }, { passive: true });

    // --- REAL-TIME TICKER ---
    gsap.ticker.add(() => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const centerRect = centerEl.getBoundingClientRect();

      const centerX = centerRect.left - wrapperRect.left + centerRect.width / 2;
      const centerY = centerRect.top - wrapperRect.top + centerRect.height / 2;

      logos.forEach((logo, i) => {
        // --- VARIATIONS DE VITESSE INTELLIGENTES ---
        // Effet de gravité : plus lent en haut, plus rapide en bas
        const normalizedY = Math.sin(angles[i]); // -1 (haut) à 1 (bas)
        const gravityFactor = 1.0 + (normalizedY * 0.3); // 0.7 à 1.3
        
        // Ralentissement au hover
        const hoverFactor = (hoveredIndex === i) ? 0.3 : 1.0;
        
        // Vitesse finale combinée
        speeds[i] = baseSpeeds[i] * gravityFactor * hoverFactor * scrollMultiplier;
        
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

      // --- CONNEXIONS ENTRE LOGOS PROCHES ---
      connectionLines.forEach(({ from, to, line }) => {
        const fromLogo = logos[from];
        const toLogo = logos[to];
        
        const fromRect = fromLogo.getBoundingClientRect();
        const toRect = toLogo.getBoundingClientRect();
        
        const fromX = fromRect.left - wrapperRect.left + fromRect.width / 2;
        const fromY = fromRect.top - wrapperRect.top + fromRect.height / 2;
        const toX = toRect.left - wrapperRect.left + toRect.width / 2;
        const toY = toRect.top - wrapperRect.top + toRect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2)
        );
        
        // Afficher la ligne si distance < 200px
        const maxDistance = 200;
        if (distance < maxDistance) {
          const opacity = 1 - (distance / maxDistance);
          line.setAttribute("x1", fromX);
          line.setAttribute("y1", fromY);
          line.setAttribute("x2", toX);
          line.setAttribute("y2", toY);
          line.setAttribute("opacity", opacity * 0.3);
        } else {
          line.setAttribute("opacity", "0");
        }
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

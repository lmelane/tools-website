(() => {
  // ============================================================
  // SIMPLE LIQUID SVG ANIMATION - GSAP Powered
  // Fast radial gradient animation (like reference example)
  // Replaces native SVG <animate> with GSAP for better control
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[liquid-svg] GSAP not loaded. Add GSAP CDN.');
    return;
  }

  console.log('[liquid-svg] Initializing simple radial animation...');

  function initAnimation() {
    const svg = document.querySelector('.liquid-shape');
    if (!svg) {
      console.error('[liquid-svg] SVG with class .liquid-shape not found');
      return;
    }

    console.log('[liquid-svg] SVG found, converting to radial gradient animation...');

    // Remove existing gradients and create new radial gradient
    const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svg.querySelector('defs')) {
      svg.insertBefore(defs, svg.firstChild);
    }

    // Clear old gradients
    const oldGradA = svg.querySelector('#gradA');
    const oldGradB = svg.querySelector('#gradB');
    if (oldGradA) oldGradA.remove();
    if (oldGradB) oldGradB.remove();

    // Create radial gradient (like reference example)
    const radialGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    radialGrad.setAttribute('id', 'liquidGradient');
    radialGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
    radialGrad.setAttribute('cx', '864');
    radialGrad.setAttribute('cy', '600');
    radialGrad.setAttribute('r', '700');

    // Add color stops
    const stops = [
      { offset: '0%', color: '#CBB6FF' },
      { offset: '35%', color: '#FFB68F' },
      { offset: '70%', color: '#BFA9FF' },
      { offset: '100%', color: '#FFB08A' }
    ];

    stops.forEach(({ offset, color }) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', color);
      radialGrad.appendChild(stop);
    });

    defs.appendChild(radialGrad);

    // Update rects to use new gradient
    const rects = svg.querySelectorAll('g[mask] rect');
    rects.forEach(rect => {
      rect.setAttribute('fill', 'url(#liquidGradient)');
    });

    console.log('[liquid-svg] Radial gradient created');

    // ============================================================
    // GSAP ANIMATIONS - Fast and fluid like reference
    // ============================================================

    // Animate gradient center (cx, cy) - Fast movement
    gsap.to(radialGrad, {
      attr: { cx: 1200 },
      duration: 8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gsap.to(radialGrad, {
      attr: { cy: 400 },
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    // Animate gradient radius - Breathing effect
    gsap.to(radialGrad, {
      attr: { r: 900 },
      duration: 12,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    console.log('[liquid-svg] Gradient animation started');

    // ============================================================
    // PATH MORPHING (if mask path exists)
    // ============================================================

    const maskPath = svg.querySelector('#shapeMask path');
    if (maskPath) {
      const morphPaths = [
        "M921.849 306.795C1035.35 488.753 741.681 876.909 265.927 1173.77C-209.827 1470.63 -687.51 1563.77 -801.009 1381.81C-914.507 1199.86 -620.841 811.701 -145.087 514.842C330.668 217.984 808.351 124.838 921.849 306.795Z",
        "M1050.23 280.441C1180.67 510.328 820.145 920.667 298.764 1205.89C-222.617 1491.11 -745.328 1578.23 -875.771 1348.34C-1006.21 1118.46 -645.692 708.118 -124.311 422.896C397.07 137.674 919.781 50.5544 1050.23 280.441Z",
        "M780.562 390.128C920.445 598.892 580.234 1010.45 88.9234 1280.34C-402.387 1550.23 -895.672 1620.11 -1035.56 1411.35C-1175.44 1202.58 -835.229 791.023 -343.919 521.134C147.391 251.245 640.679 181.364 780.562 390.128Z"
      ];

      const morphTimeline = gsap.timeline({ repeat: -1 });
      
      morphPaths.forEach((path, index) => {
        const nextPath = morphPaths[(index + 1) % morphPaths.length];
        morphTimeline.to(maskPath, {
          attr: { d: nextPath },
          duration: 10,
          ease: 'sine.inOut'
        });
      });

      console.log('[liquid-svg] Path morphing started');
    }

    // ============================================================
    // TURBULENCE ANIMATION (if filter exists)
    // ============================================================

    const turbulences = svg.querySelectorAll('feTurbulence');
    if (turbulences.length > 0) {
      turbulences.forEach((turb, index) => {
        const baseFreq = turb.getAttribute('baseFrequency');
        const [x, y] = baseFreq.split(' ').map(parseFloat);
        
        gsap.to(turb, {
          attr: { baseFrequency: `${y} ${x}` },
          duration: 4 + index * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      });

      console.log(`[liquid-svg] ${turbulences.length} turbulence layers animated`);
    }

    console.log('[liquid-svg] ✅ Simple fast animation fully initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimation);
  } else {
    initAnimation();
  }
})();

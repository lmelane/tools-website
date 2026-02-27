(() => {
  // ============================================================
  // ULTRA COMPLEX LIQUID SVG ANIMATION - GSAP Powered
  // Premium molecular fluid motion with advanced morphing
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[liquid-svg] GSAP not loaded. Add GSAP CDN.');
    return;
  }

  console.log('[liquid-svg] Initializing ultra complex animation...');

  // ============================================================
  // CONFIGURATION
  // ============================================================

  const CONFIG = {
    // Morphing complexity
    morphSteps: 8,
    morphDuration: 12,
    morphEase: 'sine.inOut',
    
    // Turbulence animation
    turbulenceSpeed: 'slow', // 'slow', 'medium', 'fast'
    turbulenceComplexity: 'ultra', // 'simple', 'complex', 'ultra'
    
    // Gradient flow
    gradientFlow: true,
    gradientSpeed: 1.0,
    
    // Displacement intensity
    displacementIntensity: 1.2, // 0.5 to 2.0
    
    // Color shifting
    colorShift: true,
    colorShiftSpeed: 0.8
  };

  // ============================================================
  // ULTRA COMPLEX MORPH PATHS
  // ============================================================

  const MORPH_PATHS = [
    // Path 1: Original organic blob
    "M921.849 306.795C1035.35 488.753 741.681 876.909 265.927 1173.77C-209.827 1470.63 -687.51 1563.77 -801.009 1381.81C-914.507 1199.86 -620.841 811.701 -145.087 514.842C330.668 217.984 808.351 124.838 921.849 306.795Z",
    
    // Path 2: Flowing wave
    "M1050.23 280.441C1180.67 510.328 820.145 920.667 298.764 1205.89C-222.617 1491.11 -745.328 1578.23 -875.771 1348.34C-1006.21 1118.46 -645.692 708.118 -124.311 422.896C397.07 137.674 919.781 50.5544 1050.23 280.441Z",
    
    // Path 3: Twisted vortex
    "M780.562 390.128C920.445 598.892 580.234 1010.45 88.9234 1280.34C-402.387 1550.23 -895.672 1620.11 -1035.56 1411.35C-1175.44 1202.58 -835.229 791.023 -343.919 521.134C147.391 251.245 640.679 181.364 780.562 390.128Z",
    
    // Path 4: Expanding bubble
    "M1120.45 195.667C1265.89 425.889 925.334 865.223 380.445 1135.67C-164.444 1406.11 -710.889 1485.67 -856.334 1255.45C-1001.78 1025.22 -661.223 585.889 -116.334 315.445C428.555 45.0011 975 -34.5544 1120.45 195.667Z",
    
    // Path 5: Liquid drop
    "M850.234 420.556C975.667 635.778 665.445 1045.33 175.234 1310.22C-315.977 1575.11 -808.445 1645.33 -933.878 1430.11C-1059.31 1214.89 -749.089 805.333 -258.878 540.445C231.333 275.556 724.801 205.333 850.234 420.556Z",
    
    // Path 6: Spiral motion
    "M1015.67 250.889C1155.22 475.667 835.667 905.778 325.667 1165.89C-184.333 1426 -695.667 1505.22 -835.222 1280.44C-974.778 1055.67 -655.222 625.556 -145.222 365.444C344.778 105.333 876.111 26.1111 1015.67 250.889Z",
    
    // Path 7: Organic pulse
    "M895.445 365.222C1025.33 580.444 715.889 985.778 220.889 1245.67C-274.111 1505.56 -770.222 1580.44 -900.111 1365.22C-1030 1150 -720.556 744.667 -225.556 484.778C270.444 224.889 765.556 150 895.445 365.222Z",
    
    // Path 8: Final complex form
    "M980.778 310.556C1105.89 535.333 795.445 945.556 295.445 1205.33C-204.556 1465.11 -705.889 1540.33 -831 1315.56C-956.111 1090.78 -645.667 680.556 -145.667 420.778C354.333 161 855.667 85.7778 980.778 310.556Z"
  ];

  // ============================================================
  // INITIALIZE SVG ELEMENTS
  // ============================================================

  function initAnimation() {
    const svg = document.querySelector('.liquid-shape');
    if (!svg) {
      console.error('[liquid-svg] SVG with class .liquid-shape not found');
      return;
    }

    const maskPath = svg.querySelector('#shapeMask path');
    const gradA = svg.querySelector('#gradA');
    const gradB = svg.querySelector('#gradB');
    const turbulence1 = svg.querySelectorAll('feTurbulence')[0];
    const turbulence2 = svg.querySelectorAll('feTurbulence')[1];
    const turbulence3 = svg.querySelectorAll('feTurbulence')[2];
    const displacement1 = svg.querySelectorAll('feDisplacementMap')[0];
    const displacement2 = svg.querySelectorAll('feDisplacementMap')[1];

    if (!maskPath) {
      console.error('[liquid-svg] Mask path not found');
      return;
    }

    console.log('[liquid-svg] Elements found, starting animation...');

    // ============================================================
    // 1. ULTRA COMPLEX PATH MORPHING
    // ============================================================

    const morphTimeline = gsap.timeline({ repeat: -1 });
    
    MORPH_PATHS.forEach((path, index) => {
      const nextPath = MORPH_PATHS[(index + 1) % MORPH_PATHS.length];
      
      morphTimeline.to(maskPath, {
        attr: { d: nextPath },
        duration: CONFIG.morphDuration,
        ease: CONFIG.morphEase
      });
    });

    console.log('[liquid-svg] Path morphing initialized');

    // ============================================================
    // 2. ADVANCED TURBULENCE ANIMATION
    // ============================================================

    if (turbulence1 && turbulence2 && turbulence3) {
      // Turbulence 1: Slow organic waves
      gsap.to(turbulence1, {
        attr: { baseFrequency: '0.004 0.006' },
        duration: 6.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Turbulence 2: Fast molecular vibration
      gsap.to(turbulence2, {
        attr: { baseFrequency: '0.032 0.050' },
        duration: 4.0,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });

      // Turbulence 3: Medium chaotic flow
      gsap.to(turbulence3, {
        attr: { baseFrequency: '0.030 0.070' },
        duration: 5.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Additional seed animation for more complexity
      gsap.to(turbulence1, {
        attr: { seed: 50 },
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: 'none'
      });

      gsap.to(turbulence2, {
        attr: { seed: 80 },
        duration: 15,
        repeat: -1,
        yoyo: true,
        ease: 'none'
      });

      gsap.to(turbulence3, {
        attr: { seed: 100 },
        duration: 18,
        repeat: -1,
        yoyo: true,
        ease: 'none'
      });

      console.log('[liquid-svg] Turbulence animation initialized');
    }

    // ============================================================
    // 3. DYNAMIC DISPLACEMENT INTENSITY
    // ============================================================

    if (displacement1 && displacement2) {
      const baseScale1 = 78 * CONFIG.displacementIntensity;
      const baseScale2 = 24 * CONFIG.displacementIntensity;

      gsap.to(displacement1, {
        attr: { scale: baseScale1 * 1.3 },
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to(displacement2, {
        attr: { scale: baseScale2 * 1.4 },
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });

      console.log('[liquid-svg] Displacement animation initialized');
    }

    // ============================================================
    // 4. GRADIENT FLOW ANIMATION
    // ============================================================

    if (CONFIG.gradientFlow && gradA && gradB) {
      // Gradient A: Complex circular motion
      const gradATimeline = gsap.timeline({ repeat: -1 });
      
      gradATimeline
        .to(gradA, {
          attr: { x1: 140, y1: 120, x2: 1600, y2: 1180 },
          duration: 9 / CONFIG.gradientSpeed,
          ease: 'sine.inOut'
        })
        .to(gradA, {
          attr: { x1: -200, y1: -200, x2: 1900, y2: 1400 },
          duration: 9 / CONFIG.gradientSpeed,
          ease: 'sine.inOut'
        });

      // Gradient B: Wave motion
      const gradBTimeline = gsap.timeline({ repeat: -1 });
      
      gradBTimeline
        .to(gradB, {
          attr: { x1: 240, x2: 1480 },
          duration: 7 / CONFIG.gradientSpeed,
          ease: 'sine.inOut'
        })
        .to(gradB, {
          attr: { x1: 0, x2: 1728 },
          duration: 7 / CONFIG.gradientSpeed,
          ease: 'sine.inOut'
        });

      console.log('[liquid-svg] Gradient flow initialized');
    }

    // ============================================================
    // 5. COLOR SHIFTING (OPTIONAL)
    // ============================================================

    if (CONFIG.colorShift && gradA) {
      const stops = gradA.querySelectorAll('stop');
      
      if (stops.length >= 4) {
        // Animate stop colors for dynamic color shifting
        gsap.to(stops[0], {
          attr: { 'stop-color': '#FFB68F' },
          duration: 12 / CONFIG.colorShiftSpeed,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

        gsap.to(stops[1], {
          attr: { 'stop-color': '#BFA9FF' },
          duration: 10 / CONFIG.colorShiftSpeed,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

        gsap.to(stops[2], {
          attr: { 'stop-color': '#FFB08A' },
          duration: 11 / CONFIG.colorShiftSpeed,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

        gsap.to(stops[3], {
          attr: { 'stop-color': '#CBB6FF' },
          duration: 13 / CONFIG.colorShiftSpeed,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

        console.log('[liquid-svg] Color shifting initialized');
      }
    }

    // ============================================================
    // 6. ROTATION & SCALE BREATHING
    // ============================================================

    const maskGroup = svg.querySelector('g[mask]');
    if (maskGroup) {
      // Subtle rotation
      gsap.to(maskGroup, {
        rotation: 5,
        transformOrigin: 'center center',
        duration: 25,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Breathing scale effect
      gsap.to(maskGroup, {
        scale: 1.05,
        transformOrigin: 'center center',
        duration: 15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      console.log('[liquid-svg] Rotation & scale breathing initialized');
    }

    console.log('[liquid-svg] ✅ Ultra complex animation fully initialized');
  }

  // ============================================================
  // START
  // ============================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimation);
  } else {
    initAnimation();
  }
})();

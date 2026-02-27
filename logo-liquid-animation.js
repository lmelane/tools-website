(() => {
  // ============================================================
  // LOGO LIQUID ANIMATION - GSAP Powered
  // Applies radial gradient animation to text SVG logos
  // Add class="logo-liquid" to your SVG
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[logo-liquid] GSAP not loaded. Add GSAP CDN.');
    return;
  }

  console.log('[logo-liquid] Initializing...');

  function initAnimation() {
    const svgs = document.querySelectorAll('.logo-liquid');
    
    if (svgs.length === 0) {
      console.error('[logo-liquid] No SVG with class .logo-liquid found');
      return;
    }

    console.log(`[logo-liquid] Found ${svgs.length} logo(s)`);

    svgs.forEach((svg, index) => {
      // Get SVG dimensions
      const viewBox = svg.getAttribute('viewBox');
      const [x, y, width, height] = viewBox.split(' ').map(parseFloat);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(width, height) * 0.6;

      // Create defs if not exists
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }

      // Create radial gradient
      const gradId = `logoLiquidGradient${index}`;
      const radialGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
      radialGrad.setAttribute('id', gradId);
      radialGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
      radialGrad.setAttribute('cx', centerX);
      radialGrad.setAttribute('cy', centerY);
      radialGrad.setAttribute('r', radius);

      // Color stops
      const stops = [
        { offset: '0%', color: '#FFB68F' },
        { offset: '35%', color: '#E37272' },
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

      // Apply gradient to all paths
      const paths = svg.querySelectorAll('path');
      paths.forEach(path => {
        path.setAttribute('fill', `url(#${gradId})`);
      });

      console.log(`[logo-liquid] Logo ${index + 1}: Gradient applied to ${paths.length} paths`);

      // ============================================================
      // GSAP ANIMATIONS
      // ============================================================

      // Animate gradient center - Fluid movement
      gsap.to(radialGrad, {
        attr: { cx: centerX + width * 0.3 },
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to(radialGrad, {
        attr: { cy: centerY - height * 0.2 },
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Animate gradient radius - Breathing
      gsap.to(radialGrad, {
        attr: { r: radius * 1.3 },
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Color shifting on stops
      const stopElements = radialGrad.querySelectorAll('stop');
      stopElements.forEach((stop, i) => {
        const colors = ['#FFB68F', '#E37272', '#BFA9FF', '#FFB08A', '#CBB6FF'];
        const targetColor = colors[(i + 2) % colors.length];
        
        gsap.to(stop, {
          attr: { 'stop-color': targetColor },
          duration: 15,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.5
        });
      });

      console.log(`[logo-liquid] Logo ${index + 1}: Animation started`);
    });

    console.log('[logo-liquid] ✅ All logos animated');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimation);
  } else {
    initAnimation();
  }
})();

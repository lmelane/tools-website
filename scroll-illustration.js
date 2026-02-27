(() => {
  // ============================================================
  // SCROLL ILLUSTRATION - Illustration slides down on scroll
  // Uses GSAP ScrollTrigger to animate illustration from top
  // Requires: GSAP + ScrollTrigger
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[scroll-illustration] GSAP not loaded. Add GSAP CDN before this script.');
    return;
  }

  if (typeof ScrollTrigger === 'undefined') {
    console.error('[scroll-illustration] ScrollTrigger not loaded. Add ScrollTrigger CDN before this script.');
    return;
  }

  console.log('[scroll-illustration] Initializing...');

  function initScrollIllustration() {
    const section = document.querySelector(".section-cokpit");
    const illu = document.querySelector(".container-illustration");

    if (!section) {
      console.error('[scroll-illustration] .section-cokpit not found');
      return;
    }

    if (!illu) {
      console.error('[scroll-illustration] .container-illustration not found');
      return;
    }

    console.log('[scroll-illustration] Section and illustration found');

    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // Set initial position (illustration starts 200px above)
    gsap.set(illu, { y: -200, force3D: true });

    // Animate illustration down on scroll
    gsap.to(illu, {
      y: 0,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 80%",     // Start early
        end: "top 40%",       // End quickly (middle of screen)
        scrub: 1,             // Smooth but reactive
        invalidateOnRefresh: true
      }
    });

    console.log('[scroll-illustration] ✅ Scroll illustration initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollIllustration);
  } else {
    initScrollIllustration();
  }
})();

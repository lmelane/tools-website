(() => {
  // ============================================================
  // SCROLL ZOOM - Scale element based on scroll position
  // Zooms in when scrolling down, zooms out when scrolling up
  // Works within a specific section viewport
  // ============================================================

  console.log('[scroll-zoom] Initializing...');

  function initScrollZoom() {
    const section = document.querySelector('.section-artiste-main');
    const target = document.querySelector('.bg-main-video-artiste');

    if (!section) {
      console.error('[scroll-zoom] .section-artiste-main not found');
      return;
    }

    if (!target) {
      console.error('[scroll-zoom] .bg-main-video-artiste not found');
      return;
    }

    console.log('[scroll-zoom] Section and target found');

    // Configuration
    const minScale = 1.0;  // Scale minimum (dézoomé)
    const maxScale = 1.5;  // Scale maximum (zoomé)

    function updateZoom() {
      const sectionRect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Check if section is in viewport
      const isInViewport = sectionRect.top < windowHeight && sectionRect.bottom > 0;

      if (!isInViewport) {
        return;
      }

      // Calculate scroll progress within section
      // 0 = top of section entering viewport
      // 1 = bottom of section leaving viewport
      const sectionHeight = sectionRect.height;
      const scrollStart = -sectionRect.top;
      const scrollRange = sectionHeight + windowHeight;
      const scrollProgress = Math.max(0, Math.min(1, scrollStart / scrollRange));

      // Calculate scale based on scroll progress
      const scale = minScale + (scrollProgress * (maxScale - minScale));

      // Apply scale transform
      target.style.transform = `scale(${scale})`;
      target.style.transformOrigin = 'center center';
      target.style.transition = 'transform 0.1s ease-out';
    }

    // Listen to scroll
    window.addEventListener('scroll', updateZoom, { passive: true });

    // Initial update
    updateZoom();

    console.log('[scroll-zoom] ✅ Scroll zoom initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollZoom);
  } else {
    initScrollZoom();
  }
})();

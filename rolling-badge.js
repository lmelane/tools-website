(() => {
  // ============================================================
  // ROLLING BADGE - Infinite Vertical Scroll
  // Webflow Compatible - Auto-detects badges with data-rolling-badge="true"
  // Requires: GSAP (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[rolling-badge] GSAP not loaded. Add GSAP CDN to Webflow.');
    return;
  }

  console.log('[rolling-badge] Initializing...');

  function initRollingBadges() {
    const badges = document.querySelectorAll('[data-rolling-badge="true"]');

    if (badges.length === 0) {
      console.log('[rolling-badge] No badges found with data-rolling-badge="true"');
      return;
    }

    console.log(`[rolling-badge] Found ${badges.length} badge(s)`);

    badges.forEach((badge, badgeIndex) => {
      const track = badge.querySelector('.badge-track');
      const items = badge.querySelectorAll('.badge-item');

      if (!track) {
        console.error(`[rolling-badge] Badge ${badgeIndex + 1}: .badge-track not found`);
        return;
      }

      if (items.length < 2) {
        console.warn(`[rolling-badge] Badge ${badgeIndex + 1}: Need at least 2 .badge-item elements`);
        return;
      }

      const itemHeight = items[0].offsetHeight;
      const total = items.length;

      // Clone first item for seamless infinite loop
      const firstClone = items[0].cloneNode(true);
      track.appendChild(firstClone);

      console.log(`[rolling-badge] Badge ${badgeIndex + 1}: ${total} items, height: ${itemHeight}px`);

      // Create timeline
      const tl = gsap.timeline({
        repeat: -1,
        defaults: {
          duration: 0.9,
          ease: "expo.inOut"
        }
      });

      // Animate through all items
      for (let i = 1; i <= total; i++) {
        tl.to(track, {
          y: -itemHeight * i,
          force3D: true
        })
        .to({}, { duration: 2 }); // pause between each phrase
      }

      // Reset instant without flash
      tl.eventCallback("onRepeat", () => {
        gsap.set(track, { y: 0 });
      });

      console.log(`[rolling-badge] Badge ${badgeIndex + 1}: Animation started`);
    });

    console.log('[rolling-badge] ✅ All badges initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRollingBadges);
  } else {
    initRollingBadges();
  }
})();

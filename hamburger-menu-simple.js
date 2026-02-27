(() => {
  // ============================================================
  // HAMBURGER MENU SIMPLE - Reliable rotation effect
  // Click .hamburger_menu_mobile to open/close .bigmenumobile
  // Hamburger rotates 90deg, middle line fades out
  // Requires: GSAP (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[hamburger-menu-simple] GSAP not loaded. Add GSAP CDN before this script.');
    return;
  }

  console.log('[hamburger-menu-simple] Initializing...');

  // Check for reduced motion preference (accessibility)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger_menu_mobile');
    const menu = document.querySelector('.bigmenumobile');

    if (!hamburger) {
      console.error('[hamburger-menu-simple] .hamburger_menu_mobile not found');
      return;
    }

    if (!menu) {
      console.error('[hamburger-menu-simple] .bigmenumobile not found');
      return;
    }

    const downLine = hamburger.querySelector('.down-line');

    if (!downLine) {
      console.error('[hamburger-menu-simple] .down-line not found');
      return;
    }

    console.log('[hamburger-menu-simple] Hamburger and menu found');

    let isOpen = false;

    // Initial state: menu hidden with display:none
    gsap.set(menu, {
      display: 'none',
      x: '100%'
    });

    // Animation timelines (instant if reduced motion)
    const duration = prefersReducedMotion ? 0 : 0.4;
    const menuDuration = prefersReducedMotion ? 0 : 0.6;
    
    const openTimeline = gsap.timeline({ paused: true });
    const closeTimeline = gsap.timeline({ paused: true });

    // --- OPEN ANIMATION ---
    openTimeline
      // Show menu first
      .set(menu, { display: 'block' }, 0)
      // Slide menu in from right
      .to(menu, {
        x: '0%',
        duration: menuDuration,
        ease: 'power3.out'
      }, 0)
      // Rotate hamburger 90deg and fade middle line
      .to(hamburger, {
        rotation: 90,
        duration: duration,
        ease: 'power2.inOut'
      }, 0)
      .to(downLine, {
        opacity: 0,
        scaleX: 0,
        duration: duration * 0.75,
        ease: 'power2.out'
      }, 0);

    // --- CLOSE ANIMATION ---
    closeTimeline
      // Slide menu out to right
      .to(menu, {
        x: '100%',
        duration: menuDuration * 0.83,
        ease: 'power3.in'
      }, 0)
      // Rotate hamburger back to 0deg
      .to(hamburger, {
        rotation: 0,
        duration: duration,
        ease: 'power2.inOut'
      }, 0)
      .to(downLine, {
        opacity: 1,
        scaleX: 1,
        duration: duration * 0.75,
        ease: 'power2.in'
      }, 0.1)
      // Hide menu after animation
      .set(menu, { display: 'none' });

    // Click handler
    hamburger.addEventListener('click', () => {
      if (isOpen) {
        // Close menu
        openTimeline.pause();
        closeTimeline.restart();
        isOpen = false;
        // Unlock scroll
        document.body.style.overflow = '';
        console.log('[hamburger-menu-simple] Menu closed');
      } else {
        // Open menu
        closeTimeline.pause();
        openTimeline.restart();
        isOpen = true;
        // Lock scroll
        document.body.style.overflow = 'hidden';
        console.log('[hamburger-menu-simple] Menu opened');
      }
    });

    // Optional: close menu when clicking outside
    const outsideClickHandler = (e) => {
      if (isOpen && !menu.contains(e.target) && !hamburger.contains(e.target)) {
        closeTimeline.restart();
        isOpen = false;
        // Unlock scroll
        document.body.style.overflow = '';
        console.log('[hamburger-menu-simple] Menu closed (click outside)');
      }
    };
    
    document.addEventListener('click', outsideClickHandler);

    // Cleanup function
    window.addEventListener('beforeunload', () => {
      document.removeEventListener('click', outsideClickHandler);
    });

    console.log('[hamburger-menu-simple] ✅ Hamburger menu initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHamburgerMenu);
  } else {
    initHamburgerMenu();
  }
})();

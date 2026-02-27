(() => {
  // ============================================================
  // HAMBURGER MENU - Mobile menu with smooth GSAP animation
  // Click .hamburger_menu_mobile to open/close .bigmenumobile
  // Menu slides in from right, hamburger transforms to cross
  // Requires: GSAP (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[hamburger-menu] GSAP not loaded. Add GSAP CDN before this script.');
    return;
  }

  console.log('[hamburger-menu] Initializing...');

  function initHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger_menu_mobile');
    const menu = document.querySelector('.bigmenumobile');

    if (!hamburger) {
      console.error('[hamburger-menu] .hamburger_menu_mobile not found');
      return;
    }

    if (!menu) {
      console.error('[hamburger-menu] .bigmenumobile not found');
      return;
    }

    const topLine = hamburger.querySelector('.top-line');
    const downLine = hamburger.querySelector('.down-line');
    const bottomLine = hamburger.querySelector('.bottom-line');

    if (!topLine || !downLine || !bottomLine) {
      console.error('[hamburger-menu] Lines (.top-line, .down-line, .bottom-line) not found');
      return;
    }

    console.log('[hamburger-menu] Hamburger and menu found');

    let isOpen = false;

    // Initial state: menu hidden off-screen to the right
    gsap.set(menu, {
      x: '100%',
      visibility: 'visible'
    });

    // Animation timelines
    const openTimeline = gsap.timeline({ paused: true });
    const closeTimeline = gsap.timeline({ paused: true });

    // --- OPEN ANIMATION ---
    openTimeline
      // Slide menu in from right
      .to(menu, {
        x: '0%',
        duration: 0.6,
        ease: 'power3.out'
      }, 0)
      // Transform hamburger to cross
      // Top line: rotate 45deg and move to center
      .to(topLine, {
        y: 7, // Move to center (half of 15px height - 1px line = 7px)
        rotation: 45,
        duration: 0.4,
        ease: 'power2.inOut'
      }, 0)
      // Middle line: fade out
      .to(downLine, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out'
      }, 0)
      // Bottom line: rotate -45deg and move to center
      .to(bottomLine, {
        y: -7, // Move to center
        rotation: -45,
        duration: 0.4,
        ease: 'power2.inOut'
      }, 0);

    // --- CLOSE ANIMATION ---
    closeTimeline
      // Slide menu out to right
      .to(menu, {
        x: '100%',
        duration: 0.5,
        ease: 'power3.in'
      }, 0)
      // Transform cross back to hamburger
      .to(topLine, {
        y: 0,
        rotation: 0,
        duration: 0.4,
        ease: 'power2.inOut'
      }, 0)
      .to(downLine, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.in'
      }, 0.1)
      .to(bottomLine, {
        y: 0,
        rotation: 0,
        duration: 0.4,
        ease: 'power2.inOut'
      }, 0);

    // Click handler
    hamburger.addEventListener('click', () => {
      if (isOpen) {
        // Close menu
        openTimeline.pause();
        closeTimeline.restart();
        isOpen = false;
        console.log('[hamburger-menu] Menu closed');
      } else {
        // Open menu
        closeTimeline.pause();
        openTimeline.restart();
        isOpen = true;
        console.log('[hamburger-menu] Menu opened');
      }
    });

    // Optional: close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (isOpen && !menu.contains(e.target) && !hamburger.contains(e.target)) {
        closeTimeline.restart();
        isOpen = false;
        console.log('[hamburger-menu] Menu closed (click outside)');
      }
    });

    console.log('[hamburger-menu] ✅ Hamburger menu initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHamburgerMenu);
  } else {
    initHamburgerMenu();
  }
})();

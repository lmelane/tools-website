(() => {
  // ============================================================
  // PREMIUM TABS SLIDER - Webflow Compatible
  // Mapping: div-tabs-1 => slider-1, div-tabs-2 => slider-2, etc.
  // Requires: GSAP (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[tabs-slider] GSAP not loaded. Add GSAP CDN to Webflow.');
    return;
  }

  console.log('[tabs-slider] Initializing...');

  // ============================================================
  // CONFIGURATION
  // ============================================================

  const TABS_SELECTOR = '[class*="div-tabs-"]'; // All tabs
  const SLIDERS_SELECTOR = '[class*="slider-"]'; // All sliders
  const ACTIVE_CLASS = 'is-active'; // Class to add to active tab

  // ============================================================
  // ANIMATION VARIANTS
  // ============================================================

  const animations = {
    // Fade + Slide from right
    fadeSlide: (slider) => {
      return gsap.timeline()
        .fromTo(slider,
          {
            opacity: 0,
            x: 50,
            scale: 0.95
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.6,
            ease: 'power3.out'
          }
        );
    },

    // Scale + Fade
    scaleFade: (slider) => {
      return gsap.timeline()
        .fromTo(slider,
          {
            opacity: 0,
            scale: 0.9,
            y: 20
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.5,
            ease: 'back.out(1.2)'
          }
        );
    },

    // Blur reveal
    blurReveal: (slider) => {
      return gsap.timeline()
        .fromTo(slider,
          {
            opacity: 0,
            filter: 'blur(10px)',
            y: 30
          },
          {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            duration: 0.7,
            ease: 'power2.out'
          }
        );
    },

    // 3D Flip
    flip3d: (slider) => {
      return gsap.timeline()
        .fromTo(slider,
          {
            opacity: 0,
            rotationY: -90,
            transformOrigin: 'center center',
            transformPerspective: 1000
          },
          {
            opacity: 1,
            rotationY: 0,
            duration: 0.8,
            ease: 'power3.out'
          }
        );
    },

    // Elastic bounce
    elastic: (slider) => {
      return gsap.timeline()
        .fromTo(slider,
          {
            opacity: 0,
            scale: 0.5,
            y: -50
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1,
            ease: 'elastic.out(1, 0.5)'
          }
        );
    }
  };

  // Default animation (can be changed)
  const DEFAULT_ANIMATION = 'fadeSlide';

  // ============================================================
  // INITIALIZATION
  // ============================================================

  function init() {
    const tabs = document.querySelectorAll(TABS_SELECTOR);
    const sliders = document.querySelectorAll(SLIDERS_SELECTOR);

    if (tabs.length === 0) {
      console.error('[tabs-slider] No tabs found with selector:', TABS_SELECTOR);
      return;
    }

    if (sliders.length === 0) {
      console.error('[tabs-slider] No sliders found with selector:', SLIDERS_SELECTOR);
      return;
    }

    console.log(`[tabs-slider] Found ${tabs.length} tabs and ${sliders.length} sliders`);

    // Extract tab numbers and create mapping
    const tabsMap = new Map();
    const slidersMap = new Map();

    tabs.forEach(tab => {
      const match = tab.className.match(/div-tabs-(\d+)/);
      if (match) {
        const num = match[1];
        tabsMap.set(num, tab);
      }
    });

    sliders.forEach(slider => {
      const match = slider.className.match(/slider-(\d+)/);
      if (match) {
        const num = match[1];
        slidersMap.set(num, slider);
      }
    });

    console.log('[tabs-slider] Tabs mapping:', Array.from(tabsMap.keys()));
    console.log('[tabs-slider] Sliders mapping:', Array.from(slidersMap.keys()));

    // Force min-height on parent container to prevent collapse
    const slidersContainer = document.querySelector('.sliders-div');
    if (slidersContainer) {
      gsap.set(slidersContainer, { minHeight: '400px' });
      console.log('[tabs-slider] Parent container min-height set');
    }

    // Clear Webflow inline styles first, then hide all sliders
    sliders.forEach(slider => {
      // Remove Webflow inline styles
      slider.style.removeProperty('display');
      slider.style.removeProperty('opacity');
      
      gsap.set(slider, { 
        display: 'none', 
        opacity: 0,
        minHeight: '400px' // Prevent collapse when children have height: 100%
      });
    });

    // Show first slider (slider-1) by default
    const firstSlider = slidersMap.get('1');
    if (firstSlider) {
      // Remove Webflow inline styles
      firstSlider.style.removeProperty('display');
      firstSlider.style.removeProperty('opacity');
      
      gsap.set(firstSlider, { 
        display: 'block', 
        opacity: 1,
        minHeight: '400px'
      });
      console.log('[tabs-slider] Default slider-1 shown');
    }

    // Add active class to first tab
    const firstTab = tabsMap.get('1');
    if (firstTab) {
      firstTab.classList.add(ACTIVE_CLASS);
      console.log('[tabs-slider] Default div-tabs-1 active');
    }

    // Setup click handlers
    tabsMap.forEach((tab, num) => {
      tab.addEventListener('click', () => {
        handleTabClick(num, tabsMap, slidersMap);
      });

      // Add cursor pointer
      tab.style.cursor = 'pointer';
    });

    console.log('[tabs-slider] Ready');
  }

  // ============================================================
  // TAB CLICK HANDLER
  // ============================================================

  function handleTabClick(targetNum, tabsMap, slidersMap) {
    console.log(`[tabs-slider] Tab ${targetNum} clicked`);

    const targetTab = tabsMap.get(targetNum);
    const targetSlider = slidersMap.get(targetNum);

    if (!targetSlider) {
      console.error(`[tabs-slider] Slider ${targetNum} not found`);
      return;
    }

    // Check if already active
    if (targetTab.classList.contains(ACTIVE_CLASS)) {
      console.log(`[tabs-slider] Tab ${targetNum} already active`);
      return;
    }

    // Remove active class from all tabs
    tabsMap.forEach(tab => {
      tab.classList.remove(ACTIVE_CLASS);
    });

    // Add active class to target tab
    targetTab.classList.add(ACTIVE_CLASS);

    // Hide all sliders
    const hideTimeline = gsap.timeline();
    slidersMap.forEach(slider => {
      if (slider !== targetSlider && slider.style.display !== 'none') {
        hideTimeline.to(slider, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            gsap.set(slider, { display: 'none' });
          }
        }, 0);
      }
    });

    // Show target slider with animation
    hideTimeline.add(() => {
      // Remove Webflow inline styles
      targetSlider.style.removeProperty('display');
      targetSlider.style.removeProperty('opacity');
      
      gsap.set(targetSlider, { display: 'block', minHeight: '400px' });
      
      // Get animation variant from data attribute or use default
      const animationName = targetSlider.getAttribute('data-animation') || DEFAULT_ANIMATION;
      const animationFn = animations[animationName] || animations[DEFAULT_ANIMATION];
      
      animationFn(targetSlider);
      
      console.log(`[tabs-slider] Slider ${targetNum} shown with ${animationName} animation`);
    });
  }

  // ============================================================
  // START
  // ============================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

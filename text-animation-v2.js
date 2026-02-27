(() => {
  // ============================================================
  // TEXT ANIMATION V2 - Ultra Robust Webflow Compatible
  // Best practices: performance, accessibility, mobile/desktop/tablet
  // Attribute: data-text-animate="variant" (flip3d, fade, slide, wave)
  // Requires: GSAP (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[text-animation-v2] GSAP not loaded. Add GSAP CDN before this script.');
    return;
  }

  console.log('[text-animation-v2] Initializing...');

  // Check for reduced motion preference (accessibility)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    console.log('[text-animation-v2] Reduced motion detected - animations disabled');
    // Show all text immediately without animation
    document.querySelectorAll('[data-text-animate]').forEach(el => {
      el.style.opacity = '1';
    });
    return;
  }

  // Performance: track initialized elements to avoid double-init
  const initializedElements = new WeakSet();

  // Split text into letters (simple and robust)
  function splitText(element) {
    const text = element.textContent;
    const letters = [];
    
    // Clear element
    element.textContent = '';
    
    // Create letter spans
    [...text].forEach((char) => {
      if (char.trim() === '') {
        // Preserve whitespace
        element.appendChild(document.createTextNode(char));
      } else {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.cssText = 'display:inline-block;opacity:0;will-change:transform,opacity;';
        element.appendChild(span);
        letters.push(span);
      }
    });
    
    return letters;
  }

  // Animation variants (optimized for performance)
  const animations = {
    // Default: Simple fade + slide up
    fade: (letters) => {
      gsap.fromTo(letters,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.02,
          clearProps: 'all' // Clean up after animation
        }
      );
    },

    // 3D flip (premium)
    flip3d: (letters) => {
      gsap.fromTo(letters,
        { opacity: 0, rotationX: -90, transformOrigin: '50% 50%' },
        {
          opacity: 1,
          rotationX: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.03,
          clearProps: 'all'
        }
      );
    },

    // Slide from left
    slide: (letters) => {
      gsap.fromTo(letters,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.02,
          clearProps: 'all'
        }
      );
    },

    // Wave effect
    wave: (letters) => {
      gsap.fromTo(letters,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'sine.out',
          stagger: {
            amount: 0.5,
            from: 'start',
            ease: 'sine.inOut'
          },
          clearProps: 'all'
        }
      );
    }
  };

  // Initialize single element
  function initElement(element) {
    // Guard: avoid double init
    if (initializedElements.has(element)) {
      return;
    }
    initializedElements.add(element);

    // Get variant
    const variant = element.getAttribute('data-text-animate') || 'fade';
    const animationFn = animations[variant] || animations.fade;

    // Split text
    const letters = splitText(element);

    if (letters.length === 0) {
      console.warn('[text-animation-v2] No letters found in element:', element);
      return;
    }

    // Intersection Observer for scroll trigger
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Trigger animation
            animationFn(letters);
            
            // Unobserve after animation (play once)
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% visible
        rootMargin: '0px 0px -10% 0px' // Slight offset
      }
    );

    observer.observe(element);
  }

  // Initialize all elements
  function initAll() {
    const elements = document.querySelectorAll('[data-text-animate]');
    
    if (elements.length === 0) {
      console.log('[text-animation-v2] No elements found with data-text-animate');
      return;
    }
    
    console.log(`[text-animation-v2] Found ${elements.length} elements`);
    
    elements.forEach(initElement);
  }

  // Cleanup function for SPA/page transitions
  function cleanup() {
    // Kill all GSAP animations
    gsap.killTweensOf('*');
    console.log('[text-animation-v2] Cleanup complete');
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Re-initialize on custom event (for SPA/dynamic content)
  document.addEventListener('text-animation:reinit', () => {
    console.log('[text-animation-v2] Re-initializing...');
    initAll();
  });

  // Cleanup on page unload (for SPA)
  window.addEventListener('beforeunload', cleanup);

  // Expose cleanup for manual use
  window.textAnimationCleanup = cleanup;

  console.log('[text-animation-v2] ✅ Ready');
})();

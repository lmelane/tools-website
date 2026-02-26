(() => {
  // ============================================================
  // PREMIUM TEXT ANIMATION - Webflow Compatible
  // Letter-by-letter animation on scroll
  // Attribute: animation-text="true"
  // Requires: GSAP (add in Webflow: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
  // ============================================================

  // Wait for GSAP to load
  if (typeof gsap === 'undefined') {
    console.error('[text-animation] GSAP not loaded. Add GSAP CDN to Webflow.');
    return;
  }

  console.log('[text-animation] Initializing...');

  // Split text into letters while preserving HTML structure (spans, br, etc.)
  function splitTextToLetters(element) {
    const letters = [];
    
    // Recursive function to process nodes
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Text node - split into letters
        const text = node.textContent;
        if (text.trim() === '') {
          // Keep whitespace as-is
          return;
        }
        
        const fragment = document.createDocumentFragment();
        
        [...text].forEach((char) => {
          if (char === ' ') {
            // Preserve space
            const space = document.createTextNode(' ');
            fragment.appendChild(space);
          } else if (char.trim() !== '') {
            // Create letter span
            const letterSpan = document.createElement('span');
            letterSpan.textContent = char;
            letterSpan.style.display = 'inline-block';
            letterSpan.style.opacity = '0';
            letterSpan.style.transform = 'translateY(20px) rotateX(-90deg)';
            letterSpan.style.transformOrigin = 'center bottom';
            letterSpan.className = 'letter-animated';
            
            fragment.appendChild(letterSpan);
            letters.push(letterSpan);
          }
        });
        
        // Replace text node with fragment
        node.parentNode.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Element node (span, br, etc.) - preserve and process children
        if (node.tagName === 'BR') {
          // Keep BR as-is
          return;
        }
        
        // For spans with critical styles (background-clip, etc.), wrap letters inside
        if (node.tagName === 'SPAN') {
          const computedStyle = getComputedStyle(node);
          const hasBackgroundClip = computedStyle.webkitBackgroundClip === 'text' || 
                                    computedStyle.backgroundClip === 'text';
          
          if (hasBackgroundClip) {
            // Preserve the span wrapper, split text inside
            node.style.display = 'inline-block';
          }
        }
        
        // Process children
        const childNodes = Array.from(node.childNodes);
        childNodes.forEach(child => processNode(child));
      }
    }
    
    // Clone to avoid modifying during iteration
    const childNodes = Array.from(element.childNodes);
    childNodes.forEach(child => processNode(child));
    
    return letters;
  }

  // Premium animation variants
  const animations = {
    // Variant 1: 3D Flip In (default)
    flip3d: (letters) => {
      return gsap.timeline()
        .to(letters, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: {
            amount: 0.6,
            from: 'start'
          }
        });
    },
    
    // Variant 2: Elastic Pop
    elastic: (letters) => {
      return gsap.timeline()
        .fromTo(letters,
          {
            opacity: 0,
            scale: 0,
            y: 30
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.2,
            ease: 'elastic.out(1, 0.5)',
            stagger: {
              amount: 0.8,
              from: 'start'
            }
          }
        );
    },
    
    // Variant 3: Wave Blur
    wave: (letters) => {
      return gsap.timeline()
        .fromTo(letters,
          {
            opacity: 0,
            y: 50,
            filter: 'blur(10px)'
          },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1,
            ease: 'power2.out',
            stagger: {
              amount: 1,
              from: 'start',
              ease: 'sine.inOut'
            }
          }
        );
    },
    
    // Variant 4: Glitch Reveal
    glitch: (letters) => {
      const tl = gsap.timeline();
      
      letters.forEach((letter, i) => {
        tl.fromTo(letter,
          {
            opacity: 0,
            x: gsap.utils.random(-20, 20),
            y: gsap.utils.random(-10, 10),
            skewX: gsap.utils.random(-20, 20)
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            skewX: 0,
            duration: 0.4,
            ease: 'power2.out'
          },
          i * 0.02
        );
      });
      
      return tl;
    },
    
    // Variant 5: Fade Slide
    fadeSlide: (letters) => {
      return gsap.timeline()
        .fromTo(letters,
          {
            opacity: 0,
            x: -30,
            rotationY: -45
          },
          {
            opacity: 1,
            x: 0,
            rotationY: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: {
              amount: 0.5,
              from: 'start'
            }
          }
        );
    }
  };

  // Get animation variant from attribute
  function getAnimationVariant(element) {
    const variant = element.getAttribute('animation-variant');
    return animations[variant] || animations.flip3d;
  }

  // Initialize animations
  function initTextAnimations() {
    const elements = document.querySelectorAll('[animation-text="true"]');
    
    if (elements.length === 0) {
      console.log('[text-animation] No elements found with animation-text="true"');
      return;
    }
    
    console.log(`[text-animation] Found ${elements.length} elements to animate`);
    
    elements.forEach((element, index) => {
      // Split text into letters
      const letters = splitTextToLetters(element);
      
      // Get animation variant
      const animationFn = getAnimationVariant(element);
      
      // Create Intersection Observer for scroll trigger
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Trigger animation
              animationFn(letters);
              
              // Unobserve after animation (play once)
              observer.unobserve(entry.target);
              
              console.log(`[text-animation] Animated element ${index + 1}`);
            }
          });
        },
        {
          threshold: 0.2, // Trigger when 20% visible
          rootMargin: '0px 0px -10% 0px' // Slight offset from bottom
        }
      );
      
      observer.observe(element);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextAnimations);
  } else {
    initTextAnimations();
  }

  console.log('[text-animation] Ready');
})();

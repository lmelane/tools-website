(() => {
  // ============================================================
  // FAQ ACCORDION - GSAP Animated Accordion
  // Auto-detects .main-box-content elements
  // Smooth open/close with icon rotation
  // Requires: GSAP (https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js)
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[faq-accordion] GSAP not loaded. Add GSAP CDN before this script.');
    return;
  }

  console.log('[faq-accordion] Initializing...');

  function initFAQ() {
    const items = Array.from(document.querySelectorAll(".main-box-content"));
    
    if (items.length === 0) {
      console.log('[faq-accordion] No .main-box-content elements found');
      return;
    }

    console.log(`[faq-accordion] Found ${items.length} FAQ items`);

    const DUR = 0.52;

    function closeItem(item) {
      const answer = item.querySelector(".faq_answer");
      const icon = item.querySelector(".faq_icon");
      if (!answer) return;

      gsap.killTweensOf(answer);
      if (icon) gsap.killTweensOf(icon);

      answer.classList.remove("is-open");

      gsap.to(answer, {
        height: 0,
        opacity: 0,
        y: -6,
        duration: DUR,
        ease: "power2.inOut",
        onComplete: () => gsap.set(answer, { display: "none" })
      });

      if (icon) {
        gsap.to(icon, {
          rotate: 0,
          duration: DUR,
          ease: "power2.inOut",
          transformOrigin: "50% 50%",
          transformBox: "fill-box"
        });
      }
    }

    function openItem(item) {
      const answer = item.querySelector(".faq_answer");
      const icon = item.querySelector(".faq_icon");
      if (!answer) return;

      gsap.killTweensOf(answer);
      if (icon) gsap.killTweensOf(icon);

      answer.classList.add("is-open");
      gsap.set(answer, { display: "block" });

      gsap.fromTo(answer,
        { height: 0, opacity: 0, y: -6 },
        { height: "auto", opacity: 1, y: 0, duration: DUR, ease: "back.out(1.6)" }
      );

      if (icon) {
        gsap.to(icon, {
          rotate: 180,
          duration: DUR,
          ease: "back.out(1.6)",
          transformOrigin: "50% 50%",
          transformBox: "fill-box"
        });
      }
    }

    items.forEach((item) => {
      const answer = item.querySelector(".faq_answer");
      if (!answer) return;

      // Initial state
      gsap.set(answer, { 
        height: 0, 
        opacity: 0, 
        y: -6, 
        overflow: "hidden", 
        display: "none" 
      });

      const icon = item.querySelector(".faq_icon");
      if (icon) {
        gsap.set(icon, { 
          rotate: 0, 
          transformOrigin: "50% 50%", 
          transformBox: "fill-box" 
        });
      }

      item.style.cursor = "pointer";

      item.addEventListener("click", () => {
        const isOpen = answer.classList.contains("is-open");

        // Close all others
        items.forEach((other) => {
          if (other !== item) closeItem(other);
        });

        // Toggle clicked item
        if (isOpen) {
          closeItem(item);
        } else {
          openItem(item);
        }
      });
    });

    console.log('[faq-accordion] ✅ FAQ accordion initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFAQ);
  } else {
    initFAQ();
  }
})();

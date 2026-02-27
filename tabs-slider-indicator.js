(() => {
  // ============================================================
  // TABS SLIDER INDICATOR - Animated underline for Webflow Tabs
  // Adds a sliding colored line under the active tab
  // Works with Webflow native Tabs component
  // ============================================================

  if (typeof gsap === 'undefined') {
    console.error('[tabs-slider-indicator] GSAP not loaded. Add GSAP CDN.');
    return;
  }

  console.log('[tabs-slider-indicator] Initializing...');

  function initTabsSlider() {
    // Find all tab menus - try both ARIA and Webflow classes
    let tabMenus = document.querySelectorAll('[role="tablist"]');
    
    // Fallback to Webflow classes if ARIA not found
    if (tabMenus.length === 0) {
      tabMenus = document.querySelectorAll('.tabs-grid, [class*="tabs-grid"]');
      console.log('[tabs-slider-indicator] Using Webflow class detection');
    }
    
    if (tabMenus.length === 0) {
      console.error('[tabs-slider-indicator] No tab menus found');
      return;
    }

    console.log(`[tabs-slider-indicator] Found ${tabMenus.length} tab menu(s)`);

    tabMenus.forEach((tabMenu, menuIndex) => {
      // Try ARIA first, then Webflow classes
      let tabs = tabMenu.querySelectorAll('[role="tab"]');
      
      if (tabs.length === 0) {
        // Select only elements that have BOTH div-tabs-* AND w-tab-link
        tabs = tabMenu.querySelectorAll('[class*="div-tabs-"][class*="w-tab-link"]');
        console.log(`[tabs-slider-indicator] Menu ${menuIndex + 1}: Using Webflow tab classes`);
      }
      
      if (tabs.length === 0) {
        console.warn(`[tabs-slider-indicator] Menu ${menuIndex + 1}: No tabs found`);
        return;
      }
      
      console.log(`[tabs-slider-indicator] Menu ${menuIndex + 1}: Found ${tabs.length} tabs`);

      // Get padding from .tabs-grid
      const menuStyle = getComputedStyle(tabMenu);
      const menuPaddingTop = parseFloat(menuStyle.paddingTop) || 0;
      const menuPaddingBottom = parseFloat(menuStyle.paddingBottom) || 0;
      
      // Create slider background (respects padding)
      const slider = document.createElement('div');
      slider.className = 'tabs-slider-indicator';
      slider.style.cssText = `
        position: absolute;
        top: ${menuPaddingTop}px;
        left: 0;
        height: calc(100% - ${menuPaddingTop + menuPaddingBottom}px);
        background-color: #2B2B2B;
        opacity: 0.5;
        transition: none;
        pointer-events: none;
        z-index: 1;
        border-radius: 20px;
      `;

      // Make sure parent is positioned
      if (getComputedStyle(tabMenu).position === 'static') {
        tabMenu.style.position = 'relative';
      }

      tabMenu.appendChild(slider);

      // Ensure tab text stays above the slider
      tabs.forEach(tab => {
        if (getComputedStyle(tab).position === 'static') {
          tab.style.position = 'relative';
        }
        tab.style.zIndex = '2';
      });

      // Function to update slider position
      function updateSlider(activeTab, animate = true) {
        // Check if activeTab itself is the link, or find link inside
        const linkElement = activeTab.classList.contains('w-tab-link') ? activeTab :
                           (activeTab.querySelector('a.w-tab-link') || 
                            activeTab.querySelector('a') || 
                            activeTab);
        
        const linkRect = linkElement.getBoundingClientRect();
        const menuRect = tabMenu.getBoundingClientRect();
        
        // Get padding from .tabs-grid and from the tab itself
        const menuStyle = getComputedStyle(tabMenu);
        const tabStyle = getComputedStyle(linkElement);
        
        const menuPaddingLeft = parseFloat(menuStyle.paddingLeft) || 0;
        const menuPaddingTop = parseFloat(menuStyle.paddingTop) || 0;
        const tabPaddingLeft = parseFloat(tabStyle.paddingLeft) || 0;
        const tabPaddingRight = parseFloat(tabStyle.paddingRight) || 0;
        const tabPaddingTop = parseFloat(tabStyle.paddingTop) || 0;
        const tabPaddingBottom = parseFloat(tabStyle.paddingBottom) || 0;
        
        // Position: account for menu padding, then add tab padding to go inside
        const left = (linkRect.left - menuRect.left) - menuPaddingLeft + tabPaddingLeft;
        const top = (linkRect.top - menuRect.top) - menuPaddingTop + tabPaddingTop;
        // Width/Height: full tab dimensions minus padding
        const width = linkRect.width - tabPaddingLeft - tabPaddingRight;
        const height = linkRect.height - tabPaddingTop - tabPaddingBottom;

        console.log(`[tabs-slider-indicator] Update slider:`, {
          activeTab: activeTab.textContent.trim(),
          left: left,
          width: width,
          linkRect: linkRect,
          menuRect: menuRect
        });

        if (animate) {
          gsap.to(slider, {
            x: left,
            y: top,
            width: width,
            height: height,
            duration: 0.4,
            ease: 'power2.out'
          });
        } else {
          gsap.set(slider, {
            x: left,
            y: top,
            width: width,
            height: height
          });
        }
      }

      // Find initial active tab - force first tab (div-tabs-1) if none active
      let initialActive = tabs[0]; // Always use first tab (div-tabs-1)
      
      // Activate first tab if not already active
      if (!initialActive.classList.contains('w--current')) {
        // Click the first tab to activate it
        initialActive.click();
      }
      
      console.log(`[tabs-slider-indicator] Menu ${menuIndex + 1}: Initial active tab:`, initialActive);
      updateSlider(initialActive, false);

      console.log(`[tabs-slider-indicator] Menu ${menuIndex + 1}: Slider initialized on tab "${initialActive.textContent.trim()}"`);

      // Watch for tab clicks
      tabs.forEach((tab, tabIndex) => {
        tab.addEventListener('click', () => {
          console.log(`[tabs-slider-indicator] Menu ${menuIndex + 1}: Tab ${tabIndex + 1} clicked`);
          
          // Small delay to let Webflow update classes
          setTimeout(() => {
            const activeTab = tabMenu.querySelector('[aria-selected="true"]') || 
                             tabMenu.querySelector('.w--current') ||
                             tab; // Fallback to clicked tab
            
            console.log(`[tabs-slider-indicator] Active tab after click:`, activeTab);
            
            if (activeTab) {
              updateSlider(activeTab, true);
            } else {
              console.warn(`[tabs-slider-indicator] No active tab found after click`);
            }
          }, 50);
        });
      });

      // Watch for attribute/class changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'aria-selected' || mutation.attributeName === 'class')) {
            const activeTab = tabMenu.querySelector('[aria-selected="true"]') || 
                             tabMenu.querySelector('.w--current');
            if (activeTab) {
              updateSlider(activeTab, true);
            }
          }
        });
      });

      tabs.forEach(tab => {
        observer.observe(tab, { attributes: true });
      });

      // Update on window resize
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const activeTab = tabMenu.querySelector('[aria-selected="true"]') || 
                           tabMenu.querySelector('.w--current');
          if (activeTab) {
            updateSlider(activeTab, false);
          }
        }, 100);
      });
    });

    console.log('[tabs-slider-indicator] ✅ All tab menus initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabsSlider);
  } else {
    initTabsSlider();
  }
})();

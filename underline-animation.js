(() => {
  // ============================================================
  // UNDERLINE ANIMATION - Animated underline on hover
  // Add underline="on" or data-underline="on" to any element
  // White 1px underline animates left to right on hover
  // ============================================================

  console.log('[underline-animation] Initializing...');

  // Inject CSS styles
  const style = document.createElement('style');
  style.textContent = `
/* Supporte underline="on" ET data-underline="on" au cas où */
[underline="on"],
[data-underline="on"]{
  position: relative !important;
  display: inline-block !important; /* underline à la largeur du texte */
  text-decoration: none !important;
  padding-bottom: 2px; /* garantit l'espace pour la ligne */
}

/* Underline 1px blanc, anim gauche -> droite */
[underline="on"]::after,
[data-underline="on"]::after{
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 1px !important;
  background-color: #ffffff !important;
  transform: scaleX(0) !important;
  transform-origin: left !important;
  transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1) !important;
  will-change: transform;
  pointer-events: none;
}

/* Hover + focus clavier */
[underline="on"]:hover::after,
[underline="on"]:focus-visible::after,
[data-underline="on"]:hover::after,
[data-underline="on"]:focus-visible::after{
  transform: scaleX(1) !important;
}
  `;

  document.head.appendChild(style);

  console.log('[underline-animation] ✅ Underline animation styles injected');

  // Count elements with underline attribute
  const elements = document.querySelectorAll('[underline="on"], [data-underline="on"]');
  console.log(`[underline-animation] Found ${elements.length} element(s) with underline animation`);
})();

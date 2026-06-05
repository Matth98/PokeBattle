import React from 'react';

/**
 * Bouton d'effacement pour les champs de recherche.
 * Utilise un SVG inline (cercle plein + croix blanche) pour un centrage parfait sur iOS.
 *
 * Props :
 *   onClick       — handler
 *   color         — couleur du cercle (classe Tailwind text-*, ex: "text-gray-400")
 *   size          — taille du SVG en px (défaut 20)
 *   aria-label    — label accessibilité
 */
export const ClearButton = ({ onClick, onMouseDown, color = 'text-gray-400', size = 20, 'aria-label': ariaLabel = 'Effacer' }) => (
  <button
    onClick={onClick}
    onMouseDown={onMouseDown}
    className={`flex-shrink-0 p-0 ${color}`}
    aria-label={ariaLabel}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="10" />
      <line x1="6.5" y1="6.5" x2="13.5" y2="13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="13.5" y1="6.5" x2="6.5" y2="13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  </button>
);

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
export const ClearButton = ({ onClick, onMouseDown, color = 'text-gray-400', strokeColor = '#f3f4f6', size = 20, 'aria-label': ariaLabel = 'Effacer' }) => (
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
      <line x1="7.5" y1="7.5" x2="12.5" y2="12.5" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12.5" y1="7.5" x2="7.5" y2="12.5" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </button>
);

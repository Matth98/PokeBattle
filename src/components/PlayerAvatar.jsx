import React, { useState } from 'react';

const AVATAR_PALETTE = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
];

export const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
};

export const initials = (name = '?') => name.trim().charAt(0).toUpperCase() || '?';

/**
 * Avatar de joueur : affiche la photo si présente, sinon initiale + couleur.
 * - size : taille en pixels (carré). Défaut 44.
 * - textSize : classe Tailwind pour la taille du texte initiale (ex 'text-base').
 */
export const PlayerAvatar = ({ player, size = 44, textSize = 'text-base', className = '' }) => {
  const name = player?.name || '';
  const avatar = player?.avatar;
  const style = { width: size, height: size };
  const [imgError, setImgError] = useState(false);

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        style={style}
        className={`rounded-full object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full flex items-center justify-center text-white font-black ${textSize} ${avatarColor(name)} ${className}`}
    >
      {initials(name)}
    </div>
  );
};

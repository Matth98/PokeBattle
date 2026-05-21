import React from 'react';
import { Home, Shield, Swords, Users } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Accueil', Icon: Home },
  { id: 'players', label: 'Joueurs', Icon: Users },
  { id: 'battles', label: 'Combats', Icon: Swords },
  { id: 'teams', label: 'Équipes', Icon: Shield },
];

export const Navigation = ({ currentTab, setCurrentTab, isDark, t, onCreateBattle }) => {
  // On considère qu'on est dans une "section" même quand on est dans la fiche détail
  const activeFor = (tab) => {
    if (currentTab === tab) return true;
    if (tab === 'players' && currentTab === 'playerDetail') return true;
    if (tab === 'teams' && currentTab === 'teamDetail') return true;
    if (tab === 'battles' && currentTab === 'battleDetail') return true;
    return false;
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 ${t.surfaceBlur} border-t ${t.divider} shadow-[0_-8px_28px_rgba(15,23,42,0.08)]`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 items-end px-3 pt-2 pb-2">
        {TABS.slice(0, 2).map(({ id, label, Icon }) => {
          const isActive = activeFor(id);
          return (
            <button
              key={id}
              onClick={() => setCurrentTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? t.accent : t.textTertiary
              }`}
              aria-pressed={isActive}
              aria-label={label}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.4 : 1.8}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}
              >
              {label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onCreateBattle}
          className="relative -mt-5 mx-auto flex flex-col items-center justify-end gap-1 text-amber-500"
          aria-label="Créer un combat"
        >
          <span className="w-[60px] h-[60px] rounded-full shadow-xl shadow-amber-500/30 active:scale-95 transition overflow-hidden flex items-center justify-center">
            {(() => { const fg = isDark ? 'black' : 'white'; return (
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g clipPath="url(#pokeball-clip)">
                <path d="M60 30C60 46.5688 46.5688 60 30 60C13.4312 60 0 46.5688 0 30C0 13.4312 13.4312 0 30 0C46.5688 0 60 13.4312 60 30Z" fill="url(#pokeball-grad)"/>
                <path d="M49 30C49 19.5066 40.4934 11 30 11C19.5066 11 11 19.5066 11 30C11 40.4934 19.5066 49 30 49V53C17.2975 53 7 42.7025 7 30C7 17.2975 17.2975 7 30 7C42.7025 7 53 17.2975 53 30C53 42.7025 42.7025 53 30 53V49C40.4934 49 49 40.4934 49 30Z" fill={fg}/>
                <path d="M20.5615 28C19.9659 28.9867 19.7898 30.2362 20.2891 31.458C20.367 31.6488 20.4585 31.8293 20.5605 32H8V28H20.5615ZM51 32H39.4502C39.9975 31.0732 40.1894 29.9071 39.7842 28.7441C39.6959 28.4741 39.5807 28.2274 39.4492 28H51V32Z" fill={fg}/>
                <path d="M33.5911 22.1843C33.9659 22.4487 34.0908 22.8894 33.9347 23.3008L31.4675 29.0598H35.9959C36.4331 29.0598 36.8079 29.2948 36.9328 29.6768C37.0889 30.0588 36.964 30.4701 36.6517 30.7346L27.6573 37.7864C27.2826 38.0508 26.7829 38.0802 26.4081 37.8157C26.0334 37.5513 25.9084 37.1106 26.0646 36.6992L28.5318 30.9402H24.0034C23.5974 30.9402 23.2226 30.7052 23.0665 30.3232C22.9103 29.9412 23.0352 29.5299 23.3788 29.2654L32.3731 22.2136C32.7167 21.9492 33.2164 21.9198 33.5911 22.1843Z" fill={fg}/>
              </g>
              <defs>
                <linearGradient id="pokeball-grad" x1="30" y1="0" x2="30" y2="60" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FBBC45"/>
                  <stop offset="1" stopColor="#FF7300"/>
                </linearGradient>
                <clipPath id="pokeball-clip">
                  <rect width="60" height="60" fill="white"/>
                </clipPath>
              </defs>
            </svg>
            ); })()}
          </span>
          <span className="text-xs tracking-wide font-bold">
            Match
          </span>
        </button>
        {TABS.slice(2).map(({ id, label, Icon }) => {
          const isActive = activeFor(id);
          return (
            <button
              key={id}
              onClick={() => setCurrentTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? t.accent : t.textTertiary
              }`}
              aria-pressed={isActive}
              aria-label={label}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.4 : 1.8}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

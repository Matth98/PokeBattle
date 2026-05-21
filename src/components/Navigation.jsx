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
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g clipPath="url(#pokeball-clip)">
                <path d="M60 30C60 46.5688 46.5688 60 30 60C13.4312 60 0 46.5688 0 30C0 13.4312 13.4312 0 30 0C46.5688 0 60 13.4312 60 30Z" fill="#F49D0D"/>
                <circle cx="30" cy="30" r="21" stroke="white" strokeWidth="4"/>
                <rect x="8" y="28" width="43" height="4" fill="white"/>
                <path d="M31.458 21.0254C32.2434 20.4208 33.3655 20.3087 34.2764 20.8428L34.4561 20.959L34.626 21.0889C35.4384 21.7695 35.7072 22.8575 35.3369 23.833L35.3262 23.8623L35.3135 23.8916L33.7422 27.5596H35.9961C36.9213 27.5597 37.926 28.0643 38.3193 29.1094H38.3213C38.7502 30.1588 38.3721 31.2428 37.6211 31.8789L37.5996 31.8975L37.5771 31.915L28.583 38.9668L28.5527 38.9902L28.5225 39.0117C27.698 39.5935 26.5018 39.7176 25.543 39.041C24.5998 38.3753 24.2672 37.2074 24.6621 36.167L24.6855 36.1084L26.2578 32.4404H24.0029C23.025 32.4403 22.0781 31.87 21.6777 30.8906C21.2437 29.8285 21.6347 28.7222 22.4541 28.085L31.4473 21.0332L31.458 21.0254Z" fill="white" stroke="#F49D0D" strokeWidth="3"/>
              </g>
              <defs>
                <clipPath id="pokeball-clip">
                  <rect width="60" height="60" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </span>
          <span className="text-xs tracking-wide font-bold">
            Combat
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

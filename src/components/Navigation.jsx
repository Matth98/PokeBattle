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
      className={`fixed bottom-0 left-0 right-0 z-20 ${t.surfaceBlur} border-t ${t.divider} shadow-[0_-8px_28px_rgba(15,23,42,0.08)]`}
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
          className="relative -mt-5 mx-auto flex flex-col items-center justify-end gap-1"
          aria-label="Créer un combat"
        >
          <span className="w-[60px] h-[60px] rounded-full ring-[4px] ring-white flex items-center justify-center active:scale-95 transition">
            <img
              src={`${process.env.PUBLIC_URL}/pokeball-button.png`}
              alt=""
              className="w-[60px] h-[60px]"
              aria-hidden="true"
            />
          </span>
          <span className="text-xs tracking-wide font-bold" style={{ color: '#E88700' }}>
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

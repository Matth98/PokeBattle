import React from 'react';
import { Home, Users, Zap, Shield } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Accueil', Icon: Home },
  { id: 'players', label: 'Joueurs', Icon: Users },
  { id: 'teams', label: 'Équipes', Icon: Shield },
  { id: 'battles', label: 'Combats', Icon: Zap },
];

export const Navigation = ({ currentTab, setCurrentTab, isDark, t }) => {
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
      className={`fixed bottom-0 left-0 right-0 ${t.surfaceBlur} border-t ${t.divider}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around px-2 pt-2 pb-2">
        {TABS.map(({ id, label, Icon }) => {
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

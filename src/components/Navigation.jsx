import React from 'react';
import { Home, Shield, Swords, Users } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const TABS = [
  { id: 'home', Icon: Home, key: 'nav.home' },
  { id: 'players', Icon: Users, key: 'nav.players' },
  { id: 'battles', Icon: Swords, key: 'nav.battles' },
  { id: 'teams', Icon: Shield, key: 'nav.teams' },
];

export const Navigation = ({ currentTab, setCurrentTab, isDark, t, onCreateBattle, hidden = false, badgeCounts = {} }) => {
  const tr = useTranslation();
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
      className={`fixed bottom-0 left-0 right-0 z-20 ${t.surfaceBlur} border-t ${t.divider} shadow-[0_-8px_28px_rgba(15,23,42,0.08)] transition-[transform,opacity] duration-[280ms] ease-in-out ${hidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 items-end px-3 pt-2 pb-2">
        {TABS.slice(0, 2).map(({ id, key, Icon }) => {
          const isActive = activeFor(id);
          const label = tr(key);
          const badge = badgeCounts[id] || 0;
          return (
            <button
              key={id}
              data-tour={`nav-${id}`}
              onClick={() => setCurrentTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? t.accent : t.textTertiary
              }`}
              aria-pressed={isActive}
              aria-label={label}
            >
              <span className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-[3px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                    {badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
        <button
          data-tour="nav-battle-btn"
          onClick={onCreateBattle}
          className="relative -mt-5 mx-auto flex flex-col items-center justify-end gap-1"
          aria-label="Créer un combat"
        >
          <span className={`w-[60px] h-[60px] rounded-full ring-[5px] ${isDark ? 'ring-black' : 'ring-white'} flex items-center justify-center active:scale-95 transition`}>
            <img
              src={`${process.env.PUBLIC_URL}/pokeball-button.png`}
              alt=""
              className="w-[60px] h-[60px]"
              aria-hidden="true"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </span>
          <span className="text-xs tracking-wide font-bold" style={{ background: 'linear-gradient(90deg, #FF9D38 0.18%, #E35BEE 100.18%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Match
          </span>
        </button>
        {TABS.slice(2).map(({ id, key, Icon }) => {
          const isActive = activeFor(id);
          const label = tr(key);
          const badge = badgeCounts[id] || 0;
          return (
            <button
              key={id}
              data-tour={`nav-${id}`}
              onClick={() => setCurrentTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? t.accent : t.textTertiary
              }`}
              aria-pressed={isActive}
              aria-label={label}
            >
              <span className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-[3px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                    {badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

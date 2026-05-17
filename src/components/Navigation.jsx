import React from 'react';
import { Home, Users, Zap, Shield } from 'lucide-react';

export const Navigation = ({ currentTab, setCurrentTab, isDark, t }) => (
  <div className={`fixed bottom-0 left-0 right-0 ${t.headerBg} border-t ${t.headerBorder} flex justify-around py-4`}>
    <button
      onClick={() => setCurrentTab('home')}
      className={`flex flex-col items-center ${currentTab === 'home' ? 'text-orange-500' : t.textSecondary}`}
    >
      <Home size={24} />
      <span className="text-xs mt-1">Accueil</span>
    </button>
    <button
      onClick={() => setCurrentTab('players')}
      className={`flex flex-col items-center ${currentTab === 'players' ? 'text-orange-500' : t.textSecondary}`}
    >
      <Users size={24} />
      <span className="text-xs mt-1">Joueurs</span>
    </button>
    <button
      onClick={() => setCurrentTab('teams')}
      className={`flex flex-col items-center ${currentTab === 'teams' ? 'text-orange-500' : t.textSecondary}`}
    >
      <Shield size={24} />
      <span className="text-xs mt-1">Équipes</span>
    </button>
    <button
      onClick={() => setCurrentTab('battles')}
      className={`flex flex-col items-center ${currentTab === 'battles' ? 'text-orange-500' : t.textSecondary}`}
    >
      <Zap size={24} />
      <span className="text-xs mt-1">Combats</span>
    </button>
  </div>
);

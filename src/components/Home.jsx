import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { formatDate } from '../utils/dates';

export const Home = ({ players, battles, teams, isDark, setIsDark, t, setCurrentTab, setSelectedBattle }) => {
  const recentBattles = [...battles]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 3);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${t.bg}`}>
      <div className={`${t.headerBg} pt-12 pb-8 px-6 border-b ${t.headerBorder}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className={`text-4xl font-black ${t.text}`}>PokéScores</h1>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <p className={`${t.textSecondary}`}>Enregistrez vos combats Pokémon & analysez vos équipes.</p>
      </div>

      <div className="px-6 mt-8 pb-32 space-y-8">
        <div className="grid grid-cols-3 gap-3">
          <div className={`${t.bgPrimary} rounded-2xl p-4 border ${t.border} text-center`}>
            <p className={`text-2xl font-black ${t.text}`}>{players.length}</p>
            <p className={`${t.textSecondary} text-xs mt-1`}>Joueurs</p>
          </div>
          <div className={`${t.bgPrimary} rounded-2xl p-4 border ${t.border} text-center`}>
            <p className={`text-2xl font-black ${t.text}`}>{teams.length}</p>
            <p className={`${t.textSecondary} text-xs mt-1`}>Équipes</p>
          </div>
          <div className={`${t.bgPrimary} rounded-2xl p-4 border ${t.border} text-center`}>
            <p className={`text-2xl font-black ${t.text}`}>{battles.length}</p>
            <p className={`${t.textSecondary} text-xs mt-1`}>Combats</p>
          </div>
        </div>

        <div>
          <h2 className={`text-xl font-black ${t.text} mb-4`}>📊 Combats récents</h2>
          {recentBattles.length === 0 ? (
            <div className={`${t.bgPrimary} rounded-2xl p-6 border ${t.border} text-center ${t.textSecondary}`}>
              Aucun combat
            </div>
          ) : (
            recentBattles.map(b => {
              const p1 = players.find(p => p._id === b.player1);
              const p2 = players.find(p => p._id === b.player2);
              const p1Elim = (b.team1 || []).filter(p => p.eliminated).length;
              const p2Elim = (b.team2 || []).filter(p => p.eliminated).length;

              return (
                <button
                  key={b._id}
                  onClick={() => {
                    setSelectedBattle(b);
                    setCurrentTab('battleDetail');
                  }}
                  className={`w-full ${t.bgPrimary} rounded-2xl p-6 border ${t.border} mb-3 text-center hover:shadow-md transition`}
                >
                  <div className="text-center mb-4">
                    <span className="inline-block bg-orange-500 bg-opacity-20 text-orange-500 px-3 py-1 rounded-full font-bold text-xs">
                      {b.format}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4 mb-4">
                    <p className={`font-black text-lg ${b.winner === 'player1' ? 'text-orange-500' : t.text}`}>
                      {p1?.name}
                    </p>
                    <p className="font-black text-3xl text-orange-500">{p2Elim} - {p1Elim}</p>
                    <p className={`font-black text-lg ${b.winner === 'player2' ? 'text-orange-500' : t.text}`}>
                      {p2?.name}
                    </p>
                  </div>
                  <p className={`${t.textSecondary} text-xs flex items-center justify-center gap-2`}>
                    <span>📅</span>
                    <span>{formatDate(b.date)}</span>
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

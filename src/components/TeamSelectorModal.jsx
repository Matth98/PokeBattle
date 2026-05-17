import React from 'react';

/**
 * Modal de sélection d'une équipe pour un joueur, filtrée par format.
 *
 * Props :
 * - t, isDark : thème
 * - teams : liste complète des équipes
 * - playerId : id du joueur dont on veut les équipes
 * - format : format du combat ('1v1' | '2v2') — seules les équipes de ce format sont affichées
 * - onSelect(team) : appelé quand une équipe est choisie
 * - onClose() : fermeture
 */
export const TeamSelectorModal = ({
  t,
  isDark,
  teams = [],
  playerId,
  format,
  onSelect,
  onClose,
}) => {
  const filtered = teams.filter(
    (team) =>
      team.ownerId === playerId &&
      team.format === format
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex flex-col">
      <div className={`${t.bgPrimary} flex-1 overflow-y-auto flex flex-col`}>
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className={`text-2xl font-black ${t.text} mb-4`}>Sélectionner une équipe</h2>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className={`${t.textSecondary} mb-2`}>
                Aucune équipe au format {format} pour ce joueur
              </p>
              <p className={`${t.textSecondary} text-sm`}>
                Crée d'abord une équipe depuis l'onglet Équipes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((team) => (
                <button
                  key={team._id}
                  onClick={() => onSelect(team)}
                  className={`w-full ${t.bgPrimary} rounded-lg p-4 border ${t.border} text-left hover:shadow-md transition`}
                >
                  <h3 className={`font-black ${t.text}`}>{team.name}</h3>
                  <p className={`${t.textSecondary} text-sm`}>
                    {team.format} · {team.pokemon?.length || 0} Pokémon
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`border-t ${t.headerBorder} p-6`}>
          <button
            onClick={onClose}
            className={`w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} py-3 rounded-xl font-bold`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

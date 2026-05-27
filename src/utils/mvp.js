/**
 * Table des types super-efficaces (attaquant → défenseurs vulnérables).
 * Partagée par BattleDetail, PlayerDetail et Home.
 */
export const TYPE_SUPER_EFFECTIVE = {
  normal:   [],
  fire:     ['grass','ice','bug','steel'],
  water:    ['fire','ground','rock'],
  electric: ['water','flying'],
  grass:    ['water','ground','rock'],
  ice:      ['grass','ground','flying','dragon'],
  fighting: ['normal','ice','rock','dark','steel'],
  poison:   ['grass','fairy'],
  ground:   ['fire','electric','poison','rock','steel'],
  flying:   ['grass','fighting','bug'],
  psychic:  ['fighting','poison'],
  bug:      ['grass','psychic','dark'],
  rock:     ['fire','ice','flying','bug'],
  ghost:    ['psychic','ghost'],
  dragon:   ['dragon'],
  dark:     ['psychic','ghost'],
  steel:    ['ice','rock','fairy'],
  fairy:    ['fighting','dragon','dark'],
};

/**
 * Calcule le score d'avantage de types d'un Pokémon contre une équipe adverse.
 * @param {number[]} myTypes   - types du Pokémon évalué
 * @param {number[][]} oppTypes - tableau des types de chaque Pokémon adverse
 */
export const calcTypeAdv = (myTypes, oppTypes) => {
  let score = 0;
  for (const mt of myTypes) {
    const se = TYPE_SUPER_EFFECTIVE[mt] || [];
    for (const oppTypeList of oppTypes) {
      for (const ot of oppTypeList) {
        if (se.includes(ot)) score++;
      }
    }
  }
  return score;
};

/**
 * Retourne le Pokémon MVP d'un combat : le survivant de n'importe quelle équipe
 * avec le plus grand avantage de types contre l'équipe adverse.
 *
 * @param {object} battle      - document bataille (team1, team2, winner)
 * @param {object} pokemonTypes - map pokeId → string[]
 * @returns {{ pokeId, name, winningSide: 'team1'|'team2' } | null}
 */
export const computeBattleMvp = (battle, pokemonTypes) => {
  if (!battle) return null;

  // On considère les survivants des DEUX équipes pour élire le MVP du match
  const candidates = [
    ...(battle.team1 || []).filter(p => !p.eliminated).map(p => ({ ...p, side: 'team1', oppTeam: battle.team2 || [] })),
    ...(battle.team2 || []).filter(p => !p.eliminated).map(p => ({ ...p, side: 'team2', oppTeam: battle.team1 || [] })),
  ];
  if (candidates.length === 0) return null;

  const scored = candidates.map(p => ({
    ...p,
    score: calcTypeAdv(
      pokemonTypes[p.pokeId] || [],
      p.oppTeam.map(o => pokemonTypes[o.pokeId] || []),
    ),
  }));

  return scored.reduce((best, cur) => cur.score > best.score ? cur : best);
};

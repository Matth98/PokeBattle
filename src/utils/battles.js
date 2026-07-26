export const getBattleDateKey = (battle) => {
  if (battle?.date) return battle.date;
  if (battle?.timestamp) return new Date(battle.timestamp).toISOString().split('T')[0];
  return '';
};

export const getBattleSortTime = (battle) => {
  if (battle?.date) {
    // La date choisie fait toujours foi : le timestamp de création ne sert qu'à
    // départager les combats d'une même date (voir getBattleCreatedAt), jamais à
    // la remplacer — sinon un combat daté rétroactivement remonterait quand même
    // en tête via son heure de création.
    if (battle.time) return new Date(`${battle.date}T${battle.time}:00`).getTime();
    return new Date(`${battle.date}T00:00:00`).getTime();
  }
  if (battle?.timestamp) return new Date(battle.timestamp).getTime();
  return 0;
};

// Horodatage de création d'un combat — départage les combats à date/heure identiques
export const getBattleCreatedAt = (battle) => {
  if (battle?.timestamp) return new Date(battle.timestamp).getTime();
  if (battle?.createdAt) return new Date(battle.createdAt).getTime();
  return 0;
};

const compareBattlesChronological = (a, b) => {
  const diff = getBattleSortTime(a) - getBattleSortTime(b);
  if (diff !== 0) return diff;
  return getBattleCreatedAt(a) - getBattleCreatedAt(b);
};

export const sortBattlesAsc = (battles = []) => [...battles].sort(compareBattlesChronological);

export const sortBattlesDesc = (battles = []) =>
  [...battles].sort((a, b) => compareBattlesChronological(b, a));

export const groupBattlesByDate = (battles = []) => {
  const groups = [];
  const groupByDate = new Map();

  for (const battle of battles) {
    const dateKey = getBattleDateKey(battle);
    if (!groupByDate.has(dateKey)) {
      const group = { date: dateKey, battles: [] };
      groupByDate.set(dateKey, group);
      groups.push(group);
    }
    groupByDate.get(dateKey).battles.push(battle);
  }

  // Trier les groupes du plus récent au plus ancien
  groups.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  // Dans chaque groupe, trier du plus récent au plus ancien (heure saisie, puis heure de création)
  for (const group of groups) {
    group.battles.sort((a, b) => compareBattlesChronological(b, a));
  }

  return groups;
};

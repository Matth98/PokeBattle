export const getBattleDateKey = (battle) => {
  if (battle?.date) return battle.date;
  if (battle?.timestamp) return new Date(battle.timestamp).toISOString().split('T')[0];
  return '';
};

export const getBattleSortTime = (battle) => {
  if (battle?.date) {
    if (battle.time) return new Date(`${battle.date}T${battle.time}:00`).getTime();
    // Pas d'heure saisie : utiliser le timestamp de création pour départager les combats du même jour
    if (battle?.timestamp) return new Date(battle.timestamp).getTime();
    return new Date(`${battle.date}T00:00:00`).getTime();
  }
  if (battle?.timestamp) return new Date(battle.timestamp).getTime();
  return 0;
};

export const sortBattlesDesc = (battles = []) =>
  [...battles].sort((a, b) => getBattleSortTime(b) - getBattleSortTime(a));

// Horodatage de création d'un combat — utilisé pour le tri intra-groupe
const getBattleCreatedAt = (battle) => {
  if (battle?.timestamp) return new Date(battle.timestamp).getTime();
  if (battle?.createdAt) return new Date(battle.createdAt).getTime();
  return 0;
};

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

  // Dans chaque groupe, trier du plus récent au plus ancien (heure saisie, puis heure de création)
  for (const group of groups) {
    group.battles.sort((a, b) => {
      const timeDiff = getBattleSortTime(b) - getBattleSortTime(a);
      if (timeDiff !== 0) return timeDiff;
      return getBattleCreatedAt(b) - getBattleCreatedAt(a);
    });
  }

  return groups;
};

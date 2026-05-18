export const getBattleDateKey = (battle) => {
  if (battle?.date) return battle.date;
  if (battle?.timestamp) return new Date(battle.timestamp).toISOString().split('T')[0];
  return '';
};

export const getBattleSortTime = (battle) => {
  if (battle?.timestamp) return new Date(battle.timestamp).getTime();
  if (battle?.date) return new Date(`${battle.date}T00:00:00`).getTime();
  return 0;
};

export const sortBattlesDesc = (battles = []) =>
  [...battles].sort((a, b) => getBattleSortTime(b) - getBattleSortTime(a));

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

  return groups;
};

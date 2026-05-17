export const formatDate = (dateStr) => {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const jour = String(dateObj.getDate()).padStart(2, '0');
  const mois = String(dateObj.getMonth() + 1).padStart(2, '0');
  const annee = dateObj.getFullYear();
  return `${jour}/${mois}/${annee}`;
};

export const getTodayDate = () => new Date().toISOString().split('T')[0];

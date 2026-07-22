export function computeStreak(dates: string[]) {
  const set = new Set(dates.map(d => d.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

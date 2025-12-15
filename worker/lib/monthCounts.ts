import type { Entry, MonthCount } from "./types";

export const monthCounts = (entries: Entry[]): MonthCount[] => {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    counts[month] = (counts[month] || 0) + 1;
  }
  return Object.keys(counts)
    .sort()
    .map((month) => ({ date: `${month}-01`, count: counts[month] }));
};

import { Entry, Meta, MonthCount } from "./types";

export const buildMeta = (entries: Entry[], months: MonthCount[], source: string): Meta => {
  const latestEntryDate =
    entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), "") || null;

  return {
    total_entries: entries.length,
    total_months: months.length,
    latest_entry_date: latestEntryDate,
    source,
    generated_at: new Date().toISOString()
  };
};

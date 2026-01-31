import type { Entry, Meta, MonthCount } from "./types";

export const buildMeta = (entries: Entry[], months: MonthCount[]): Meta => ({
  total_entries: entries.length,
  total_months: months.length,
  generated_at: new Date().toISOString(),
});

export type Entry = { date: string; body: string };
export type MonthCount = { date: string; count: number };
export type Meta = {
  total_entries: number;
  total_months: number;
  generated_at: string;
};

export const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    year: "numeric",
  });

export const monthLabel = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d)) {
    const fallback = iso.slice(0, 7).split("-");
    return `${fallback[0]?.slice(2)}年${fallback[1]}月`;
  }
  const year = String(d.getFullYear()).slice(2);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}年${month}月`;
};

export const yen = (n) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

export const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

export const latestEntryDate = (entries) =>
  entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), "") || null;

export const normalizeMeta = (entries, months, meta) => ({
  totalEntries: meta?.total_entries ?? entries.length,
  totalMonths: meta?.total_months ?? months.length,
  latestEntryDate: meta?.latest_entry_date ?? latestEntryDate(entries),
  generatedAt: meta?.generated_at ?? null,
  source: meta?.source ?? "unknown",
});

export const ensureArray = (value) => (Array.isArray(value) ? value : []);

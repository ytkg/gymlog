import { dom } from "./dom.js";
import { MONTHLY_FEE } from "./constants.js";
import { hideChart, renderSparkline } from "./chart.js";
import { setStatus } from "./ui.js";
import { currentMonthKey, ensureArray, formatDate, formatDateTime, monthLabel, normalizeMeta, yen } from "./utils.js";

export const renderEntries = (entries) => {
  if (!dom.entries) return;

  if (!entries.length) {
    dom.entries.innerHTML = '<div class="empty">記録がまだありません。</div>';
    return;
  }

  const fragments = entries
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (entry) => `
        <article class="entry">
          <div class="entry-date">
            <span class="dot" aria-hidden="true"></span>
            <span>${formatDate(entry.date)}</span>
          </div>
          <div class="entry-body">${entry.body ? entry.body.replace(/\n/g, "<br>") : ""}</div>
        </article>
      `
    )
    .join("");

  dom.entries.innerHTML = fragments;
};

export const renderStats = (entries, months, meta) => {
  if (!dom.stats) return;
  if (!entries.length) {
    dom.stats.innerHTML = "";
    return;
  }

  const total = meta.totalEntries;
  const totalMonths = meta.totalMonths;
  const currentKey = currentMonthKey();
  const currentMonth = months.find((m) => m.date === currentKey);
  const currentCount = currentMonth ? currentMonth.count : 0;
  const currentPrice = currentCount > 0 ? yen(MONTHLY_FEE / currentCount) : null;
  const latestEntry = meta.latestEntryDate ? formatDate(meta.latestEntryDate) : "なし";

  dom.stats.innerHTML = `
    <div class="stat">
      <div class="stat-label">総エントリー</div>
      <div class="stat-value">${total}</div>
      <div class="stat-hint">これまでの積み重ね（${totalMonths} か月）</div>
    </div>
    <div class="stat">
      <div class="stat-label">今月の回数</div>
      <div class="stat-value">${currentCount}</div>
      <div class="stat-hint">${monthLabel(currentKey)} の記録数</div>
    </div>
    ${
      currentPrice
        ? `<div class="stat">
             <div class="stat-label">1回あたり</div>
             <div class="stat-value">${currentPrice}</div>
             <div class="stat-hint">${monthLabel(currentKey)} 時点</div>
           </div>`
        : ""
    }
    <div class="stat">
      <div class="stat-label">最新の記録</div>
      <div class="stat-value">${latestEntry}</div>
      <div class="stat-hint">ソース: ${meta.source}</div>
    </div>
  `;
};

export const renderAll = (data) => {
  const entries = ensureArray(data.entries);
  const months = ensureArray(data.month_counts);
  const meta = normalizeMeta(entries, months, data.meta);

  renderEntries(entries);
  renderSparkline(months);
  renderStats(entries, months, meta);

  if (meta.generatedAt) {
    setStatus(`更新完了 (${formatDateTime(meta.generatedAt)})`);
  } else {
    setStatus("更新完了");
  }
};

export const clearViewsForError = () => {
  if (dom.stats) dom.stats.innerHTML = "";
  hideChart("読み込みエラー");
};


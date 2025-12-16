import { hideChart, renderSparkline } from "./chart.js";
import { MONTHLY_FEE } from "./constants.js";
import { dom } from "./dom.js";
import { state } from "./state.js";
import { setStatus } from "./ui.js";
import {
  currentMonthKey,
  ensureArray,
  escapeHtml,
  formatDate,
  formatDateTime,
  monthLabel,
  normalizeMeta,
  yen,
} from "./utils.js";

const computeMonthKey = (isoDate) => String(isoDate).slice(0, 7);

const filterEntries = (entries, filters) => {
  const query = (filters.query || "").trim().toLowerCase();
  const month = filters.month || "all";

  return entries.filter((entry) => {
    if (month !== "all" && computeMonthKey(entry.date) !== month) return false;
    if (!query) return true;
    return `${entry.date}\n${entry.body || ""}`.toLowerCase().includes(query);
  });
};

const groupEntriesByMonth = (entries) => {
  const groups = new Map();
  for (const entry of entries) {
    const key = computeMonthKey(entry.date);
    const list = groups.get(key) || [];
    list.push(entry);
    groups.set(key, list);
  }
  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({
      key,
      list: list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));
};

export const renderEntries = (entries, meta) => {
  if (!dom.entries) return;

  if (!entries.length) {
    dom.entries.innerHTML = '<div class="empty">条件に一致する記録がありません。</div>';
    return;
  }

  const groups = groupEntriesByMonth(entries);
  dom.entries.innerHTML = groups
    .map(({ key, list }) => {
      const title = monthLabel(`${key}-01`);
      const items = list
        .map(
          (entry) => `
            <article class="entry">
              <div class="entry-date">
                <span class="dot" aria-hidden="true"></span>
                <span>${formatDate(entry.date)}</span>
              </div>
              <div class="entry-body">${entry.body ? escapeHtml(entry.body).replace(/\n/g, "<br>") : ""}</div>
            </article>
          `
        )
        .join("");
      return `
        <section class="month-group">
          <div class="month-head">
            <div class="month-title">${title}</div>
            <div class="month-count">${list.length} 件</div>
          </div>
          <div class="month-items">${items}</div>
        </section>
      `;
    })
    .join("");

  if (dom.entriesSummary && meta) {
    const query = state.filters.query ? ` / 検索: "${escapeHtml(state.filters.query)}"` : "";
    const month =
      state.filters.month !== "all" ? ` / 月: ${monthLabel(`${state.filters.month}-01`)}` : "";
    dom.entriesSummary.textContent = `${entries.length} 件表示${month}${query}`;
  }
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
  const latestEntry = meta.latestEntryDate ? formatDate(meta.latestEntryDate) : "なし";
  const totalCost = totalMonths * MONTHLY_FEE;
  const overallCostPerEntry = total > 0 ? yen(totalCost / total) : "—";
  const avgPerMonth = totalMonths > 0 ? (total / totalMonths).toFixed(1) : "—";
  const currentPrice = currentCount > 0 ? yen(MONTHLY_FEE / currentCount) : "—";
  const updatedAt = meta.generatedAt ? formatDateTime(meta.generatedAt) : "—";

  dom.stats.innerHTML = `
    <div class="stat">
      <div class="stat-label">合計</div>
      <div class="stat-value">${total}</div>
      <div class="stat-hint">${totalMonths} か月分</div>
    </div>
    <div class="stat">
      <div class="stat-label">今月</div>
      <div class="stat-value">${currentCount}</div>
      <div class="stat-hint">${monthLabel(currentKey)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">円/回（今月）</div>
      <div class="stat-value">${currentPrice}</div>
      <div class="stat-hint">月額 ${yen(MONTHLY_FEE)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">最新</div>
      <div class="stat-value">${latestEntry}</div>
      <div class="stat-hint">更新: ${updatedAt}</div>
    </div>
    <div class="stat">
      <div class="stat-label">平均/月</div>
      <div class="stat-value">${avgPerMonth}</div>
      <div class="stat-hint">回 / 月</div>
    </div>
    <div class="stat">
      <div class="stat-label">円/回（全体）</div>
      <div class="stat-value">${overallCostPerEntry}</div>
      <div class="stat-hint">月額×月数 / 合計</div>
    </div>
  `;
};

export const renderMonths = (months) => {
  if (!dom.months) return;
  const sorted = ensureArray(months)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!sorted.length) {
    dom.months.innerHTML = '<div class="empty">月別データがありません。</div>';
    return;
  }

  const total = sorted.reduce((acc, m) => acc + (m.count || 0), 0);
  if (dom.monthsNote) dom.monthsNote.textContent = `${sorted.length} か月 / 合計 ${total} 回`;

  dom.months.innerHTML = `
    <div class="months-head">
      <div>月</div>
      <div class="months-num">回数</div>
      <div class="months-num">円/回</div>
    </div>
    ${sorted
      .map((m) => {
        const label = monthLabel(m.date);
        const per = m.count > 0 ? yen(MONTHLY_FEE / m.count) : "—";
        return `
          <div class="months-row">
            <div class="months-month">${label}</div>
            <div class="months-num">${m.count}</div>
            <div class="months-num">${per}</div>
          </div>
        `;
      })
      .join("")}
  `;
};

const buildMonthOptions = (months) => {
  const options = ensureArray(months)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((m) => ({ value: computeMonthKey(m.date), label: monthLabel(m.date) }));

  return [{ value: "all", label: "すべて" }, ...options];
};

const bindControlsOnce = (months) => {
  if (state.uiBound) return;
  state.uiBound = true;
  if (!dom.search || !dom.monthFilter || !dom.clearFilters) return;

  dom.monthFilter.innerHTML = buildMonthOptions(months)
    .map((o) => `<option value="${o.value}">${escapeHtml(o.label)}</option>`)
    .join("");

  const apply = () => {
    const query = dom.search?.value ?? "";
    const month = dom.monthFilter?.value ?? "all";
    state.filters = { query, month };

    const { entries, months: storedMonths, meta } = state.data || {};
    if (!entries || !storedMonths || !meta) return;

    const filtered = filterEntries(entries, state.filters);
    renderEntries(filtered, meta);
    renderSparkline(storedMonths);
    renderStats(entries, storedMonths, meta);
    renderMonths(storedMonths);
  };

  dom.search.addEventListener("input", apply);
  dom.monthFilter.addEventListener("change", apply);
  dom.clearFilters.addEventListener("click", () => {
    dom.search.value = "";
    dom.monthFilter.value = "all";
    apply();
  });
};

export const renderAll = (data) => {
  const entries = ensureArray(data.entries);
  const months = ensureArray(data.month_counts);
  const meta = normalizeMeta(entries, months, data.meta);

  state.data = { entries, months, meta };
  bindControlsOnce(months);

  const filtered = filterEntries(entries, state.filters);
  renderEntries(filtered, meta);
  renderSparkline(months);
  renderStats(entries, months, meta);
  renderMonths(months);

  if (meta.generatedAt) {
    setStatus(`更新完了 (${formatDateTime(meta.generatedAt)})`);
  } else {
    setStatus("更新完了");
  }
};

export const clearViewsForError = () => {
  if (dom.stats) dom.stats.innerHTML = "";
  if (dom.months) dom.months.innerHTML = "";
  if (dom.entriesSummary) dom.entriesSummary.textContent = "";
  hideChart("読み込みエラー");
};

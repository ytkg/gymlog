const MONTHLY_FEE = 7678;
const CHART_LIMIT = 8;

const dom = {
  entries: document.getElementById("entries"),
  stats: document.getElementById("stats"),
  status: document.querySelector("[data-status]"),
  sparklineStatus: document.getElementById("sparkline-status"),
  sparklineCanvas: document.getElementById("recent-chart"),
  sparklineEmpty: document.getElementById("sparkline-empty"),
  hint: document.getElementById("hint")
};

const state = {
  chart: null,
  isFile: window.location.protocol === "file:"
};

const setStatus = (text) => {
  if (dom.status) dom.status.textContent = text;
};

const showHint = () => {
  if (dom.hint) dom.hint.hidden = false;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    year: "numeric"
  });

const monthLabel = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d)) {
    const fallback = iso.slice(0, 7).split("-");
    return `${fallback[0]?.slice(2)}年${fallback[1]}月`;
  }
  const year = String(d.getFullYear()).slice(2);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}年${month}月`;
};

const yen = (n) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const destroyChart = () => {
  if (!state.chart) return;
  state.chart.destroy();
  state.chart = null;
};

const hideChart = (message) => {
  destroyChart();
  if (dom.sparklineEmpty) {
    if (message) dom.sparklineEmpty.textContent = message;
    dom.sparklineEmpty.hidden = false;
    dom.sparklineEmpty.style.display = "flex";
  }
  if (dom.sparklineCanvas) dom.sparklineCanvas.style.display = "none";
  if (dom.sparklineStatus) dom.sparklineStatus.textContent = "";
};

const showChart = () => {
  if (dom.sparklineEmpty) {
    dom.sparklineEmpty.hidden = true;
    dom.sparklineEmpty.style.display = "none";
  }
  if (dom.sparklineCanvas) dom.sparklineCanvas.style.display = "block";
};

const renderEntries = (entries) => {
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

const buildChartConfig = (labels, counts, prices) => ({
  type: "line",
  data: {
    labels,
    datasets: [
      {
        type: "bar",
        label: "回数",
        data: counts,
        borderColor: "transparent",
        backgroundColor: "rgba(29, 211, 176, 0.7)",
        borderRadius: 6,
        yAxisID: "yCounts"
      },
      {
        label: "1回あたり価格",
        data: prices,
        borderColor: "#f4a949",
        backgroundColor: "rgba(244, 169, 73, 0.24)",
        tension: 0,
        pointRadius: 4,
        pointBackgroundColor: "#0a1021",
        pointBorderColor: "#f4a949",
        spanGaps: true,
        yAxisID: "yPrice"
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    scales: {
      x: {
        ticks: { color: "#e8eef8" },
        grid: { color: "rgba(255, 255, 255, 0.08)" }
      },
      yCounts: {
        position: "left",
        ticks: {
          color: "#e8eef8",
          stepSize: 1,
          precision: 0,
          callback: (value) => Math.round(value)
        },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        title: { display: true, text: "回数", color: "#e8eef8" },
        beginAtZero: true,
        min: 0,
        suggestedMin: 0
      },
      yPrice: {
        position: "right",
        ticks: {
          color: "#e8eef8",
          callback: (value) => yen(value)
        },
        grid: { drawOnChartArea: false, color: "rgba(255, 255, 255, 0.12)" },
        title: { display: true, text: "円/回", color: "#e8eef8" },
        beginAtZero: true,
        min: 0,
        suggestedMin: 0
      }
    },
    plugins: {
      legend: {
        labels: { color: "#e8eef8" }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === "yPrice") {
              return `${ctx.dataset.label}: ${yen(ctx.parsed.y)}`;
            }
            return `${ctx.dataset.label}: ${ctx.parsed.y} 回`;
          }
        }
      }
    }
  }
});

const renderSparkline = (months) => {
  if (!dom.sparklineCanvas) return;

  const sorted = ensureArray(months)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-CHART_LIMIT);

  if (!sorted.length) {
    hideChart("データなし");
    return;
  }

  if (typeof Chart === "undefined") {
    hideChart("Chart.js の読み込みに失敗しました");
    console.error("Chart.js not loaded");
    return;
  }

  const labels = sorted.map((m) => monthLabel(m.date));
  const counts = sorted.map((m) => m.count);
  const prices = sorted.map((m) => (m.count > 0 ? Math.round(MONTHLY_FEE / m.count) : null));

  showChart();
  destroyChart();

  const ctx = dom.sparklineCanvas.getContext("2d");
  if (!ctx) {
    hideChart("グラフの描画に失敗しました");
    return;
  }

  state.chart = new Chart(ctx, buildChartConfig(labels, counts, prices));
  if (dom.sparklineStatus) dom.sparklineStatus.textContent = `${sorted.length} か月表示`;
};

const renderStats = (entries, months) => {
  if (!dom.stats) return;
  if (!entries.length) {
    dom.stats.innerHTML = "";
    return;
  }

  const total = entries.length;
  const currentKey = currentMonthKey();
  const currentMonth = months.find((m) => m.date === currentKey);
  const currentCount = currentMonth ? currentMonth.count : 0;
  const currentPrice = currentCount > 0 ? yen(MONTHLY_FEE / currentCount) : null;

  dom.stats.innerHTML = `
    <div class="stat">
      <div class="stat-label">総エントリー</div>
      <div class="stat-value">${total}</div>
      <div class="stat-hint">これまでの積み重ね</div>
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
  `;
};

const renderAll = (data) => {
  const entries = ensureArray(data.entries);
  const months = ensureArray(data.month_counts);
  renderEntries(entries);
  renderSparkline(months);
  renderStats(entries, months);
  setStatus("更新完了");
};

const handleLoadError = (err) => {
  console.error(err);
  if (dom.entries) {
    dom.entries.innerHTML = '<div class="empty">データの取得に失敗しました。<br>logs.json が存在するか確認してください。</div>';
  }
  if (dom.stats) dom.stats.innerHTML = "";
  hideChart("データなし");
  setStatus("読み込みエラー");
  if (state.isFile) showHint();
};

const fetchLogs = async () => {
  const apiPath = "/api/logs.json";
  const res = await fetch(apiPath, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const init = async () => {
  if (state.isFile) {
    showHint();
    setStatus("ローカル閲覧には簡易サーバーが必要です");
  }

  try {
    const data = await fetchLogs();
    renderAll(data);
  } catch (err) {
    handleLoadError(err);
  }
};

init();

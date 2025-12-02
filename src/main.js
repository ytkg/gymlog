const MONTHLY_FEE = 7678;

const entriesEl = document.getElementById("entries");
const statsEl = document.getElementById("stats");
const statusEl = document.querySelector("[data-status]");
const sparklineStatusEl = document.getElementById("sparkline-status");
const recentChartCanvas = document.getElementById("recent-chart");
const sparklineEmptyEl = document.getElementById("sparkline-empty");
const hintEl = document.getElementById("hint");
const isFile = window.location.protocol === "file:";
let recentChart = null;

const showHint = () => {
  if (hintEl) hintEl.hidden = false;
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

const renderEntries = (entries) => {
  if (!entries.length) {
    entriesEl.innerHTML = '<div class="empty">記録がまだありません。</div>';
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

  entriesEl.innerHTML = fragments;
};


const renderSparkline = (months) => {
  if (!recentChartCanvas) return;

  if (!months || !months.length) {
    if (recentChart) {
      recentChart.destroy();
      recentChart = null;
    }
    if (sparklineEmptyEl) sparklineEmptyEl.hidden = false;
    recentChartCanvas.style.display = "none";
    if (sparklineStatusEl) sparklineStatusEl.textContent = "";
    return;
  }

  const sorted = months
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-8);

  if (!sorted.length) {
    if (recentChart) {
      recentChart.destroy();
      recentChart = null;
    }
    if (sparklineEmptyEl) sparklineEmptyEl.hidden = false;
    recentChartCanvas.style.display = "none";
    if (sparklineStatusEl) sparklineStatusEl.textContent = "";
    return;
  }

  if (typeof Chart === "undefined") {
    console.error("Chart.js not loaded");
    if (sparklineEmptyEl) {
      sparklineEmptyEl.textContent = "Chart.js の読み込みに失敗しました";
      sparklineEmptyEl.hidden = false;
    }
    recentChartCanvas.style.display = "none";
    return;
  }

  const labels = sorted.map((m) => monthLabel(m.date));
  const counts = sorted.map((m) => m.count);
  const prices = sorted.map((m) => (m.count > 0 ? Math.round(MONTHLY_FEE / m.count) : null));

  if (sparklineEmptyEl) {
    sparklineEmptyEl.hidden = true;
    sparklineEmptyEl.style.display = "none";
  }
  recentChartCanvas.style.display = "block";

  if (recentChart) recentChart.destroy();

  const ctx = recentChartCanvas.getContext("2d");
  recentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "回数",
          data: counts,
          borderColor: "#1dd3b0",
          backgroundColor: "rgba(29, 211, 176, 0.22)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#0a1021",
          pointBorderColor: "#1dd3b0",
          yAxisID: "yCounts"
        },
        {
          label: "1回あたり価格",
          data: prices,
          borderColor: "#f4a949",
          backgroundColor: "rgba(244, 169, 73, 0.24)",
          tension: 0.35,
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
          ticks: { color: "#e8eef8" },
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          title: { display: true, text: "回数", color: "#e8eef8" },
          beginAtZero: true
        },
        yPrice: {
          position: "right",
          ticks: {
            color: "#e8eef8",
            callback: (value) => yen(value)
          },
          grid: { drawOnChartArea: false, color: "rgba(255, 255, 255, 0.12)" },
          title: { display: true, text: "円/回", color: "#e8eef8" }
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
                const value = ctx.parsed.y;
                return `${ctx.dataset.label}: ${yen(value)}`;
              }
              return `${ctx.dataset.label}: ${ctx.parsed.y} 回`;
            }
          }
        }
      }
    }
  });

  if (sparklineStatusEl) sparklineStatusEl.textContent = `${sorted.length} か月表示`;
};


const renderStats = (entries, months) => {
  if (!entries.length) {
    statsEl.innerHTML = "";
    return;
  }

  const total = entries.length;
  const currentKey = currentMonthKey();
  const currentMonth = months.find((m) => m.date === currentKey);
  const currentCount = currentMonth ? currentMonth.count : 0;
  const currentPrice = currentCount > 0 ? yen(MONTHLY_FEE / currentCount) : null;

  statsEl.innerHTML = `
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

const loadData = async () => {
  try {
    const res = await fetch("./logs.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderEntries(data.entries || []);
    renderSparkline(data.month_counts || []);
    renderStats(data.entries || [], data.month_counts || []);
    if (statusEl) statusEl.textContent = "更新完了";
  } catch (err) {
    console.error(err);
    entriesEl.innerHTML = '<div class="empty">データの取得に失敗しました。<br>logs.json が存在するか確認してください。</div>';
    statsEl.innerHTML = "";
    if (recentChart) {
      recentChart.destroy();
      recentChart = null;
    }
    if (sparklineEmptyEl) {
      sparklineEmptyEl.hidden = false;
      sparklineEmptyEl.style.display = "flex";
    }
    if (recentChartCanvas) recentChartCanvas.style.display = "none";
    if (sparklineStatusEl) sparklineStatusEl.textContent = "";
    if (statusEl) statusEl.textContent = "読み込みエラー";
    if (isFile) showHint();
  }
};

if (isFile) {
  showHint();
  if (statusEl) statusEl.textContent = "ローカル閲覧には簡易サーバーが必要です";
}

loadData();

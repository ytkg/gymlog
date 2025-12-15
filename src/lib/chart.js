import { dom } from "./dom.js";
import { state } from "./state.js";
import { CHART_LIMIT, MONTHLY_FEE } from "./constants.js";
import { ensureArray, monthLabel, yen } from "./utils.js";

const destroyChart = () => {
  if (!state.chart) return;
  state.chart.destroy();
  state.chart = null;
};

export const hideChart = (message) => {
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

export const renderSparkline = (months) => {
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


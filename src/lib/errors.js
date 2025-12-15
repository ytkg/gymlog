import { dom } from "./dom.js";
import { state } from "./state.js";
import { hideChart } from "./chart.js";
import { setEntriesMessage, setStatus, showHint } from "./ui.js";

export const handleLoadError = (err) => {
  console.error(err);
  const status = typeof err?.status === "number" ? err.status : null;
  const code = typeof err?.code === "string" ? err.code : null;

  let message = "データの取得に失敗しました。";
  let statusText = "読み込みエラー";
  let shouldShowHint = state.isFile;

  if (status === 404 && code === "LOGS_NOT_FOUND") {
    statusText = "エラー (404 / LOGS_NOT_FOUND)";
    message = `ログファイルが見つかりません。\n${err.message}`;
  } else if (status === 404) {
    statusText = "エラー (404)";
    message = "API が見つかりません。\nWorker を起動してアクセスしてください（npm run dev）。";
    shouldShowHint = true;
  } else if (status && status >= 500) {
    statusText = `エラー (${status}${code ? ` / ${code}` : ""})`;
    message = `サーバーエラーが発生しました。\n${err.message || "時間をおいて再度お試しください。"}`;
  } else if (code === "NETWORK_ERROR") {
    statusText = "エラー (NETWORK)";
    message = "API に接続できませんでした。\nWorker の起動状況とネットワークを確認してください。";
    shouldShowHint = true;
  } else if (status) {
    statusText = `エラー (HTTP ${status}${code ? ` / ${code}` : ""})`;
    message = `${message}\n${err.message || ""}`.trim();
  }

  setEntriesMessage(message);
  if (dom.stats) dom.stats.innerHTML = "";
  hideChart("読み込みエラー");
  setStatus(statusText);
  if (shouldShowHint) showHint();
};


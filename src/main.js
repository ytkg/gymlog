import { state } from "./lib/state.js";
import { fetchLogs } from "./lib/api.js";
import { handleLoadError } from "./lib/errors.js";
import { renderAll } from "./lib/render.js";
import { setStatus, showHint } from "./lib/ui.js";

const init = async () => {
  if (state.isFile) {
    showHint();
    setStatus("ローカル閲覧には Worker の起動が必要です");
  }

  try {
    const data = await fetchLogs();
    renderAll(data);
  } catch (err) {
    handleLoadError(err);
  }
};

init();

import { dom } from "./dom.js";
import { escapeHtml } from "./utils.js";

export const setStatus = (text) => {
  if (dom.status) dom.status.textContent = text;
};

export const showHint = () => {
  if (dom.hint) dom.hint.hidden = false;
};

export const setEntriesMessage = (message) => {
  if (!dom.entries) return;
  dom.entries.innerHTML = `<div class="empty">${escapeHtml(message).replace(/\n/g, "<br>")}</div>`;
};


const MAX_REPS = 20;
const MAX_SETS = 10;
const DEFAULT_REPS = "10";
const DEFAULT_SETS = "3";
const DEFAULT_SET = { weight: "", reps: DEFAULT_REPS, sets: DEFAULT_SETS };

const items = [];

const dateInput = document.getElementById("date");
const exerciseInput = document.getElementById("exercise");
const weightInput = document.getElementById("weight");
const repsSelect = document.getElementById("reps");
const setsSelect = document.getElementById("sets");
const addSetButton = document.getElementById("add-set");
const addNoteButton = document.getElementById("add-note");
const noteInput = document.getElementById("note");
const markdownOutput = document.getElementById("markdown");
const itemsContainer = document.getElementById("items");
const statusLabel = document.getElementById("editor-status");
const copyButton = document.getElementById("copy");

const setStatus = (text) => {
  if (statusLabel) statusLabel.textContent = text;
};

const formatToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initSelectRange = (select, max, defaultValue) => {
  for (let i = 1; i <= max; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${i}`;
    if (i === defaultValue) option.selected = true;
    select.appendChild(option);
  }
};

const optionsRange = (max, selectedValue) =>
  Array.from({ length: max }, (_, index) => {
    const value = String(index + 1);
    const selected = value === String(selectedValue) ? " selected" : "";
    return `<option value="${value}"${selected}>${value}</option>`;
  }).join("");

const formatWeight = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/kg/i.test(trimmed)) return trimmed;
  return `${trimmed}kg`;
};

const updateMarkdown = () => {
  markdownOutput.value = buildMarkdown();
};

const buildMarkdown = () => {
  const date = dateInput.value;
  const lines = [];
  if (date) lines.push(`## ${date}`);

  for (const item of items) {
    if (item.type === "note") {
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      lines.push(item.text);
      continue;
    }

    if (item.type === "exercise") {
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      lines.push(item.exercise);
      for (const set of item.sets) {
        const weightPart = set.weight ? `${formatWeight(set.weight)}×` : "";
        lines.push(`${weightPart}${set.reps}回×${set.sets}セット`);
      }
    }
  }

  return lines.join("\n");
};

const renderNoteItem = (item, index) => `<div class="item-row">
  <div class="item-fields">
    <div class="field compact">
      <label>メモ</label>
      <input type="text" value="${item.text}" data-index="${index}" data-field="text">
    </div>
  </div>
  <button class="btn tiny ghost" data-remove-item="${index}" type="button">削除</button>
</div>`;

const renderExerciseSet = (index, set, setIndex) => `
  <div class="set-row">
    <div class="field compact">
      <label>重量</label>
      <input type="text" value="${set.weight || ""}" placeholder="例: 45" data-index="${index}" data-set="${setIndex}" data-field="weight">
    </div>
    <div class="field compact">
      <label>回数</label>
      <select data-index="${index}" data-set="${setIndex}" data-field="reps">
        ${optionsRange(MAX_REPS, set.reps)}
      </select>
    </div>
    <div class="field compact">
      <label>セット数</label>
      <select data-index="${index}" data-set="${setIndex}" data-field="sets">
        ${optionsRange(MAX_SETS, set.sets)}
      </select>
    </div>
    <button class="btn tiny ghost" data-remove-set="${index}:${setIndex}" type="button">削除</button>
  </div>
`;

const renderExerciseItem = (item, index) => `<div class="item-row">
  <div class="item-fields">
    <div class="field compact">
      <label>種目</label>
      <input type="text" list="exercise-options" value="${item.exercise}" data-index="${index}" data-field="exercise">
    </div>
    <div class="set-list">
      ${item.sets.map((set, setIndex) => renderExerciseSet(index, set, setIndex)).join("")}
    </div>
    <div class="set-add">
      <button class="btn tiny primary" data-add-set="${index}" type="button">セットを追加</button>
    </div>
  </div>
  <button class="btn tiny ghost" data-remove-item="${index}" type="button">削除</button>
</div>`;

const renderItems = () => {
  itemsContainer.innerHTML = items
    .map((item, index) => {
      if (item.type === "note") return renderNoteItem(item, index);
      return renderExerciseItem(item, index);
    })
    .join("");

  updateMarkdown();
};

const addSet = () => {
  const exercise = exerciseInput.value.trim();
  if (!exercise) {
    setStatus("種目を入力してください");
    return;
  }
  const weight = weightInput.value.trim();
  const reps = repsSelect.value;
  const sets = setsSelect.value;
  items.push({ type: "exercise", exercise, sets: [{ weight, reps, sets }] });
  exerciseInput.value = "";
  weightInput.value = "";
  renderItems();
  setStatus("種目を追加しました");
};

const addNote = () => {
  const text = noteInput.value.trim();
  if (!text) {
    setStatus("メモを入力してください");
    return;
  }
  items.push({ type: "note", text });
  noteInput.value = "";
  renderItems();
  setStatus("メモを追加しました");
};

const removeItem = (index) => {
  items.splice(index, 1);
  renderItems();
  setStatus("削除しました");
};

const updateItemField = (index, field, value, setIndex = null) => {
  const item = items[index];
  if (!item) return;
  if (item.type === "note") {
    if (field === "text") item.text = value;
  } else {
    if (field === "exercise") item.exercise = value;
    if (setIndex !== null && item.sets[setIndex]) {
      if (field === "weight") item.sets[setIndex].weight = value;
      if (field === "reps") item.sets[setIndex].reps = value;
      if (field === "sets") item.sets[setIndex].sets = value;
    }
  }
  updateMarkdown();
  setStatus("編集中");
};

const copyMarkdown = async () => {
  const text = markdownOutput.value;
  if (!text) {
    setStatus("Markdown が空です");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("コピーしました");
  } catch (err) {
    markdownOutput.select();
    document.execCommand("copy");
    setStatus("コピーしました");
  }
};

const addSetToItem = (index) => {
  const item = items[index];
  if (!item || item.type !== "exercise") return;
  item.sets.push({ ...DEFAULT_SET });
  renderItems();
  setStatus("セットを追加しました");
  const setIndex = item.sets.length - 1;
  const row = itemsContainer.querySelector(
    `[data-index="${index}"][data-set="${setIndex}"][data-field="weight"]`
  );
  if (row instanceof HTMLInputElement) row.focus();
};

const removeSet = (index, setIndex) => {
  const item = items[index];
  if (!item || item.type !== "exercise") return;
  item.sets.splice(setIndex, 1);
  if (item.sets.length === 0) {
    items.splice(index, 1);
  }
  renderItems();
  setStatus("削除しました");
};

initSelectRange(repsSelect, MAX_REPS, Number(DEFAULT_REPS));
initSelectRange(setsSelect, MAX_SETS, Number(DEFAULT_SETS));
dateInput.value = formatToday();

addSetButton.addEventListener("click", addSet);
addNoteButton.addEventListener("click", addNote);
copyButton.addEventListener("click", copyMarkdown);
itemsContainer.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const removeItemIndex = target.getAttribute("data-remove-item");
  if (removeItemIndex) {
    removeItem(Number(removeItemIndex));
    return;
  }

  const removeSetValue = target.getAttribute("data-remove-set");
  if (removeSetValue) {
    const [itemIndex, setIndex] = removeSetValue.split(":").map(Number);
    removeSet(itemIndex, setIndex);
    return;
  }

  const addSetIndex = target.getAttribute("data-add-set");
  if (addSetIndex) {
    addSetToItem(Number(addSetIndex));
  }
});
itemsContainer.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  const index = target.getAttribute("data-index");
  const field = target.getAttribute("data-field");
  const setIndex = target.getAttribute("data-set");
  if (!index || !field) return;
  updateItemField(Number(index), field, target.value, setIndex ? Number(setIndex) : null);
});

renderItems();

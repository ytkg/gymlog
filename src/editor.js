const MAX_REPS = 20;
const MAX_SETS = 10;
const DEFAULT_REPS = "10";
const DEFAULT_SETS = "3";
const DEFAULT_SET = { weight: "", reps: DEFAULT_REPS, sets: DEFAULT_SETS };
const STORAGE_KEY = "gymlog-editor-state";
const BASE_WEIGHT_OPTIONS = ["", "自重"];
const BASE_EXERCISE_OPTIONS = [
  "種目を選択",
  "ベンチプレス",
  "スクワット",
  "デッドリフト",
  "レッグプレス",
  "レッグエクステンション",
  "ラットプルダウン",
  "ラットプルダウンロー",
  "チンニング",
  "バイセップスカール",
  "チェストプレス",
  "アブドミナル",
  "トーソローテーション",
  "スミスマシン",
  "エアロバイク",
  "トレッドミル",
];
const WEIGHT_MATCH = /(?:\(?体重-\d+(?:\.\d+)?\)?kg|\d+(?:\.\d+)?kg|自重)/g;
let weightOptionsList = [...BASE_WEIGHT_OPTIONS];
let exerciseOptionsList = [...BASE_EXERCISE_OPTIONS];

const items = [];

const dateInput = document.getElementById("date");
const exerciseSelect = document.getElementById("exercise");
const weightSelect = document.getElementById("weight");
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

const saveState = () => {
  const payload = {
    date: dateInput.value,
    items,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.date === "string") {
        dateInput.value = parsed.date;
      }
      if (Array.isArray(parsed.items)) {
        items.splice(0, items.length, ...parsed.items);
      }
    }
    return true;
  } catch {
    return false;
  }
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
  if (trimmed.includes("体重") || trimmed.includes("自重")) return trimmed;
  return `${trimmed}kg`;
};

const normalizeWeightToken = (value) => {
  const trimmed = value.trim().replace(/[()（）\s]/g, "");
  if (!trimmed) return null;
  if (trimmed === "自重") return trimmed;
  if (trimmed.startsWith("体重-") && !trimmed.endsWith("kg")) {
    return `${trimmed}kg`;
  }
  return trimmed;
};

const weightSortKey = (value) => {
  if (!value) return { group: 0, num: 0, text: "" };
  if (value === "自重") return { group: 1, num: 0, text: value };
  if (value.startsWith("体重-")) {
    const num = Number.parseFloat(value.replace(/[^\d.]/g, ""));
    return { group: 2, num: Number.isNaN(num) ? 0 : num, text: value };
  }
  const num = Number.parseFloat(value);
  return { group: 3, num: Number.isNaN(num) ? 0 : num, text: value };
};

const sortWeights = (values) =>
  values.slice().sort((a, b) => {
    const keyA = weightSortKey(a);
    const keyB = weightSortKey(b);
    if (keyA.group !== keyB.group) return keyA.group - keyB.group;
    if (keyA.num !== keyB.num) return keyA.num - keyB.num;
    return keyA.text.localeCompare(keyB.text);
  });

const initWeightSelect = (select) => {
  for (const optionValue of weightOptionsList) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue || "重量なし";
    select.appendChild(option);
  }
};

const weightOptions = (selectedValue) =>
  weightOptionsList
    .map((optionValue) => {
      const selected = optionValue === selectedValue ? " selected" : "";
      const label = optionValue || "重量なし";
      return `<option value="${optionValue}"${selected}>${label}</option>`;
    })
    .join("");

const setWeightOptions = (options) => {
  weightOptionsList = sortWeights(Array.from(new Set(options)));
  const currentValue = weightSelect.value;
  weightSelect.innerHTML = "";
  initWeightSelect(weightSelect);
  if (weightOptionsList.includes(currentValue)) {
    weightSelect.value = currentValue;
  }
};

const initExerciseSelect = (select) => {
  for (const optionValue of exerciseOptionsList) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  }
};

const exerciseOptions = (selectedValue) =>
  exerciseOptionsList
    .map((optionValue) => {
      const selected = optionValue === selectedValue ? " selected" : "";
      return `<option value="${optionValue}"${selected}>${optionValue}</option>`;
    })
    .join("");

const setExerciseOptions = (options) => {
  exerciseOptionsList = Array.from(new Set(options));
  const currentValue = exerciseSelect.value;
  exerciseSelect.innerHTML = "";
  initExerciseSelect(exerciseSelect);
  if (exerciseOptionsList.includes(currentValue)) {
    exerciseSelect.value = currentValue;
  }
};

const loadWeightOptionsFromLogs = async () => {
  try {
    const res = await fetch("/api/logs.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    const weights = new Set(BASE_WEIGHT_OPTIONS);
    for (const entry of entries) {
      const body = typeof entry?.body === "string" ? entry.body : "";
      const matches = body.match(WEIGHT_MATCH) || [];
      for (const match of matches) {
        const normalized = normalizeWeightToken(match);
        if (normalized) weights.add(normalized);
      }
    }
    setWeightOptions(Array.from(weights));
    renderItems();
  } catch {
    setWeightOptions(BASE_WEIGHT_OPTIONS);
  }
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
      <select data-index="${index}" data-set="${setIndex}" data-field="weight">
        ${weightOptions(set.weight || "")}
      </select>
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
      <select data-index="${index}" data-field="exercise">
        ${exerciseOptions(item.exercise)}
      </select>
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
  saveState();
};

const addSet = () => {
  const exercise = exerciseSelect.value;
  if (!exercise || exercise === BASE_EXERCISE_OPTIONS[0]) {
    setStatus("種目を入力してください");
    return;
  }
  const weight = weightSelect.value;
  const reps = repsSelect.value;
  const sets = setsSelect.value;
  items.push({ type: "exercise", exercise, sets: [{ weight, reps, sets }] });
  exerciseSelect.value = BASE_EXERCISE_OPTIONS[0];
  weightSelect.value = "";
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
setWeightOptions(BASE_WEIGHT_OPTIONS);
setExerciseOptions(BASE_EXERCISE_OPTIONS);
dateInput.value = formatToday();
loadWeightOptionsFromLogs();
if (!loadState()) {
  dateInput.value = formatToday();
}
renderItems();

addSetButton.addEventListener("click", addSet);
addNoteButton.addEventListener("click", addNote);
copyButton.addEventListener("click", copyMarkdown);
dateInput.addEventListener("input", () => {
  updateMarkdown();
  saveState();
});
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

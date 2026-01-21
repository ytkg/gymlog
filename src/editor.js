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
const TREADMILL_EXERCISE = "トレッドミル";
const DEFAULT_TREADMILL_DURATION = "20";
const DEFAULT_TREADMILL_SPEED = "4.5";
const DURATION_OPTIONS = ["5", "8", "10", "15", "20", "30"];
const SPEED_OPTIONS = ["3.0", "4.0", "4.5", "5.0", "5.4", "5.5", "6.0", "8.0"];

const state = {
  items: [],
  weightOptions: [...BASE_WEIGHT_OPTIONS],
  exerciseOptions: [...BASE_EXERCISE_OPTIONS],
};

const dom = {
  dateInput: document.getElementById("date"),
  exerciseSelect: document.getElementById("exercise"),
  weightSelect: document.getElementById("weight"),
  durationSelect: document.getElementById("duration"),
  speedSelect: document.getElementById("speed"),
  repsSelect: document.getElementById("reps"),
  setsSelect: document.getElementById("sets"),
  addSetButton: document.getElementById("add-set"),
  addNoteButton: document.getElementById("add-note"),
  noteInput: document.getElementById("note"),
  markdownOutput: document.getElementById("markdown"),
  itemsContainer: document.getElementById("items"),
  statusLabel: document.getElementById("editor-status"),
  copyButton: document.getElementById("copy"),
  strengthFields: document.getElementById("strength-fields"),
  treadmillFields: document.getElementById("treadmill-fields"),
};

const setStatus = (text) => {
  if (dom.statusLabel) dom.statusLabel.textContent = text;
};

const saveState = () => {
  const payload = {
    date: dom.dateInput.value,
    items: state.items,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const normalizeSet = (set) => {
  if (!set || typeof set !== "object") return { ...DEFAULT_SET };
  const weight = typeof set.weight === "string" ? set.weight : "";
  const reps = typeof set.reps === "string" ? set.reps : DEFAULT_REPS;
  const sets = typeof set.sets === "string" ? set.sets : DEFAULT_SETS;
  return { weight, reps, sets };
};

const normalizeSpeedSet = (set) => {
  if (!set || typeof set !== "object") return { speed: DEFAULT_TREADMILL_SPEED };
  const speed = typeof set.speed === "string" ? set.speed : DEFAULT_TREADMILL_SPEED;
  return { speed };
};

const normalizeItem = (item) => {
  if (!item || typeof item !== "object") return null;
  if (item.type === "note") {
    const text = typeof item.text === "string" ? item.text : "";
    return { type: "note", text };
  }
  if (item.type === "exercise") {
    const exercise = typeof item.exercise === "string" ? item.exercise : "";
    if (exercise === TREADMILL_EXERCISE) {
      const duration =
        typeof item.duration === "string" ? item.duration : DEFAULT_TREADMILL_DURATION;
      const sets = Array.isArray(item.sets)
        ? item.sets.map(normalizeSpeedSet)
        : [{ speed: DEFAULT_TREADMILL_SPEED }];
      return { type: "exercise", exercise, duration, sets };
    }
    const sets = Array.isArray(item.sets) ? item.sets.map(normalizeSet) : [{ ...DEFAULT_SET }];
    return { type: "exercise", exercise, sets };
  }
  return null;
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    if (typeof parsed.date === "string") {
      dom.dateInput.value = parsed.date;
    }
    if (Array.isArray(parsed.items)) {
      const normalized = parsed.items.map(normalizeItem).filter(Boolean);
      state.items.splice(0, state.items.length, ...normalized);
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

const initSelectOptions = (select, options, defaultValue) => {
  for (const value of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === defaultValue) option.selected = true;
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

const buildOptions = (values, selectedValue, labelFor) =>
  values
    .map((optionValue) => {
      const selected = optionValue === selectedValue ? " selected" : "";
      return `<option value="${optionValue}"${selected}>${labelFor(optionValue)}</option>`;
    })
    .join("");

const updateWeightSelect = () => {
  const currentValue = dom.weightSelect.value;
  dom.weightSelect.innerHTML = buildOptions(
    state.weightOptions,
    currentValue,
    (value) => value || "重量なし"
  );
  if (state.weightOptions.includes(currentValue)) {
    dom.weightSelect.value = currentValue;
  }
};

const updateExerciseSelect = () => {
  const currentValue = dom.exerciseSelect.value;
  dom.exerciseSelect.innerHTML = buildOptions(
    state.exerciseOptions,
    currentValue,
    (value) => value
  );
  if (state.exerciseOptions.includes(currentValue)) {
    dom.exerciseSelect.value = currentValue;
  }
};

const setWeightOptions = (options) => {
  state.weightOptions = sortWeights(Array.from(new Set(options)));
  updateWeightSelect();
};

const setExerciseOptions = (options) => {
  state.exerciseOptions = Array.from(new Set(options));
  updateExerciseSelect();
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
  dom.markdownOutput.value = buildMarkdown();
};

const buildMarkdown = () => {
  const date = dom.dateInput.value;
  const lines = [];
  if (date) lines.push(`## ${date}`);

  for (const item of state.items) {
    if (item.type === "note") {
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      lines.push(item.text);
      continue;
    }

    if (item.type === "exercise") {
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      if (item.exercise === TREADMILL_EXERCISE) {
        if (item.duration) lines.push(`トレッドミルを${item.duration}分`);
        const speeds = item.sets.map((set) => set.speed).filter(Boolean);
        if (speeds.length) lines.push(`${speeds.join(" -> ")}km/h`);
        continue;
      }
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
  <div class="set-row${setIndex === 0 ? "" : " no-labels"}">
    <div class="field compact">
      <label>重量</label>
      <select data-index="${index}" data-set="${setIndex}" data-field="weight" aria-label="重量">
        ${buildOptions(state.weightOptions, set.weight || "", (value) => value || "重量なし")}
      </select>
    </div>
    <div class="field compact">
      <label>回数</label>
      <select data-index="${index}" data-set="${setIndex}" data-field="reps" aria-label="回数">
        ${optionsRange(MAX_REPS, set.reps)}
      </select>
    </div>
    <div class="field compact">
      <label>セット数</label>
      <select data-index="${index}" data-set="${setIndex}" data-field="sets" aria-label="セット数">
        ${optionsRange(MAX_SETS, set.sets)}
      </select>
    </div>
    <button class="btn tiny ghost" data-remove-set="${index}:${setIndex}" type="button">削除</button>
  </div>
`;

const renderTreadmillSet = (index, set, setIndex) => `
  <div class="set-row is-treadmill${setIndex === 0 ? "" : " no-labels"}">
    <div class="field compact">
      <label>速度(km/h)</label>
      <select data-index="${index}" data-set="${setIndex}" data-field="speed" aria-label="速度(km/h)">
        ${buildOptions(SPEED_OPTIONS, set.speed || "", (value) => value)}
      </select>
    </div>
    <button class="btn tiny ghost" data-remove-set="${index}:${setIndex}" type="button">削除</button>
  </div>
`;

const renderTreadmillItem = (item, index) => `<div class="item-row">
  <div class="item-fields">
    <div class="field compact">
      <label>種目</label>
      <select data-index="${index}" data-field="exercise">
        ${buildOptions(state.exerciseOptions, item.exercise, (value) => value)}
      </select>
    </div>
    <div class="field compact">
      <label>時間(分)</label>
      <select data-index="${index}" data-field="duration" aria-label="時間(分)">
        ${buildOptions(DURATION_OPTIONS, item.duration || "", (value) => value)}
      </select>
    </div>
    <div class="set-list">
      ${item.sets.map((set, setIndex) => renderTreadmillSet(index, set, setIndex)).join("")}
    </div>
    <div class="set-add">
      <button class="btn tiny primary" data-add-set="${index}" type="button">速度を追加</button>
    </div>
  </div>
  <button class="btn tiny ghost" data-remove-item="${index}" type="button">削除</button>
</div>`;

const renderExerciseItem = (item, index) => `<div class="item-row">
  <div class="item-fields">
    <div class="field compact">
      <label>種目</label>
      <select data-index="${index}" data-field="exercise">
        ${buildOptions(state.exerciseOptions, item.exercise, (value) => value)}
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
  dom.itemsContainer.innerHTML = state.items
    .map((item, index) => {
      if (item.type === "note") return renderNoteItem(item, index);
      if (item.exercise === TREADMILL_EXERCISE) return renderTreadmillItem(item, index);
      return renderExerciseItem(item, index);
    })
    .join("");

  updateMarkdown();
  saveState();
};

const addExercise = () => {
  const exercise = dom.exerciseSelect.value;
  if (!exercise || exercise === BASE_EXERCISE_OPTIONS[0]) {
    setStatus("種目を入力してください");
    return;
  }
  if (exercise === TREADMILL_EXERCISE) {
    const duration = dom.durationSelect.value;
    const speed = dom.speedSelect.value;
    state.items.push({ type: "exercise", exercise, duration, sets: [{ speed }] });
  } else {
    const weight = dom.weightSelect.value;
    const reps = dom.repsSelect.value;
    const sets = dom.setsSelect.value;
    state.items.push({ type: "exercise", exercise, sets: [{ weight, reps, sets }] });
  }
  dom.exerciseSelect.value = BASE_EXERCISE_OPTIONS[0];
  dom.weightSelect.value = "";
  dom.durationSelect.value = DEFAULT_TREADMILL_DURATION;
  dom.speedSelect.value = DEFAULT_TREADMILL_SPEED;
  renderItems();
  setStatus("種目を追加しました");
};

const addNote = () => {
  const text = dom.noteInput.value.trim();
  if (!text) {
    setStatus("メモを入力してください");
    return;
  }
  state.items.push({ type: "note", text });
  dom.noteInput.value = "";
  renderItems();
  setStatus("メモを追加しました");
};

const removeItem = (index) => {
  state.items.splice(index, 1);
  renderItems();
  setStatus("削除しました");
};

const updateItemField = (index, field, value, setIndex = null) => {
  const item = state.items[index];
  if (!item) return;
  if (item.type === "note") {
    if (field === "text") item.text = value;
  } else {
    if (field === "exercise") {
      if (value === TREADMILL_EXERCISE && item.exercise !== TREADMILL_EXERCISE) {
        item.exercise = value;
        item.duration = DEFAULT_TREADMILL_DURATION;
        item.sets = [{ speed: DEFAULT_TREADMILL_SPEED }];
      } else if (value !== TREADMILL_EXERCISE && item.exercise === TREADMILL_EXERCISE) {
        item.exercise = value;
        delete item.duration;
        item.sets = [{ ...DEFAULT_SET }];
      } else {
        item.exercise = value;
      }
      renderItems();
      setStatus("編集中");
      return;
    }
    if (setIndex !== null && item.sets[setIndex]) {
      if (field === "weight") item.sets[setIndex].weight = value;
      if (field === "reps") item.sets[setIndex].reps = value;
      if (field === "sets") item.sets[setIndex].sets = value;
      if (field === "speed") item.sets[setIndex].speed = value;
    }
    if (field === "duration") item.duration = value;
  }
  updateMarkdown();
  saveState();
  setStatus("編集中");
};

const copyMarkdown = async () => {
  const text = dom.markdownOutput.value;
  if (!text) {
    setStatus("Markdown が空です");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("コピーしました");
  } catch (err) {
    dom.markdownOutput.select();
    document.execCommand("copy");
    setStatus("コピーしました");
  }
};

const addSetToItem = (index) => {
  const item = state.items[index];
  if (!item || item.type !== "exercise") return;
  if (item.exercise === TREADMILL_EXERCISE) {
    item.sets.push({ speed: DEFAULT_TREADMILL_SPEED });
  } else {
    item.sets.push({ ...DEFAULT_SET });
  }
  renderItems();
  setStatus("セットを追加しました");
  const setIndex = item.sets.length - 1;
  const row = dom.itemsContainer.querySelector(
    `[data-index="${index}"][data-set="${setIndex}"][data-field="weight"]`
  );
  if (row instanceof HTMLSelectElement) row.focus();
};

const removeSet = (index, setIndex) => {
  const item = state.items[index];
  if (!item || item.type !== "exercise") return;
  item.sets.splice(setIndex, 1);
  if (item.sets.length === 0) {
    state.items.splice(index, 1);
  }
  renderItems();
  setStatus("削除しました");
};

const handleDateInput = () => {
  updateMarkdown();
  saveState();
};

const handleItemsClick = (event) => {
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
};

const handleItemsInput = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  const index = target.getAttribute("data-index");
  const field = target.getAttribute("data-field");
  const setIndex = target.getAttribute("data-set");
  if (!index || !field) return;
  updateItemField(Number(index), field, target.value, setIndex ? Number(setIndex) : null);
};

const toggleExerciseFields = () => {
  const isTreadmill = dom.exerciseSelect.value === TREADMILL_EXERCISE;
  if (dom.strengthFields) dom.strengthFields.classList.toggle("is-hidden", isTreadmill);
  if (dom.treadmillFields) dom.treadmillFields.classList.toggle("is-hidden", !isTreadmill);
};

const init = () => {
  initSelectRange(dom.repsSelect, MAX_REPS, Number(DEFAULT_REPS));
  initSelectRange(dom.setsSelect, MAX_SETS, Number(DEFAULT_SETS));
  initSelectOptions(dom.durationSelect, DURATION_OPTIONS, DEFAULT_TREADMILL_DURATION);
  initSelectOptions(dom.speedSelect, SPEED_OPTIONS, DEFAULT_TREADMILL_SPEED);
  setWeightOptions(BASE_WEIGHT_OPTIONS);
  setExerciseOptions(BASE_EXERCISE_OPTIONS);
  dom.dateInput.value = formatToday();
  loadWeightOptionsFromLogs();
  if (!loadState()) {
    dom.dateInput.value = formatToday();
  }
  renderItems();

  dom.addSetButton.addEventListener("click", addExercise);
  dom.addNoteButton.addEventListener("click", addNote);
  dom.copyButton.addEventListener("click", copyMarkdown);
  dom.dateInput.addEventListener("input", handleDateInput);
  dom.exerciseSelect.addEventListener("change", toggleExerciseFields);
  dom.itemsContainer.addEventListener("click", handleItemsClick);
  dom.itemsContainer.addEventListener("input", handleItemsInput);
  toggleExerciseFields();
};

init();

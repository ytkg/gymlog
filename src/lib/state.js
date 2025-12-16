export const state = {
  chart: null,
  isFile: window.location.protocol === "file:",
  data: null,
  filters: { query: "", month: "all" },
  uiBound: false,
};

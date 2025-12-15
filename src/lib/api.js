export const fetchLogs = async () => {
  const apiPath = "/api/logs.json";
  let res;
  try {
    res = await fetch(apiPath, { cache: "no-store" });
  } catch (cause) {
    const err = new Error("fetch failed");
    err.code = "NETWORK_ERROR";
    err.cause = cause;
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    const errorMessage = typeof data?.error === "string" ? data.error : data?.error?.message;
    const errorCode = typeof data?.error === "string" ? null : data?.error?.code;
    const err = new Error(errorMessage || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = errorCode || null;
    throw err;
  }

  if (!data) {
    const err = new Error("API の応答が不正です");
    err.status = res.status;
    err.code = "INVALID_RESPONSE";
    throw err;
  }

  return data;
};

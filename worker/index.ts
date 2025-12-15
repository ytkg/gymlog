import { Hono } from "hono";
import type { Context } from "hono";
import { buildMeta } from "./lib/meta";
import { monthCounts } from "./lib/monthCounts";
import { parseEntries } from "./lib/parseEntries";

type Bindings = {
  ASSETS: Fetcher;
  OBSIDIAN: R2Bucket;
};

type AppEnv = { Bindings: Bindings };
const app = new Hono<AppEnv>();

const LOG_KEY = "ジム記録/logs.md";
const CACHE_CONTROL = "no-cache, max-age=0, must-revalidate";

const jsonError = (c: Context<AppEnv>, status: number, code: string, message: string) =>
  c.json({ error: { message, code } }, status);

const etagHeaderValue = (etag: string) => `"${etag}"`;

const ifNoneMatchHasEtag = (ifNoneMatch: string | undefined, etag: string) => {
  if (!ifNoneMatch) return false;
  const normalized = ifNoneMatch
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^W\//i, "").replace(/^"/, "").replace(/"$/, ""));
  return normalized.includes(etag);
};

const cacheHeaders = (etag: string | null): Record<string, string> => {
  const headers: Record<string, string> = { "Cache-Control": CACHE_CONTROL };
  if (etag) headers.ETag = etagHeaderValue(etag);
  return headers;
};

const getLogObject = async (c: Context<AppEnv>) => {
  try {
    return await c.env.OBSIDIAN.get(LOG_KEY);
  } catch (err) {
    console.error("R2 get failed", err);
    return jsonError(c, 500, "R2_GET_FAILED", `R2 から ${LOG_KEY} を取得できませんでした`);
  }
};

const readObjectText = async (c: Context<AppEnv>, object: R2ObjectBody) => {
  try {
    return await object.text();
  } catch (err) {
    console.error("R2 read failed", err);
    return jsonError(c, 500, "R2_READ_FAILED", `R2 の ${LOG_KEY} の読み込みに失敗しました`);
  }
};

app.get("/api/logs.json", async (c) => {
  const objectOrResponse = await getLogObject(c);
  if (objectOrResponse instanceof Response) return objectOrResponse;
  const object = objectOrResponse;

  if (!object) {
    return jsonError(c, 404, "LOGS_NOT_FOUND", `R2 に ${LOG_KEY} が見つかりません`);
  }

  const etag = object.etag || null;
  if (etag && ifNoneMatchHasEtag(c.req.header("if-none-match"), etag)) {
    return c.body(null, 304, cacheHeaders(etag));
  }

  const textOrResponse = await readObjectText(c, object);
  if (textOrResponse instanceof Response) return textOrResponse;
  const bodyText = textOrResponse;

  try {
    const entries = parseEntries(bodyText);
    const months = monthCounts(entries);
    const meta = buildMeta(entries, months, LOG_KEY);

    return c.json({ entries, month_counts: months, meta }, 200, cacheHeaders(etag));
  } catch (err) {
    console.error("logs processing failed", err);
    return jsonError(c, 500, "INTERNAL_ERROR", "ログの処理中にエラーが発生しました");
  }
});

app.get("*", async (c) => {
  const { ASSETS } = c.env;
  const request = c.req.raw;
  const accept = c.req.header("accept") || "";

  // 静的アセット優先
  const assetResponse = await ASSETS.fetch(request);
  if (assetResponse.status !== 404) return assetResponse;

  // SPAフォールバック: HTML要求のみindex.htmlを返す
  if (accept.includes("text/html")) {
    const url = new URL(c.req.url);
    const indexRequest = new Request(new URL("/index.html", url), request);
    const htmlResponse = await ASSETS.fetch(indexRequest);
    if (htmlResponse.status !== 404) return htmlResponse;
  }

  return assetResponse;
});

export default app;

import type { Context } from "hono";
import { Hono } from "hono";
import { CACHE_CONTROL_REVALIDATE, cacheHeaders, ifNoneMatchHasEtag } from "./lib/httpCache";
import { buildMeta } from "./lib/meta";
import { monthCounts } from "./lib/monthCounts";
import { parseEntries } from "./lib/parseEntries";
import {
  getObjectOrNull,
  R2GetFailedError,
  R2ReadFailedError,
  readObjectText,
} from "./lib/r2Object";

type Bindings = {
  ASSETS: Fetcher;
  OBSIDIAN: R2Bucket;
};

type AppEnv = { Bindings: Bindings };
const app = new Hono<AppEnv>();

const LOG_KEY = "ジム記録/logs.md";
const CACHE_CONTROL = CACHE_CONTROL_REVALIDATE;

const jsonError = (c: Context<AppEnv>, status: number, code: string, message: string) =>
  c.json({ error: { message, code } }, status);

app.get("/api/logs.json", async (c) => {
  let object: R2ObjectBody | null;
  try {
    object = await getObjectOrNull(c.env.OBSIDIAN, LOG_KEY);
  } catch (err) {
    if (err instanceof R2GetFailedError) {
      console.error(err.message, err.cause);
    } else {
      console.error("R2 get failed", err);
    }
    return jsonError(c, 500, "R2_GET_FAILED", `R2 から ${LOG_KEY} を取得できませんでした`);
  }

  if (!object) {
    return jsonError(c, 404, "LOGS_NOT_FOUND", `R2 に ${LOG_KEY} が見つかりません`);
  }

  const etag = object.etag || null;
  if (etag && ifNoneMatchHasEtag(c.req.header("if-none-match"), etag)) {
    return c.body(null, 304, cacheHeaders(CACHE_CONTROL, etag));
  }

  let bodyText: string;
  try {
    bodyText = await readObjectText(object, LOG_KEY);
  } catch (err) {
    if (err instanceof R2ReadFailedError) {
      console.error(err.message, err.cause);
    } else {
      console.error("R2 read failed", err);
    }
    return jsonError(c, 500, "R2_READ_FAILED", `R2 の ${LOG_KEY} の読み込みに失敗しました`);
  }

  try {
    const entries = parseEntries(bodyText);
    const months = monthCounts(entries);
    const meta = buildMeta(entries, months, LOG_KEY);

    return c.json({ entries, month_counts: months, meta }, 200, cacheHeaders(CACHE_CONTROL, etag));
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

import type { Context } from "hono";
import {
  getObjectOrNull,
  R2GetFailedError,
  R2ReadFailedError,
  readObjectText,
} from "../infra/r2Object";
import { cacheHeaders, ifNoneMatchHasEtag } from "../lib/httpCache";
import { buildMeta } from "../lib/meta";
import { monthCounts } from "../lib/monthCounts";
import { parseEntries } from "../lib/parseEntries";

type EnvWithObsidian = { Bindings: { OBSIDIAN: R2Bucket } };

const jsonError = <E>(c: Context<E>, status: number, code: string, message: string) =>
  c.json({ error: { message, code } }, status);

type LogsApiOptions = {
  logKey: string;
  cacheControl: string;
};

const EDGE_CACHE_CONTROL = "public, max-age=60";

const normalizeEtagHeader = (value: string | null) => {
  if (!value) return null;
  return value.replace(/^W\//i, "").replace(/^"/, "").replace(/"$/, "");
};

export const createLogsHandler =
  <E extends EnvWithObsidian>(opts: LogsApiOptions) =>
  async (c: Context<E>) => {
    try {
      const cache = caches.default;
      const cacheKey = new Request(c.req.url, { method: "GET" });

      const cached = await cache.match(cacheKey);
      if (cached) {
        const cachedEtag = normalizeEtagHeader(cached.headers.get("ETag"));
        if (cachedEtag && ifNoneMatchHasEtag(c.req.header("if-none-match"), cachedEtag)) {
          return c.body(null, 304, cacheHeaders(opts.cacheControl, cachedEtag));
        }

        const res = cached.clone();
        res.headers.set("Cache-Control", opts.cacheControl);
        return res;
      }

      const object = await getObjectOrNull(c.env.OBSIDIAN, opts.logKey);
      if (!object) {
        return jsonError(c, 404, "LOGS_NOT_FOUND", `R2 に ${opts.logKey} が見つかりません`);
      }

      const etag = object.etag || null;
      if (etag && ifNoneMatchHasEtag(c.req.header("if-none-match"), etag)) {
        return c.body(null, 304, cacheHeaders(opts.cacheControl, etag));
      }

      const bodyText = await readObjectText(object, opts.logKey);
      const entries = parseEntries(bodyText);
      const months = monthCounts(entries);
      const meta = buildMeta(entries, months, opts.logKey);

      const response = c.json(
        { entries, month_counts: months, meta },
        200,
        cacheHeaders(opts.cacheControl, etag)
      );

      const cacheable = response.clone();
      cacheable.headers.set("Cache-Control", EDGE_CACHE_CONTROL);
      const putPromise = cache.put(cacheKey, cacheable);
      if (c.executionCtx) c.executionCtx.waitUntil(putPromise);
      else await putPromise;

      return response;
    } catch (err) {
      if (err instanceof R2GetFailedError) {
        console.error(err.message, err.cause);
        return jsonError(c, 500, "R2_GET_FAILED", `R2 から ${opts.logKey} を取得できませんでした`);
      }
      if (err instanceof R2ReadFailedError) {
        console.error(err.message, err.cause);
        return jsonError(c, 500, "R2_READ_FAILED", `R2 の ${opts.logKey} の読み込みに失敗しました`);
      }

      console.error("logs processing failed", err);
      return jsonError(c, 500, "INTERNAL_ERROR", "ログの処理中にエラーが発生しました");
    }
  };

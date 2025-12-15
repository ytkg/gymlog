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

export const createLogsHandler =
  <E extends EnvWithObsidian>(opts: LogsApiOptions) =>
  async (c: Context<E>) => {
    try {
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

      return c.json(
        { entries, month_counts: months, meta },
        200,
        cacheHeaders(opts.cacheControl, etag)
      );
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

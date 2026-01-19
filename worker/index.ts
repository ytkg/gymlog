import { Hono } from "hono";
import { cache } from "hono/cache";
import { etag } from "hono/etag";
import { CACHE_CONTROL_REVALIDATE } from "./lib/httpCache";
import { createLogsHandler } from "./usecases/logsApi";

type Bindings = {
  ASSETS: Fetcher;
  OBSIDIAN: R2Bucket;
};

type AppEnv = { Bindings: Bindings };
const app = new Hono<AppEnv>();

const LOG_KEY = "ジム記録/logs.md";
const CACHE_CONTROL = CACHE_CONTROL_REVALIDATE;
const EDGE_CACHE_NAME = "gymlog-api";
const EDGE_CACHE_CONTROL = "s-maxage=60";

app.get(
  "/api/logs.json",
  etag(),
  cache({ cacheName: EDGE_CACHE_NAME, cacheControl: EDGE_CACHE_CONTROL }),
  createLogsHandler<AppEnv>({ logKey: LOG_KEY, cacheControl: CACHE_CONTROL })
);

app.get("*", async (c) => {
  const { ASSETS } = c.env;
  const request = c.req.raw;
  const accept = c.req.header("accept") || "";
  const url = new URL(c.req.url);

  if (url.pathname === "/editor" || url.pathname === "/editor/") {
    const editorRequest = new Request(new URL("/editor.html", url), request);
    const editorResponse = await ASSETS.fetch(editorRequest);
    if (editorResponse.status !== 404) return editorResponse;
  }

  // 静的アセット優先
  const assetResponse = await ASSETS.fetch(request);
  if (assetResponse.status !== 404) return assetResponse;

  // SPAフォールバック: HTML要求のみindex.htmlを返す
  if (accept.includes("text/html")) {
    const indexRequest = new Request(new URL("/index.html", url), request);
    const htmlResponse = await ASSETS.fetch(indexRequest);
    if (htmlResponse.status !== 404) return htmlResponse;
  }

  return assetResponse;
});

export default app;

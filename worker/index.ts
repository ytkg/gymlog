import { Hono } from "hono";
import { monthCounts } from "./lib/monthCounts";
import { parseEntries } from "./lib/parseEntries";

type Bindings = {
  ASSETS: Fetcher;
  OBSIDIAN: R2Bucket;
};

const LOG_KEY = "ジム記録/logs.md";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/logs.json", async (c) => {
  const object = await c.env.OBSIDIAN.get(LOG_KEY);
  if (!object) return c.json({ error: "logs.md not found" }, 404);

  const bodyText = await object.text();
  const entries = parseEntries(bodyText);
  const months = monthCounts(entries);

  return c.json({ entries, month_counts: months });
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

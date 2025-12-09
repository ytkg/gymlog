import { Hono } from "hono";

type Bindings = {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

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

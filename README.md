# gymlog

Cloudflare Workers + Hono で動く、ジム記録ビューアです。R2 に置いた `logs.md` を読み取り、一覧/サマリー/グラフを表示します。

## 構成

- Worker: `worker/index.ts`
  - `GET /api/logs.json`: R2 の `ジム記録/logs.md` を読み取り JSON 化して返す（ETag/304 対応）
  - `GET *`: `src/` 配下の静的アセットを配信（SPA フォールバックで `index.html`）
- Frontend assets: `src/`（`wrangler.toml` の `[assets]`）

## 必要な Bindings（wrangler.toml）

`wrangler.toml` で次を利用します。

- `ASSETS`: `src/` を静的配信するための Assets binding
- `OBSIDIAN`: R2 bucket binding（bucket 名: `obsidian`）

R2 内のオブジェクトキーは `ジム記録/logs.md` を前提としています（`worker/index.ts` の `LOG_KEY`）。

## ローカル開発

### セットアップ

```bash
npm i
```

### 開発サーバ

このプロジェクトの `dev` は `wrangler dev --remote` です（Cloudflare 側で実行）。

```bash
npm run dev
```

初回は `wrangler login` が必要な場合があります。

`src/index.html` を `file://` で開いても API にアクセスできないため、必ず `wrangler dev` が表示する URL を開いてください。

## デプロイ

```bash
wrangler deploy
```

## データ（logs.md）のフォーマット

`logs.md` は Markdown で、日付見出し（`# YYYY-MM-DD` または `## YYYY-MM-DD` 等）ごとに 1 エントリーとして扱います。

例:

```md
# 2024-01-02
ベンチプレス 80kg x 5
スクワット 100kg x 5

# 2024-01-05
デッドリフト 120kg x 3
```

- 見出しの前にあるテキストは無視されます
- 改行は本文として保持され、UI 側で `<br>` として表示されます

## 開発用コマンド

```bash
npm test   # Vitest
npm run check  # Biome（lint+format+organize imports）
```

## 外部依存（Chart.js / Google Fonts）

- フロントの Chart.js は `src/vendor/chart.umd.js` に同梱しています（npm の `chart.js` 由来）
- Google Fonts は使用せず、システムフォントを利用します

この方針により、CSP を厳格化しやすくなります（例: `script-src 'self'` / `style-src 'self'` など）。

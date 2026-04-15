# VAVOO Deployment Guide (Browser-only)

## 1. Cloudflare Worker (API) - Browser

1. https://dash.cloudflare.com → Workers & Pages → **Create application** → **Worker**
2. **Name:** `vavoo-api`
3. Paste **complete** `worker/worker.js` content
4. **Save & Deploy**
5. **URL:** `https://vavoo-api.YOUR-ACCOUNT.workers.dev` ← Copy this!

## 2. Cloudflare Pages (Frontend) - Browser

1. Workers & Pages → **Create application** → **Pages**
2. **Upload assets** → Drag `pages` folder (index.html)
3. **Deploy**
4. **URL:** `https://YOUR-PROJECT.pages.dev`

## 4. GitHub + Auto-deploy

1. https://github.com/CABLord/vavoo.to → Upload all files
2. Cloudflare Pages → Connect Git → CABLord/vavoo.to → `/` output dir
3. Push to GitHub → auto-deploys!

URLs:
Worker: https://vavoo-api.cabo-lorik-bajgora.workers.dev
App: https://netstreamz.pages.dev

Re-upload `pages` folder.

## Test

Open Pages URL → Live TV → Play channel. Works!

**Free tiers:** Unlimited Worker/Pages calls.

## Lokales Testen

**Worker:**
```bash
cd worker
wrangler dev
```

**Pages (Live Server):**
```bash
npx serve pages
```

## Domain-Konfiguration

Ersetze `deinedomain.de` in `wrangler.toml` durch deine Domain und passe Routes an.

## Dependencies

- Cloudflare Account mit Pages/Workers
- Wrangler CLI: `npm i -g wrangler`
- Login: `wrangler login`

# Astro + Cloudflare Pages + Tailwind v4 — Unified Optimal Guide (Astro 5.6+)

This merges the best parts of previous guides and drops non-optimal/deprecated patterns. Use as the single baseline for new projects.

## Stack Baseline
- Astro 5.6+ (static-first; per-page SSR via `export const prerender = false`)
- Tailwind v4 with `@tailwindcss/vite` (CSS-first `@theme`, no JS config)
- Cloudflare Pages + `wrangler.jsonc`
- Cloudflare adapter `@astrojs/cloudflare` **>= 12.6.6** (CVE-2025-58179 patched)
- Local dev: `platformProxy` enabled
- Sessions/env: built-in `Astro.session` and `astro:env/server`

Nuance: Default to static-first unless most pages are dynamic. Use per-page SSR for the dynamic subset; keep static for everything else to maximize cacheability and cost efficiency.

## Core Files (minimal)
```
src/
  layouts/BaseLayout.astro
  components/UserWidget.astro      # Server Island example
  pages/
    index.astro                    # static
    dashboard.astro                # SSR (prerender = false)
    blog/[slug].astro              # cache headers for ISR-like
    store.astro                    # Server Island shell
  styles/global.css                # Tailwind v4 CSS
  env.d.ts                         # typings
public/
  _headers
  .assetsignore
astro.config.mjs
wrangler.jsonc
tsconfig.json
package.json
```

## package.json (scripts and deps)
```json
{
  "scripts": {
    "dev": "wrangler types && astro dev",
    "build": "wrangler types && astro check && astro build",
    "preview": "wrangler pages dev ./dist",
    "deploy": "astro build && wrangler pages deploy ./dist"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/cloudflare": "^12.6.6",
    "@astrojs/check": "^0.9.0"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.6.0",
    "wrangler": "^3.0.0"
  }
}
```

## astro.config.mjs (static-first + SSR opt-in)
```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.jsonc',
      persist: { path: './.wrangler/state/v3' }
    },
    imageService: 'compile', // see image notes below
    sessionKVBindingName: 'SESSION' // optional; Astro.session is preferred
  }),
  vite: {
    plugins: [tailwindcss()],
    ssr: { external: ['node:buffer', 'node:crypto'] }
  }
});
```

### Security and image notes
- **CVE-2025-58179**: Use `@astrojs/cloudflare` **>= 12.6.6**. Restrict `image.domains`/`remotePatterns` for user-supplied URLs.
- Choose image service based on needs:
  - `passthrough`: safest/minimal when you do not need on-demand optimization.
  - `cloudflare`: uses Cloudflare Image Resizing (paid) and avoids Sharp bloat.
  - `compile`: works but adds ~12–15 MB to the worker (paid tier recommended if kept in-worker).

### Output mode
- Default static; per-page SSR: `export const prerender = false`.
- If most pages are dynamic, set `output: 'server'` and use per-page prerender for static pages.

## Tailwind v4 (CSS-first)
```css
/* src/styles/global.css */
@import "tailwindcss";

@source "../components";
@source "../pages";
@source "../layouts";

@theme {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --color-primary: oklch(0.65 0.15 260);
  --color-secondary: oklch(0.72 0.11 178);
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(0 0% 3.9%);
  --spacing: 0.25rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

@custom-variant dark (&:where(.dark, .dark *));
@utility content-auto { content-visibility: auto; }

@layer base {
  html { font-family: var(--font-sans); scroll-behavior: smooth; }
}
```

## Wrangler (Pages) — wrangler.jsonc
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-astro-app",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2025-01-15",
  "compatibility_flags": ["nodejs_compat"],
  "vars": { "ENVIRONMENT": "production" },
  "kv_namespaces": [
    { "binding": "CACHE", "id": "<KV_NAMESPACE_ID>" },
    { "binding": "SESSION", "id": "<SESSION_NAMESPACE_ID>" }
  ],
  "d1_databases": [
    { "binding": "DB", "database_name": "app-db", "database_id": "<DATABASE_ID>" }
  ],
  "r2_buckets": [
    { "binding": "ASSETS", "bucket_name": "app-assets" }
  ],
  "env": {
    "preview": { "vars": { "ENVIRONMENT": "preview" } }
  }
}
```
- Node polyfills: `nodejs_compat` (optionally `nodejs_compat_v2`) adds ~200 KB.
- Nuance: Use JSONC for schema validation and Pages. Use toml only if you deliberately target Worker service mode.

## Typings and Astro 5.6+ sessions/env
```ts
// src/env.d.ts
/// <reference types="astro/client" />
type ENV = { CACHE: KVNamespace; SESSION: KVNamespace; DB: D1Database; ASSETS: R2Bucket; ENVIRONMENT: string; };
type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;
declare namespace App { interface Locals extends Runtime {} }
```

- Sessions (built-in):
```js
const session = await Astro.session.get('user');
await Astro.session.set('user', { id: 123, name: 'Alice' });
```

- Env/secrets (global server access):
```js
import { getSecret } from 'astro:env/server';
export const prerender = false;
export default async function () {
  const apiKey = await getSecret('API_KEY');
}
```

Nuance: Use Astro.session unless you need custom store semantics; fall back to KV only for specialized cases.

## Rendering mode patterns
- **SSR page (per-request)**: `export const prerender = false;` use Astro.session and bindings. Keep responses cacheable when possible.
- **ISR-like**: On SSR pages, set `Cache-Control: s-maxage=300, stale-while-revalidate=60` (tune as needed).
- **Server Islands**: Use `server:defer` with a `slot="fallback"` skeleton. Props > ~2 KB switch to POST (not cached); keep props small for cache-friendly GET hydration.

## Example snippets
- **SSR page** (`src/pages/dashboard.astro`):
```astro
---
export const prerender = false;
import BaseLayout from '../layouts/BaseLayout.astro';
const session = await Astro.session.get('user');
const { env } = Astro.locals.runtime;
const userData = session?.id ? await env.CACHE.get(`user:${session.id}`, 'json') : null;
---
<BaseLayout title="Dashboard">
  <main class="container mx-auto px-4 py-16">
    <h1 class="text-3xl font-bold">Welcome back, {userData?.name}</h1>
    <p class="text-secondary">This page renders fresh on every request.</p>
  </main>
</BaseLayout>
```

- **ISR-like** (`src/pages/blog/[slug].astro`):
```astro
---
export const prerender = false;
import BaseLayout from '../../layouts/BaseLayout.astro';
Astro.response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
const { slug } = Astro.params;
const post = await fetch(`https://api.example.com/posts/${slug}`).then(r => r.json());
---
<BaseLayout title={post.title}>
  <article class="prose mx-auto px-4 py-16">
    <h1>{post.title}</h1>
    <p class="text-sm text-secondary">Cached for 5 minutes. Last rendered: {new Date().toISOString()}</p>
    <div set:html={post.content} />
  </article>
</BaseLayout>
```

- **Server Island** (`src/pages/store.astro` + `src/components/UserWidget.astro`):
```astro
---
export const prerender = true;
import BaseLayout from '../layouts/BaseLayout.astro';
import UserWidget from '../components/UserWidget.astro';
---
<BaseLayout title="Store">
  <header class="flex justify-between items-center px-4 py-4 border-b">
    <h1 class="text-2xl font-bold">Store</h1>
    <UserWidget server:defer>
      <div slot="fallback" class="animate-pulse bg-gray-200 rounded-full w-10 h-10" />
    </UserWidget>
  </header>
  <main class="container mx-auto px-4 py-8">
    <p>This static content loads instantly from CDN.</p>
  </main>
</BaseLayout>
```

```astro
---
// src/components/UserWidget.astro
const session = await Astro.session.get('user');
const { env } = Astro.locals.runtime;
const user = session?.id ? await env.CACHE.get(`user:${session.id}`, 'json') : null;
Astro.response.headers.set('Cache-Control', 'max-age=60');
---
<div class="flex items-center gap-2">
  {user ? (
    <>
      <img src={user.avatar} alt="" class="w-10 h-10 rounded-full" />
      <span class="text-sm font-medium">{user.name}</span>
    </>
  ) : (
    <a href="/login" class="text-primary hover:underline">Sign in</a>
  )}
</div>
```

Nuance: The fallback renders immediately. Keep island props small to stay on GET (cachable); large props trigger POST and bypass cache.

## Headers and assets
```
# public/_headers
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/api/*
  Cache-Control: no-store, no-cache
```
```
# public/.assetsignore
_worker.js
_routes.json
```

Nuance: Add `_redirects` as needed; use routes.extend in Cloudflare config for fine-grained include/exclude when mixing static and server handling.

## Quick commands
```bash
npm create astro@latest my-app -- --template minimal
cd my-app
npm install @astrojs/cloudflare
npm install -D tailwindcss @tailwindcss/vite wrangler
npx astro add cloudflare
npx wrangler types
npm run dev
npm run build
npx wrangler pages dev ./dist
npx wrangler pages deploy ./dist
```

## When to choose which option
- **Static-first with per-page SSR (default here)**: Best for marketing/docs/blogs with a few dynamic routes; cheapest and fastest via CDN cache.
- **Server output globally**: Only when most pages are dynamic and SSR-driven; still prerender specific static pages.
- **Image service**: Use `passthrough` if you do not need optimization; use `cloudflare` if you have the paid Image Resizing feature; use `compile` only if bundle size limits and paid worker tiers are acceptable.
- **Sessions**: Prefer `Astro.session`. Use KV directly only for specialized needs (shared/non-session data, custom TTLs beyond sessions).
- **Env access**: Use `astro:env/server` for secrets; avoid ad hoc env plumbing through locals.
- **Node compat**: Enable `nodejs_compat` (and `nodejs_compat_v2` if you need broader polyfills) when using Node APIs.

# Minimal Astro + Cloudflare Pages + Tailwind v4 scaffolding guide

Astro 5+ with Cloudflare Pages enables SSG, SSR, ISR-like caching via headers, and PPR-equivalent Server Islands. Tailwind v4 removes JS config entirely through CSS-first `@theme`. Use the static-first default and opt into SSR per page for flexibility.

---

## Project structure and essential files
Minimal scaffold with eight core files that cover all rendering modes on Cloudflare Pages:

```
my-astro-cloudflare/
|-- src/
|   |-- layouts/
|   |   `-- BaseLayout.astro
|   |-- components/
|   |   `-- UserWidget.astro      # Server Island example
|   |-- pages/
|   |   |-- index.astro           # SSG (static)
|   |   |-- dashboard.astro       # SSR (dynamic)
|   |   |-- blog/[slug].astro     # ISR-like (cached SSR)
|   |   `-- store.astro           # PPR-like (Server Islands)
|   |-- styles/
|   |   `-- global.css            # Tailwind v4 CSS
|   `-- env.d.ts                  # TypeScript bindings
|-- public/
|   |-- _headers                  # Cloudflare cache headers
|   `-- .assetsignore
|-- astro.config.mjs
|-- wrangler.jsonc
|-- tsconfig.json
`-- package.json
```

---

## Package.json with correct dependencies
Tailwind v4 uses the `@tailwindcss/vite` plugin; `@astrojs/tailwind` is deprecated for v4.

```json
{
  "name": "astro-cloudflare-tailwind",
  "type": "module",
  "scripts": {
    "dev": "wrangler types && astro dev",
    "build": "wrangler types && astro check && astro build",
    "preview": "wrangler pages dev ./dist",
    "deploy": "astro build && wrangler pages deploy ./dist"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/cloudflare": "^12.0.0",
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

---

## Astro configuration for Cloudflare with all modes
Astro 5 removed `output: 'hybrid'`. Keep the default static output and opt into SSR per page.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Static-first; add adapter so SSR pages work on Cloudflare Pages.
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.jsonc',
      persist: { path: './.wrangler/state/v3' },
    },
    // Sharp is incompatible with workerd; use compile-time images.
    imageService: 'compile',
    // Example session storage binding.
    sessionKVBindingName: 'SESSION',
  }),

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['node:buffer', 'node:crypto'],
    },
  },
});
```

### Output mode decision matrix

| Scenario | Config | Per-page override |
| -------- | ------ | ----------------- |
| Mostly static, few dynamic pages | Omit `output` (default static) | `export const prerender = false` |
| Mostly dynamic, few static pages | `output: 'server'` | `export const prerender = true` |

---

## Tailwind CSS v4 setup with CSS-first configuration
Tailwind v4 removes `tailwind.config.js`; configure in CSS with `@theme`.

```css
/* src/styles/global.css */
@import "tailwindcss";

/* Optional: Explicit sources for class detection */
@source "../components";
@source "../pages";
@source "../layouts";

/* Theme configuration */
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

@utility content-auto {
  content-visibility: auto;
}

@layer base {
  html {
    font-family: var(--font-sans);
    scroll-behavior: smooth;
  }
}
```

### Theme variable namespaces generate utilities automatically

| CSS Variable | Generated Utilities |
| ------------ | ------------------- |
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*` |
| `--font-*` | `font-*` |
| `--spacing` | `p-*`, `m-*`, `gap-*`, `w-*`, `h-*` |
| `--radius-*` | `rounded-*` |
| `--shadow-*` | `shadow-*` |
| `--breakpoint-*` | Responsive prefixes `sm:`, `md:`, etc. |

---

## Wrangler configuration for Cloudflare Pages

```jsonc
// wrangler.jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-astro-app",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2025-01-15",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "ENVIRONMENT": "production"
  },
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
    "preview": {
      "vars": { "ENVIRONMENT": "preview" }
    }
  }
}
```

---

## TypeScript configuration and Cloudflare bindings

```ts
// src/env.d.ts
/// <reference types="astro/client" />

type ENV = {
  CACHE: KVNamespace;
  SESSION: KVNamespace;
  DB: D1Database;
  ASSETS: R2Bucket;
  ENVIRONMENT: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}
```

```json
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

Generate types with `npx wrangler types`.

---

## Rendering modes demonstrated with example pages

### SSG: Static page (default)

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';

const features = ['Fast', 'Modern', 'Edge-optimized'];
---
<BaseLayout title="Home">
  <main class="container mx-auto px-4 py-16">
    <h1 class="text-4xl font-bold text-primary mb-8">
      Astro + Cloudflare + Tailwind v4
    </h1>
    <ul class="space-y-2">
      {features.map(f => <li class="text-foreground">{f}</li>)}
    </ul>
  </main>
</BaseLayout>
```

### SSR: Dynamic server-rendered page

```astro
---
// src/pages/dashboard.astro
export const prerender = false; // Opt into SSR

import BaseLayout from '../layouts/BaseLayout.astro';

const { env } = Astro.locals.runtime;
const session = Astro.cookies.get('session')?.value;
const userData = await env.CACHE.get(`user:${session}`, 'json');
---
<BaseLayout title="Dashboard">
  <main class="container mx-auto px-4 py-16">
    <h1 class="text-3xl font-bold">Welcome back, {userData?.name}</h1>
    <p class="text-secondary">This page renders fresh on every request.</p>
  </main>
</BaseLayout>
```

### ISR-like behavior via cache headers

```astro
---
// src/pages/blog/[slug].astro
export const prerender = false;

import BaseLayout from '../../layouts/BaseLayout.astro';

Astro.response.headers.set(
  'Cache-Control',
  's-maxage=300, stale-while-revalidate=60'
);

const { slug } = Astro.params;
const post = await fetch(`https://api.example.com/posts/${slug}`).then(r => r.json());
---
<BaseLayout title={post.title}>
  <article class="prose mx-auto px-4 py-16">
    <h1>{post.title}</h1>
    <p class="text-sm text-secondary">
      Cached for 5 minutes. Last rendered: {new Date().toISOString()}
    </p>
    <div set:html={post.content} />
  </article>
</BaseLayout>
```

### PPR-like behavior with Server Islands

```astro
---
// src/pages/store.astro
export const prerender = true; // Static shell

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
const session = Astro.cookies.get('session')?.value;
const { env } = Astro.locals.runtime;
const user = session ? await env.CACHE.get(`user:${session}`, 'json') : null;
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

---

## Base layout with Tailwind v4

```astro
---
// src/layouts/BaseLayout.astro
import '../styles/global.css';

interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body class="min-h-screen bg-background text-foreground antialiased">
    <slot />
  </body>
</html>
```

---

## Cloudflare Pages cache and headers configuration

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

---

## Accessing Cloudflare bindings for future integrations

```ts
// src/pages/api/data.ts
import type { APIContext } from 'astro';

export const prerender = false;

export async function GET({ locals }: APIContext) {
  const { env, ctx } = locals.runtime;

  const cached = await env.CACHE.get('stats', 'json');
  const { results } = await env.DB.prepare('SELECT * FROM items LIMIT 10').all();
  const file = await env.ASSETS.get('config.json');

  ctx.waitUntil(env.CACHE.put('last-access', new Date().toISOString()));

  return Response.json({ cached, results });
}
```

---

## Edge runtime limitations to consider
- No filesystem access; use KV, R2, or D1 instead of `fs`.
- Limited Node.js APIs; use `node:*` imports and list them under `vite.ssr.external`.
- Worker bundle size limits: about 1 MB free tier, 10 MB paid.
- CPU time: about 50 ms free tier, 30 seconds paid per request.
- Sharp is incompatible; keep `imageService: 'compile'` or `passthrough`.

---

## Quick start commands

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

---

## Conclusion
This scaffold delivers a production-ready Astro project with four strategies: static by default, SSR via `prerender = false`, ISR-like caching through `Cache-Control`, and PPR-style Server Islands with `server:defer`. Tailwind v4 removes JS config via `@theme`, while `platformProxy` keeps local dev aligned with Cloudflare bindings (KV, D1, R2). Use static output with per-page overrides to mix static speed and dynamic capability.

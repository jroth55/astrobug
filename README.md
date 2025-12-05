# astrobug

## Guides

- Unified optimal Astro + Cloudflare Pages + Tailwind v4 guide: `docs/unified-optimal-guide.md`.

## Cloudflare adapter bug repro (missing `_worker.js/_astro`)

This repo is intentionally configured to **show** the adapter bug:

- Config knob that **makes the bug appear**: custom Rollup output directing chunks/assets to `_astro/[name].[hash]` in `astro.config.mjs`:
  ```js
  rollupOptions: {
    output: {
      chunkFileNames: '_astro/[name].[hash].js',
      assetFileNames: '_astro/[name].[hash][extname]',
    },
  },
  ```
- Result: `dist/_worker.js/index.js` and `renderers.mjs` import `./_astro/...` but `_worker.js/_astro` is never emitted. Running `node -e "import('./dist/_worker.js/index.js')"` fails with `ERR_MODULE_NOT_FOUND .../_worker.js/_astro/...`.

- How to **make the bug disappear** (workaround): remove the Rollup output override so the adapter emits worker chunks under `dist/_worker.js/chunks` and references them correctly. (Keeping `output: 'server'` is fine.)

- Stack used for repro:
  - `@astrojs/cloudflare@12.6.12`
  - `astro@5.16.4`
  - `wrangler@4.53.0`
  - `output: 'server'`
  - Tailwind v4 via `@tailwindcss/vite`

Steps to verify:
1) `npm install`
2) `npm run build`
3) `node -e "import('./dist/_worker.js/index.js')"` → observe missing `_worker.js/_astro` module error.

To validate the fix, delete the Rollup output block above, rebuild, and note that imports point to `_worker.js/chunks/...` and the module loads (aside from the expected `cloudflare:` scheme error when running under Node rather than workerd).

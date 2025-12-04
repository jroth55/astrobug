import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.jsonc',
      persist: { path: './.wrangler/state/v3' },
    },
    // Default to compile-time images; switch to 'passthrough' or 'cloudflare' if desired.
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['node:buffer', 'node:crypto'],
    },
  },
});

import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://astrobug.example.com',
  output: 'server',

  devToolbar: { enabled: false },
  trailingSlash: 'never',
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'viewport',
  },
  compressHTML: true,
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.jsonc',
      persist: { path: './.wrangler/state/v3' },
    },
    imageService: 'passthrough',
  }),
  integrations: [
    react({ include: ['**/islands/**'] }),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {},
    build: {
      rollupOptions: {
        output: {
          chunkFileNames: '_astro/[name].[hash].js',
          assetFileNames: '_astro/[name].[hash][extname]',
        },
      },
    },
    ssr: {},
  },
});

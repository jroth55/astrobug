# Astrobug

A minimal Astro project configured for Cloudflare deployment.

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`   |
| `npm run build`   | Build production site to `./dist/`           |
| `npm run preview` | Preview production build locally             |
| `npm run check`   | Run TypeScript type checking                 |

## Deployment

This project is configured with the `@astrojs/cloudflare` adapter for deployment to Cloudflare Pages.

### Deploy to Cloudflare Pages

1. Connect your repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `dist`
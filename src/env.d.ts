/// <reference types="astro/client" />

type ENV = {
  CACHE: KVNamespace;
  SESSION: KVNamespace;
  DB: D1Database;
  ASSETS: R2Bucket;
  ENVIRONMENT: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}

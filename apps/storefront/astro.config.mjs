import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import themes from './src/themes/config.mjs';
const edition = process.env.STOREFRONT_EDITION || 'seller';
const name = (edition === 'seller' ? process.env.STOREFRONT_SELLER_THEME : process.env.STOREFRONT_ORG_THEME) || 'neutral';
if (!Object.hasOwn(themes, name)) throw new Error(`Unknown theme: ${name}`);
export default defineConfig({outDir: process.env.STOREFRONT_OUTPUT_DIR || `./dist/${edition}/`, trailingSlash:'always', vite:{resolve:{alias:{'@theme':fileURLToPath(new URL(themes[name]+'/', new URL('./src/themes/config.mjs', import.meta.url)))}}}});

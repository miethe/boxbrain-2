import { defineConfig } from 'astro/config';
export default defineConfig({outDir: process.env.STOREFRONT_OUTPUT_DIR || `./dist/${process.env.STOREFRONT_EDITION || 'seller'}/`, trailingSlash:'always'});

import { chromium } from '@playwright/test';
const [,, url, out] = process.argv;
const b = await chromium.launch({ executablePath: '/Users/miethe/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: false });
await b.close();

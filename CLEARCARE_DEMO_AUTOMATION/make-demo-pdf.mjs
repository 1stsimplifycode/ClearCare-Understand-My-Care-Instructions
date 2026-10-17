// Prints the synthetic demo discharge letter (HTML) to a PDF with Microsoft Edge (Playwright).
//   PLAYWRIGHT_PATH=… node CLEARCARE_DEMO_AUTOMATION/make-demo-pdf.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const pw = createRequire(join(root, 'package.json'))(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const browser = await pw.chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(pathToFileURL(join(root, 'CLEARCARE_DEMO_AUTOMATION/fixtures/demo_arjun_appendectomy.html')).href);
await page.pdf({ path: join(root, 'CLEARCARE_DEMO_AUTOMATION/fixtures/demo_arjun_appendectomy.pdf'), format: 'A4', printBackground: true });
await browser.close();
console.log('wrote CLEARCARE_DEMO_AUTOMATION/fixtures/demo_arjun_appendectomy.pdf');

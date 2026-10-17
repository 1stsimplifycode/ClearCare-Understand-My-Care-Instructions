# Change impact report

Only **4 original files** were modified, plus `README.md`, which was rewritten. Full diff: `docs/evidence/original-files.diff`. All other original files are byte-identical; this is verified with `cmp` against the baseline extraction. That includes the 6 fixture PDFs, `lib/*.js`, `public/pdf-reader.js`, `public/structured-extract.js`, `public/styles.css` and all 3 original test files.

| Original file | Change | Why necessary | Extension alternative evaluated | Behaviour that could be affected | Regression coverage → result |
|---|---|---|---|---|---|
| `server.js` | (1) Import `lib/ext/routes.js`. (2) `applySecurityHeaders` and `handleExtension` at the top of `handleRequest`. (3) The `/api/explain` result is passed through `verifyLegacyExplanation`. (4) `aiConfigured` reflects `RADEON_API_KEY`. (5) `.mjs` MIME type. (6) `export { handleRequest }` and a `CLEARCARE_NO_LISTEN` guard so tests can import it. | No hook exists to add routes or headers without touching the request handler. AI text from the original route was displayed unverified. Without `.mjs`, browsers reject pdf.js modules, a defect E2E found. | A wrapper server that proxies to the original: rejected, because it would add a second process and port. | Every route: headers are added; v2 routes are matched first, and only `/api/v2/*` and `/samples/*`. Original `/api/explain` output can now be **withheld** when unfaithful. | Original 23 tests pass. `ext-amd-server.test.js`: headers, traversal, 405/415/400/413/422/429, legacy decorator. E2E E01–E03. **PASS** |
| `public/app.js` | (1) `notifyDoc()` dispatches `clearcare:document` after a synthetic or uploaded document is set. (2) `clearcare:document-error` is dispatched after a failed upload. (3) `window.ClearCareBridge` (read-only) exposes `getDoc` and `loadFile`. (4) `renderCare` falls back to the saved language (baseline defect fix). | `currentDoc` is module-private, so the extension cannot see uploads without an event. | Re-parsing the file input in the extension: rejected, because `app.js` clears `input.value` in its own handler, creating a race. | Upload and demo flows dispatch events; no original logic changed. The care plan now honours the saved language. | `safety.test.js` (7 static checks on `app.js`) all pass. E2E E02–E04, E14–E17. **PASS** |
| `public/index.html` | Adds `<link href="/ext/ext.css">` and `<script type="module" src="/ext/main.js">`. **Desktop-only change:** links `/ext/desktop-styles.css` instead of `/styles.css`; adds an app icon; sets the viewport to `width=1280`. | There is no other way to load extension code. The user asked for a desktop application only: the server now serves the original `styles.css` with its `max-width` phone/tablet media blocks removed, and the original file stays byte-identical. | None possible. | Page load gains one CSS and one JS request. | E2E E01 (no JS errors). Original `index.html` assertions in `safety.test.js` pass. **PASS** |
| `package.json` | Version 2.0.0. Scripts `test:e2e`, `smoke`, `perf`. Still **no dependencies**. | Discoverability of the new checks. | None. | None. `npm start` and `npm test` are unchanged. | `npm test` runs all 92 tests. **PASS** |
| `README.md` | Rewritten (quick start, `.bat` files, languages, AMD, safety, tests, docs index); the original content is preserved where still true. | Original claims are now outdated (no OCR, no AI translation). | — | Documentation only. | — |

## UI retention

The original screens were compared pixel by pixel against the original ZIP: 7 screens, Playwright Chromium, 1366×900. All are identical except the added sidebar row at y=344–362 (`docs/evidence/ui-retention.json`). The Today view styles copy the original component metrics. No original markup or styles were changed; the extension only adds a nav row and a hidden section.

## New files (extensions)

- `public/ext/**`: isomorphic modules and UI.
- `lib/ext/**`: server extensions.
- `public/vendor/pdfjs/`: pdf.js 6.2.108 legacy build plus cmaps (Apache-2.0, unmodified).
- `discharge_pdf_adversarial/`: 13 synthetic fixtures.
- `test/ext-*.test.js`: 68 tests (including 2 red-team regression files).
- `e2e/run-e2e.mjs`: 23 browser tests.
- `tools/`: fixture generator, smoke test, performance script.
- Desktop launchers: `ClearCare.ps1` (app window plus server lifecycle), `START_CLEARCARE.bat`, `CREATE_DESKTOP_SHORTCUT.bat`, `clearcare.ico`, `public/ext/icon.svg`.
- `TEST_CLEARCARE.bat`, `.env.example`, reports.

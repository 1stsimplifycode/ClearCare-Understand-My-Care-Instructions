# ClearCare: understand my care instructions (v2)

A **desktop application** (Windows) that is a **multilingual (English · Español · हिन्दी), voice-first, source-grounded post-discharge companion**. It reads a discharge PDF and turns it into:
- a calm daily check-in you can listen to;
- plain-language explanations;
- answers that come only from your document.

Anything unclear is kept in a separate "Needs clarification" list and never becomes a reminder.

> Synthetic-data demo. **Not a medical device** and not clinically validated. Do not upload real patient records. Always follow your care team.

## AMD Developer Hackathon: ACT III (October 2026)

| Topic | Document |
|---|---|
| What was found, fixed and verified | [`CLEARCARE_AUDIT.md`](CLEARCARE_AUDIT.md) |
| Official requirements and status | [`CLEARCARE_AMD_COMPLIANCE.md`](CLEARCARE_AMD_COMPLIANCE.md) |
| What AMD powers, live evidence, how to reproduce | [`CLEARCARE_AMD_VERIFICATION.md`](CLEARCARE_AMD_VERIFICATION.md) |
| Safety boundaries, tests, limitations | [`CLEARCARE_MEDICAL_SAFETY.md`](CLEARCARE_MEDICAL_SAFETY.md) |
| Test results with methods and denominators | [`CLEARCARE_TEST_RESULTS.md`](CLEARCARE_TEST_RESULTS.md) |
| Differentiation (and its limits) | [`CLEARCARE_DIFFERENTIATION.md`](CLEARCARE_DIFFERENTIATION.md) |
| Videos, slide deck, submission checklist | [`CLEARCARE_AMD_ACT_III_SUBMISSION/`](CLEARCARE_AMD_ACT_III_SUBMISSION/) |

New in this round: Family calendar with a **Calendar Agent** (the papers fill the calendar, with a log of every decision), a **Care Agent** (plan → tools → one AMD call → verified answer with a visible trace), a **safety gate** in 5 languages, **38 more languages** via AMD translation with locked doses and back-translation checks, onboarding, completion tracking, and AMD request pacing with request-id telemetry.

Reproduce the evidence: `npm test` · `node tools/eval-extraction.mjs` · `node tools/eval-calendar.mjs` · `node --env-file=.env tools/amd-verify.mjs` (live AMD, about 7 min) · browser suites `e2e/run-e2e.mjs` and `e2e/run-journey.mjs` (need `playwright-core`; set `CLEARCARE_E2E_CHANNEL=msedge` to use installed Edge). Videos: `CLEARCARE_DEMO_AUTOMATION/build-video.mjs A|B`.

## Quick start (Windows)

1. Install **Node.js 22 LTS** from https://nodejs.org (Node 18+ works with reduced server-side PDF reading).
2. Unzip, then double-click **`TEST_CLEARCARE.bat`**. It runs the syntax check, 92 automated tests and a smoke test against the real server. The 23 browser tests are optional. Results go to `test-results.txt`.
3. Double-click **`CREATE_DESKTOP_SHORTCUT.bat`** once. After that, open **ClearCare** from your Desktop or Start menu. It opens in **its own desktop window** (Microsoft Edge app mode: no tabs or address bar), and closing the window stops ClearCare. `START_CLEARCARE.bat` does the same without a shortcut.
4. Optional AMD AI: copy `.env.example` to `.env` and set `RADEON_API_KEY=`.

On macOS or Linux: `npm test`, `npm run smoke`, `npm start`. There are no `npm install` steps and no runtime dependencies.

## What's new in v2 (the original app is preserved)

| Area | What it does |
|---|---|
| **Today: voice-guided daily check-in** | A greeting matched to the time of day, then today's medicines, appointments and recovery tasks. It also covers do-not-take items, a separate needs-clarification list, warning signs and what's coming up. Controls: **Hear my day**, pause, stop, per-sentence replay and speed. Autoplay only with consent, and an honest message if the browser blocks it. |
| **Document reading** | pdf.js text layer with page and line provenance. Handles multi-page, two-column, tables, rotated text, Hindi text and password or malformed detection. Optional local OCR (tesseract). The original parser is kept as a fallback. |
| **Clinical instruction engine** | Status START/CONTINUE/STOP/HOLD/CHANGE/UNKNOWN; dose, unit, quantity (½, ranges), route, frequency (BID/TDS/1-0-1/q6h…), timing, duration, tapers, daily limits, cautions, conditions; appointments, tests, warnings, recovery tasks. Prompt-injection and markup lines are quarantined. |
| **Safety gates** | An instruction becomes a reminder only if it is clear, active, complete and not high-alert. Every AI text **and** every rule-based text is independently verified for numbers, units, names, negation, frequency, timing, as-needed, route, emergency severity and language. If verification fails, the original words are shown instead. |
| **Three languages** | English, Spanish and Hindi only. Explanations are built from the structured meaning, not translated word by word. Code-mixed questions ("Follow-up appointment kab hai?") are understood. |
| **AMD AI (genuine)** | The original AMD Token Factory endpoint and model (`DeepSeek-V4-Flash`). Three explanation modes and grounded Q&A, with timeout, one bounded retry, schema validation, verification and telemetry. One instruction, or at most 3 excerpts, is sent; never the whole document. |
| **Voice** | Web Speech text-to-speech with dose-safe pronunciation ("0.5 mg" → "zero point 5 milligrams") that is verified before speaking. Voice questions start only on a tap, after consent. |
| **Privacy** | Default processing stays in the browser. Plan storage is opt-in. Export and delete are available. Strict CSP and security headers. |

## Original UI retained

The original ClearCare interface is kept as it was.
- Every original screen (Overview, care plan, review, documents, settings, calendar and upload) is **pixel-identical** to the original ZIP at 1366×900. The only exception is one added sidebar row, **Today · Hear my day**, placed below the original items so nothing moves. Evidence: `docs/evidence/ui-retention.json` and `ui-retention-overview-original-vs-new.png`.
- The new Today view reuses the original's own visual language: fonts, panels, rows, status tags, buttons and evidence blocks. Its text colours are a shade darker to meet WCAG contrast; the original screens keep their colours.

## Desktop only

ClearCare is designed and tested as a **desktop application** only.
- The phone and tablet layouts were removed. The original stylesheet's phone breakpoints are stripped when served; the file itself is unchanged.
- A narrow window keeps the desktop layout and scrolls.
- The window opens at 1366×900.
- Your preferences are stored in ClearCare's own window profile (`%LOCALAPPDATA%\ClearCare`).

## Languages

Only **English, Español and हिन्दी** are supported, as requested. Medicine names stay as written on the box, and numbers stay as digits.

## Tests (all executed; see `REGRESSION_RESULTS.md`)

| Suite | Result |
|---|---|
| Original 23 tests (unchanged files) | 23 / 23 |
| Independent red-team rounds (2) | criticals fixed, regression-tested (`docs/ADVERSARIAL_EVALUATION_REPORT.md`) |
| Full `npm test` | 92 / 92 on Node 22. On Node 20: 86 pass, 6 skipped (server-side pdf.js needs Node 22.13 or newer), 0 fail. |
| `npm run smoke` (real server, real HTTP) | 9 / 9 |
| `npm run test:e2e` (Playwright, Chromium) | 23 / 23 |
| axe-core WCAG 2.1 AA on Today | 0 violations |

## Documentation

- **Original baseline and change control:** `BASELINE_MANIFEST.md` · `ARCHITECTURE.md` · `CHANGE_IMPACT_REPORT.md` · `OCP_COMPLIANCE_REPORT.md` · `REGRESSION_RESULTS.md`
- **AMD and security:** `AMD_INTEGRATION_REPORT.md` · `SECURITY_AUDIT.md` · `COMPETITIVE_DIFFERENTIATION.md`
- **`docs/`:** document extraction · clinical safety · multilingual fidelity · speech · calendar briefing · accessibility · E2E · performance · patient-comprehension plan · adversarial evaluation · known limitations and acceptance gates · deployment
- **Evidence (logs, screenshots, JSON):** `docs/evidence/`

## Original sample PDFs

`discharge_pdf/01–06` are the original fictional fixtures and are unchanged. `discharge_pdf_adversarial/07–19` are new synthetic stress fixtures (password: `patient123` for #11).

## Original behaviour that is preserved

The Overview dashboard, review modal ("Mark follow-up done"), care plan modal with **Explain simply**, documents view, synthetic scenarios, and `.ics` export of confirmed appointments only all work as before. The original `/api/explain` response is now also verified before display.

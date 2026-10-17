# Browser end-to-end results

**Environment:**
- Run on 2026-10-17T08:15:22.302Z.
- Node 22.22.0.
- Playwright 1.56 with Chromium 141 (headless).
- The browser clock was fixed at **2026-10-17 09:00 Asia/Kolkata**.

**Test doubles:**
- The AMD endpoint is a **local loopback mock**, labelled "TEST MOCK" in the UI.
- Voices and speech recognition are **mocked** in E07–E12 and E19.
- E20 uses the **real** headless Chromium speech API, which has no voices installed.

**Result: 23 passed, 0 failed, 0 skipped.**

| ID | Scenario | Result | Detail |
|---|---|---|---|
| E01 | original overview renders, no JS errors | PASS |  [32 ms] |
| E02 | original "See full plan" modal with Explain simply (regression) | PASS |  [306 ms] |
| E03 | original calendar export downloads .ics for a confirmed visit (regression) | PASS |  [304 ms] |
| E04 | upload original fixture via original file input → original view + Today plan (bridge) | PASS |  [450 ms] |
| E05 | Today briefing is grounded (appointment Oct 20 is upcoming; PRN acetaminophen not a task) | PASS |  [95 ms] |
| E06 | switch to हिन्दी and Español: transcript, lang attributes, preference saved | PASS |  [237 ms] |
| E07 | Hear my day speaks every transcript segment, normalised and verified (mock voices) | PASS | 9 segments [144 ms] |
| E08 | replay a single segment and speed control change the utterance | PASS |  [59 ms] |
| E09 | Hindi speech uses a Hindi voice and Devanagari text | PASS |  [267 ms] |
| E10 | Explain with AMD (mock) shows verified, labelled TEST MOCK; unfaithful mock output is withheld | PASS |  [566 ms] |
| E11 | Ask: Hinglish appointment, not-in-document, and AI-grounded open question | PASS |  [301 ms] |
| E12 | voice question: consent prompt, visible listening state, answer produced (mock recognition) | PASS |  [95 ms] |
| E13 | comprehension controls: I need clarification adds a question; Explain again changes strategy | PASS |  [236 ms] |
| E14 | medication-change PDF: stop/hold in "Do not take", unclear items separate, injection ignored | PASS |  [397 ms] |
| E15 | XSS text in a PDF is shown as text, never executed | PASS |  [461 ms] |
| E16 | scanned PDF: original error modal offers local OCR; OCR plan flags medicine for checking | PASS |  [2131 ms] |
| E17 | password-protected PDF is refused with a clear message | PASS |  [570 ms] |
| E18 | delete my data clears ClearCare storage | PASS |  [94 ms] |
| E19 | auto-read with consent: blocked autoplay shows a clear fallback (no fake gestures) | PASS |  [609 ms] |
| E20 | real headless Chromium (no voices installed): honest "no voice" message, text still shown | PASS | No voice for this language is installed in this browser, so it can’t read aloud. The text  [445 ms] |
| E21 | desktop app only: Hindi Today at 1366×900; a narrow 800 px window keeps the desktop sidebar (no phone layout) | PASS | {"width":"253px","height":"900px","brand":"flex"} [1342 ms] |
| E22 | axe-core accessibility scan of Today (WCAG 2.1 A/AA rules) | PASS | 0 violations total, 0 serious/critical [1719 ms] |
| E23 | performance: in-browser sample PDF → plan → Today render time | PASS | 290 ms (fetch + pdf.js + engine + render, includes original app parse) [741 ms] |

**Screenshots:**
- `docs/evidence/today-en-desktop.png`
- `docs/evidence/today-hi-desktop.png`
- `docs/evidence/explain-ai-mock.png`

**Accessibility:** `docs/evidence/axe-today.json`.

**Re-run:** `npm i --no-save playwright@1.56.0 axe-core@4.10.2 && npx playwright install chromium && npm run test:e2e`, or use `TEST_CLEARCARE.bat`.

**Not covered:** Firefox, Safari, real speech voices and recognition, and a live AMD endpoint.

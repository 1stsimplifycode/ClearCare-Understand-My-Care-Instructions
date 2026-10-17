# ClearCare audit (AMD Developer Hackathon: ACT III)

Audit date: 17 October 2026. Scope: this folder (`ClearCare-Understand-My-Care-Instructions-main`), mirrored at
https://github.com/1stsimplifycode/ClearCare-Understand-My-Care-Instructions.

Status labels: **VERIFIED** (executed with evidence) · **PARTIALLY WORKING** · **BROKEN** · **MISSING** · **UNVERIFIED** · **BLOCKED BY EXTERNAL DEPENDENCY**.
"Before" is the state found at the start of this work; "After" is the state at the end. Evidence paths are relative to this folder.

## 1. Architecture as found

| Layer | What it is | Files |
|---|---|---|
| Desktop shell | Windows launcher opens Microsoft Edge in app mode against a local server | `ClearCare.ps1`, `START_CLEARCARE.bat` |
| Server | Node.js (no dependencies), `node:http`, binds **127.0.0.1 and ::1 only** | `server.js`, `lib/ext/routes.js` |
| Front end | Plain ES modules, no framework. Original prototype (`public/app.js`) plus the extension UI (`public/ext/main.js`) | `public/` |
| Document reading | pdf.js in the browser (vendored), basic parser fallback, optional local OCR | `public/ext/document/`, `lib/pdf-text.js` |
| Clinical engine | Deterministic extraction, rules-based explanations in EN/ES/HI, fidelity verifier | `public/ext/clinical/` |
| AI | AMD endpoint (`https://developer.amd.com.cn/radeon/api/v1`, model `DeepSeek-V4-Flash`), server-side key | `lib/amd-explainer.js`, `lib/ext/amd-provider.js` |
| Storage | Browser `localStorage` only (no database, no accounts) | `public/ext/main.js` |
| Tests | `node --test` unit/integration; Playwright browser suites | `test/`, `e2e/` |

Main journey traced in code: PDF → `ingestPdfInBrowser` → `extractInstructions` (source line + page kept on every item) → fidelity rules → Today briefing / cards → Calendar Agent → voice (Web Speech) → questions (safety gate → rules → AMD) → AMD output verified by `verifyExplanation` before display.

## 2. Component audit

| Component | Exists | Works | Evidence | Problem found | Severity | Action |
|---|---|---|---|---|---|---|
| AMD key loading | Yes | Before: **BROKEN**. After: **VERIFIED** | `docs/evidence/amd-live-verification.json` | The key was placed in `.env.example`, which is never read; quotes around the value would also have been sent as part of the key | P0 | `.env` created; launcher strips quotes; `npm start` loads `.env` |
| AMD explanation (explain-v2) | Yes | **VERIFIED** (request reaches AMD; verifier gates output) | live run: 3.8 s AMD time, request id `bnzlIQU6…`; output **withheld** by verifier (dropped "every 6 hours") | AI simplification dropped a number; verifier caught it both runs | P1 (safety behaving correctly) | Kept; documented as evidence of the safety net |
| AMD request pacing | No | Before: **MISSING**. After: **VERIFIED** | `test/ext-agent-translate.test.js` ("requests are spaced") | The key allows about 1 request/minute; parallel calls failed with 429 | P0 | Shared queue, `CLEARCARE_AMD_MIN_INTERVAL_MS`, retry once on 429 |
| AMD observability | Partial | **VERIFIED** | AI activity panel; `amd-live-verification.json` | No request ids; latency included queue wait | P1 | Provider request id, served model, AMD latency and queue time recorded separately; no patient text logged |
| Calendar (original overview export) | Yes | Before: **BROKEN**. After: **VERIFIED** | E2E E03 | Download revoked immediately; no DTSTAMP; commas unescaped; PM times wrong | P0 | Fixed in `public/app.js` |
| Recovery calendar | Partial (`.ics` only) | Before: **MISSING**. After: **VERIFIED** | Journey J02–J06, J14, J15 | No calendar view; documents never reached the calendar | P0 | Family calendar, Calendar Agent, completion tracking, missed-visit prompt, reminders, voice overview |
| Calendar persistence | No | **VERIFIED** after a real reload | J03, J03b, J04, J05 | Tests originally used hash-only navigation, which never reloaded | P1 | Real `page.reload()` with document-identity check |
| Urgent symptom handling | No | Before: **BROKEN (unsafe)**. After: **VERIFIED** | `test/ext-safety-gate.test.js`, J07 | "I have chest pain and trouble breathing" answered "not in your document" | **P0** | Safety gate (EN/ES/HI/Hinglish/KN) runs before any answer or AI; emergency banner |
| Medication-change / prescribing requests | Partial | Before: **PARTIALLY WORKING**. After: **VERIFIED** | safety-gate tests, J08, J09 | "Can I double my medication?" → "not found"; prescribing not refused | P0 | Fixed responses quoting the document; agent escalates without AI |
| Voice (Hindi/Spanish) | Yes | Before: **BROKEN**. After: **VERIFIED** in a real Edge window | earlier session log; scene status lines | Only installed voices allowed (PC has English only); 2 s start timeout; utterances garbage-collected | P1 | Online-voice fallback, waits for voices to load, per-line voice, longer start |
| Voice interruption | Yes | **VERIFIED** | J13 | — | — | — |
| Languages beyond EN/ES/HI | No | **VERIFIED (automated checks only)** | `multilingual-eval.json` (Kannada 12/12 verified) | Limited to 3 languages | P1 | 38 more languages via AMD translation with locked tokens and back-translation check. **No qualified human review** |
| Care Agent (agentic, explainable) | No | **VERIFIED** | live: verified answer, 9.7 s AMD time; J09 | No agent existed | P1 | Plan → tools → one AMD call → verify; full trace in UI |
| Onboarding | No | **VERIFIED** | J01 | No first-run guidance | P1 | Language, voice, role, keep-plan, text size; no personal data |
| Extraction fidelity | Yes | **VERIFIED** on 11 synthetic documents | `docs/evidence/extraction-eval.json` | "Review with Dr. …" follow-up missed (held-out doc); "No sports…" line dropped; `Children’s Clinic` (curly apostrophe) not recognised; uninterpreted lines never shown | P0/P1 | All fixed; uninterpreted lines now listed word for word in the All tab |
| Prompt injection in documents | Yes | **VERIFIED** | E14, J17, held-out C | — | — | — |
| Accessibility | Yes | **VERIFIED** (axe-core) | E22 (Today), J20 (Calendar) | 12 colour-contrast failures on the new calendar | P1 | Colours darkened; 0 serious/critical |
| Keyboard-only use | Yes | **VERIFIED** | J16 | — | — | Focus outline added |
| Data isolation | Local only | **VERIFIED** (by design) | `server.js` binds loopback | No accounts or multi-user model exist | Note | Documented; not a multi-patient system |
| Deletion | Yes | **VERIFIED** | E18 | Did not clear new calendar data | P1 | Clears visits and agent calendar too |
| Hosted application URL | No | **BLOCKED BY EXTERNAL DEPENDENCY** | — | Needs a hosting account and a decision about where the AMD key lives | P0 for submission | See `CLEARCARE_FINAL_READINESS.md` |
| OCR for scanned PDFs | Yes | **UNVERIFIED** here | E16 skipped | tesseract/pdftoppm not installed on this PC | P2 | Not installed (would need user approval) |
| Legal compliance (HIPAA, GDPR, DPDP) | — | **UNVERIFIED** | — | No compliance review performed | Note | No compliance is claimed |

## 3. Test totals at the end of this audit

| Suite | Result | Evidence |
|---|---|---|
| Unit and integration (`npm test`) | 107 passed, 0 failed | `npm test` |
| Original browser suite (`e2e/run-e2e.mjs`, Edge) | 22 passed, 0 failed, 1 skipped (OCR) | `docs/evidence/e2e-results.json` |
| Patient-journey suite (`e2e/run-journey.mjs`, Edge) | 22 passed, 0 failed, 4 consecutive runs | `docs/evidence/journey-e2e.json` |
| Extraction against hand-written answers | 110/110 checks, 11 documents, 0 clinically significant errors | `docs/evidence/extraction-eval.json` |
| Live AMD verification | 5 steps; see `CLEARCARE_AMD_VERIFICATION.md` | `docs/evidence/amd-live-verification.json` |

Problems I found in my own test code during this audit (fixed, and listed for transparency): four journey checks returned a message on failure, which counted as a pass; persistence checks did not really reload the page; one reminder test was timing-dependent. All three were corrected before the totals above.

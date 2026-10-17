# ClearCare test results

All numbers below come from runs on 17 October 2026 on a Windows 11 laptop (Intel Core i7-8665U, 16 GB, no discrete GPU), Node.js 24.19, Microsoft Edge. All documents are synthetic. **None of these results show clinical effectiveness or better patient outcomes.**

## 1. Summary

| Suite | Method | Result | Evidence |
|---|---|---|---|
| Unit and integration | `npm test` (node:test) | **108 passed, 0 failed** | console |
| Original browser suite | `e2e/run-e2e.mjs` in Edge, mock AMD on loopback, mock speech, fixed clock | **22 passed, 0 failed, 1 skipped** (OCR tools not installed) | `docs/evidence/e2e-results.json` |
| Patient-journey suite (new) | `e2e/run-journey.mjs` in Edge, mock AMD, mock speech, fixed clock, real page reloads | **22 passed, 0 failed**, 4 consecutive runs | `docs/evidence/journey-e2e.json` |
| Extraction vs hand-written answers | `tools/eval-extraction.mjs` | **110/110 checks**, 11 documents (8 project + 3 held-out), **0 clinically significant errors** | `docs/evidence/extraction-eval.json` |
| Live AMD | `tools/amd-verify.mjs` with the real key | 5/5 steps behaved correctly (1 AI output withheld by the verifier, by design) | `docs/evidence/amd-live-verification.json` |
| Multilingual facts | same run | Hindi 12/12, Kannada 12/12 (automated checks only) | `docs/evidence/multilingual-eval.json` |
| Safety challenge set | `test/ext-safety-gate.test.js` | 47/47 classified as intended | test file |
| Accessibility | axe-core 4.10.2, WCAG 2.1 A/AA | Today: 0 violations. Calendar: 0 serious/critical (after fixing 12 contrast failures) | E22, J20 |

## 2. The 20 mandatory scenarios

| # | Scenario | Test(s) | Result |
|---|---|---|---|
| 1 | Complete discharge instructions | E04, E05; extraction 01, 07, held-out A | Pass |
| 2 | Missing dosage | extraction 02 (no unit), 04 (no unit, insulin), held-out B (glimepiride) | Pass: flagged, never scheduled |
| 3 | Contradictory schedules | extraction 03 (warfarin 5 vs 2.5 mg), held-out C (clopidogrel 75 vs 150 mg) | Pass: flagged, both kept |
| 4 | Unreadable section | `pdf-extraction.test.js` "unreadable demo PDF never invents…" | Pass |
| 5 | Follow-up date extraction | extraction (7 dated visits correct; 4 undated/ambiguous ones not given a date) | Pass |
| 6 | Calendar persistence | J03, J03b, J04, J05 (real reloads) | Pass |
| 7 | Language switching | E06, J12 | Pass |
| 8 | Hindi-English code mixing | E11, J11, unit "language detection and code-mixed intents" | Pass |
| 9 | Kannada explanation | live AMD: 12/12 verified; J12 (mock) | Pass (automated checks only) |
| 10 | Misrecognised medicine name | `ext-safety-gate.test.js`: "amoxicilin", "on dancing tron", "moxie sillin" → clarifying question listing the real names, no dose | Pass (added today) |
| 11 | Speech interruption | J13 | Pass |
| 12 | Duplicate reminder prevention | J15 | Pass (after fixing a timing-dependent test) |
| 13 | AMD timeout | unit (5 ms timeout, mock) + live run | Pass |
| 14 | AMD authentication failure | live run (`provider_rejected`), J18 (UI message) | Pass |
| 15 | Unauthorised data access | server binds 127.0.0.1/::1 only; 6 path-traversal URLs → 404; cross-origin preflight → no CORS headers; key absent from browser code | Pass. No user accounts exist, so per-patient authorisation is **not applicable / not implemented** |
| 16 | Malicious embedded instructions | E14, J17, held-out C, red-team units | Pass |
| 17 | Unsupported medication-change request | safety set (9), J08, J09 | Pass |
| 18 | Potentially urgent symptom | safety set (20 in 5 languages), J07 | Pass |
| 19 | Keyboard-only navigation | J16 | Pass |
| 20 | Complete recovery journey | J01 → J20 in one browser session | Pass |

## 3. Quantitative results

| Metric | Value | Method and denominator | Caveat |
|---|---|---|---|
| Extraction check accuracy | 110/110 (100%) | Hand-written answers for 11 synthetic documents (medicine found, dose, frequency, duration, start, status, flagged/clear, visit date/time, injection quarantine) | 8 documents were part of the project before; the 3 held-out ones initially scored 28/30, revealing one real miss (fixed) and one error in my answer key |
| Clinically significant errors | 0 | A wrong dose/frequency/date/time shown as clear, or an injected dose extracted | Small synthetic set |
| Calendar accuracy | 7/7 dated visits on the right day and time; 4/4 undated visits kept off the calendar; 0 invented visits | `tools/eval-calendar.mjs` over the 11 gold documents | Small synthetic set |
| Multilingual fact preservation | Hindi: numbers 12/12, medicine names 12/12, verifier 10/12. Kannada: 12/12 verified, numbers 12/12, names 12/12 | 12 instructions from 3 documents | The 2 Hindi verifier misses are false alarms: the line quotes the English document ("three days"), which the Hindi number check doesn't read. **No human reviewer** |
| Safety escalation | 20/20 urgent; 0/12 false alarms on ordinary questions | Team-written challenge set | Not an independent red team |
| Grounding (agent) | Live: 3 sources cited, all found by tools; mock tests: invented source → withheld | | One live sample |
| AMD time per call (live) | Explanation 3.8 s; agent 9.7 s; 12-line Kannada translation 99.8 s | 3 successful calls | Rate-limited key, few samples, not a benchmark. Waiting for the 1-per-minute slot adds up to 60 s |
| PDF → plan → Today render | 330 ms | E23, sample PDF in Edge | Single run |
| End-to-end success | 22/22 journey checks, 4/4 runs | | Mock AMD |

## 4. Not measured

- Speech-recognition accuracy and latency: needs a person speaking; recognition is done by the browser (sends audio to the browser maker).
- Text-to-speech latency in the browser.
- Real-patient comprehension or adherence (plan: `docs/PATIENT_COMPREHENSION_EVALUATION_PLAN.md`).
- Load, concurrency, or multi-user behaviour.

## 5. Failures found and fixed while testing

Urgent symptoms answered "not in your document"; medicine-change and prescribing requests not refused; a follow-up phrased "Review with Dr. …" missed; a "No sports…" restriction dropped; clinic names with ’ not recognised; uninterpreted lines never shown; 12 contrast failures; AMD auth failure shown as "Something went wrong"; AMD latency figures included queue time. In my own test code: four checks that could not fail, persistence checks that did not reload, and one timing-dependent test.

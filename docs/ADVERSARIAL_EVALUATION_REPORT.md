# Adversarial evaluation report

Three adversarial passes were run against the software. In each one, every finding was reproduced, root-caused, fixed and covered by a regression test.

1. **The build team's own hostile audit**, using the synthetic fixtures and E2E.
2. **Independent red-team round 1.** A separate agent that had not seen the implementation reasoning wrote 80 inputs and 31 adversarial AI explanations.
3. **Independent red-team round 2.** Roughly 190 new inputs, 89 adversarial explanations and 16 Q&A probes.

The scripts are kept in `tools/redteam/` and `tools/redteam2/`.

## 1. Own audit: defects found and fixed

| # | Attack | Observed | Root cause | Fix | Regression test |
|---|---|---|---|---|---|
| A1 | Table PDF (17) | "twice daily" from another row was assigned to pantoprazole | Free-floating lines were attached to the previous medicine; the table was read as 2 columns | Detect 2+ gutters (table) and keep rows together; attach only same-line text or explicit notes | `ext-document`: table rows |
| A2 | Two-column PDF (08) | Right-column "as needed" leaked into lisinopril | Gutter detection required ≥ 12 items | Lowered the threshold; run-based gutter search | `ext-document`: two-column |
| A3 | Rotated page (09) | Lines merged in reverse | Text read in display orientation | Reading frame rotated by the dominant text angle | `ext-document`: rotated |
| A4 | `Assistant:` injection (14) | Fake 10 mg created a warfarin "conflict" | Regex word-boundary bug | Sentence-level quarantine | `ext-clinical`: injection |
| A5 | XSS text (19) | Markup inside instruction text | Line-level screening only | Sentence-level quarantine of markup and handlers; `esc()` everywhere; CSP | E2E E15 |
| A6 | Browser pdf.js | Silent fallback to the old parser | `.mjs` served as `octet-stream`; the modern pdf.js build needs a 2025+ JavaScript API | MIME type added; switched to the pdf.js legacy build | E2E E04 |
| A7 | Autoplay blocked | Fallback message wiped by re-render | Status not kept in state | `state.voiceMsg` | E2E E19 |
| A8 | Contrast | 14 axe violations | Light grey text | Darkened tokens | E2E E22 (0 violations) |

## 2. Red-team round 1: 13 critical, 17 major, 3 minor. Status: fixed

**Critical examples, each now with a test:**
- "1/2 tablet" was read as **two tablets**.
- "should not take", "should be held", "withheld" and "NOT to be taken" were ignored and became **reminders**.
- "once daily, not twice daily" was read as **twice daily**.
- "do not take it if BP < 100" was rendered as **"Only if BP < 100"**.
- The verifier **accepted** "Keep taking aspirin" for "Stop aspirin", in all 3 languages.

**Main fixes:**
- Fraction and range quantities.
- A larger stop/hold lexicon.
- Negation-aware frequency and timing parsing.
- A **"do not" safety net**: any negation the engine cannot place makes the item *needs clarification*, shown in the document's own words.
- A conditional-stop flag.
- Indian notations: BD, TDS, QDS, 1-0-1.
- `x5d`, daily limits, and caution phrases (milk, alcohol, empty stomach).
- **Verifier:**
  - status-aware stop/keep-taking check;
  - number+unit pair multisets;
  - frequency exclusivity;
  - time-of-day, as-needed and route checks;
  - emergency-delay words;
  - same-verb negation.

**Test:** `test/ext-redteam.test.js`. All 80 inputs are re-checked against the invariants, and all 31 adversarial explanations must be rejected.

## 3. Red-team round 2: 4 critical, 12 major, 6 minor. Status: critical and major fixed or contained

| Finding | Fix |
|---|---|
| "Calcium 500 mg … apart from levothyroxine" created a **levothyroxine 500 mg reminder** | Sentences naming several medicines are split by medicine, or become a **caution** item; a dose never crosses medicines |
| "Never take aspirin and warfarin together" became **two STOP orders** | Interaction sentences become a caution item |
| Dose ranges collapsed to the upper number | Strength ranges are kept, rendered as "4 to 8 units", flagged `dose_range`, and never scheduled |
| The verifier accepted daily → weekly, monthly or alternate days; food-timing reversal; added conditions; as-needed added or removed; early stopping; extra units; a Hindi double negative | New shape, food, condition, as-needed, stop and extra-dose checks |
| Different insulins merged into one item | Insulin types are separate generics; "U" is flagged as error-prone |
| "omit" not recognised; "start … tomorrow" became today's task | Both handled; a relative start is never scheduled |
| Unknown medicines dropped to plain text | Any dose-like line becomes a *needs clarification* item |
| "Rush to hospital", "Dial 108", "Return in 2 weeks", "Repeat CBC" not recognised | Patterns added |
| "Can I double the dose?" and "how much insulin if sugar 300?" | A new *advice* intent answers only from the document, otherwise "not in your document". It never calls AI. |

**Defence in depth (added after round 2):**
- Every rule-based rendering is now verified at runtime (`renderItemSafe`). If verification fails, the patient sees the original words.
- Such an item is also kept out of Today's tasks, card-title doses and calendar files.

**Test:** `test/ext-redteam2.test.js`.

## Remaining known weaknesses (not fixed; contained)

- **Over-flagging.** Recognised as safe but noisy:
  - "OD", "HS" and "Dolo 650" (no unit) are flagged;
  - correct explanations that use number words or unit conversions (0.5 g ↔ 500 mg) are rejected;
  - Hindi-script medicine names are rejected.
- **Vocabulary.** Medicines outside the demo vocabulary are flagged, not interpreted.
- **"3/11" without a year.** Shown as "date not given".
- **No guarantee.** The rules are heuristic. Three passes found and fixed many defects, which means more certainly remain. **This is not a clinically validated system.**

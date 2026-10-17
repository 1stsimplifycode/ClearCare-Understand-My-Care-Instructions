# Clinical safety evaluation

ClearCare is a comprehension tool. It never creates a treatment plan. Safety is enforced by **deterministic gates**, not by prompts.

## Gates

- An item can become a reminder (`schedulable`) only if **all** of the following hold:
  - clarity is `clear`;
  - status is not STOP or HOLD;
  - it is not PRN or conditional;
  - the frequency is known;
  - it is not a taper;
  - it is not delayed-start;
  - it is not high-alert;
  - it is not from OCR.
- Every AI paraphrase must pass `verifyExplanation` before it is displayed.
- Warning severity (emergency, urgent or routine) is computed by rules. AI cannot change it, and the verifier rejects outputs that drop emergency wording.

## Directive examples (all automated tests, passing)

| Source | Result |
|---|---|
| "Start metoprolol after three days." | START, **no dose** (3 is a delay), `missing_dose` and `missing_frequency`, not schedulable |
| "Stop aspirin until reviewed by your doctor." | HOLD with resume condition; rendered "Do not take aspirin for now" in en, es and hi; never a reminder |
| "Take 5 mg for three days, followed by 2.5 mg." | Taper `[5 mg × 3 days, then 2.5 mg]`; not a conflict; not flattened |
| "Continue oral medication BID PC for five days." | CONTINUE, twice a day, after meals, 5 days, oral; **missing name and dose flagged** (not invented) |
| "Do not stop taking unless instructed" | CONTINUE (not STOP) |
| "Do not take ibuprofen." / "Do not take with food." | STOP / not STOP |
| "Do not exceed 3,000 mg in 24 hours" | Max-daily limit, not a dose |
| Same drug "take" + "stop until" | `conflicting_status`; stop/hold wins; no reminder |

## Hazard categories tested

| Category | Status |
|---|---|
| Wrong dose | Tested |
| Missing dose | Tested |
| Altered units | Tested |
| Changed frequency | Tested |
| Negation failures (en/es/hi) | Tested |
| Stop/hold misclassification | Tested |
| Conflicting doses | Tested |
| Conflicting appointments | Tested |
| Missing appointment date, time or place | Tested |
| Ambiguous dd/mm dates | Tested |
| Relative dates | Tested |
| Unsupported model additions (numbers, medicines) | Tested |
| Emergency-severity downgrade | Tested |
| False reassurance | Tested |
| Conditional medicines | Tested |
| Unclear duration / start (disclosed in the briefing) | Tested |
| Missing source evidence (every item carries provenance; asserted in the parse test) | Tested |
| Error-prone notation (ISMP list: QD, OD, HS, SC, naked decimal, trailing zero) | Tested |

There is also a property test: **every** rule-based rendering of **every** fixture item, in 3 languages × 3 modes, passes the verifier (more than 100 renderings).

## Independent red-team rounds

Two independent red-team rounds found 17 critical defects in total, for example:
- "1/2 tablet" read as two tablets;
- "should not take" ignored;
- one medicine's dose leaking to another in the same sentence;
- "Never take aspirin and warfarin together" rendered as "stop warfarin";
- the verifier accepting "keep taking" for a stop instruction.

All are fixed and locked by `test/ext-redteam*.test.js`. As a final layer, **every rule-based explanation is also verified at runtime**. If verification fails, the patient sees the document's own words, and that item cannot become a task, a card-title dose or a calendar entry. Details: `docs/ADVERSARIAL_EVALUATION_REPORT.md`.

## Reference sources

**High-alert list.** The original ClearCare list, plus selected agents from the ISMP *List of High-Alert Medications in Community/Ambulatory Care Settings* (2021).
- Limitation: it is a demo subset, not a formulary.

**Error-prone notation.** ISMP *List of Error-Prone Abbreviations, Symbols, and Dose Designations* (2021).

An empty warning list does **not** mean an instruction is safe.

## Not done

- No clinician review of the rules or the translations.
- No real-patient documents.

Passing synthetic tests is **not** clinical validation.

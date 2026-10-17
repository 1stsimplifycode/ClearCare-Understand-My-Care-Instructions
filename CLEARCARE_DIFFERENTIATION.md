# How ClearCare differs, and where it does not

ClearCare's intended position: **source-grounded, multilingual, voice-supported post-discharge recovery assistance with daily follow-through and explicit clinical boundaries.** This page separates what is genuinely different from what is ordinary. It does not rank competitors; no market study or user study was done.

## 1. Categories compared (by their general purpose, not specific products)

| Category | What it is built for | Gap ClearCare addresses | What ClearCare does **not** do that they do |
|---|---|---|---|
| Telemedicine / doctor-booking platforms | Finding clinicians, booking and holding consultations | Understanding and following instructions **after** a visit, at home, every day | Consultations, booking, payments, clinician access |
| General-purpose medical chatbots | Answering open health questions | Answers come **only** from the patient's own discharge papers; the AI output is checked against the source before display; urgent and care-changing questions bypass AI | Broad health information; symptom assessment |
| Medication reminder apps | Reminders for medicines the user types in | The schedule comes from the clinician's document, with source lines; unclear or high-risk items are flagged instead of scheduled | Pharmacy integration, refills, adherence analytics |
| Translation tools | Translating any text | Medicine names, doses and numbers are locked; each translated line is verified by back-translation; failures stay in English | General translation quality across all domains |
| Discharge summarisers | Shortening a document | Turns it into a **daily** routine (Today, calendar, voice, completion ticks) and keeps every unclear line visible | — |

## 2. Classification of ClearCare's capabilities

| Capability | Classification | Evidence |
|---|---|---|
| PDF reading, text-to-speech, reminders, `.ics` export | **Common existing functionality** | — |
| Rule-based extraction that keeps source line and page, and refuses to guess missing units, doses or dates | **Improvement in execution** | `extraction-eval.json`: 110/110 checks, 0 clinically significant errors on 11 synthetic documents |
| AI output verified against the source (numbers, units, names, negations, frequency, severity) before display, withheld otherwise | **Improvement in execution** | Live run: an unfaithful AMD explanation was withheld |
| Translation with locked clinical tokens + back-translation check; per-line English fallback | **Meaningful combination** | Kannada 12/12 verified automatically (no human review) |
| Calendar Agent: the discharge document fills a family calendar automatically, with a log explaining every decision and ⚠ on unclear items | **Distinctive workflow** (within the limits of our knowledge; no market search done) | Journey J02–J06 |
| Care Agent with deterministic planning, one AI call and a visible trace (steps, evidence, checks) | **Meaningful combination** | Live run: verified answer with trace |
| Safety gate in front of every answer and the agent, in 5 languages | **Improvement in execution** | 47-case challenge set |
| Caregiver framing ("I'm helping someone recover"), family visits on the same calendar | **Meaningful combination** | J01 |
| Patient outcomes (adherence, readmissions, comprehension) | **Unverified differentiator** | No study done. `docs/PATIENT_COMPREHENSION_EVALUATION_PLAN.md` describes one |

## 3. Honest limitations

- No evidence yet that patients understand or follow instructions better with ClearCare.
- Desktop prototype, single user, synthetic data; no clinical-system integration.
- Depends on the document being machine-readable; scanned PDFs need local OCR (not installed in this test environment).
- The AMD key's rate limit (about 1 request per minute) makes AI features slow under load.

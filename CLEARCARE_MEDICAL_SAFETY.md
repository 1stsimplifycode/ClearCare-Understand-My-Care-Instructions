# ClearCare medical safety

ClearCare explains care that a clinician has already prescribed. It does not diagnose, prescribe, assess symptoms or change treatment. It is a prototype tested only with synthetic documents and **is not a medical device**.

## 1. Boundaries enforced in code

| Boundary | Where | How |
|---|---|---|
| Urgent symptoms always escalate | `public/ext/qa/safety.js` (`safetyGate`) | Runs before any answer, rule or AI. Chest pain, breathing trouble, fainting, seizures, heavy or unstoppable bleeding, vomiting or coughing blood, stroke signs, severe allergic swelling, overdose, self-harm (English, Spanish, Hindi, romanised Hindi, Kannada) → "This could be an emergency… call 108 or 112 in India, 911 in the US…". A red banner with the numbers is shown. ClearCare never says whether a symptom is dangerous |
| No medicine changes | same | "double", "skip", "stop", "extra dose", "missed dose", "cut in half" … → "ClearCare can't change how you take a medicine…" plus the document's exact words |
| No prescribing | same | "prescribe", "what medicine should I take for…", "which painkiller" → refusal plus any as-needed medicine the papers already list |
| No skipping visits | same | "skip/cancel my follow-up" → talk to the care team, plus the appointment line |
| Symptom questions | same | "Is this dangerous / normal?" → ClearCare can't judge symptoms; emergency numbers if severe; the document's warning signs |
| Care Agent | `lib/ext/agent.js` | The same gate runs before planning; matched questions return status `escalated` with **no AI request** (test checks that no request was made) |
| No invented facts | `public/ext/clinical/fidelity.js` | Every AI output is checked against the source: numbers, number+unit pairs, units, medicine names, negations ("do not", "stop", "hold"), frequency, as-needed status, severity, language. Any failure → output withheld and the rule-based text plus the original line are shown |
| Translations | `lib/ext/translate.js` | Names, doses, times and numbers are locked as tokens the model must copy unchanged; a literal back-translation must pass the same verifier; failures stay in English, marked **EN** |
| Unclear instructions are never tasks | `public/ext/clinical/engine.js`, `calendar/agent-sync.js` | Missing unit, missing dose, conflicting directions, high-risk medicines (e.g. anticoagulants, insulin), ambiguous dates → "Needs clarification"; on the calendar they show ⚠ with the reason and get no reminders; nothing is filled in by guessing |
| Nothing hidden | `public/ext/main.js` (All tab) | Lines ClearCare could not interpret are listed word for word |
| Documents are data, not commands | engine (`suspicious`), prompts | Lines that look like instructions to software (e.g. "IGNORE ALL PREVIOUS INSTRUCTIONS…") are quarantined and reported; prompts state that documents are data; injected doses never appear (E14, J17, held-out C) |
| Transparency | onboarding, labels | "AI tool, not a doctor"; every text is labelled "ClearCare rules (not AI)" or "AMD AI explanation · checked against your document"; AI-translated lines carry 🌐 |

## 2. Incorrect or unsupported AI responses (Health track requirement)

Every AMD response is verified before display. In the live run of 17 October, AMD's simplified explanation of "Acetaminophen 500 mg … every 6 hours as needed" dropped the interval and the as-needed condition. ClearCare withheld it and showed its rule-based explanation instead (`docs/evidence/amd-live-verification.json`). Withheld answers say so plainly and list the failed checks.

## 3. Sensitive information

- Documents are read on the user's computer. Only single instructions the user asks to explain, questions, translation lines and the agent's gathered evidence are sent to the AMD endpoint. No names are added; documents may still contain names, so users are told not to upload real records during the prototype stage.
- The key stays on the server. The server listens only on 127.0.0.1/::1.
- Logs contain no patient text (`CLEARCARE_AMD_VERIFICATION.md` §5).
- Users can export or delete all ClearCare data from the browser (E18).
- No regulatory compliance (HIPAA, GDPR, India DPDP) is claimed or has been assessed.

## 4. Uncertain results and high-risk decisions

Uncertainty is shown, not resolved: "Needs clarification" tab with reasons; ⚠ on calendar items; "confidence" on agent answers (downgraded when a cited instruction is unclear); the emergency banner for urgent messages. Speech recognition is untrusted input: transcripts are shown in the text box and pass through the same safety gate; ClearCare never turns a heard medicine name into a dose.

## 5. Human review

The care team is the reviewer: every unclear item says what to ask, "I need clarification" adds the question to a list that can be copied, and the print view is for a caregiver.

## 6. Tests

| Test | Result |
|---|---|
| Safety-gate challenge set (`test/ext-safety-gate.test.js`): 20 urgent messages in 5 languages, 9 medicine-change, 4 prescribing, 2 skip-visit, 12 ordinary questions | All 47 classified as intended; the agent made no AI request for an escalated question |
| Red-team suites (`test/ext-redteam*.test.js`) | Pass |
| Browser: emergency banner (J07), medicine change in English and Hindi (J08), agent escalation without AI (J09), prompt-injection PDF (J17), AMD auth failure (J18) | Pass |

## 7. Known limitations and failures observed

- The safety gate is keyword- and phrase-based. A message describing an emergency in unusual words can be missed. The challenge set was written by the same team (no external red team). **This is the most important remaining risk.**
- The fixed safety texts and the built-in Hindi/Spanish wording have not been reviewed by clinicians or professional medical translators.
- Kannada and the other 37 added languages were checked only automatically; no fluent clinician has reviewed them.
- Emergency numbers are for India and the US; other countries are not tailored.
- During development I found and fixed: urgent symptoms answered "not in your document"; "Can I double my medication?" not refused; a follow-up phrased "Review with Dr. …" missed; a "No sports…" restriction dropped; uninterpreted lines never shown.

# Multilingual fidelity report: English, Español, हिन्दी (only)

Languages are limited to **English, Spanish and Hindi**, at the product owner's request. All other languages are out of scope. Kannada, Tamil, Telugu, Malayalam, Marathi and Bengali are **not supported**.

## How meaning is preserved (not word-by-word translation)

Source sentence → structured meaning (status, dose, unit, route, frequency, timing, duration, limits, conditions) → language templates written for each structure → independent verification → display and speech.

- **Free text** (wound care, activity, warnings) is rendered only through **reviewed phrase templates** that capture the numbers. There are 12 patterns, such as "walk N minutes…", "do not lift more than N…", "call 108 or go to emergency…".
- Free text that matches no template is **not machine-translated**. Spanish and Hindi users see a clear note plus the original words, and can ask for a verified AMD explanation.
- **Medicine names** stay in Latin script, as on the box. **Numbers** stay as Latin digits with no thousands separators: "3000 mg", never "3.000". **Times** use a 12-hour clock in every language, with a part-of-day word such as "सुबह 10:30 बजे" or "2:00 de la tarde".

Example: "Continue oral medication BID PC for five days."
- The structure is: continue · oral · twice a day · after meals · 5 days · *name and dose missing*.
- In every language this is shown as **needs clarification**. Missing details are never invented.
- "BID = दिन में दो बार / dos veces al día" is shown in the glossary.

## Evaluation (automated and synthetic; not a human-rated fluency study)

| Check | en | es | hi |
|---|---|---|---|
| Numbers preserved (no missing, none added) | ✔ | ✔ | ✔ |
| Units preserved, none added | ✔ | ✔ | ✔ |
| Medicine names preserved, none added | ✔ | ✔ | ✔ |
| Negation and STOP/HOLD preserved | ✔ | ✔ | ✔ |
| Frequency and time of day preserved | ✔ | ✔ | ✔ |
| Emergency severity preserved | ✔ | ✔ | ✔ |
| Script / language check | ✔ | ✔ | ✔ (Devanagari) |
| Property test: all fixture items × 3 modes | ✔ | ✔ | ✔ |
| Adversarial AI outputs rejected (wrong dose, unit, frequency or language; lost negation; added drug) | ✔ | ✔ | ✔ |

## Code-mixed questions (intent tests passing)

- **Romanised Hindi:** "Doctor ne discharge mein kya bola?", "Ye medicine kab leni hai?", "Follow-up appointment kab hai?"
- **Devanagari Hindi:** "दवा कब लेनी है?"
- **Spanish:** "¿Cuándo es mi cita?"
- **English:** "I didn't understand", "Explain it in Hindi", "Please repeat the second instruction".

**Answer language:** an explicit request comes first, then a clearly Spanish or Devanagari question, then the saved preference. A romanised-Hindi question offers a "Answer in हिन्दी" button. Language is never used to infer anything about the patient.

## Limits

- Natural-sounding output has **not** been rated by native-speaker clinicians.
- The Hindi uses a neutral, standard register; regional dialects are not supported.
- Rule-based coverage of free-text instructions is limited to the template set. Everything else depends on AMD plus the verifier, and AMD is not verified live (see `AMD_INTEGRATION_REPORT.md`).
- Perfect translation is **not** claimed.

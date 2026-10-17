# Draft lablab.ai submission text (edit before submitting)

**Title:** ClearCare: understand and follow your care instructions after hospital

**Challenge track:** Health and Wellbeing

**Short description (≤ 255 characters):**
ClearCare turns a patient's own discharge instructions into a clear, multilingual, voice-supported daily plan and calendar. AMD-hosted AI explains and translates, and every output is checked against the document before it is shown.

**Long description:**
Leaving hospital, families receive pages of medical instructions, often in a language they don't think in. ClearCare reads the discharge PDF on the family's computer and turns it into a daily plan: what to take, what to do, which visits are coming, and when to get help. Every item keeps a link to its exact source line. Anything unclear (a missing unit, conflicting doses, a vague date, a high-risk medicine) is flagged for the care team instead of being guessed.

A Calendar Agent fills a family calendar automatically and explains each decision. The plan can be read aloud, with pause and stop, in English, Spanish and Hindi (reviewed rules) and in 38 more languages through AMD-hosted AI. Medicine names, doses and numbers are locked before translation, and every translated line is verified by back-translation. A Care Agent answers multi-step questions by planning tool calls over the plan and calendar, making one AMD model request, and showing its steps, evidence and safety checks.

ClearCare never diagnoses or prescribes. A safety gate in five languages sends urgent symptom descriptions straight to emergency numbers and redirects requests to change medicines to the care team, without asking the AI. Every AMD response is checked for numbers, units, medicine names and negations before display; failures are withheld.

AMD: explanations, translations, open questions and Care Agent reasoning run on the DeepSeek-V4-Flash model at an AMD Developer Cloud endpoint, with request pacing, request-id telemetry and no patient text in logs. Tested with 108 unit tests, 44 browser checks, a 110-check extraction evaluation on 11 synthetic documents (0 clinically significant errors) and a live AMD verification run. Prototype; synthetic data only; not a medical device.

**Technology tags:** AMD Developer Cloud, DeepSeek-V4-Flash, Node.js, JavaScript, pdf.js, Web Speech API, Playwright, Health

**Links:**
- Repository: https://github.com/1stsimplifycode/ClearCare-Understand-My-Care-Instructions
- Demo video: upload `videos/CLEARCARE_AMD_ACT_III_DEMO.mp4` and paste its URL here
- Application URL: **not available yet** (see `CLEARCARE_FINAL_READINESS.md`)

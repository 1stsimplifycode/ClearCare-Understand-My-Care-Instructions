# Final readiness (17 Oct 2026, 17:31 IST)

## 1. Six evidence gates
| Gate | Status | Evidence |
|---|---|---|
| 1 Real AMD execution | ✅ Live requests with AMD request ids, served model DeepSeek-V4-Flash, measured latency | `CLEARCARE_AMD_VERIFICATION.md`, `docs/evidence/amd-live-verification.json` |
| 2 Clinical fidelity | ✅ 110/110 checks on 11 synthetic documents, 0 clinically significant errors | `docs/evidence/extraction-eval.json` |
| 3 Multilingual EN/HI/KN | 🟡 Automated: Hindi 12/12 numbers and names; Kannada 12/12 verified. **No human review** | `docs/evidence/multilingual-eval.json` |
| 4 Voice + caregiver | 🟡 Interruption, simpler re-explanation, remembered plan and voice in the real Edge window verified; speech recognition accuracy not measured | Journey J10, J13, J03b |
| 5 Calendar | ✅ Document-derived, survives real reloads, completion tracking, 7/7 visits, 0 invented | J02–J06, `tools/eval-calendar.mjs` |
| 6 Safety under challenge | ✅ 47-case set, injection PDF, agent escalates without AI | `CLEARCARE_MEDICAL_SAFETY.md` |

## 2. Deliverables
- ✅ App: 109 unit tests pass (1 skipped: OCR); browser suites 22/23 (1 skipped) and 23/23.
- ✅ `CLEARCARE_AMD_ACT_III_SUBMISSION/CLEARCARE_AMD_ACT_III_3D.pptx`: 16 slides, validator passed, opened in PowerPoint and all 16 slides exported. "3D" = rendered depth from real screenshots plus layered editable shapes; **no native PowerPoint 3D models** (pptxgenjs cannot create them).
- ✅ `videos/CLEARCARE_AMD_ACT_III_DEMO.mp4` (see `CLEARCARE_VIDEO_QA.md`).
- ⛔ `CLEARCARE_STAKEHOLDER_WALKTHROUGH.mp4`: **not rendered** (out of time). Script and automation ready: `PLAYWRIGHT_PATH=… node CLEARCARE_DEMO_AUTOMATION/build-video.mjs B` (about 25 min).

## 3. Owner actions before submitting
1. Review, then push today's changes to GitHub (not pushed).
2. Upload the demo MP4, then paste its link in lablab.ai and on slide 12.
3. Hosted app URL: ⛔ needs a hosting account (e.g. a Node host with `RADEON_API_KEY` and `CLEARCARE_AMD_MIN_INTERVAL_MS` set as secrets).
4. Confirm with organisers that the `developer.amd.com.cn/radeon` endpoint counts as the event's AMD infrastructure.
5. Rotate the AMD key if `.env.example` with the key was ever pushed.

## 4. Internal scores (not competition results)
Application of Technology 7 · Presentation 7 · Business Value 6 · Originality 7 · Medical Safety 7 · Multilingual 5 (no human review) · Caregiver Experience 6 · Calendar 8 · Video 5 (one of two videos) · Submission Readiness 5 (no hosted URL, not pushed).

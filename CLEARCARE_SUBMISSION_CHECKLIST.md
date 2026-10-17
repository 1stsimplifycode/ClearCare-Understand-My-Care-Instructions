# Submission checklist: AMD Developer Hackathon ACT III

Legend: ✅ done and verified · 🟡 done, needs an owner action · ⛔ blocked · ⬜ not started

## Required by the organisers (from the event page, 17 Oct 2026)

| Item | Status | Where / what to do |
|---|---|---|
| AMD technology does a meaningful part of the work | ✅ | `CLEARCARE_AMD_VERIFICATION.md`; ask organisers to confirm the endpoint counts (open question on Token Factory naming) |
| Working prototype | ✅ | Runs locally (`START_CLEARCARE.bat`); 108 unit + 44 browser checks pass |
| Project title, short and long description, track, tags | 🟡 | Draft in `CLEARCARE_AMD_ACT_III_SUBMISSION/SUBMISSION_TEXT.md`; paste into lablab.ai |
| Cover image | 🟡 | `CLEARCARE_AMD_ACT_III_SUBMISSION/cover.png` (title card); upload |
| Demo video | 🟡 | `CLEARCARE_AMD_ACT_III_SUBMISSION/videos/CLEARCARE_AMD_ACT_III_DEMO.mp4`; upload (e.g. YouTube unlisted) and paste the link |
| Pitch presentation | 🟡 | `CLEARCARE_AMD_ACT_III_SUBMISSION/CLEARCARE_AMD_ACT_III_3D.pptx`; upload |
| Public GitHub repository | 🟡 | Repo is public, but today's work is **not pushed**. Push after review (see readiness §3) |
| Demo application platform + application URL | ⛔ | Needs a hosting account; see `CLEARCARE_FINAL_READINESS.md` §4 |
| Team registered; AMD AI Developer Program sign-up; lablab.ai + Discord | 🟡 | Team to confirm |
| Deadline | 🟡 | Online build listed as 12–18 Oct 2026; exact deadline and timezone not on the page; check lablab.ai |

## Package contents

| File | Status |
|---|---|
| `CLEARCARE_AUDIT.md`, `CLEARCARE_AMD_COMPLIANCE.md`, `CLEARCARE_AMD_VERIFICATION.md`, `CLEARCARE_MEDICAL_SAFETY.md`, `CLEARCARE_DIFFERENTIATION.md`, `CLEARCARE_TEST_RESULTS.md` | ✅ (repository root, copied into the package) |
| `CLEARCARE_VIDEO_NARRATION.md`, `CLEARCARE_VIDEO_STORYBOARD.md`, `CLEARCARE_VIDEO_QA.md` | ✅ |
| Two MP4 videos + `.srt` captions + QA frames | see `CLEARCARE_VIDEO_QA.md` |
| `CLEARCARE_AMD_ACT_III_3D.pptx` | see `CLEARCARE_FINAL_READINESS.md` |
| Reproducible automation | ✅ `CLEARCARE_DEMO_AUTOMATION/` |
| `.env.example` without secrets | ✅ |
| No credentials, `node_modules`, caches or real patient data in the package | ✅ checked (see readiness §5) |

# AMD Developer Hackathon: ACT III: requirements and ClearCare's status

Source: https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii (read 17 October 2026). Anything the page does not state is marked **UNVERIFIED**. The page says the rules may change at lablab.ai's discretion, so re-check before submitting.

## A. Official mandatory requirements

| # | Requirement (as published) | ClearCare status | Evidence / action |
|---|---|---|---|
| A1 | "Every project must run a meaningful part of its workload on AMD infrastructure or AMD hardware" | **Met, with one open question.** Explanations, translations (38 languages) and the Care Agent's reasoning run on the AMD-domain endpoint `developer.amd.com.cn/radeon/api/v1` (model `DeepSeek-V4-Flash`) | `CLEARCARE_AMD_VERIFICATION.md`. **UNVERIFIED:** whether this endpoint is the same "Token Factory" the FAQ names (`notebooks.amd.com/tokenfactory`), and which AMD hardware serves it. Confirm with the organisers |
| A2 | The AMD component must be part of the working product shown to judges | Met | Both videos show live AMD calls and the AI activity panel with request ids |
| A3 | Health and Wellbeing: "must not present autonomous diagnosis or treatment as medical advice" | Met | Safety gate, fixed responses, verifier; `CLEARCARE_MEDICAL_SAFETY.md` |
| A4 | Health track: explain handling of incorrect or unsupported responses, sensitive information, uncertain results, high-risk decisions, human review | Met (documented) | `CLEARCARE_MEDICAL_SAFETY.md` §2–§6 |
| A5 | Health track: the demo should make uncertainty visible and show when a person must review or take over | Met | "Needs clarification", ⚠ calendar items, withheld AI output, emergency banner (both videos) |
| A6 | Team of 1–6; members enrolled on lablab.ai and Discord; signed up to the AMD AI Developer Program | **UNVERIFIED** (participant action) | The team must confirm |
| A7 | Project title, short and long description, challenge track, technology tags, working prototype | Draft text provided | `CLEARCARE_AMD_ACT_III_SUBMISSION/SUBMISSION_TEXT.md` |
| A8 | Cover image, demo video, pitch presentation, problem and intended user explained | Files produced | `CLEARCARE_AMD_ACT_III_SUBMISSION/` |
| A9 | Public GitHub repository | Exists (public): https://github.com/1stsimplifycode/ClearCare-Understand-My-Care-Instructions | Today's changes are **not pushed yet** (needs the owner's go-ahead) |
| A10 | Demo application platform and application URL | **BLOCKED BY EXTERNAL DEPENDENCY** | No hosting account available here. See `CLEARCARE_FINAL_READINESS.md` for a deployment plan |
| A11 | Deadline and timezone | **UNVERIFIED**: the page lists the online build as 12–18 October 2026 but no exact deadline | Check lablab.ai |
| A12 | Video length, slide limits, file sizes | **UNVERIFIED**: not stated on the page | Videos kept at 3–5 and 6–10 minutes |

## B. Official judging criteria (no weights published)

1. Application of Technology
2. Presentation
3. Business Value
4. Originality

(The Vibe Generation special prize uses different criteria. ClearCare is not entered for it.)

## C. Recommended competitive improvements (not official requirements)

- Hosted demo URL with a shared demo key and the 1-request-per-minute pacing visible to judges.
- Qualified human review of Hindi and Kannada output by fluent clinicians.
- Clinician review of the fixed safety texts.
- Usability sessions with caregivers.
- A key with a higher request rate, to reduce waiting during judging.

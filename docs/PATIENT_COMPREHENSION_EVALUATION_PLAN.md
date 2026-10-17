# Patient comprehension evaluation plan

**Status:**
- No study with participants has been conducted.
- No participant results exist, and none are reported.
- The automated checks in this repository are **synthetic**. They test software behaviour, not comprehension.

## Design (proposed)

| Item | Plan |
|---|---|
| Design | Within-subject crossover. Each participant gets two matched synthetic discharge documents (A and B) in counterbalanced order: one with the **document only**, one **with ClearCare**. |
| Participants | 24–36 adults who are not clinicians, split evenly across preferred language (English, Spanish, Hindi). Include people aged 60 and over, and people with limited English. Recruit through an ethics-approved protocol with consent. |
| Materials | Fixture pairs of matched difficulty, each with one STOP/HOLD, one taper, one ambiguous dose, one appointment and one warning. All synthetic. |
| Tasks | Q1–Q10 from the directive: locate an instruction; explain it; today's tasks; confirmed vs uncertain; spoken-explanation comprehension; preferred-language comprehension; ask for clarification; inspect the source; recognise when clinician confirmation is needed; navigate independently. |
| Primary outcome | **Critical misunderstanding rate**: taking a stopped or held medicine, a wrong dose or unit, or missing an emergency sign. **Release blocker if more than 0 occur with ClearCare.** |
| Secondary outcomes | Task success, time to find an instruction, comprehension errors by language, voice intelligibility (1–5), perceived clarity (1–5), accessibility blockers, tone (patronising / overfamiliar / falsely reassuring: yes or no, with a reason). |
| Analysis | Paired comparison (McNemar for success; Wilcoxon for time and ratings), reported by language with confidence intervals. All critical errors reported with root cause. |
| Emotional design check | Short interview: "Did it feel calm, respectful and not overwhelming? Did anything feel falsely reassuring or intrusive?" Record verbatim quotes. No invented testimonials. |

## What exists today

- The UI supports every task, and the logging hooks (understood, clarification requests) are stored only on the device.
- No study software, consent material or ethics approval has been prepared.

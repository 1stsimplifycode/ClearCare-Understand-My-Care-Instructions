# ClearCare: Competitive Differentiation

Access date for all sources: 2026-10-17. Evidence comes only from public product pages, app-store listings, and vendor or hospital documentation. **NF** means "not found in documentation". It does not mean the product lacks the feature, only that we could not confirm it from public sources. **Partial** means the documentation covers only part of the capability, as the notes explain.

## 1. Capability matrix

| Capability | Practo | Apollo 24\|7 | Tata 1mg | Google Translate (docs) | Epic MyChart + Emmie | MyDischarge (OpenEM) | Corti Discharge Education Agent | Medisafe | MyTherapy |
|---|---|---|---|---|---|---|---|---|---|
| Discharge-document upload & explanation | NF (stores records/prescriptions [1]) | NF (PHR stores/digitises records [2]) | NF (record tracking only [3]) | Upload yes, explanation no [5] | Partial: AVS plain-language rewrite, in-chart [7] | **Yes** [9] | **Yes** (clinician-side, from EHR docs) [10] | NF (imports meds via Apple Health Records [11]) | NF [12] |
| Plain-language simplification | NF | NF ("abnormal values" analysis of lab reports [2]) | NF | No (translation only) [5] | **Yes** [7] | **Yes** [9] | **Yes**, with a target reading level [10] | NF | NF |
| Multilingual (Hindi / Spanish) | NF | NF | NF | **Yes**, both [6] | Spanish yes (portions of the AVS, set per organization) [8]. Hindi NF | 15+ languages, specific list NF [9] | Partial: "language preference" is an input, languages not named [10] | NF | **Yes**, both listed [12] |
| Text-to-speech / voice | NF | NF | NF | **Yes** ("Listen") [13] | NF | **Yes**, read aloud [9] | NF | NF (alert tones only) [11] | NF |
| Grounded Q&A over the user's own document | NF | NF ("Ask Apollo" is a symptom checker [4]) | NF | No | **Yes**, chart-based Q&A [7] | **Yes** ("Do I take this with food?") [9] | NF (generates questions to ask the clinician) [10] | NF | NF |
| Source-evidence links to the original text | NF | NF | NF | No | NF ("can reference" the chart, but no linking described) [7] | NF | NF (cites external education sources) [10] | NF | NF |
| Uncertainty / ambiguity flags | NF | NF | NF | No | NF | NF | **Yes**: flags incomplete, contradictory or unclear documentation [10] | NF | NF |
| Medication reminders / calendar | NF in current docs | NF | **Yes** [3] | No | Partial: follow-up reminders only, medications NF [7] | NF | NF ("what changed" medication summary only) [10] | **Yes** [11] | **Yes** [12] |
| Daily briefing | NF | NF | NF | No | NF | NF | NF | NF | NF (monthly overview only) [12] |

Other observations:
- Practo, Apollo 24|7 and 1mg mention AI only in general terms: "AI-powered health recommendations" and a symptom checker [1][3][4]. None of the pages we reviewed describes AI explanation of a discharge summary.
- In Belgium, ZAS, AZ Maria Middelares and UZ Brussel are piloting AI plain-language versions of reports and discharge letters in Dutch, French and English. The original sits alongside the simplified version, which doctors do not review [14]. This pilot is not included in the matrix.

## 2. Honest differentiation

**What competitors already do.** None of these features is unique to ClearCare:
- **Discharge-document upload and plain-language explanation:** MyDischarge [9], Epic Emmie for the AVS [7], Corti [10] and the Belgian hospital pilot [14].
- **Multilingual output:** Google Translate (Hindi and Spanish) [6], MyDischarge (15+ languages) [9], MyChart's Spanish AVS [8] and MyTherapy (Hindi and Spanish UI) [12].
- **Voice / read aloud:** Google Translate [13] and MyDischarge [9].
- **Q&A over the patient's own record:** Emmie [7] and MyDischarge [9].
- **Ambiguity flagging:** Corti [10], but on the clinician side.
- **Medication reminders:** 1mg [3], Medisafe [11] and MyTherapy [12].

**Where ClearCare differs.** We did not find documentation of two capabilities in any product reviewed:
- **Per-instruction source-evidence links** back to the original discharge text.
- **A daily briefing.**

Even so, ClearCare's differentiation is the **integrated, safety-gated workflow**, not any single feature. ClearCare is a multilingual (English, Spanish, Hindi only), voice-first, source-grounded post-discharge comprehension companion. Its workflow chains five steps:

1. Each extracted instruction carries its **source evidence**, a link to the exact span in the patient's document.
2. **Ambiguity flags block reminders.** An unclear dose or frequency never becomes a scheduled alarm until it is resolved. The reminder apps we reviewed take whatever the user enters [11][12]. Corti flags ambiguity, but its documentation does not mention reminders [10].
3. AI explanations are **verified against the source** before they are shown.
4. A **daily voice briefing** is generated only from verified items.
5. **Grounded Q&A** answers "not in your document" instead of filling gaps with general knowledge.

Each competitor we reviewed documents at most two or three of these steps, and none documents the gating between them. This difference is about how the product is designed. It does not prove better outcomes, and we have not run a clinical evaluation.

**Honest limits.**
- ClearCare supports three languages. MyDischarge claims 15+ and Google Translate covers far more [6][9].
- ClearCare has no EHR integration. Emmie and Corti work inside clinical systems with chart access [7][10].
- ClearCare is less mature than the established reminder apps (Medisafe, MyTherapy) [11][12].

## 3. What ClearCare deliberately does NOT do

- **No doctor booking or teleconsultation.** These are the core of Practo and Apollo 24|7 [1][4].
- **No pharmacy commerce, medicine ordering or delivery.** These are core to 1mg and Apollo 24|7 [3][4].
- **No telemedicine, diagnosis or symptom checking.** For comparison, Apollo's "Ask Apollo" evaluates symptoms [4].
- **No lab-test booking, billing or payments.**
- **No new clinical advice.** ClearCare only explains what is in the patient's own document and refers everything else to the care team.

This keeps ClearCare free of commercial incentives to upsell, and limits it to comprehension and adherence after discharge.

## 4. Sources (accessed 2026-10-17)

1. Practo, Google Play listing: https://play.google.com/store/apps/details?id=com.practo.fabric&hl=en_IN
2. Apollo 24|7 Personal Health Records: https://apollo247.com/guest-health-records
3. Tata 1mg, Google Play listing: https://play.google.com/store/apps/details?id=com.aranoah.healthkart.plus&hl=en_IN
4. Apollo 24|7, Google Play listing: https://play.google.com/store/apps/details?id=com.apollo.patientapp&hl=en_IN
5. Google Cloud Translation, Translate documents: https://docs.cloud.google.com/translate/docs/advanced/translate-documents (for consumer Google Translate document limits of .docx/.pdf/.pptx/.xlsx up to 10 MB, see the University of Michigan KB: https://teamdynamix.umich.edu/TDClient/30/Portal/KB/Article/13268/Google-Translate-Documents-Files-Using-Google-Translate)
6. Google Cloud Translation, supported languages: https://docs.cloud.google.com/translate/docs/languages
7. Epic, Emmie for Patients: https://www.epic.com/software/emmie
8. Austin Regional Clinic, View AVS in Spanish (MyChart): https://WWW.AUSTINREGIONALCLINIC.COM/patient-guide/mychart-tips/view-after-visit-summary-in-spanish
9. MyDischarge (OpenEM Foundation), app listing: https://mwm.ai/apps/mydischarge/6760598585
10. Corti, Patient Discharge Education Agent: https://www.corti.ai/agents/patient-discharge-education-agent
11. Medisafe, App Store listing: https://apps.apple.com/app/id573916946
12. MyTherapy, App Store listing: https://apps.apple.com/de/app/mytherapy-medication-reminder/id662170995?l=en-GB
13. Google Translate Help, listen to translations: https://support.google.com/translate/answer/6142478
14. Belga News Agency, Belgian hospitals use AI to make medical reports understandable: https://www.belganewsagency.eu/belgian-hospitals-use-ai-to-make-medical-reports-understandable

Method note: We could not fetch the Tata 1mg App Store page, so we used the Play Store listing instead. A 2015 press mention of Practo medicine reminders was excluded because it is not current documentation.

# Known limitations, release blockers and acceptance gates

## Acceptance gates

| Gate | Requirement | Status | Evidence / reason |
|---|---|---|---|
| A | Original ZIP preserved and regression-tested | **PASS** | SHA-256 recorded; 6 modules and 6 fixtures byte-identical; original 23/23 pass |
| B | OCP extension strategy documented | **PASS** | `OCP_COMPLIANCE_REPORT.md`, `CHANGE_IMPACT_REPORT.md` (4 files touched) |
| C | Genuine AMD pathway preserved | **PASS (code) / NOT VERIFIED (live)** | Original endpoint and model reused; tested with mocks; no live key or network in the build environment |
| D | Main journey focused on post-discharge care | **PASS** | No booking, commerce or telemedicine features |
| E | Reliable source-grounded extraction | **PASS (synthetic)** | 19 fixtures; page and line provenance; real-document accuracy not measured |
| F | Safe medication status and dosage handling | **PASS (synthetic, red-teamed)** | 2 independent red-team rounds; criticals fixed with regression tests |
| G | Clinically faithful multilingual explanation (en/es/hi) | **PASS (automated) / NOT VERIFIED (human)** | Verifier and property tests; no native-speaker clinician review |
| H | Functional, understandable voice | **PASS (mocked voices) / NOT VERIFIED (real voices)** | E2E E07–E12, E20 |
| I | Working contextual calendar voice briefing | **PASS** | Calendar tests; E05, E07, E19 |
| J | Safe handling of ambiguous instructions | **PASS (synthetic)** | Gates and the "do not" safety net |
| K | Privacy and security controls | **PASS (local single-user scope)** | `SECURITY_AUDIT.md` |
| L | Accessible desktop frontend (phone layout removed by request) | **PASS (automated)** | axe 0 violations; desktop layout kept at 800–1366 px; no assistive-technology user testing |
| M | Executed automated and E2E tests | **PASS** | 92 unit, 9 smoke, 23 E2E |
| N | Evidence-backed differentiation | **PASS** | `COMPETITIVE_DIFFERENTIATION.md` (14 sources) |
| O | Transparent limitations, reproducible results | **PASS** | This file; `.bat` and `npm` scripts; `docs/evidence/` |

## Release blockers for any real-patient or production use (open)

1. No clinician review of the extraction rules, phrase templates, Hindi or Spanish wording, or high-alert list.
2. No patient comprehension study (plan only).
3. Live AMD behaviour has not been verified (latency, output quality, verifier pass rate).
4. Real-hospital-document accuracy is unknown; all fixtures are synthetic.
5. Not assessed against HIPAA, DPDP, GDPR or medical-device regulation.
6. The `.bat` and `ClearCare.ps1` desktop launchers have not been executed on Windows (`.ps1` parse-checked only). They were written and reviewed in Linux without a Windows host.

## Known limitations

| Area | Limitation |
|---|---|
| Languages | English, Spanish and Hindi only. Hindi- or Spanish-language **documents** are shown verbatim, not structured. |
| Extraction | Rule-based demo vocabulary (~140 names). Complex forms, handwriting and some tables may defeat the layout heuristics. |
| OCR | Optional and local. English data only in the test environment. Every OCR medicine needs checking. |
| Voice | Depends on the voices installed on the device; online voices are off by default. Speech recognition only works in Chrome and Edge and may send audio to the browser vendor. |
| Reminders | In-app reminders work only while the page is open. `.ics` export is available. There are no background or push reminders. |
| Desktop app | Runs in an Edge or Chrome app-mode window, not a separately installed native application. Requires Edge (built into Windows 10/11) or Chrome. |
| Server | Single user on loopback. No authentication or TLS. Server-side pdf.js needs Node ≥ 22.13. |
| Original UI | The original Overview is unchanged: hard-coded demo name and date, small font sizes, and a Google Fonts request. |

# Baseline manifest

The original archive is the protected baseline. It was copied, hashed and extracted into a separate directory. The improved project was built in a different directory.

| Item | Value |
|---|---|
| Archive | `ClearCare-Understand-My-Care-Instructions-main.zip` (delivered unchanged, next to the improved ZIP) |
| SHA-256 | `287ec6a079c0678c9c287880c347cad07553648c43e5926e0b745f8762b6c242` |
| Files | 21 (no dependencies; `package.json` has no `dependencies`) |
| Runtime | Node.js ≥ 18, `node:http` static server bound to `127.0.0.1` and `::1`, port 4173 |
| Baseline tests | `node --test`: **23 / 23 pass**, run on the untouched extraction (Node 22.22.0). Log: `docs/evidence/baseline-original-tests.txt` |

## Original files (SHA-256, first 16 hex characters)

| File | Bytes | SHA-256 (prefix) |
|---|---|---|
| `.gitignore` | 42 | `aab938e3426a8248` |
| `README.md` | 5727 | `f2967a67e9a145f1` |
| `discharge_pdf/01_everyday_recovery.pdf` | 2930 | `5b9fcd909e486cb2` |
| `discharge_pdf/02_ambiguous_dose.pdf` | 2896 | `d73c008fdc492dcb` |
| `discharge_pdf/03_conflicting_warfarin.pdf` | 2836 | `861693ad1c16555c` |
| `discharge_pdf/04_missing_units_insulin.pdf` | 2758 | `e442c36ed40f9f1f` |
| `discharge_pdf/05_high_risk_apixaban.pdf` | 2745 | `a157861757a6bedc` |
| `discharge_pdf/06_unreadable_scan.pdf` | 2759 | `becdd510d6e72668` |
| `lib/amd-explainer.js` | 5925 | `faec436c9ca44413` |
| `lib/extract.js` | 7307 | `7bbeb4beabc90c07` |
| `lib/pdf-text.js` | 3622 | `8846719c8fcbd5d2` |
| `package.json` | 207 | `539705c127ed78d4` |
| `public/app.js` | 32723 | `deb03da6594390c7` |
| `public/index.html` | 8156 | `735a505e9be86017` |
| `public/pdf-reader.js` | 3308 | `f89e827a441ad8ca` |
| `public/structured-extract.js` | 6905 | `4e8ac44540c20732` |
| `public/styles.css` | 16677 | `95936db354b625c5` |
| `server.js` | 4613 | `fdf9a9432ae8b20c` |
| `test/amd-explainer.test.js` | 4857 | `39a9fd4f6e5b21bc` |
| `test/pdf-extraction.test.js` | 4071 | `ca0625a31ecab515` |
| `test/safety.test.js` | 3039 | `3aa2b6ab0b2c83f2` |

## Original API contracts (recorded before any change)

| Route | Contract |
|---|---|
| `GET /api/health` | `{ mode: 'local-pdf-text-demo', aiConfigured: false, uploadsLeaveThisDevice: false }`. `aiConfigured` was hard-coded to `false`. |
| `POST /api/explain` | JSON `{ instruction (1–1200 chars), language: 'English'\|'Español'\|'हिन्दी' }`; any other key → 400; body over 4 KB → 503 (a size error reported as unavailable). Response `{ explanation, cached, clarificationNeeded? }`. Calls `https://developer.amd.com.cn/radeon/api/v1/chat/completions`, model `DeepSeek-V4-Flash`, key from `RADEON_API_KEY`. |
| `POST /api/parse` | `application/pdf` (≤ 12 MB) → original rule-based care plan. The original UI does not use it; it parses in the browser. |
| `GET /*` | Static files from `public/`, with a path-traversal guard. |

## Working functionality observed in the baseline

- An Overview dashboard. "Needs a second look" review modal with "Mark follow-up done" (stored in sessionStorage). My care plan modal with per-instruction **Explain simply** (AMD). Documents modal.
- Six synthetic scenarios, plus in-browser text extraction of the six fixture PDFs through the custom parser (`public/pdf-reader.js`).
- `.ics` export of confirmed appointments only.
- Language select (English / Español / हिन्दी) for labels and the AMD explanation.

## Defects found in the baseline (and how each was handled)

1. The language preference was ignored by the care plan once Settings closed, because `renderCare` read a `<select>` that only exists while the modal is open. **Fixed** with a one-line fallback to the saved preference.
2. `/api/health` reported `aiConfigured: false` even with a key set. **Fixed**.
3. The custom PDF parser cannot read common PDFs: `<hex> Tj` strings, PDFs written by pdf-lib, encrypted files, rotated pages. **Kept unchanged** as a fallback. pdf.js was added as the primary reader.
4. No CSP or other security headers. **Added**.

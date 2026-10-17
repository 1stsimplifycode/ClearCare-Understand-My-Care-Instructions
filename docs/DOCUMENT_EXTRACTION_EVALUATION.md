# Document extraction evaluation (synthetic fixtures only)

Pipeline:
1. Validate the bytes.
2. Read the pdf.js text layer.
3. Lay out the page: group lines, detect gutters (1 gutter = two columns, 2 or more = table rows), and rotate sideways text into its reading frame.
4. Optionally run local OCR.
5. Join continuation lines and keep provenance (page, line range, method, confidence).

The original parser remains as a fallback.

| Fixture | Original pipeline | New pipeline | Verified by |
|---|---|---|---|
| 01–06 (original) | Reads all six | Reads all six, with page numbers and identical safety outcomes | `ext-document`, `ext-clinical` |
| 07 medication changes (pdf-lib, hex strings) | **Fails** (no text) | Reads it. STOP/HOLD/START/taper are correct | unit + E2E E14 |
| 08 two pages, two columns | Fails | Columns separated. Page 2 provenance kept. A right-column "as needed" no longer leaks into lisinopril | unit |
| 09 rotated page / sideways text | Fails | Read in the text's own direction (warning shown) | unit |
| 10 scanned, image-only | Fails | Reported as `no-text`, nothing guessed. Local OCR (tesseract eng) reads it, and every OCR medicine needs checking | unit + E2E E16 |
| 11 password-protected | Fails | Refused with a clear message | unit + E2E E17 |
| 12 empty, 13 malformed | Fail | Refused (`empty` / `malformed`) | unit |
| 14 prompt injection | Fails | 2 lines quarantined. The injected "10 mg" does not reach warfarin | unit |
| 15 contradictory appointments | Fails | Both visits flagged `conflicting_appointment` | unit |
| 16 dates vs doses | Fails | 81 mg (start Oct 20), `.5 g` naked decimal, `QD`, unknown "Zorvexil" and ambiguous `05/06/2026` are all flagged | unit |
| 17 table | Fails | Rows kept together. **Before this fix, the frequency "twice daily" was attached to pantoprazole; that is now fixed and covered by a regression test** | unit |
| 18 mixed English + Hindi | Fails | Hindi lines kept verbatim as "document's own words" items | unit |
| 19 XSS text | Fails | 3 markup fragments quarantined; instructions kept | unit + E2E E15 |

**Confidence** is an ordinal value (high, medium or low), not a probability:
- **Low:** anything read by OCR.
- **Medium:** text-layer items that carry a reason.
- **High:** text-layer items with no reason.

**Limits:**
- Rule-based extraction covers a 70-drug demo vocabulary plus brand aliases. Any other name is flagged, never guessed.
- Layout heuristics can fail on complex forms.
- OCR quality depends on the scan, and only English language data was available in this environment.
- None of this measures accuracy on real hospital documents.

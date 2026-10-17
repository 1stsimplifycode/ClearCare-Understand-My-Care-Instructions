# Performance measurements

The numbers below are measured, not estimated. They come from `node tools/perf.mjs`: Node 22.22.0 on a Linux x64 container, median of 15 runs per file. Raw data is in `docs/evidence/perf.json`.

| Fixture | Original pipeline | New ingest (pdf.js + layout) | Clinical engine | Render ×3 languages + briefing ×3 |
|---|---|---|---|---|
| 01_everyday_recovery | 0.87 ms | 13.69 ms | 1 ms | 9.11 ms |
| 03_conflicting_warfarin | 0.36 ms | 6.69 ms | 0.66 ms | 0.62 ms |
| 08 two pages, two columns | fails | 10.84 ms | 1.43 ms | 17.75 ms |
| 18 mixed Hindi | fails | 18.12 ms | 0.75 ms | 3.71 ms |

## Trade-off

The new ingest step is roughly **10× slower** than the original custom parser: about 5–18 ms instead of under 1 ms. In exchange, it reads **13 document types** the original cannot read. Rendering now includes runtime verification of every explanation (up to ~18 ms for a two-page plan × 3 languages). Absolute times stay far below what a patient would notice.

## Browser and server

| Measure | Result |
|---|---|
| Browser, end to end: sample PDF fetch → pdf.js → engine → Today render | 270–340 ms (E2E E23, headless Chromium, includes the original app's own parse) |
| OCR of one scanned page | About 2 s (tesseract at 200 dpi, E2E E16) |
| Server process after the perf run | 301.8 MB RSS, mostly pdf.js and V8 code; 28.4 MB heap |
| Live AMD latency | **Not measured.** No live access (see `AMD_INTEGRATION_REPORT.md`). |

## Caching

- Only verified AI text is cached, keyed by a hash of the instruction, language and mode.
- No per-patient data is cached on the server.
- pdf.js loads lazily, on the first upload only.

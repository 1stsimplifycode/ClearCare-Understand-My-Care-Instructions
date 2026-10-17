# Regression results

All runs are on Linux x64. Logs are in `docs/evidence/`.

| Run | Node | Result | Log |
|---|---|---|---|
| Baseline: original tests on the **untouched** extraction | 22.22.0 | **23 / 23 pass** | `baseline-original-tests.txt` |
| Regression: the same 3 original test files on the improved project | 22.22.0 | **23 / 23 pass** | `regression-original-tests.txt` |
| Full suite (original 23 + new 69, incl. red-team regressions and desktop-only checks) | 22.22.0 | **92 / 92 pass**, 0 skipped | `full-test-results.txt` |
| Full suite | 20.18.0 | **86 pass, 0 fail, 6 skipped** (pdf.js server-side needs Node ≥ 22.13; the server falls back to the original parser) | `full-test-results-node20.txt` |
| Execution smoke test (real server, real HTTP) | 22.22.0 | **9 / 9 pass** | `smoke-results.txt` |
| Browser E2E (Chromium 141 via Playwright 1.56, mock AMD on loopback, clock fixed at 2026-10-17 09:00 IST) | 22.22.0 | **23 / 23 pass** | `e2e-console.txt`, `e2e-results.json` |

No original test was deleted, weakened or edited: the 3 test files are byte-identical to the baseline.

**Not verified:**
- The `.bat` and `ClearCare.ps1` desktop launchers on Windows. No Windows host was available. The `.ps1` parses with 0 errors in PowerShell 7.4; the `.bat` files were reviewed only.
- Firefox and Safari.
- A live AMD call (see `AMD_INTEGRATION_REPORT.md`).

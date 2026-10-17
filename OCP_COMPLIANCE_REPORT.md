# OCP compliance report

**Principle:** open for extension, closed for unnecessary modification.

| Check | Evidence | Result |
|---|---|---|
| Original archive preserved | SHA-256 `287ec6a0…c242`. Delivered unchanged next to the improved ZIP. | PASS |
| Stable modules untouched | `lib/pdf-text.js`, `lib/extract.js`, `lib/amd-explainer.js`, `public/pdf-reader.js`, `public/structured-extract.js`, `public/styles.css` and the 6 fixtures are **byte-identical** (`cmp`). | PASS |
| Original tests untouched and passing | All 3 test files are byte-identical. 23/23 pass before and after (`docs/evidence/baseline-original-tests.txt`, `regression-original-tests.txt`). | PASS |
| Original API contracts kept | `/api/health`, `/api/explain` and `/api/parse` keep the same request schema. `/api/explain` responses gain only optional fields (`verified`, `withheld`, `failures`). A withheld response still has `explanation` (safe text) and `clarificationNeeded: true`, so the original UI renders it unchanged. | PASS (behavioural tightening documented) |
| Original AMD path preserved | `amd-explainer.js` is unchanged. The new provider **imports** its `AMD_BASE_URL` and `AMD_MODEL` constants rather than redefining them. | PASS |
| Original parser preserved as fallback | `document-node.js` and `browser-provider.js` fall back to `pdf-text.js` and `pdf-reader.js`. A test forces the legacy path (`preferLegacy`). | PASS |
| Original UI preserved | Overview, review modal, care plan modal, documents and `.ics` export all work (E2E E01–E04, E17). The new view is added through an injected nav item and section; original nodes are hidden, not removed, while Today is open. | PASS |
| Modifications minimal and justified | 4 files; see `CHANGE_IMPACT_REPORT.md`. Every change is additive except two defect fixes (language fallback, `aiConfigured`). | PASS |
| No framework rewrite | Still plain Node `http` and vanilla ES modules, with no build step and no runtime npm dependencies. | PASS |

**Residual coupling.** The extension depends on two original DOM ids (`#modal-actions`, `#file-input`) and the `.main-nav`, `.content` and `.greeting` classes. If those are renamed, E2E E04, E14 and E16 fail loudly.

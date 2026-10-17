# Security audit

**Scope:** local single-user app (server bound to `127.0.0.1` and `::1`), browser UI, and AMD calls.

**No compliance claim is made.** ClearCare is not assessed as compliant with HIPAA, DPDP Act 2023 or GDPR, and is not certified as a medical device.

| Threat | Test / evidence | Protection | Result |
|---|---|---|---|
| Malicious PDF (malformed, encrypted, oversized, empty) | `13_malformed`, `11_password_protected`, `12_empty`, 13 MB buffer | pdf.js with `isEvalSupported:false` and no font-face loading; 12 MB and 50-page caps; clear errors; no partial plan | PASS |
| PDF font-eval code execution (class of CVE-2024-4367) | Configuration review | pdf.js 6.2.108 (patched line) plus `isEvalSupported:false` | PASS (config) |
| Prompt injection in a document | `14_prompt_injection.pdf` ("IGNORE ALL PREVIOUS…", "Assistant: … 10 mg") | Sentence-level quarantine; never sent to AMD; shown as "looked like instructions to software"; the AMD prompt treats the instruction as data | PASS |
| Prompt injection in a question | Unit test | Questions with injection patterns are refused; excerpts are screened | PASS |
| Model output manipulation | Unit tests with adversarial AI outputs | Schema check plus fidelity verifier; withheld on mismatch | PASS |
| XSS via document text | `19_xss_text.pdf` (`<img onerror>`, `<script>`, `"><svg onload>`), E2E E15 | Markup sentences quarantined; all dynamic text goes through `esc()`; CSP `script-src 'self'` (no inline script) | PASS |
| Unsafe HTML or links from AI | Verifier rejects `<…>`, `http(s)://` and `www.` | — | PASS |
| API key leakage | Tests: key absent from `/api/v2/status` and frontend files | Key server-side only; never logged | PASS |
| Insecure logging | Code review | Server logs only the error class name; telemetry holds no content | PASS |
| Path traversal | `/../server.js`, `%2e%2e`, `/samples/..%2F`, `/vendor/../../.env` → 403/404 | Original normalize guard plus a sample allow-list regex | PASS |
| Clickjacking, MIME sniffing, referrer | Header test | CSP `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (mic self only), COOP | PASS |
| Resource exhaustion | 413 test, rate-limit test | Body caps (4 KB, 8 KB, 12 MB); 30 AI requests and 10 parse requests per minute; OCR max 10 pages with timeouts | PASS |
| Duplicate requests | Unit test | In-flight de-duplication | PASS |
| Malicious calendar content | `icsEscape` test | ICS text escaped (`; , \ newline`) and folded | PASS (new export). The original appointment export does not escape commas; its input comes from extracted text with newlines removed. **Residual, low.** |
| Cross-session / cross-patient exposure | Design review | No accounts and no server-side storage. The server cache holds only verified explanation text keyed by instruction, with no identity. Per-browser `localStorage`, with the care plan **opt-in**. | PASS (single-user local design) |
| Data persistence leaks | E2E E18 | "Delete my data" removes all `clearcare-ext-*` keys and the review state | PASS |
| Third-party transmission | Code review | The PDF stays in the browser (default path) or on the local server (OCR / parse, temp files deleted). AMD receives one instruction or ≤ 3 excerpts. **Web Speech:** Chrome and Edge speech recognition and "online" voices may send audio or text to the browser vendor; this is disclosed before mic use and online voices are off by default. **Google Fonts:** the original `styles.css` loads fonts from Google (IP address exposure, no document data). | Disclosed |
| Insecure dependencies | — | No runtime npm dependencies. pdf.js is vendored and pinned (Apache-2.0). Dev-only tools (Playwright, axe-core, pdf-lib) are installed with `--no-save`. | PASS |
| Authorization | N/A | Single-user local server on loopback only. **Do not expose it on a network** without adding authentication and TLS. | Documented |

**Residual risks:**
- The server on a shared or multi-user computer: any local user can call it.
- `localStorage` is not encrypted at rest.
- Speech-vendor transmission when the user opts in.

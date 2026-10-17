# AMD integration report

## 1. Actual configuration (verified in code)

| Item | Value | Source |
|---|---|---|
| Provider | AMD Developer Cloud **Token Factory** (OpenAI-compatible chat completions) | `lib/amd-explainer.js` (original, unchanged) |
| Endpoint | `https://developer.amd.com.cn/radeon/api/v1/chat/completions` | `AMD_BASE_URL` (original constant, imported by the new provider) |
| Model | `DeepSeek-V4-Flash` | `AMD_MODEL` (original constant). The new code adds **no** model override. |
| Credential | `RADEON_API_KEY`, server environment only (or `.env`, read by the `.bat`). Never sent to the browser. A test asserts that no frontend file contains the key name, the endpoint or `Bearer`. | `lib/ext/amd-provider.js`, `test/ext-amd-server.test.js` |
| Test override | `CLEARCARE_AMD_BASE_URL` is accepted **only for loopback hosts**; anything else throws. The UI then shows "TEST MOCK". | `amdConfig()` plus its test |

No OpenAI, Gemini or Anthropic code or endpoint exists in the project.

## 2. Data flow

1. The patient taps **Explain with AMD AI** on one instruction card.
2. The browser sends `POST /api/v2/explain` with `{ instruction, language, mode }`. The PDF, the plan, the patient name and the history are never sent.
3. The server re-parses that one instruction. If it is unclear (missing unit or dose, conflicting, unknown medicine, unreadable…), it returns `needs_clarification` with **no AMD call**.
4. Prompt: a static, cacheable system rule set, then `<instruction>…</instruction>` treated as data, the target language, and the mode rule. `temperature: 0`. `max_tokens` is 220 (simple) or 420.
5. The response is size-checked (64 KB), `<think>` blocks are stripped, and exactly one JSON `{explanation, steps[]}` is required (schema check).
6. **Independent fidelity check.** `fidelity.js` checks numbers, units, medicine names (none missing, none added), negation and stop/hold, frequency, emergency severity, language/script, links/markup, and false reassurance. The same code runs in the browser for the rule-based text.
7. If it is `verified`, the text is shown with the label "AMD AI explanation · checked against your document" and the model name. If it is `withheld`, the AI text is **not sent to the browser at all**; the original words and a clarification notice are shown instead.
8. `POST /api/v2/ask` follows the same pattern, but sends only ≤ 3 retrieved excerpts. Answers must cite excerpt ids and pass the partial fidelity checks plus a stop/hold check.
9. The **original** `/api/explain` route is kept, and its output now passes through the same verifier (`verifyLegacyExplanation`).

## 3. Reliability controls

| Control | Implementation | Test |
|---|---|---|
| Timeout | 15 s per attempt (AbortController) | `timeout` |
| Bounded retry | Max 1 retry, only on 5xx, timeout or network errors. Never on 429 or 4xx. Backoff 300 ms + jitter. | 503→ok (2 attempts); 503×2 (2 calls); 429 (1 call); 400 (1 call) |
| Rate limiting | Provider 429 is surfaced and not retried. Local limit of 30 req/min per client on AI routes. | HTTP 429 test |
| Cancellation | A client disconnect aborts the upstream call. | `cancelled` |
| Size limits | Request body ≤ 4 KB (explain) or 8 KB (ask). Prompt ≤ 8000 chars. Response ≤ 64 KB. | 413 test, `too_large` |
| Caching | Verified results only, keyed by SHA-256(lang, mode, instruction), max 300 entries. Concurrent duplicates are de-duplicated. Errors are not cached. | Duplicate test |
| Telemetry | In-memory ring buffer of op, outcome, status, latency, attempts and the mock flag. **No content.** Exposed at `/api/v2/status`. | `telemetrySummary` |
| Sanitized errors | Fixed messages only. Raw provider errors and keys are never echoed. | Status-endpoint leak test |

## 4. Evidence of API invocation

| Evidence | Status |
|---|---|
| Request shape (URL, model, auth header, temperature, 2 messages, only one instruction) | **Verified with a mocked `fetch`** (unit tests) and a **loopback mock server** (E2E E10, E11) |
| Live call to the AMD endpoint | **NOT VERIFIED.** This build environment has no `RADEON_API_KEY`, and its network proxy blocks `developer.amd.com.cn` (`CONNECT tunnel failed, response 403`; `docs/evidence/amd-reachability.txt`). |
| How to verify yourself | Put `RADEON_API_KEY=…` in `.env` and run `TEST_CLEARCARE.bat`. The smoke test makes **one** live call and prints `LIVE AMD: verified/withheld, <latency> ms`. |

## 5. Latency

Live latency has not been measured (see above). Server-side overhead excluding the network, measured with mocks, is under 5 ms for validation, re-parse and verification. After live calls, `/api/v2/status` reports p50 and p95.

## 6. Failure behaviour (all tested)

| Failure | What happens |
|---|---|
| No key | 503 `not_configured`. The card says AI isn't set up and that the text shown comes from ClearCare's rules. |
| Timeout, 5xx or network error | One retry, then 503/504 with a calm message. The original instruction and the rule-based explanation stay visible. |
| 429 | No retry. "Busy, try again shortly." |
| Malformed or wrong-schema JSON | 502 `schema_invalid`. Nothing is shown from the AI. |
| Unfaithful content | `withheld`, with the failed check codes listed. No AI text is shown. |

The system never fabricates an AI explanation. The rule-based rendering is always labelled "Explained by ClearCare rules (not AI)".

## 7. Hardware acceleration

**No claim is made.** Token Factory is a hosted service. ClearCare cannot observe what hardware serves a request, and no AMD GPU runs locally. Any statement about AMD Instinct or ROCm acceleration would need AMD's own service documentation, which was not verified here.

## 8. Live vs mocked vs unavailable

| Component | State in this delivery |
|---|---|
| AMD explanation and Q&A code paths | Implemented. Tested against **mocks** (labelled). **Live: not verified.** |
| Fidelity verifier | Implemented, tested (live and mock independent) |
| Rule-based explanations, briefing, extraction | Implemented, tested, no network needed |

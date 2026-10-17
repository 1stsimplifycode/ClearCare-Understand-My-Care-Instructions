# What AMD powers in ClearCare, and how to reproduce it

## 1. The AMD component

| Item | Value | How it was verified |
|---|---|---|
| Endpoint | `https://developer.amd.com.cn/radeon/api/v1/chat/completions` (OpenAI-compatible) | Constant `AMD_BASE_URL` in `lib/amd-explainer.js`; live calls below |
| Model requested | `DeepSeek-V4-Flash` | `AMD_MODEL` in `lib/amd-explainer.js` |
| Model reported by the service | `DeepSeek-V4-Flash` (field `metadata.used_model`) | Recorded per call in `docs/evidence/amd-live-verification.json` |
| Provider name used in the app | "AMD Developer Cloud Token Factory" (the original project's wording) | **UNVERIFIED:** I could not confirm that this endpoint is the Token Factory the event FAQ names (`notebooks.amd.com/tokenfactory`), or which AMD GPUs serve it. The service is hosted remotely; **nothing runs on ROCm or a local AMD GPU in ClearCare**, and no such claim is made |
| Key handling | `RADEON_API_KEY` in `.env` (git-ignored), read only by the Node server. Browser code never sees it (test `ext-amd-server.test.js` scans the front-end files for it) | Unit tests |
| Rate limit | About 1 request per minute for this key. All AI calls share one queue spaced by `CLEARCARE_AMD_MIN_INTERVAL_MS` (60000) | `lib/ext/amd-provider.js`; test "requests are spaced" |

## 2. Product features that depend on AMD

| Feature | Route | What the AMD model does | Safety check before display |
|---|---|---|---|
| Explain with AMD AI | `POST /api/v2/explain` | Explains one discharge instruction (simple / detailed / step by step; EN, ES, HI) | `verifyExplanation`: every number, unit, medicine name, negation, frequency and severity must match the source, or the output is withheld |
| Ask about your document (open questions) | `POST /api/v2/ask` | Answers from at most 3 retrieved instructions | Grounding (cited ids must be the ones sent) + verifier + STOP/HOLD check |
| More languages (38) | `POST /api/v2/translate` | Translates ClearCare's own English text and gives a literal back-translation, in one request | Medicine names, doses, times and numbers are locked as `[[n]]` tokens; tokens must come back exactly once; the back-translation must pass `verifyExplanation` |
| Care Agent | `POST /api/v2/agent` | Reasons over evidence gathered by deterministic tools (one request per question) | Safety gate first (no AI for urgent or care-changing questions); cited sources must come from the tools; verifier; STOP/HOLD check |

Not AI: document reading, extraction, the Calendar Agent, the built-in English/Spanish/Hindi wording, and the safety gate are all deterministic code running on the user's computer.

## 3. Live verification run (17 October 2026, 10:21–10:27 UTC)

Command: `node --env-file=.env tools/amd-verify.mjs` → `docs/evidence/amd-live-verification.json` and `docs/evidence/multilingual-eval.json`. Synthetic documents only. "AMD time" is from sending the request to receiving the response; "queue" is time spent waiting for the 1-per-minute slot.

| Step | Result | AMD time | Queue | AMD request id |
|---|---|---|---|---|
| Explanation of "Acetaminophen 500 mg: … every 6 hours as needed …" | Response received; **withheld** by ClearCare: the AI's simplification dropped "every 6 hours" and "as needed" (`number_missing`, `pair_missing`, `prn_lost`). The same happened in an earlier run | 3,797 ms | 15 ms | `bnzlIQU6uaupAUxQZcibvYZpRnVEN65DEt4PaAFE` |
| Kannada translation of 12 instructions (one request) | **12/12 verified**; numbers and medicine names identical to the English in all 12 | 99,769 ms | 59,941 ms | `jYIlwglYQGZuPnUlrqPeOqPd9bRuaMUPeCIl014F` |
| Care Agent: "What medicines should I stop, and what do I have tomorrow?" | **Verified**, confidence high, 3 tools used, all 4 checks passed | 9,669 ms | 59,964 ms | `c0gPUJ8J7EEKAZaH5W151xRWpAhptVYCfI53FNkp` |
| Invalid key | Reported as `provider_rejected` (HTTP 502 to the app), no crash | 1,042 ms | 59,996 ms | — |
| 5 ms timeout | Reported as `timeout` (HTTP 504 to the app) | 17 ms | 60,001 ms | — |

An earlier run the same morning timed out on the Kannada step (the limit was 60 s; the call needed about 100 s). The translation limit was raised to 150 s without automatic retry.

Measured latency is a handful of samples on a rate-limited key. It is not a benchmark.

## 4. Reproduce it

1. Put the key in `.env`: `RADEON_API_KEY=…` and `CLEARCARE_AMD_MIN_INTERVAL_MS=60000`.
2. `node --env-file=.env tools/amd-verify.mjs`. This takes about 6–8 minutes because of the request spacing.
3. Or use the app: start ClearCare, add a sample PDF, press **Explain with AMD AI** on a card, then open **⚙ AI activity on AMD (for reviewers)** at the bottom of Today to see the request id, served model, AMD time and queue time of each call.

## 5. What the logs contain

Per call: time, task name (`explain`, `translate`, `agent`, …), outcome, HTTP status, AMD time, queue time, attempts, the provider's request id and the served model. **No instruction text, question, answer or key is logged.**

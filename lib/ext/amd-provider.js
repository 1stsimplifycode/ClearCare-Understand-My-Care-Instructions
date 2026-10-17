// AMDInferenceProvider + InferenceTelemetry + InferenceFallbackStrategy.
// Reuses the ORIGINAL endpoint and model constants from lib/amd-explainer.js. The only
// override allowed is a loopback base URL for automated tests, and responses produced that way
// are labelled `mock: true` everywhere they surface.
import { AMD_BASE_URL, AMD_MODEL } from '../amd-explainer.js';

const MAX_PROMPT_CHARS = 8000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const telemetry = [];

export function amdConfig(env = process.env) {
  let baseUrl = AMD_BASE_URL, mock = false;
  if (env.CLEARCARE_AMD_BASE_URL) {
    const u = new URL(env.CLEARCARE_AMD_BASE_URL);
    if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(u.hostname)) throw new Error('CLEARCARE_AMD_BASE_URL may only point to a loopback test server.');
    baseUrl = env.CLEARCARE_AMD_BASE_URL.replace(/\/$/, ''); mock = true;
  }
  return { baseUrl, model: AMD_MODEL, apiKey: env.RADEON_API_KEY || '', configured: Boolean(env.RADEON_API_KEY), mock, provider: 'AMD Developer Cloud Token Factory' };
}

function record(entry) { telemetry.push({ ts: new Date().toISOString(), ...entry }); if (telemetry.length > 200) telemetry.shift(); }
export function telemetrySummary() {
  const ok = telemetry.filter(t => t.outcome === 'ok');
  const lat = ok.map(t => t.latencyMs).sort((a, b) => a - b);
  const p = q => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] : null);
  return { calls: telemetry.length, ok: ok.length, errors: telemetry.length - ok.length, p50Ms: p(0.5), p95Ms: p(0.95), recent: telemetry.slice(-10).map(({ ts, op, outcome, status, latencyMs, queueMs, attempts, mock, requestId, servedModel }) => ({ ts, op, outcome, status, latencyMs, queueMs, attempts, mock, requestId, servedModel })) };
}
export function resetTelemetryForTests() { telemetry.length = 0; nextSlot = 0; queued = 0; }

// RequestPacer: the AMD key allows a limited number of requests per minute. Calls are queued and
// spaced CLEARCARE_AMD_MIN_INTERVAL_MS apart (0 = no spacing), so they wait their turn instead of
// failing with 429. One queue is shared by explanations, questions, translations and the Care Agent.
let nextSlot = 0, queued = 0, chain = Promise.resolve();
const intervalOf = env => Math.max(0, Number(env.CLEARCARE_AMD_MIN_INTERVAL_MS) || 0);
export function amdQueueStatus(env = process.env) { const intervalMs = intervalOf(env); return { intervalMs, queued, nextFreeInMs: Math.max(0, nextSlot - Date.now()) }; }
function acquireSlot(env, signal) {
  const intervalMs = intervalOf(env);
  if (!intervalMs) return Promise.resolve();
  queued++;
  const turn = chain.then(() => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(err('Cancelled.', 499, 'cancelled'));
    const wait = Math.max(0, nextSlot - Date.now());
    const t = setTimeout(() => { nextSlot = Date.now() + intervalMs; resolve(); }, wait);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(err('Cancelled.', 499, 'cancelled')); }, { once: true });
  }));
  chain = turn.catch(() => {});
  return turn.finally(() => { queued--; });
}
function backOff(env) { const i = intervalOf(env); if (i) nextSlot = Math.max(nextSlot, Date.now() + i); }

const err = (message, status, code, extra = {}) => Object.assign(new Error(message), { status, code, ...extra });
const sleep = (ms, signal) => new Promise((resolve, reject) => { const t = setTimeout(resolve, ms); signal?.addEventListener('abort', () => { clearTimeout(t); reject(err('Cancelled.', 499, 'cancelled')); }, { once: true }); });

/**
 * One chat completion against the AMD endpoint.
 * Bounded retry: at most 1 retry, only for 502/503/504 or network failure. Never for 4xx/429.
 */
export async function amdChat({ system, user, maxTokens = 400, op = 'chat', timeoutMs = 15000, signal, fetchImpl = fetch, env = process.env, retries = 1 }) {
  const cfg = amdConfig(env);
  if (!cfg.configured) throw err('The AMD explanation service is not configured on this computer.', 503, 'not_configured');
  if (typeof system !== 'string' || typeof user !== 'string' || system.length + user.length > MAX_PROMPT_CHARS) throw err('Request is too large.', 413, 'too_large');
  let attempt = 0;
  const started = performance.now();
  let sentAt = started, queueMs = 0; // latency = AMD processing time of the last attempt; queueMs = time waiting for a request slot
  while (true) {
    attempt++;
    const waitStart = performance.now();
    await acquireSlot(env, signal);
    queueMs += Math.round(performance.now() - waitStart); sentAt = performance.now();
    const ctl = new AbortController();
    const onAbort = () => ctl.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, { method: 'POST', signal: ctl.signal, headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: cfg.model, temperature: 0, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
      if (res.status === 429) { const ra = Number(res.headers?.get?.('retry-after')) || null; backOff(env); throw err('The AMD service is busy (rate limited). Please try again shortly.', 429, 'rate_limited', { retryAfter: ra, retryable: intervalOf(env) > 0 }); }
      if (res.status >= 500) throw err('The AMD service is temporarily unavailable.', 503, 'provider_error', { retryable: true });
      if (!res.ok) throw err('The AMD service rejected the request.', 502, 'provider_rejected', { retryable: false });
      const raw = await res.text();
      if (raw.length > MAX_RESPONSE_BYTES) throw err('The AMD service returned an oversized response.', 502, 'invalid_response');
      let data; try { data = JSON.parse(raw); } catch { throw err('The AMD service returned an invalid response.', 502, 'invalid_response'); }
      let content = data?.choices?.[0]?.message?.content;
      if (Array.isArray(content)) content = content.map(p => p?.text || '').join('');
      if (typeof content !== 'string' || !content.trim()) throw err('The AMD service returned an empty response.', 502, 'invalid_response');
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const latencyMs = Math.round(performance.now() - sentAt);
      // Observability without patient text: the provider's own request id and the model that actually served it.
      const requestId = String(data.metadata?.request_id || data.id || '').slice(0, 80) || null;
      const servedModel = String(data.metadata?.used_model || data.model || cfg.model).slice(0, 80);
      record({ op, outcome: 'ok', status: 200, latencyMs, queueMs, attempts: attempt, mock: cfg.mock, requestId, servedModel });
      return { text: content, latencyMs, attempts: attempt, model: cfg.model, mock: cfg.mock, requestId, servedModel, usage: data.usage ? { prompt: data.usage.prompt_tokens, completion: data.usage.completion_tokens } : null };
    } catch (e) {
      const cancelled = signal?.aborted;
      const timedOut = !cancelled && (e.name === 'AbortError' || ctl.signal.aborted);
      const failure = cancelled ? err('Cancelled.', 499, 'cancelled') : timedOut ? err('The AMD service took too long to answer.', 504, 'timeout', { retryable: true }) : e.status ? e : err('Could not reach the AMD service.', 503, 'network_error', { retryable: true });
      if (failure.retryable && attempt <= retries && !cancelled) { await sleep(300 * attempt + Math.floor(Math.random() * 200), signal); continue; }
      record({ op, outcome: failure.code, status: failure.status, latencyMs: Math.round(performance.now() - sentAt), queueMs, attempts: attempt, mock: cfg.mock });
      throw failure;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); backOff(env); /* the quota window counts from when a call ends */ }
  }
}

// StructuredOutputValidator: pull exactly one JSON object and check its schema.
export function parseJsonObject(text, schema) {
  const s = String(text).replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start < 0 || end <= start) throw err('The AMD response was not in the expected format.', 502, 'schema_invalid');
  let obj; try { obj = JSON.parse(s.slice(start, end + 1)); } catch { throw err('The AMD response was not in the expected format.', 502, 'schema_invalid'); }
  for (const [k, type] of Object.entries(schema)) {
    const v = obj[k];
    const ok = type === 'string[]' ? Array.isArray(v) && v.every(x => typeof x === 'string') : type === 'string?' ? v === undefined || v === null || typeof v === 'string' : typeof v === type;
    if (!ok) throw err('The AMD response was not in the expected format.', 502, 'schema_invalid');
  }
  return obj;
}

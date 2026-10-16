import test from 'node:test';
import assert from 'node:assert/strict';
import { explainInstruction, explanationCacheKey, resetExplanationStateForTests, AMD_BASE_URL, AMD_MODEL } from '../lib/amd-explainer.js';

const ok = text => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
test.beforeEach(() => resetExplanationStateForTests());

test('AMD request sends only selected instruction and fixed minimal safety prompt', async () => {
  let captured;
  const result = await explainInstruction({ instruction: 'Walk for 10 minutes twice a day as tolerated.', language: 'English' }, { apiKey: 'test-secret', fetchImpl: async (url, options) => { captured = { url, options, body: JSON.parse(options.body) }; return ok('Walk for 10 minutes two times each day, if you feel able.'); } });
  assert.equal(captured.url, `${AMD_BASE_URL}/chat/completions`);
  assert.equal(captured.options.headers.authorization, 'Bearer test-secret');
  assert.equal(captured.body.model, AMD_MODEL);
  assert.equal(captured.body.messages.length, 2);
  assert.equal(captured.body.messages[1].content, 'Walk for 10 minutes twice a day as tolerated.');
  assert.equal(JSON.stringify(captured.body).includes('Jordan'), false);
  assert.equal(JSON.stringify(captured.body).includes('care plan'), false);
  assert.match(captured.body.messages[0].content, /at most two short sentences/i);
  assert.equal(result.explanation, 'Walk for 10 minutes two times each day, if you feel able.');
});

test('successful explanation is cached by stable instruction and language hash', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; return ok('Keep the area clean and dry.'); };
  await explainInstruction({ instruction: 'Keep the incision clean and dry.', language: 'English' }, { apiKey: 'test-secret', fetchImpl });
  const second = await explainInstruction({ instruction: 'Keep the incision clean and dry.', language: 'English' }, { apiKey: 'test-secret', fetchImpl });
  assert.equal(calls, 1); assert.equal(second.cached, true);
  assert.notEqual(explanationCacheKey('same', 'English'), explanationCacheKey('same', 'Español'));
});

test('duplicate simultaneous requests share one provider call', async () => {
  let calls = 0; let release;
  const fetchImpl = () => { calls++; return new Promise(resolve => { release = () => resolve(ok('Keep the area clean and dry.')); }); };
  const a = explainInstruction({ instruction: 'Keep the incision clean and dry.' }, { apiKey: 'test-secret', fetchImpl });
  const b = explainInstruction({ instruction: 'Keep the incision clean and dry.' }, { apiKey: 'test-secret', fetchImpl });
  await new Promise(resolve => setImmediate(resolve)); release();
  const [ra, rb] = await Promise.all([a, b]); assert.equal(calls, 1); assert.equal(ra.explanation, rb.explanation);
});

test('ambiguous source is escalated without a model call', async () => {
  let calls = 0;
  const result = await explainInstruction({ instruction: 'Take insulin 8 (unit missing) before dinner.' }, { apiKey: 'test-secret', fetchImpl: async () => { calls++; return ok('guess'); } });
  assert.equal(calls, 0); assert.equal(result.clarificationNeeded, true); assert.match(result.explanation, /unclear|clarify/i);
});

test('rate limit, provider failure, missing key, and timeout surface controlled errors', async () => {
  await assert.rejects(explainInstruction({ instruction: 'Keep the incision clean.' }, { apiKey: 'test-secret', fetchImpl: async () => new Response('{}', { status: 429 }) }), e => e.status === 429 && e.code === 'rate_limited');
  await assert.rejects(explainInstruction({ instruction: 'Keep the incision dry.' }, { apiKey: 'test-secret', fetchImpl: async () => new Response('{}', { status: 503 }) }), e => e.status === 503);
  await assert.rejects(explainInstruction({ instruction: 'Walk as tolerated.' }, { apiKey: '', fetchImpl: async () => ok('x') }), e => e.status === 503 && e.code === 'not_configured');
  await assert.rejects(explainInstruction({ instruction: 'Rest as needed.' }, { apiKey: 'test-secret', timeoutMs: 5, fetchImpl: (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))) }), e => e.status === 504 && e.code === 'timeout');
});

test('extra data fields and oversized instructions are rejected before provider call', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; return ok('x'); };
  await assert.rejects(explainInstruction({ instruction: 'Walk.', patient: 'Jordan' }, { apiKey: 'test-secret', fetchImpl }), e => e.status === 400);
  await assert.rejects(explainInstruction({ instruction: 'x'.repeat(1201) }, { apiKey: 'test-secret', fetchImpl }), e => e.status === 400);
  assert.equal(calls, 0);
});

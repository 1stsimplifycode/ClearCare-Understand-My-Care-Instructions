import { createHash } from 'node:crypto';

export const AMD_BASE_URL = 'https://developer.amd.com.cn/radeon/api/v1';
export const AMD_MODEL = 'DeepSeek-V4-Flash';
const MAX_INSTRUCTION_LENGTH = 1200;
const CACHE_LIMIT = 200;
const cache = new Map();
const inFlight = new Map();

export function explanationCacheKey(instruction, language = 'English') {
  return createHash('sha256').update(`${language}\0${instruction}`).digest('hex');
}

export function normalizeLanguage(value) {
  const allowed = new Set(['English', 'Español', 'हिन्दी']);
  return allowed.has(value) ? value : 'English';
}

export function validateExplanationInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Invalid request.'), { status: 400 });
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction || instruction.length > MAX_INSTRUCTION_LENGTH) throw Object.assign(new Error(`Select one instruction of 1–${MAX_INSTRUCTION_LENGTH} characters.`), { status: 400 });
  if (Object.keys(body).some(key => !['instruction', 'language'].includes(key))) throw Object.assign(new Error('Only one instruction and its language may be sent.'), { status: 400 });
  return { instruction, language: normalizeLanguage(body.language) };
}

function looksAmbiguous(text) {
  return /\b(?:unit (?:not stated|missing)|illegible|unreadable|conflict(?:ing)?|directions? conflict|not clear|unclear|not specified|confirm|to be confirmed|\bor\b.*\d|\d+(?:\.\d+)?\s*(?:and|or)\s*\d+(?:\.\d+)?|\[.*?\])\b/i.test(text);
}

function ambiguousFallback(instruction, language) {
  const messages = {
    English: 'This instruction is unclear. Please ask your care team to clarify it before following it.',
    Español: 'Esta instrucción no está clara. Pida al equipo de atención que la aclare antes de seguirla.',
    'हिन्दी': 'यह निर्देश स्पष्ट नहीं है। इसका पालन करने से पहले अपनी देखभाल टीम से इसे स्पष्ट करने के लिए कहें।'
  };
  return messages[language];
}

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.response;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map(part => typeof part?.text === 'string' ? part.text : '').join('').trim();
  throw Object.assign(new Error('The explanation service returned an invalid response.'), { status: 502 });
}

export async function explainInstruction(body, { apiKey = process.env.RADEON_API_KEY, fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const input = validateExplanationInput(body);
  const key = explanationCacheKey(input.instruction, input.language);
  if (cache.has(key)) return { explanation: cache.get(key), cached: true };
  if (inFlight.has(key)) return inFlight.get(key);
  const operation = (async () => {
    if (looksAmbiguous(input.instruction)) return { explanation: ambiguousFallback(input.instruction, input.language), cached: false, clarificationNeeded: true };
    if (!apiKey) throw Object.assign(new Error('The explanation service is not configured.'), { status: 503, code: 'not_configured' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${AMD_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: AMD_MODEL,
          temperature: 0,
          max_tokens: 110,
          messages: [
            { role: 'system', content: `Explain the single care instruction in plain language in at most two short sentences. Preserve its meaning exactly. Do not add medical advice or change any medication dose, schedule, or treatment. If it is ambiguous, say clarification from the care team is needed; never guess. Respond in ${input.language}.` },
            { role: 'user', content: input.instruction }
          ]
        })
      });
      if (response.status === 429) throw Object.assign(new Error('The explanation service is rate limited. Please try again later.'), { status: 429, code: 'rate_limited' });
      if (!response.ok) throw Object.assign(new Error('The explanation service is temporarily unavailable.'), { status: response.status >= 500 ? 503 : 502, code: 'provider_error' });
      let data;
      try { data = await response.json(); } catch { throw Object.assign(new Error('The explanation service returned an invalid response.'), { status: 502, code: 'invalid_response' }); }
      let explanation = extractText(data).replace(/\s+/g, ' ').trim();
      if (!explanation || explanation.length > 500) throw Object.assign(new Error('The explanation service returned an invalid response.'), { status: 502, code: 'invalid_response' });
      if (looksAmbiguous(input.instruction) && !/clarif|unclear|ambiguous|not clear|confirm/i.test(explanation)) explanation = `${explanation} Please ask your care team to clarify this instruction.`;
      cache.set(key, explanation);
      if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
      return { explanation, cached: false, clarificationNeeded: looksAmbiguous(input.instruction) };
    } catch (error) {
      if (error.name === 'AbortError') throw Object.assign(new Error('The explanation request timed out. Please try again.'), { status: 504, code: 'timeout' });
      throw error;
    } finally { clearTimeout(timer); }
  })();
  inFlight.set(key, operation);
  try { return await operation; } finally { inFlight.delete(key); }
}

export function resetExplanationStateForTests() { cache.clear(); inFlight.clear(); }

// SpeechSynthesisProvider / SpeechRecognitionProvider / SpeechPlaybackController (Web Speech API).
// Honest capability reporting: if no voice exists for a language, we say so instead of
// reading Hindi with an English voice.
import { LANGS, EXTRA_LANGS, normalizeLang } from '../i18n.js';

// Speech preferences for a built-in language (en/es/hi) or one of the AI-translated EXTRA_LANGS.
export const speechPrefs = lang => (EXTRA_LANGS[lang] || LANGS[normalizeLang(lang)]).speech;
const bcp47Of = lang => (EXTRA_LANGS[lang] || LANGS[normalizeLang(lang)]).bcp47;
import { speakable } from '../speech/normalize.js';

export class WebSpeechSynthesisProvider {
  constructor() { this.synth = globalThis.speechSynthesis || null; this.voices = []; this.ready = this.#load(); }
  #load() {
    if (!this.synth) return Promise.resolve([]);
    return new Promise(resolve => {
      const take = () => { this.voices = this.synth.getVoices() || []; if (this.voices.length) resolve(this.voices); };
      take();
      this.synth.addEventListener?.('voiceschanged', () => { take(); resolve(this.voices); });
      setTimeout(() => resolve(this.voices), 1500);
    });
  }
  get available() { return Boolean(this.synth && globalThis.SpeechSynthesisUtterance); }
  voicesFor(lang) {
    // Re-read every time: Edge adds its online voices a few seconds after the page opens.
    const fresh = this.synth?.getVoices() || [];
    if (fresh.length) this.voices = fresh;
    const prefs = speechPrefs(lang).map(s => s.toLowerCase());
    return this.voices.filter(v => prefs.some(p => v.lang?.toLowerCase().replace('_', '-').startsWith(p))).sort((a, b) => prefs.findIndex(p => a.lang.toLowerCase().startsWith(p)) - prefs.findIndex(p => b.lang.toLowerCase().startsWith(p)) || Number(b.localService) - Number(a.localService));
  }
  pickVoice(lang, { preferLocal = true } = {}) {
    // Prefer a voice installed on this device; if none exists for the language (e.g. Hindi on a
    // Windows PC with only English voices), fall back to the browser's online voice for it.
    const list = this.voicesFor(lang);
    return (preferLocal ? list.find(v => v.localService) : null) || list[0] || null;
  }
  /** Resolves when a voice for lang exists, or after ms. */
  waitForVoice(lang, ms = 6000) {
    if (!this.synth || this.voicesFor(lang).length) return Promise.resolve(true);
    return new Promise(resolve => {
      const started = Date.now();
      const tick = () => { if (this.voicesFor(lang).length) return resolve(true); if (Date.now() - started > ms) return resolve(false); setTimeout(tick, 300); };
      tick();
    });
  }
}

export class SpeechPlaybackController {
  constructor(provider) { this.p = provider; this.queue = []; this.index = -1; this.state = 'idle'; this.listeners = new Set(); this.rate = 0.95; }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #emit(type, extra = {}) { for (const fn of this.listeners) fn({ type, index: this.index, state: this.state, ...extra }); }
  /** segments: [{id, text}]; resolves with { started:boolean, blocked:boolean, reason } */
  async play(segments, { lang, rate, preferLocal = true, startAt = 0 } = {}) {
    this.stop(true);
    if (!this.p.available) { this.#emit('unavailable', { reason: 'no-speech-api' }); return { started: false, reason: 'no-speech-api' }; }
    if (!this.p.pickVoice(lang, { preferLocal }) && this.p.waitForVoice) await this.p.waitForVoice(lang);
    const voice = this.p.pickVoice(lang, { preferLocal });
    // An empty voice list means the browser has not loaded its voices yet: speak with the language
    // tag only and let the browser choose. A loaded list with no match means no voice for the language.
    if (!voice && this.p.voices.length) { this.#emit('unavailable', { reason: 'no-voice' }); return { started: false, reason: 'no-voice' }; }
    this.queue = segments; this.index = startAt - 1; this.state = 'playing'; this.lang = lang; this.voice = voice;
    if (rate) this.rate = rate;
    return new Promise(resolve => {
      let settled = false;
      const settle = r => { if (!settled) { settled = true; resolve(r); } };
      this._onFirstStart = () => settle({ started: true, voice: voice?.name || bcp47Of(lang), local: voice ? voice.localService : true });
      this._onBlocked = reason => settle({ started: false, blocked: true, reason });
      // Online voices can take several seconds to start, so wait generously before giving up.
      setTimeout(() => { if (!settled && !this.p.synth.speaking) { this.state = 'idle'; this.p.synth.cancel(); this.#emit('blocked'); settle({ started: false, blocked: true, reason: 'no-start' }); } }, 10000);
      // Chromium can drop an utterance queued in the same tick as cancel(); give it a moment.
      setTimeout(() => this.#next(), 80);
    });
  }
  #next() {
    if (this.state !== 'playing') return;
    this.index++;
    if (this.index >= this.queue.length) { this.state = 'idle'; this.#emit('done'); return; }
    const seg = this.queue[this.index];
    // Built-in languages get verified speech normalisation; translated languages are read as shown.
    // A segment may carry its own language (e.g. a line kept in English inside a translated briefing).
    const segLang = seg.lang || this.lang;
    const voice = segLang === this.lang ? this.voice : this.p.pickVoice(segLang, { preferLocal: true });
    const { spoken, verified } = EXTRA_LANGS[segLang] ? { spoken: seg.text, verified: true } : speakable(seg.text, segLang);
    const u = new SpeechSynthesisUtterance(spoken);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || bcp47Of(segLang); u.rate = this.rate; u.pitch = 1;
    this.current = u; // Chromium garbage-collects unreferenced utterances, so onend never fires and the queue stalls
    u.onstart = () => { this._onFirstStart?.(); this._onFirstStart = null; this.#emit('segment', { id: seg.id, verified }); };
    u.onend = () => this.#next();
    u.onerror = e => { if (e.error === 'interrupted' || e.error === 'canceled') return; if (e.error === 'not-allowed') { this.state = 'idle'; this._onBlocked?.('not-allowed'); this.#emit('blocked'); return; } this.#emit('error', { error: e.error }); this.#next(); };
    this.p.synth.speak(u);
  }
  playOne(segment, opts) { return this.play([segment], opts); }
  pause() { if (this.state === 'playing') { this.p.synth.pause(); this.state = 'paused'; this.#emit('paused'); } }
  resume() { if (this.state === 'paused') { this.p.synth.resume(); this.state = 'playing'; this.#emit('resumed'); } }
  stop(silent = false) { if (this.p.synth) this.p.synth.cancel(); const was = this.state; this.state = 'idle'; if (!silent && was !== 'idle') this.#emit('stopped'); }
}

export class WebSpeechRecognitionProvider {
  constructor() { this.Ctor = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null; this.rec = null; }
  get available() { return Boolean(this.Ctor); }
  start({ lang, onText, onEnd, onError }) {
    if (!this.Ctor) { onError?.('unsupported'); return; }
    this.stop();
    const rec = new this.Ctor();
    rec.lang = bcp47Of(lang); rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    let finalText = '';
    rec.onresult = e => { let interim = ''; for (const r of e.results) { if (r.isFinal) finalText = r[0].transcript; else interim += r[0].transcript; } onText?.(finalText || interim, Boolean(finalText)); };
    rec.onerror = e => onError?.(e.error);
    rec.onend = () => { this.rec = null; onEnd?.(finalText); };
    this.rec = rec; rec.start();
  }
  stop() { try { this.rec?.stop(); } catch { /* already stopped */ } this.rec = null; }
  get listening() { return Boolean(this.rec); }
}

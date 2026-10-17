// Builds a narrated, captioned MP4 of the REAL ClearCare app.
//   PLAYWRIGHT_PATH=…/playwright-core node CLEARCARE_DEMO_AUTOMATION/build-video.mjs A   (or B)
// Steps: narration (Windows OneCore TTS, one WAV per sentence) → title cards (Pillow) → live screen
// recording of each scene in Microsoft Edge (Playwright over CDP, real server, real AMD key from .env)
// → per-scene mux with burned-in captions (ffmpeg) → concatenation → .srt → validation frames.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { VIDEO_A, VIDEO_B } from './storyboard.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const auto = join(root, 'CLEARCARE_DEMO_AUTOMATION');
const which = (process.argv[2] || 'A').toUpperCase();
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const SCENES = (which === 'A' ? VIDEO_A : VIDEO_B).filter(s => !ONLY.length || ONLY.includes(s.id));
const OUTNAME = (which === 'A' ? 'CLEARCARE_AMD_ACT_III_DEMO' : 'CLEARCARE_STAKEHOLDER_WALKTHROUGH') + (ONLY.length ? '_TEST' : '');
const work = join(auto, '.work', which); mkdirSync(work, { recursive: true });
const outDir = join(root, 'CLEARCARE_AMD_ACT_III_SUBMISSION', 'videos'); mkdirSync(outDir, { recursive: true });
const pw = createRequire(join(root, 'package.json'))(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26, ...opts }).toString();
const dur = f => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).trim());
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const GAP = 0.35, LEAD = 0.6, TAIL = 1.0;

// ---------- 1. narration ----------
const lines = SCENES.flatMap(s => s.lines.map((text, i) => ({ id: `${s.id}-${i}`, text })));
const tts = join(work, 'tts');
if (!process.argv.includes('--skip-tts') || !existsSync(tts)) {
  writeFileSync(join(work, 'lines.json'), JSON.stringify(lines), 'utf8');
  log('narration:', run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(auto, 'tts.ps1'), '-InputJson', join(work, 'lines.json'), '-OutDir', tts, '-Voice', 'Zira', '-Rate', '0.95']).trim());
}
run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', String(GAP), join(work, 'gap.wav')]);
run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', String(LEAD), join(work, 'lead.wav')]);
const timing = {};
for (const s of SCENES) {
  const parts = [join(work, 'lead.wav')], cues = [];
  let t = LEAD;
  s.lines.forEach((text, i) => { const f = join(tts, `${s.id}-${i}.wav`); const d = dur(f); cues.push({ start: t, end: t + d, text }); t += d; parts.push(f); if (i < s.lines.length - 1) { parts.push(join(work, 'gap.wav')); t += GAP; } });
  writeFileSync(join(work, `${s.id}.txt`), parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', join(work, `${s.id}.txt`), '-c', 'copy', join(work, `${s.id}.wav`)]);
  timing[s.id] = { audio: t, target: t + TAIL, cues };
}
log('narration total', Object.values(timing).reduce((n, x) => n + x.target, 0).toFixed(1), 's');

// ---------- 2. title cards ----------
const cards = SCENES.filter(s => s.kind === 'card').map(s => ({ id: s.id, ...s.card }));
writeFileSync(join(work, 'cards.json'), JSON.stringify(cards), 'utf8');
log(run('python', [join(auto, 'make-cards.py'), join(work, 'cards.json'), join(work, 'cards')]).trim());

// ---------- 3. live recording of the real app ----------
const port = 4181, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--env-file=.env', 'server.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const edgeProfile = join(auto, '.work', 'edge-profile');
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--remote-debugging-port=9351', `--user-data-dir=${edgeProfile}`, '--no-first-run', '--no-default-browser-check', '--mute-audio', '--window-size=1460,900', 'about:blank'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 3500));
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9351');
const VIEW = { width: 1440, height: 810 };
const CURSOR = () => { addEventListener('DOMContentLoaded', () => { const c = document.createElement('div'); c.id = '__demo_cursor'; Object.assign(c.style, { position: 'fixed', zIndex: 2147483647, width: '22px', height: '22px', borderRadius: '50%', border: '3px solid #e2574c', background: 'rgba(226,87,76,.18)', pointerEvents: 'none', left: '-40px', top: '-40px', transform: 'translate(-50%,-50%)', transition: 'width .12s,height .12s' }); document.documentElement.append(c); addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true); addEventListener('mousedown', () => { c.style.width = '34px'; c.style.height = '34px'; }, true); addEventListener('mouseup', () => { c.style.width = '22px'; c.style.height = '22px'; }, true); }); };
const aiFree = async () => { for (let i = 0; i < 400; i++) { try { const s = await (await fetch(base + '/api/v2/status')).json(); if (!s.amd.queue.queued && !s.amd.queue.nextFreeInMs) return; } catch { /* starting */ } await new Promise(r => setTimeout(r, 1000)); } };

function makeCtl(page, fast = false) {
  const mouse = { x: 700, y: 400 };
  const box = async loc => { await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(250); return loc.boundingBox(); };
  const moveTo = async loc => { if (fast) return; if (!(await loc.isVisible().catch(() => false))) { log('  (cursor skipped: element not visible)'); return; } const b = await box(loc); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y, { steps: Math.max(12, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 25)) }); mouse.x = x; mouse.y = y; };
  const c = {
    started: null,
    async go(path) { await page.goto(base + path); await page.waitForSelector('#cc-nav-today'); if (path.includes('#today')) await page.waitForSelector('#cc-today:not([hidden])'); await page.waitForTimeout(400); c.started ??= Date.now(); },
    async fresh() { await page.goto(base + '/'); await page.evaluate(() => localStorage.clear()); },
    pause: ms => (fast ? Promise.resolve() : page.waitForTimeout(ms)),
    async hover(sel) { await moveTo(page.locator(sel).first()); },
    async click(sel) { const l = page.locator(sel).first(); if (fast) return l.click(); await moveTo(l); await page.waitForTimeout(180); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(350); },
    async clickIn(container, sel) { const l = page.locator(container).locator(sel).first(); if (fast) return l.click(); await moveTo(l); await page.waitForTimeout(180); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(350); },
    async type(sel, text, clear = false) { if (fast) return page.locator(sel).first().fill(text); await c.click(sel); if (clear) await page.locator(sel).first().fill(''); await page.keyboard.type(text, { delay: 38 }); await page.waitForTimeout(300); },
    async fill(sel, v) { await moveTo(page.locator(sel).first()); await page.locator(sel).first().fill(v); await page.waitForTimeout(250); },
    async select(sel, v) { await moveTo(page.locator(sel).first()); await page.selectOption(sel, v); await page.waitForTimeout(500); },
    async upload(file) { await moveTo(page.locator('.cc-empty, .cc-doc').first()); await page.setInputFiles('#file-input', join(root, file)); await page.waitForSelector('.cc-doc', { timeout: 20000 }); },
    async closeModal() { try { await page.waitForSelector('#modal-backdrop:not([hidden])', { state: 'visible', timeout: 5000 }); } catch { return; } if (!fast) await page.waitForTimeout(1200); await c.click('#modal-close'); await page.waitForSelector('#modal-backdrop', { state: 'hidden', timeout: 5000 }).catch(() => {}); },
    async scrollTo(sel) { if (fast) return; await page.locator(sel).first().evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'center' })); await page.waitForTimeout(900); },
    async scrollBy(px) { if (fast) return; await page.evaluate(px => scrollBy({ top: px, behavior: 'smooth' }), px); await page.waitForTimeout(900); },
    waitFor: (sel, timeout = 30000) => page.waitForSelector(sel, { timeout }),
    async waitTranslated() { await page.waitForFunction(() => !document.querySelector('.cc-transcript .cc-x-tag[title="Translating…"], .cc-explain + .cc-x-tag[title="Translating…"]'), null, { timeout: 15 * 60000, polling: 1000 }); },
    async waitAiSlot() { /* handled before the scene starts recording */ }
  };
  return c;
}

let storageState = { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'clearcare-ext-prefs', value: JSON.stringify({ lang: 'en', onboarded: true, rememberPlan: true, autoRead: false, preferLocalVoices: true }) }, { name: 'clearcare-language', value: 'English' }] }] };

// Warm-up (not recorded): AMD translates the demo plan into Kannada now; the server caches verified lines on disk.
if (SCENES.some(s => s.run?.name === 'kannada') && !process.argv.includes('--no-warmup')) {
  log('warm-up: Kannada translation through AMD (1 request/minute)…');
  const ctx = await browser.newContext({ viewport: VIEW, storageState, locale: 'en-US', timezoneId: 'Asia/Kolkata' });
  const page = await ctx.newPage(); const c = makeCtl(page, true);
  for (const sc of SCENES.filter(x => x.kind === 'app')) { if (sc.run.name === 'kannada') break; try { await sc.run(c); } catch (e) { log('  rehearsal error', sc.id, e.message.split('\n')[0]); } }
  await c.go('/#today'); await page.click('[data-tab="today"]');
  await page.selectOption('[data-xlang]', 'kn');
  for (const tab of ['today', 'medicines']) { await page.click(`[data-tab="${tab}"]`); await page.waitForTimeout(500); await page.waitForFunction(() => !document.querySelector('.cc-x-tag[title="Translating…"]'), null, { timeout: 20 * 60000, polling: 2000 }); }
  log('warm-up done:', await page.$$eval('.cc-x-tag', t => `${t.filter(x => x.textContent === '🌐').length} verified, ${t.filter(x => x.textContent === 'EN').length} kept in English`));
  await ctx.close();
}

const clips = {};
for (const s of SCENES.filter(x => x.kind === 'app')) {
  await aiFree();
  const dir = join(work, 'rec', s.id); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: VIEW, storageState, recordVideo: { dir, size: { width: 1920, height: 1080 } }, locale: 'en-US', timezoneId: 'Asia/Kolkata' });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage(); const c = makeCtl(page);
  const t0 = Date.now();
  log('recording', s.id, '…');
  try { await s.run(c); } catch (e) { log('  scene error', s.id, e.message.split('\n')[0]); }
  const startAt = ((c.started || t0) - t0) / 1000;
  const elapsed = (Date.now() - (c.started || t0)) / 1000;
  if (elapsed < timing[s.id].target) await page.waitForTimeout((timing[s.id].target - elapsed) * 1000);
  storageState = await ctx.storageState();
  const vid = page.video(); await ctx.close();
  const p = await vid.path(); copyFileSync(p, join(work, `${s.id}.webm`));
  clips[s.id] = { startAt: Math.max(0, startAt - 0.2), elapsed: Math.max(elapsed, timing[s.id].target) };
  log('  done', s.id, `${clips[s.id].elapsed.toFixed(1)}s (narration ${timing[s.id].audio.toFixed(1)}s)`);
}
await browser.close(); edge.kill(); server.kill();

// ---------- 4. per-scene segments with burned-in captions ----------
const srtTime = t => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const wrap = (t, n = 64) => { const out = []; let l = ''; for (const w of t.split(' ')) { if ((l + ' ' + w).trim().length > n) { out.push(l); l = w; } else l = (l + ' ' + w).trim(); } if (l) out.push(l); return out.join('\n'); };
// Long sentences are split into caption chunks of at most two lines, timed by length within the sentence.
const chunk = cue => { const words = cue.text.split(' '), parts = []; let cur = []; for (const w of words) { cur.push(w); if (cur.join(' ').length > 110 && /[,.;:?!]$/.test(w)) { parts.push(cur.join(' ')); cur = []; } } if (cur.length) parts.push(cur.join(' ')); const total = parts.reduce((n, p) => n + p.length, 0); let t = cue.start; return parts.map(p => { const d = (cue.end - cue.start) * p.length / total; const r = { start: t, end: t + d, text: p }; t += d; return r; }); };
const segs = [], globalCues = []; let offset = 0;
for (const s of SCENES) {
  const tm = timing[s.id], seg = join(work, `${s.id}.mp4`), srt = join(work, `${s.id}.srt`);
  const cues = tm.cues.flatMap(chunk);
  writeFileSync(srt, cues.map((q, i) => `${i + 1}\n${srtTime(q.start)} --> ${srtTime(q.end)}\n${wrap(q.text)}\n`).join('\n'), 'utf8');
  const length = s.kind === 'card' ? tm.target : clips[s.id].elapsed;
  const sub = `subtitles='${srt.replace(/\\/g, '/').replace(':', '\\:')}':original_size=1920x1080:force_style='FontName=Segoe UI,FontSize=9,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=10'`;
  const input = s.kind === 'card'
    ? ['-loop', '1', '-framerate', '30', '-t', String(length), '-i', join(work, 'cards', `${s.id}.png`)]
    : ['-ss', String(clips[s.id].startAt), '-t', String(length), '-i', join(work, `${s.id}.webm`)];
  const vf = s.kind === 'card' ? `scale=1920:1080,zoompan=z='min(zoom+0.0004,1.06)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,${sub}` : `fps=30,scale=1920:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=${Math.max(0, tm.target - length).toFixed(2)},${sub}`;
  run('ffmpeg', ['-y', '-v', 'error', ...input, '-i', join(work, `${s.id}.wav`), '-filter_complex', `[0:v]${vf}[v];[1:a]apad,aresample=48000[a]`, '-map', '[v]', '-map', '[a]', '-t', String(Math.max(length, tm.target)), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', seg]);
  const real = dur(seg);
  for (const q of cues) globalCues.push({ start: q.start + offset, end: q.end + offset, text: q.text });
  offset += real; segs.push(seg);
  log('segment', s.id, real.toFixed(1), 's');
}
writeFileSync(join(work, 'concat.txt'), segs.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
const final = join(outDir, `${OUTNAME}.mp4`);
run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', join(work, 'concat.txt'), '-c', 'copy', '-movflags', '+faststart', final]);
writeFileSync(join(outDir, `${OUTNAME}.srt`), globalCues.map((q, i) => `${i + 1}\n${srtTime(q.start)} --> ${srtTime(q.end)}\n${wrap(q.text)}\n`).join('\n'), 'utf8');

// ---------- 5. validation frames (one per scene, mid-point) ----------
const frames = join(outDir, `${OUTNAME}_frames`); mkdirSync(frames, { recursive: true });
let t = 0; for (const s of SCENES) { const d = dur(join(work, `${s.id}.mp4`)); run('ffmpeg', ['-y', '-v', 'error', '-ss', String(t + d * 0.6), '-i', final, '-frames:v', '1', '-vf', 'scale=960:-1', join(frames, `${s.id}.jpg`)]); t += d; }
log('DONE', final, dur(final).toFixed(1), 's');
writeFileSync(join(work, 'manifest.json'), JSON.stringify({ video: OUTNAME, builtAt: new Date().toISOString(), scenes: SCENES.map(s => ({ id: s.id, kind: s.kind, lines: s.lines, narrationSec: timing[s.id].audio, clip: clips[s.id] || null })) }, null, 2));

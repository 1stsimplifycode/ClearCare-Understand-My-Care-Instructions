// Builds CLEARCARE_AMD_ACT_III_3D.pptx (16 slides, 16:9, editable) from real screenshots and evidence.
//   NODE_PATH=<dir with pptxgenjs, qrcode> node build-deck.js <artDir> <out.pptx> <applyThemeModule>
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const QRCode = require('qrcode');
const [, , ART, OUT, APPLY] = process.argv;
const { applyTheme } = require(APPLY);
const root = path.resolve(__dirname, '..', '..');
const ev = f => JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence', f), 'utf8'));
const amd = ev('amd-live-verification.json'), ml = ev('multilingual-eval.json'), ex = ev('extraction-eval.json'), jr = ev('journey-e2e.json'), e2e = ev('e2e-results.json');
const art = f => path.join(ART, f);
const REPO = 'https://github.com/1stsimplifycode/ClearCare-Understand-My-Care-Instructions';

const THEME = { name: 'ClearCare Midnight', headFontFace: 'Calibri', bodyFontFace: 'Calibri',
  colors: { dk1: '0B1F33', lt1: 'FFFFFF', dk2: '06182B', lt2: 'F6F1E7', accent1: '4CC9D2', accent2: '1C8A8F', accent3: 'E2574C', accent4: 'F2B84B', accent5: '3E6A8F', accent6: '5A6F80', hlink: '1C8A8F', folHlink: '3E6A8F' } };

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pres.title = 'ClearCare — AMD Developer Hackathon: ACT III';
  pres.author = 'ClearCare team';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const W = 13.33;

  pres.defineSlideMaster({ title: 'DARK_TITLE', background: { path: art('bg-dark.jpg') }, objects: [],
    slideNumber: { x: 12.4, y: 7.0, w: 0.6, h: 0.3, color: '8AA0B0', fontSize: 10 } });
  pres.defineSlideMaster({ title: 'DARK_CONTENT', background: { path: art('bg-dark-2.jpg') },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 34, bold: true, color: C.background2, valign: 'top', margin: 0 }, text: 'Title' } },
      { text: { text: 'ClearCare · AMD Developer Hackathon: ACT III · synthetic data', options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: '8AA0B0', margin: 0 } } }
    ], slideNumber: { x: 12.4, y: 7.0, w: 0.6, h: 0.3, color: '8AA0B0', fontSize: 10 } });
  pres.defineSlideMaster({ title: 'LIGHT_CONTENT', background: { color: 'F7F9FA' },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 34, bold: true, color: C.text1, valign: 'top', margin: 0 }, text: 'Title' } },
      { text: { text: 'ClearCare · AMD Developer Hackathon: ACT III · synthetic data', options: { x: 0.6, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: '5A6F80', margin: 0 } } }
    ], slideNumber: { x: 12.4, y: 7.0, w: 0.6, h: 0.3, color: '5A6F80', fontSize: 10 } });

  const glassCard = (s, x, y, w, h, opts = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: opts.fill || 'FFFFFF', transparency: opts.transparency ?? 88 }, line: { color: opts.line || '7FE3E8', transparency: opts.lineT ?? 55, width: 1 }, shadow: { type: 'outer', color: '000000', opacity: 0.35, blur: 12, offset: 6, angle: 90 }, objectName: opts.name || 'card' });
  const lightCard = (s, x, y, w, h, name = 'card') => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { color: 'DCE6EA', width: 1 }, shadow: { type: 'outer', color: '0B1F33', opacity: 0.12, blur: 10, offset: 4, angle: 90 }, objectName: name });
  const t = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontSize: 15, color: o.dark === false ? C.text1 : C.background2, valign: 'top', ...o, dark: undefined });
  const dot = (s, x, y, color, label, o = {}) => { s.addShape(pres.shapes.OVAL, { x, y, w: 0.5, h: 0.5, fill: { color }, line: { type: 'none' }, objectName: 'icon-circle' }); s.addText(label, { isTextBox: true, x, y, w: 0.5, h: 0.5, align: 'center', valign: 'middle', fontSize: o.size || 16, bold: true, color: o.color || '06182B', margin: 0 }); };

  // ---------- 1. Title ----------
  pres.addSection({ title: 'Opening' });
  let s = pres.addSlide({ masterName: 'DARK_TITLE', sectionTitle: 'Opening' });
  s.addImage({ path: art('hero.png'), x: 6.2, y: 0.9, w: 7.0, h: 7.0 * 0.62, objectName: 'hero-3d-screenshot', altText: 'ClearCare Today view (real screenshot) in perspective' });
  t(s, 'ClearCare', { x: 0.7, y: 2.0, w: 6, h: 1.3, fontSize: 66, bold: true, color: C.background2 });
  t(s, 'Recovery deserves understanding.', { x: 0.72, y: 3.35, w: 5.6, h: 0.6, fontSize: 24, color: C.accent1, italic: true });
  t(s, 'Turns a patient’s own discharge instructions into a clear, multilingual, voice-supported daily recovery plan — without adding medical advice.', { x: 0.72, y: 4.1, w: 5.3, h: 1.1, fontSize: 16, color: 'C9D6DF' });
  t(s, 'AI language work runs on AMD Developer Cloud (model DeepSeek-V4-Flash) · Health and Wellbeing track', { x: 0.72, y: 5.5, w: 5.4, h: 0.6, fontSize: 12, color: '8AA0B0' });
  s.addNotes('ClearCare: a working desktop prototype for the AMD Developer Hackathon ACT III, Health and Wellbeing track. Everything shown uses synthetic patient data. The screenshot is a real frame of the running app, rendered in perspective. AMD claim: AI explanations, translations and the Care Agent\'s reasoning call the AMD-hosted endpoint developer.amd.com.cn/radeon/api/v1 with the DeepSeek-V4-Flash model; deterministic parts run locally.');

  // ---------- 2. The forgotten journey ----------
  pres.addSection({ title: 'Problem' });
  s = pres.addSlide({ masterName: 'DARK_CONTENT', sectionTitle: 'Problem' });
  s.addText('The forgotten part of care: the first weeks at home', { placeholder: 'title' });
  const steps = [['Hospital', 'Clinicians, nurses and monitors around the patient', '3E6A8F'], ['Discharge', 'A few minutes of explanation and several pages of instructions', '1C8A8F'], ['Recovery at home', 'The family is now responsible for medicines, warning signs and visits', 'E2574C']];
  steps.forEach(([h, d, col], i) => {
    const x = 0.8 + i * 4.1, y = 4.2 - i * 0.75;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: y + 0.18, w: 3.6, h: 2.0, rectRadius: 0.14, fill: { color: '000000', transparency: 60 }, line: { type: 'none' }, objectName: 'step-depth' });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.6, h: 2.0, rectRadius: 0.14, fill: { color: col }, line: { color: 'FFFFFF', transparency: 70, width: 1 }, objectName: `step-${i + 1}` });
    t(s, h, { x: x + 0.3, y: y + 0.25, w: 3.0, h: 0.5, fontSize: 22, bold: true, color: 'FFFFFF' });
    t(s, d, { x: x + 0.3, y: y + 0.85, w: 3.0, h: 1.0, fontSize: 14, color: 'F6F1E7' });
    if (i < 2) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 3.68, y: y + 0.55, w: 0.38, h: 0.45, fill: { color: '7FE3E8' }, line: { type: 'none' }, objectName: 'arrow' });
  });
  t(s, 'Support drops sharply at exactly the moment responsibility moves to the family.', { x: 0.8, y: 6.3, w: 11, h: 0.5, fontSize: 16, color: C.accent1, italic: true });
  s.addNotes('Frame the gap ClearCare addresses: the transition from supervised care to home. No statistics are quoted on this slide because we did not independently verify any.');

  // ---------- 3. The real patient problem ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Problem' });
  s.addText('Arjun is twelve. His mother has four pages and a worried evening', { placeholder: 'title' });
  lightCard(s, 0.6, 1.6, 6.2, 4.9, 'story-card');
  t(s, [
    { text: 'A synthetic but realistic story', options: { bold: true, fontSize: 13, color: C.accent2, breakLine: true } },
    { text: 'After an appendix operation, Arjun’s discharge letter lists an antibiotic, a painkiller "only when needed", “Ondansetron 4” (four what?), “do not take ibuprofen”, wound care, no sports for two weeks, a follow-up with Dr. Mehta, and when to call 108.', options: { fontSize: 15, breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    { text: 'His mother thinks in Kannada. The letter is in medical English. Nobody will be there at 2 a.m. when she wonders whether a second dose is allowed.', options: { fontSize: 15 } }
  ], { x: 0.95, y: 1.9, w: 5.5, h: 4.4, dark: false });
  const probs = [['?', 'Unclear instructions', 'Missing units, conflicting doses, vague dates'], ['अ', 'Language barrier', 'Care happens in the family’s language'], ['⏰', 'Daily follow-through', 'Which dose, which day, which visit'], ['!', 'Knowing when to get help', 'Warning signs buried in paragraphs']];
  probs.forEach(([ic, h, d], i) => { const y = 1.7 + i * 1.2; dot(s, 7.3, y + 0.05, ['4CC9D2', 'F2B84B', '1C8A8F', 'E2574C'][i], ic, { color: 'FFFFFF', size: 15 }); t(s, h, { x: 8.0, y, w: 4.7, h: 0.4, fontSize: 18, bold: true, dark: false }); t(s, d, { x: 8.0, y: y + 0.42, w: 4.7, h: 0.5, fontSize: 14, color: '5A6F80', dark: false }); });
  s.addNotes('This is the demo scenario used in both videos. The letter is synthetic (CLEARCARE_DEMO_AUTOMATION/fixtures/demo_arjun_appendectomy.pdf).');

  // ---------- 4. The gap ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Problem' });
  s.addText('Existing tools solve neighbouring problems', { placeholder: 'title' });
  const hdr = o => ({ text: o, options: { bold: true, color: 'FFFFFF', fill: { color: '0B1F33' }, fontSize: 14 } });
  const rows = [
    [hdr('Category'), hdr('Built for'), hdr('What is left for the family')],
    ['Telemedicine and booking platforms', 'Finding and consulting clinicians', 'Understanding and following the plan at home, every day'],
    ['General medical chatbots', 'Open health questions', 'Answers limited to their own papers, checked before display'],
    ['Medication reminder apps', 'Reminders the user types in', 'A schedule taken from the clinician’s document, with unclear items flagged'],
    ['Translation tools', 'Any text', 'Doses and medicine names guaranteed unchanged'],
    ['ClearCare', 'The first weeks after discharge', 'Source-grounded plan · calendar · voice · own language · clear limits']
  ].map((r, i) => i === 0 ? r : r.map((c, j) => ({ text: c, options: { fontSize: 14, bold: i === 5 || j === 0, color: i === 5 ? '06182B' : '0B1F33', fill: { color: i === 5 ? 'D9F3F4' : (i % 2 ? 'FFFFFF' : 'F1F5F7') } } })));
  s.addTable(rows, { x: 0.6, y: 1.6, w: 12.1, colW: [3.3, 3.4, 5.4], border: { type: 'solid', color: 'DCE6EA', pt: 1 }, rowH: 0.62, valign: 'middle', margin: 0.1, objectName: 'comparison-table' });
  t(s, 'Compared by category purpose, not by specific products. No market study was done; see CLEARCARE_DIFFERENTIATION.md.', { x: 0.6, y: 6.3, w: 12, h: 0.4, fontSize: 11, color: '5A6F80', dark: false });
  s.addNotes('Fair framing: these categories are good at what they are built for. ClearCare does not book visits, diagnose or prescribe.');

  // ---------- 5. Introducing ClearCare ----------
  pres.addSection({ title: 'Solution' });
  s = pres.addSlide({ masterName: 'DARK_CONTENT', sectionTitle: 'Solution' });
  s.addText('Introducing ClearCare', { placeholder: 'title' });
  s.addImage({ path: art('stack.png'), x: 5.3, y: 1.25, w: 7.6, h: 7.6 * 0.66, objectName: 'layered-screens', altText: 'Three real ClearCare screens layered in depth: Today, calendar, Care Agent' });
  const intro = [['Reads the papers', 'PDF read on this computer; every item keeps its source line'], ['Plans the day', 'Today view and a family calendar filled automatically'], ['Speaks your language', 'English, Spanish, Hindi built in; 38 more via AMD AI, verified'], ['Knows its limits', 'Unclear items flagged; urgent messages escalate; no prescribing']];
  intro.forEach(([h, d], i) => { const y = 1.6 + i * 1.25; dot(s, 0.7, y, ['4CC9D2', '1C8A8F', 'F2B84B', 'E2574C'][i], String(i + 1)); t(s, h, { x: 1.4, y: y - 0.02, w: 3.8, h: 0.4, fontSize: 19, bold: true }); t(s, d, { x: 1.4, y: y + 0.4, w: 3.8, h: 0.7, fontSize: 14, color: 'C9D6DF' }); });
  s.addNotes('All three screens are real frames from the recorded app (synthetic patient), rendered with depth.');

  // ---------- 6. Patient journey ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Solution' });
  s.addText('From discharge letter to daily follow-through', { placeholder: 'title' });
  const flow = [['Discharge PDF', 'Read locally (pdf.js)'], ['Extraction', 'Rules keep source line + page'], ['Verification', 'Unclear or high-risk → flagged'], ['Recovery plan', 'Today view, plain words'], ['Calendar', 'Calendar Agent fills it'], ['Voice + language', 'Read aloud, 41 languages'], ['Safety escalation', 'Urgent → 108 / 112 / 911']];
  flow.forEach(([h, d], i) => {
    const x = 0.6 + i * 1.77, y = 2.2 + (i % 2) * 0.35;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.07, y: y + 0.1, w: 1.6, h: 2.3, rectRadius: 0.12, fill: { color: '0B1F33', transparency: 85 }, line: { type: 'none' }, objectName: 'flow-depth' });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.6, h: 2.3, rectRadius: 0.12, fill: { color: i === 6 ? 'FDECEA' : 'FFFFFF' }, line: { color: i === 6 ? 'E2574C' : '4CC9D2', width: 1.5 }, objectName: `flow-${i + 1}` });
    dot(s, x + 0.55, y + 0.2, i === 6 ? 'E2574C' : '1C8A8F', String(i + 1), { color: 'FFFFFF', size: 14 });
    t(s, h, { x: x + 0.12, y: y + 0.85, w: 1.36, h: 0.65, fontSize: 15, bold: true, align: 'center', dark: false });
    t(s, d, { x: x + 0.12, y: y + 1.5, w: 1.36, h: 0.7, fontSize: 12, color: '5A6F80', align: 'center', dark: false });
  });
  t(s, 'Deterministic code on the user’s computer does steps 1–5; the AMD model explains, translates and reasons — and every AI output is checked against the source before it is shown.', { x: 0.6, y: 5.4, w: 12.1, h: 0.8, fontSize: 16, color: '0B1F33', dark: false });
  s.addNotes('Accurate split of responsibilities: extraction, verification, calendar and safety gate are deterministic; AMD powers explanation, translation, open questions and the Care Agent reasoning.');

  // ---------- 7. Caregiver-style experience ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Solution' });
  s.addText('Attentive like family, bounded like a good system', { placeholder: 'title' });
  lightCard(s, 0.6, 1.6, 5.9, 4.8, 'generic');
  lightCard(s, 6.8, 1.6, 5.9, 4.8, 'clearcare');
  t(s, 'Generic chatbot', { x: 0.95, y: 1.85, w: 5.2, h: 0.5, fontSize: 20, bold: true, color: '5A6F80', dark: false });
  t(s, 'ClearCare', { x: 7.15, y: 1.85, w: 5.2, h: 0.5, fontSize: 20, bold: true, color: C.accent2, dark: false });
  const cmp = [['Answers from general knowledge', 'Answers only from the family’s own papers'], ['Same answer style for everyone', '“Make that easier” → a simpler wording of the same instruction'], ['Language = translation', 'Medicine names, doses and numbers locked; each line verified'], ['Forgets between sessions', 'Keeps the plan, calendar and ticked doses on this computer (with consent)'], ['May reassure or advise', 'Never judges symptoms; urgent words → emergency numbers']];
  cmp.forEach(([a, b], i) => { const y = 2.55 + i * 0.75; t(s, '–  ' + a, { x: 0.95, y, w: 5.3, h: 0.6, fontSize: 14, color: '5A6F80', dark: false }); t(s, '✓  ' + b, { x: 7.15, y, w: 5.3, h: 0.6, fontSize: 14, color: '0B1F33', dark: false }); });
  t(s, 'ClearCare always says it is an AI tool, not a doctor or a person.', { x: 0.6, y: 6.5, w: 12, h: 0.4, fontSize: 13, italic: true, color: C.accent2, dark: false });
  s.addNotes('Emotional quality comes from helpfulness, consistency and plain language, not from pretending to be human.');

  // ---------- 8. AMD architecture ----------
  pres.addSection({ title: 'Technology' });
  s = pres.addSlide({ masterName: 'DARK_CONTENT', sectionTitle: 'Technology' });
  s.addText('Architecture: local by default, AMD for language intelligence', { placeholder: 'title' });
  const layer = (x, y, w, h, title, sub, col, name) => { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.14, y: y + 0.16, w, h, rectRadius: 0.12, fill: { color: '000000', transparency: 55 }, line: { type: 'none' }, objectName: name + '-depth' }); s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: col, transparency: 20 }, line: { color: '7FE3E8', transparency: 40, width: 1 }, objectName: name }); t(s, title, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.4, fontSize: 16, bold: true }); t(s, sub, { x: x + 0.2, y: y + 0.55, w: w - 0.4, h: h - 0.6, fontSize: 12, color: 'DDE7EE' }); };
  layer(0.6, 1.5, 3.4, 2.1, 'Desktop window', 'Microsoft Edge (app mode) · plain ES modules · pdf.js · Web Speech voices · localStorage (plan, calendar, ticks)', '15406E', 'layer-ui');
  layer(0.6, 4.0, 3.4, 2.4, 'Local Node.js server', 'Binds 127.0.0.1 / ::1 only · holds the AMD key · request queue (1 per minute) · telemetry without patient text', '123A63', 'layer-server');
  layer(4.5, 1.5, 4.1, 4.9, 'Deterministic core (no AI)', '• Extraction engine (source line + page)\n• Fidelity verifier (numbers, units, names, negation, frequency, severity)\n• Safety gate (5 languages)\n• Calendar Agent\n• Care Agent planner + tools\n• Built-in EN / ES / HI wording', '0E5E6F', 'layer-core');
  layer(9.1, 1.5, 3.6, 4.9, 'AMD Developer Cloud', 'Endpoint developer.amd.com.cn/radeon/api/v1\nModel: DeepSeek-V4-Flash\n\n• Explain one instruction\n• Answer open questions\n• Translate (38 languages)\n• Care Agent reasoning\n\nEvery output verified before display', 'B54A40', 'layer-amd');
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 8.62, y: 3.6, w: 0.45, h: 0.5, fill: { color: 'F2B84B' }, line: { type: 'none' }, objectName: 'arrow-amd' });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 4.03, y: 3.6, w: 0.45, h: 0.5, fill: { color: '7FE3E8' }, line: { type: 'none' }, objectName: 'arrow-core' });
  t(s, 'Not claimed: local GPU or ROCm execution. Unverified: which AMD hardware serves the hosted endpoint.', { x: 0.6, y: 6.5, w: 12, h: 0.4, fontSize: 12, color: 'F2B84B' });
  s.addNotes('Matches the code: server.js + lib/ext/*.js on loopback; public/ext/* in the browser; lib/ext/amd-provider.js calls the AMD endpoint. Inference is remote. We could not confirm whether this endpoint is the same service as the event FAQ\'s Token Factory or which GPUs serve it.');

  // ---------- 9. Multilingual ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Technology' });
  s.addText('Same medical facts in every language', { placeholder: 'title' });
  const row = ml.rows.find(r => /Apixaban 5 mg/.test(r.en)) || ml.rows[0];
  const langs = [['English', 'rules (not AI)', row.en, 'Calibri'], ['हिन्दी · Hindi', 'built-in rules (not AI)', row.hi, 'Nirmala UI'], ['ಕನ್ನಡ · Kannada', 'AMD AI · verified', row.kn, 'Nirmala UI']];
  langs.forEach(([l, how, text, font], i) => { const x = 0.6 + i * 4.1; lightCard(s, x, 1.6, 3.85, 3.55, 'lang-' + i); t(s, l, { x: x + 0.25, y: 1.8, w: 3.4, h: 0.4, fontSize: 18, bold: true, dark: false }); t(s, how, { x: x + 0.25, y: 2.2, w: 3.4, h: 0.3, fontSize: 11, color: i === 2 ? C.accent3 : C.accent2, dark: false }); t(s, text || '(not available)', { x: x + 0.25, y: 2.6, w: 3.4, h: 2.4, fontSize: 13, fontFace: font, dark: false }); });
  const sm = ml.summary;
  [[`${sm.hindiSameNumbers}/${sm.items}`, 'Hindi lines with identical numbers'], [`${sm.kannadaVerified}/${sm.items}`, 'Kannada lines verified (AMD)'], [`${sm.kannadaNameKept}/${sm.items}`, 'Kannada lines with names unchanged']].forEach(([n, l], i) => { const x = 0.6 + i * 4.1; t(s, n, { x, y: 5.35, w: 1.7, h: 0.8, fontSize: 36, bold: true, color: C.accent2, dark: false }); t(s, l, { x: x + 1.75, y: 5.5, w: 2.2, h: 0.6, fontSize: 13, color: '5A6F80', dark: false }); });
  t(s, 'Automated checks on 12 synthetic instructions. Not yet reviewed by qualified human translators.', { x: 0.6, y: 6.4, w: 12, h: 0.4, fontSize: 12, italic: true, color: C.accent3, dark: false });
  s.addNotes('Texts are taken verbatim from docs/evidence/multilingual-eval.json (live AMD run, 17 Oct 2026). Medicine names, doses and numbers are locked as tokens before translation; a literal back-translation must pass the same fidelity verifier.');

  // ---------- 10. Calendar ----------
  s = pres.addSlide({ masterName: 'DARK_CONTENT', sectionTitle: 'Technology' });
  s.addText('A recovery calendar that fills itself — and explains why', { placeholder: 'title' });
  s.addImage({ path: art('calendar.png'), x: 0.3, y: 1.35, w: 7.8, h: 7.8 * 0.64, objectName: 'calendar-3d-screenshot', altText: 'Real ClearCare family calendar with the agent log' });
  const cal = [['Calendar Agent', 'Adds every dated visit and medicine course from the papers; logs each decision with the source line'], ['⚠ instead of guesses', 'Missing place, unit or date → shown with the reason, no reminders'], ['Completion tracking', 'Visits attended, doses ticked, “missed?” prompts; kept after a refresh'], ['Hear my calendar', 'Next verified visit, today’s medicines, items to confirm']];
  cal.forEach(([h, d], i) => { const y = 1.6 + i * 1.22; t(s, h, { x: 8.4, y, w: 4.4, h: 0.4, fontSize: 18, bold: true, color: C.accent1 }); t(s, d, { x: 8.4, y: y + 0.42, w: 4.4, h: 0.75, fontSize: 13, color: 'DDE7EE' }); });
  s.addNotes('Measured: 7/7 dated visits on the right day and time, 4/4 undated visits kept off the calendar, 0 invented (tools/eval-calendar.mjs). Persistence verified with real page reloads (journey J03–J05).');

  // ---------- 11. Clinical safety ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Technology' });
  s.addText('Safety is architecture, not a disclaimer', { placeholder: 'title' });
  const saf = [['🚨', 'Urgent symptoms', 'Chest pain, breathing trouble, vomiting blood… in 5 languages → emergency numbers, no AI', 'E2574C'], ['🛡', 'Care changes', '“Double / skip / stop / prescribe” → care team, with the document’s own words', '1C8A8F'], ['✔', 'Verified AI', 'Numbers, units, names, negations checked; failures withheld', '3E6A8F'], ['⚠', 'Uncertainty visible', 'Unclear or high-risk items flagged, never scheduled by guessing', 'F2B84B']];
  saf.forEach(([ic, h, d, col], i) => { const x = 0.6 + (i % 2) * 6.15, y = 1.6 + Math.floor(i / 2) * 2.0; lightCard(s, x, y, 5.9, 1.75, 'safety-' + i); dot(s, x + 0.3, y + 0.35, col, ic, { color: 'FFFFFF', size: 14 }); t(s, h, { x: x + 1.0, y: y + 0.28, w: 4.7, h: 0.4, fontSize: 18, bold: true, dark: false }); t(s, d, { x: x + 1.0, y: y + 0.72, w: 4.7, h: 0.9, fontSize: 14, color: '5A6F80', dark: false }); });
  const wh = amd.steps.find(x => x.status === 'withheld');
  t(s, `Live example: AMD’s simplification of “Acetaminophen 500 mg … every 6 hours as needed” dropped the interval and “as needed” — ClearCare withheld it (${(wh?.failures || []).join(', ')}).`, { x: 0.6, y: 5.75, w: 12.1, h: 0.7, fontSize: 14, color: '0B1F33', dark: false });
  s.addNotes('Safety-gate challenge set: 20/20 urgent messages escalated, 0/12 false alarms, 9/9 medicine-change, 4/4 prescribing, 2/2 skip-visit. Written by the team — not an independent red team. See CLEARCARE_MEDICAL_SAFETY.md.');

  // ---------- 12. Real product demonstration ----------
  pres.addSection({ title: 'Evidence' });
  s = pres.addSlide({ masterName: 'DARK_CONTENT', sectionTitle: 'Evidence' });
  s.addText('See it working', { placeholder: 'title' });
  ['shot-agent.png', 'shot-safety.png', 'shot-kannada.png'].forEach((f, i) => { const x = 0.6 + i * 3.25; glassCard(s, x - 0.08, 1.52, 3.1, 1.94 + 0.16, { name: 'shot-frame-' + i }); s.addImage({ path: art(f), x, y: 1.6, w: 2.94, h: 1.84, objectName: 'real-screenshot-' + i, altText: ['Care Agent answer with steps and checks', 'Emergency banner and medicine-change response', 'Plan translated to Kannada'][i] }); });
  ['Care Agent · live AMD', 'Safety responses', 'Kannada · AMD, verified'].forEach((x, i) => t(s, x, { x: 0.6 + i * 3.25, y: 3.6, w: 2.94, h: 0.4, fontSize: 13, color: C.accent1, align: 'center' }));
  const qr = await QRCode.toDataURL(REPO, { margin: 1, width: 600, color: { dark: '06182BFF', light: 'FFFFFFFF' } });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.55, y: 1.5, w: 2.15, h: 2.15, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { type: 'none' }, objectName: 'qr-card' });
  s.addImage({ data: qr.replace(/^data:/, ''), x: 10.65, y: 1.6, w: 1.95, h: 1.95, objectName: 'qr-repo', altText: 'QR code for the public GitHub repository' });
  t(s, [{ text: 'Public repository', options: { hyperlink: { url: REPO }, color: C.accent1, bold: true, breakLine: true } }, { text: 'github.com/1stsimplifycode/ClearCare-Understand-My-Care-Instructions', options: { fontSize: 10, color: 'C9D6DF' } }], { x: 9.9, y: 3.75, w: 2.9, h: 0.8, fontSize: 13, align: 'center' });
  t(s, [{ text: 'Videos in the submission package', options: { bold: true, color: C.background2, breakLine: true } }, { text: 'CLEARCARE_AMD_ACT_III_DEMO.mp4 — 3–5 minute hackathon demo', options: { breakLine: true } }, { text: 'Stakeholder walkthrough: scripted and reproducible (CLEARCARE_DEMO_AUTOMATION), not yet rendered', options: {} }], { x: 0.6, y: 4.5, w: 9, h: 1.3, fontSize: 15, color: 'C9D6DF' });
  t(s, 'Screens are real recordings of the running app with synthetic data. The recorder cannot capture the app’s own speech; the voice in use is shown on screen.', { x: 0.6, y: 6.0, w: 12, h: 0.6, fontSize: 12, color: '8AA0B0' });
  s.addNotes('No public video URL exists yet; upload the MP4s and add the link here. The QR code points to the real public repository.');

  // ---------- 13. Testing ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Evidence' });
  s.addText('Tested, not just demonstrated', { placeholder: 'title' });
  const stats = [[`${ex.passed}/${ex.checks}`, 'extraction checks on 11 synthetic documents'], [`${ex.clinicallySignificantErrors}`, 'clinically significant extraction errors'], ['47/47', 'safety challenge cases handled as intended'], [`${jr.results.filter(r => r.status === 'PASS').length}/${jr.results.length}`, 'patient-journey browser checks (4 runs)']];
  stats.forEach(([n, l], i) => { const x = 0.6 + i * 3.1; lightCard(s, x, 1.5, 2.85, 1.7, 'stat-' + i); t(s, n, { x: x + 0.2, y: 1.6, w: 2.5, h: 0.85, fontSize: 40, bold: true, color: C.accent2, dark: false }); t(s, l, { x: x + 0.2, y: 2.45, w: 2.5, h: 0.65, fontSize: 13, color: '5A6F80', dark: false }); });
  const ok = (r) => r.results.filter(x => x.status === 'PASS').length;
  if (!process.env.NOCHART) s.addChart(pres.charts.BAR, [{ name: 'Passed', labels: ['Unit + integration', 'Original browser suite', 'Journey suite', 'Extraction checks', 'Safety cases'], values: [109, ok(e2e), ok(jr), ex.passed, 47] }, { name: 'Not passed', labels: ['Unit + integration', 'Original browser suite', 'Journey suite', 'Extraction checks', 'Safety cases'], values: [0, e2e.results.length - ok(e2e), jr.results.length - ok(jr), ex.checks - ex.passed, 0] }], { x: 0.6, y: 3.45, w: 7.4, h: 3.3, barDir: 'bar', barGrouping: 'stacked', chartColors: ['1C8A8F', 'F2B84B'], showValue: true, dataLabelPosition: 'ctr', dataLabelColor: 'FFFFFF', dataLabelFontSize: 11, catAxisLabelColor: '0B1F33', valAxisLabelColor: '5A6F80', catAxisLabelFontSize: 12, valAxisLabelFontSize: 10, catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', valGridLine: { color: 'DCE6EA', size: 1 }, catGridLine: { style: 'none' }, showLegend: true, legendPos: 'b', legendFontSize: 11, legendFontFace: '+mn-lt', showTitle: true, title: 'Automated results (counts)', titleFontSize: 13, titleColor: '0B1F33', titleFontFace: '+mn-lt', objectName: 'results-chart' });
  const lat = id => amd.steps.find(x => x.name.includes(id))?.amdCall?.latencyMs;
  t(s, [{ text: 'Live AMD (17 Oct 2026)', options: { bold: true, fontSize: 16, breakLine: true } }, { text: `Explanation: ${(lat('explanation') / 1000).toFixed(1)} s (withheld by verifier)`, options: { breakLine: true } }, { text: `Care Agent: ${(lat('Care Agent') / 1000).toFixed(1)} s, verified`, options: { breakLine: true } }, { text: `Kannada, 12 lines: ${(lat('Kannada') / 1000).toFixed(1)} s, 12/12 verified`, options: { breakLine: true } }, { text: 'Auth failure and timeout reported correctly', options: { breakLine: true } }, { text: ' ', options: { breakLine: true } }, { text: 'Few samples on a rate-limited key: not a benchmark. No clinical-outcome claims.', options: { italic: true, color: 'E2574C', fontSize: 12 } }], { x: 8.3, y: 3.5, w: 4.4, h: 3.2, fontSize: 14, dark: false, paraSpaceAfter: 4 });
  s.addNotes('Every number comes from files in docs/evidence (CLEARCARE_TEST_RESULTS.md explains methods and denominators). The 1 skipped browser test needs OCR tools not installed on the test PC.');

  // ---------- 14. Business value ----------
  pres.addSection({ title: 'Value' });
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Value' });
  s.addText('Who benefits, and how it could be adopted', { placeholder: 'title' });
  const ben = [['Patients and families', 'Understand and follow the plan they were given, in their own language, any time of day'], ['Discharge and nursing teams', 'Fewer “what did they mean by…” calls; unclear lines surface as questions before they become errors'], ['Hospitals in multilingual regions', 'One English discharge letter, many family languages, with doses guaranteed unchanged']];
  ben.forEach(([h, d], i) => { const y = 1.6 + i * 1.45; lightCard(s, 0.6, y, 6.6, 1.25, 'benefit-' + i); dot(s, 0.85, y + 0.37, ['1C8A8F', '3E6A8F', 'F2B84B'][i], String(i + 1), { color: 'FFFFFF' }); t(s, h, { x: 1.55, y: y + 0.15, w: 5.5, h: 0.4, fontSize: 18, bold: true, dark: false }); t(s, d, { x: 1.55, y: y + 0.55, w: 5.5, h: 0.65, fontSize: 13, color: '5A6F80', dark: false }); });
  lightCard(s, 7.6, 1.6, 5.1, 4.1, 'adoption');
  t(s, [{ text: 'Realistic adoption path', options: { bold: true, fontSize: 18, color: C.accent2, breakLine: true } }, { text: 'Hospital gives ClearCare alongside the discharge letter', options: { bullet: true, breakLine: true } }, { text: 'Runs on the family’s computer; documents stay local', options: { bullet: true, breakLine: true } }, { text: 'Care team reviews flagged questions at follow-up', options: { bullet: true, breakLine: true } }, { text: 'Pilot first, with clinician-reviewed wording', options: { bullet: true } }], { x: 7.9, y: 1.85, w: 4.6, h: 3.6, fontSize: 15, dark: false, paraSpaceAfter: 8 });
  t(s, 'No pilots, customers or partners exist yet. No market figures are claimed.', { x: 0.6, y: 6.3, w: 12, h: 0.4, fontSize: 12, italic: true, color: C.accent3, dark: false });
  s.addNotes('Business value is argued from the workflow, not from unverified statistics.');

  // ---------- 15. Roadmap ----------
  s = pres.addSlide({ masterName: 'LIGHT_CONTENT', sectionTitle: 'Value' });
  s.addText('Built today, and what comes next', { placeholder: 'title' });
  lightCard(s, 0.6, 1.6, 5.9, 4.9, 'implemented'); lightCard(s, 6.8, 1.6, 5.9, 4.9, 'planned');
  t(s, '✓ Implemented and tested', { x: 0.9, y: 1.8, w: 5.3, h: 0.45, fontSize: 20, bold: true, color: C.accent2, dark: false });
  t(s, '→ Planned (not built)', { x: 7.1, y: 1.8, w: 5.3, h: 0.45, fontSize: 20, bold: true, color: C.accent5, dark: false });
  const done = ['Source-grounded extraction with flags', 'Today view, voice, pause/stop, speed', 'Calendar Agent, completion tracking, reminders, .ics', 'EN/ES/HI built in; 38 languages via AMD, verified', 'Care Agent with explainable trace', 'Safety gate in 5 languages', 'AMD request pacing and observability'];
  const next = ['Hosted demo URL for judges', 'Clinician review of wording and safety texts', 'Fluent human review of Hindi, Kannada and others', 'Caregiver usability study (plan in docs/)', 'Phone notifications and mobile layout', 'Scanned-PDF OCR on by default', 'Higher-rate AMD key; more languages built in'];
  t(s, done.map((x, i) => ({ text: x, options: { bullet: true, breakLine: i < done.length - 1 } })), { x: 0.9, y: 2.4, w: 5.4, h: 3.9, fontSize: 14, dark: false, paraSpaceAfter: 6 });
  t(s, next.map((x, i) => ({ text: x, options: { bullet: true, breakLine: i < next.length - 1 } })), { x: 7.1, y: 2.4, w: 5.4, h: 3.9, fontSize: 14, color: '5A6F80', dark: false, paraSpaceAfter: 6 });
  s.addNotes('Left column is verified in CLEARCARE_TEST_RESULTS.md; right column is not implemented.');

  // ---------- 16. Closing ----------
  s = pres.addSlide({ masterName: 'DARK_TITLE', sectionTitle: 'Value' });
  s.addImage({ path: art('closing.png'), x: 6.6, y: 1.2, w: 6.4, h: 6.4 * 0.62, objectName: 'closing-3d-screenshot', altText: 'ClearCare calendar (real screenshot) in perspective' });
  t(s, 'Leaving the hospital shouldn’t mean facing recovery alone.', { x: 0.7, y: 1.9, w: 5.8, h: 2.2, fontSize: 38, bold: true, color: C.background2 });
  t(s, 'ClearCare explains the care that was prescribed — in the family’s language, every day, with clear limits — and AMD-powered AI does the language work, checked before anyone sees it.', { x: 0.72, y: 4.3, w: 5.6, h: 1.4, fontSize: 16, color: 'C9D6DF' });
  t(s, [{ text: 'github.com/1stsimplifycode/ClearCare-Understand-My-Care-Instructions', options: { hyperlink: { url: REPO }, color: C.accent1 } }], { x: 0.72, y: 6.0, w: 6, h: 0.4, fontSize: 13 });
  s.addNotes('Close on the human promise and the verified engineering. Invite judges to the repository and the walkthrough video.');

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('wrote', OUT);
})().catch(e => { console.error(e); process.exit(1); });

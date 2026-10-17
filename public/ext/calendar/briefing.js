// CalendarBriefingStrategy. Builds Today/Tomorrow/Upcoming from the CLEAR items of a plan and
// a warm, factual spoken briefing. It never invents clock times, never marks anything taken,
// and never turns an unclear instruction into a task.
import { renderItemSafe as renderItem, formatDate, formatTime, reasonText, freqText } from '../clinical/render.js';
import { normalizeLang } from '../i18n.js';

const L = (en, es, hi) => ({ en, es, hi });
const pick = (o, lang) => o[lang] ?? o.en;

export function isoDate(d, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = t => parts.find(p => p.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
export function addDays(iso, n) { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function hourIn(now, timeZone) { return Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(now)) % 24; }
export function partOfDay(now, timeZone) { const h = hourIn(now, timeZone); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }

function medActiveOn(m, date) {
  if (m.start?.date && date < m.start.date) return { active: false, reason: 'not_started' };
  if (m.start?.date && m.duration?.value) {
    const days = m.duration.unit === 'week' ? m.duration.value * 7 : m.duration.unit === 'month' ? null : m.duration.value;
    if (days && date > addDays(m.start.date, days - 1)) return { active: false, reason: 'finished' };
  }
  return { active: true, startUnknown: !m.start && Boolean(m.duration?.value) };
}

/**
 * @param plan    output of extractInstructions
 * @param opts    { date: 'YYYY-MM-DD', reminders: {itemId: ['HH:MM']}, done: Set<string>, horizonDays }
 */
export function buildDay(plan, { date, reminders = {}, done = new Set(), horizonDays = 14 } = {}) {
  const day = { date, medications: [], asNeeded: [], conditional: [], appointments: [], recovery: [], remember: [], dontTake: [], clarify: [], watchFor: [], upcoming: [], notYetStarted: [], notes: [] };
  if (!plan) return day;
  for (const it of plan.items) {
    if (it.category === 'medication') {
      if (it.status === 'STOP' || it.status === 'HOLD') { (it.clarity === 'clear' ? day.dontTake : day.clarify).push(it); continue; }
      if (it.clarity !== 'clear') { day.clarify.push(it); continue; }
      if (it.frequency?.prn) { day.asNeeded.push(it); continue; }
      if (it.condition) { day.conditional.push(it); continue; }
      if (!it.schedulable || renderItem(it, 'en', 'simple').fallback) { day.clarify.push(it); continue; }
      const act = medActiveOn(it, date);
      if (!act.active) { if (act.reason === 'not_started') day.notYetStarted.push(it); continue; }
      const n = it.frequency.timesPerDay || 1;
      const userTimes = (reminders[it.id] || []).slice(0, n);
      const slots = Array.from({ length: n }, (_, i) => ({ key: `${it.id}:${date}:${i}`, userTime: userTimes[i] || null, takenByPatient: done.has(`${it.id}:${date}:${i}`) }));
      day.medications.push({ item: it, slots, startUnknown: act.startUnknown });
    } else if (it.category === 'appointment' || it.category === 'test') {
      if (it.clarity !== 'clear') { day.clarify.push(it); continue; }
      if (it.date === date) day.appointments.push(it);
      else if (it.date > date && it.date <= addDays(date, horizonDays)) day.upcoming.push(it);
    } else if (['activity', 'wound', 'home', 'diet'].includes(it.category)) {
      if (it.clarity !== 'clear') { day.clarify.push(it); continue; }
      if (it.restriction) day.remember.push(it);
      else day.recovery.push({ item: it, doneByPatient: done.has(`${it.id}:${date}`) });
    } else if (it.category === 'warning' || it.category === 'caution') {
      day.watchFor.push(it);
    } else if (it.category === 'note') {
      day.notes.push(it);
    }
  }
  day.upcoming.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return day;
}

const G = {
  morning: L('Good morning.', 'Buenos días.', 'सुप्रभात।'),
  afternoon: L('Good afternoon.', 'Buenas tardes.', 'नमस्ते।'),
  evening: L('Good evening.', 'Buenas noches.', 'शुभ संध्या।')
};

function countPhrase(n, one, many, lang) { return n === 1 ? pick(one, lang) : pick(many, lang).replace('{n}', n); }

/**
 * Briefing segments: [{ id, kind, text, itemId? }]. Transcript == concatenated text.
 * mode: 'full' | 'important' (tired / only the important things)
 */
export function buildBriefing(day, { lang = 'en', part = 'morning', mode = 'full', planPresent = true } = {}) {
  lang = normalizeLang(lang);
  const seg = [];
  const add = (kind, text, itemId) => text && seg.push({ id: `${kind}-${seg.length}`, kind, text, itemId });
  add('greeting', pick(G[part], lang));
  if (!planPresent) { add('empty', pick(L('There are no discharge papers here yet. When you add them, I’ll bring together what they say for each day.', 'Todavía no hay papeles de alta aquí. Cuando los agregue, reuniré lo que dicen para cada día.', 'अभी यहाँ डिस्चार्ज के कागज़ नहीं हैं। जब आप इन्हें जोड़ेंगे, तो मैं हर दिन के लिए उनकी बातें एक साथ बताऊँगा।'), lang)); return seg; }
  const dateText = formatDate(day.date, lang);
  add('intro', pick(L(`I’ve brought together what your discharge papers say for today, ${dateText}.`, `He reunido lo que dicen sus papeles de alta para hoy, ${dateText}.`, `आज, ${dateText}, के लिए आपके डिस्चार्ज के कागज़ों में जो लिखा है, वह मैंने एक साथ रखा है।`), lang));
  const nMed = day.medications.length, nApt = day.appointments.length, nRec = day.recovery.filter(r => !r.doneByPatient).length;
  const pieces = [];
  if (nMed) pieces.push(countPhrase(nMed, L('one medicine instruction', 'una indicación de medicamento', 'दवा का एक निर्देश'), L('{n} medicine instructions', '{n} indicaciones de medicamentos', 'दवा के {n} निर्देश'), lang));
  if (nApt) pieces.push(countPhrase(nApt, L('one appointment', 'una cita', 'एक अपॉइंटमेंट'), L('{n} appointments', '{n} citas', '{n} अपॉइंटमेंट'), lang));
  if (nRec && mode !== 'important') pieces.push(countPhrase(nRec, L('one recovery task', 'una tarea de recuperación', 'ठीक होने का एक काम'), L('{n} recovery tasks', '{n} tareas de recuperación', 'ठीक होने के {n} काम'), lang));
  const join = (arr) => arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} ${pick(L('and', 'y', 'और'), lang)} ${arr.at(-1)}`;
  if (pieces.length) add('overview', pick(L(`For today there ${/^one/.test(pieces[0]) ? 'is' : 'are'} ${join(pieces)}. Let’s go through them one at a time.`, `Para hoy hay ${join(pieces)}. Vamos a verlos uno por uno.`, `आज के लिए ${join(pieces)} हैं। चलिए, इन्हें एक-एक करके देखते हैं।`), lang));
  else add('overview', pick(L('Your papers don’t list any confirmed tasks for today.', 'Sus papeles no indican tareas confirmadas para hoy.', 'आपके कागज़ों में आज के लिए कोई पक्का काम नहीं लिखा है।'), lang));

  for (const { item, slots, startUnknown } of day.medications) {
    let text = renderItem(item, lang, 'simple').text;
    if (part !== 'morning') text += ' ' + pick(L('ClearCare doesn’t know which doses you’ve already taken today.', 'ClearCare no sabe qué dosis ya tomó hoy.', 'ClearCare को नहीं पता कि आज आपने कौन-सी खुराक पहले ही ले ली है।'), lang);
    const taken = slots.filter(s => s.takenByPatient).length;
    if (taken) text += ' ' + pick(L(`You marked ${taken} of ${slots.length} as taken.`, `Usted marcó ${taken} de ${slots.length} como tomadas.`, `आपने ${slots.length} में से ${taken} को ली हुई के रूप में चिह्नित किया है।`), lang);
    const times = slots.map(s => s.userTime).filter(Boolean);
    if (times.length) text += ' ' + pick(L(`Your reminder times: ${times.map(t => formatTime(t, 'en')).join(', ')}.`, `Sus horas de recordatorio: ${times.map(t => formatTime(t, 'es')).join(', ')}.`, `आपके रिमाइंडर का समय: ${times.map(t => formatTime(t, 'hi')).join(', ')}।`), lang);
    if (startUnknown && mode !== 'important') text += ' ' + pick(L('Your papers don’t say which day this course started, so check with your care team when it ends.', 'Sus papeles no dicen qué día empezó este tratamiento; confirme con su equipo cuándo termina.', 'कागज़ों में नहीं लिखा कि यह कोर्स किस दिन शुरू हुआ, इसलिए यह कब ख़त्म होगा, अपनी टीम से पूछें।'), lang);
    add('medication', text, item.id);
  }
  for (const a of day.appointments) add('appointment', pick(L('Today: ', 'Hoy: ', 'आज: '), lang) + renderItem(a, lang, 'simple').text, a.id);
  if (mode !== 'important') for (const r of day.recovery.filter(x => !x.doneByPatient)) { const x = renderItem(r.item, lang, 'simple'); add('recovery', x.untranslated ? pick(L('', 'Hay una tarea de recuperación escrita en inglés; puede verla en pantalla.', 'ठीक होने का एक काम अंग्रेज़ी में लिखा है; आप इसे स्क्रीन पर देख सकते हैं।'), lang) : x.text, r.item.id); }
  const doneCount = day.recovery.filter(x => x.doneByPatient).length;
  if (doneCount && mode !== 'important') add('recovery', pick(L(`You’ve already marked ${doneCount} recovery task${doneCount > 1 ? 's' : ''} as done today.`, `Ya marcó ${doneCount} tarea${doneCount > 1 ? 's' : ''} de recuperación como hecha${doneCount > 1 ? 's' : ''} hoy.`, `आज आप ठीक होने के ${doneCount} काम पूरे के रूप में चिह्नित कर चुके हैं।`), lang));
  for (const r of day.remember) { const x = renderItem(r, lang, 'simple'); if (!x.untranslated) add('remember', pick(L('Please remember: ', 'Recuerde: ', 'ध्यान रखें: '), lang) + x.text, r.id); }
  for (const n of day.notes) if (mode !== 'important' && n.docLang === lang) add('note', renderItem(n, lang, 'simple').text, n.id);
  for (const m of day.dontTake) add('dont-take', renderItem(m, lang, 'simple').text, m.id);
  for (const m of day.asNeeded) if (mode !== 'important') add('as-needed', renderItem(m, lang, 'simple').text, m.id);
  if (day.clarify.length) {
    const names = day.clarify.map(i => i.name || (i.category === 'appointment' ? pick(L('a follow-up visit', 'una cita de control', 'एक फ़ॉलो-अप मुलाक़ात'), lang) : null)).filter(Boolean);
    add('clarify', pick(L(`${day.clarify.length === 1 ? 'One instruction needs' : `${day.clarify.length} instructions need`} checking with your care team before you rely on ${day.clarify.length === 1 ? 'it' : 'them'}${names.length ? `: ${join([...new Set(names)])}` : ''}. I’ve kept ${day.clarify.length === 1 ? 'it' : 'them'} separate so nothing is guessed.`, `${day.clarify.length === 1 ? 'Una indicación necesita' : `${day.clarify.length} indicaciones necesitan`} confirmarse con su equipo antes de seguir${day.clarify.length === 1 ? 'la' : 'las'}${names.length ? `: ${join([...new Set(names)])}` : ''}. ${day.clarify.length === 1 ? 'La he dejado' : 'Las he dejado'} aparte para no adivinar nada.`, `${day.clarify.length === 1 ? 'एक निर्देश' : `${day.clarify.length} निर्देश`} पर भरोसा करने से पहले अपनी देखभाल टीम से पक्का करना ज़रूरी है${names.length ? `: ${join([...new Set(names)])}` : ''}। मैंने इन्हें अलग रखा है ताकि कुछ भी अंदाज़े से न हो।`), lang));
  }
  for (const w of day.watchFor) { const x = renderItem(w, lang, 'simple'); add('watch', x.untranslated ? pick(L('', 'Su documento tiene una señal de alarma escrita en inglés. Por favor, léala en pantalla.', 'आपके दस्तावेज़ में अंग्रेज़ी में एक ज़रूरी चेतावनी है। कृपया इसे स्क्रीन पर पढ़ें।'), lang) : x.text, w.id); }
  if (mode !== 'important') for (const a of day.upcoming.slice(0, 3)) add('upcoming', pick(L('Coming up: ', 'Próximamente: ', 'आगे: '), lang) + renderItem(a, lang, 'simple').text, a.id);
  const remaining = nMed + nApt + nRec;
  add('closing', remaining
    ? pick(L('That’s everything for today. We can take it one step at a time, and you can replay any part. If something feels unclear, your care team can help.', 'Eso es todo por hoy. Podemos ir paso a paso, y puede repetir cualquier parte. Si algo no está claro, su equipo de atención puede ayudarle.', 'आज के लिए बस इतना ही। हम एक-एक कदम चल सकते हैं, और आप कोई भी हिस्सा दोबारा सुन सकते हैं। अगर कुछ साफ़ न लगे, तो आपकी देखभाल टीम मदद कर सकती है।'), lang)
    : pick(L('That’s all your papers say for today. If something feels unclear, your care team can help.', 'Eso es todo lo que dicen sus papeles para hoy. Si algo no está claro, su equipo de atención puede ayudarle.', 'आज के लिए आपके कागज़ों में बस इतना ही लिखा है। अगर कुछ साफ़ न लगे, तो आपकी देखभाल टीम मदद कर सकती है।'), lang));
  return seg;
}

export function slotLabel(item, i, lang) {
  const n = item.frequency?.timesPerDay || 1;
  const timing = (item.frequency?.timing || []);
  const base = freqText({ ...item.frequency, timing }, lang);
  return n > 1 ? `${i + 1}/${n} · ${base}` : base;
}
export { reasonText };

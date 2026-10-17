import test from 'node:test';
import assert from 'node:assert/strict';
import { extractInstructions } from '../public/ext/clinical/engine.js';
import { pagesFromPlainText } from '../public/ext/document/layout.js';
import { buildDay, buildBriefing, partOfDay, addDays } from '../public/ext/calendar/briefing.js';
import { buildReminderIcs, icsEscape } from '../public/ext/calendar/ics.js';

const plan = extractInstructions(pagesFromPlainText(['Medications', 'Take amoxicillin 500 mg by mouth three times daily for 7 days.', 'Take clopidogrel 75 mg daily starting October 20, 2026.', 'Stop ibuprofen.', 'Stop aspirin until reviewed by your doctor.', 'Take warfarin 5 mg every evening.', 'Take metoprolol 25 by mouth twice daily.', 'Take acetaminophen 500 mg every 6 hours as needed for pain.', 'Follow-up', 'Follow up with Dr. Rao on October 22, 2026 at 10:30 AM at Northside Family Clinic.', 'Follow up in 7 days.', 'Care at home', 'Walk for 10 minutes twice a day.', 'Do not lift more than 10 pounds for 2 weeks.', 'When to call', 'Call 108 or go to the nearest emergency department if you have chest pain.'].join('\n')));
const find = n => plan.items.find(i => i.name?.toLowerCase() === n);

test('day plan contains only clear, active items; ambiguous / STOP / HOLD never become tasks', () => {
  const d = buildDay(plan, { date: '2026-10-17' });
  assert.deepEqual(d.medications.map(m => m.item.name), ['amoxicillin']);
  assert.ok(d.dontTake.some(m => m.name === 'ibuprofen') && d.dontTake.some(m => m.name === 'aspirin' && m.status === 'HOLD'));
  assert.ok(d.clarify.some(m => m.name === 'warfarin') && d.clarify.some(m => m.name === 'metoprolol'));
  assert.ok(d.asNeeded.some(m => m.name === 'acetaminophen'));
  assert.ok(d.notYetStarted.some(m => m.name === 'clopidogrel' && m.status === 'START'), 'clopidogrel starts Oct 20');
  assert.ok(d.upcoming.some(a => a.date === '2026-10-22'));
  assert.ok(d.clarify.some(a => a.category === 'appointment' && a.relative), 'relative follow-up needs clarification');
  assert.ok(d.remember.length === 1 && d.watchFor.length === 1);
});

test('no clock times are invented; slots only carry times the patient chose; nothing is marked taken automatically', () => {
  const amox = find('amoxicillin');
  const d = buildDay(plan, { date: '2026-10-17' });
  const slots = d.medications[0].slots;
  assert.equal(slots.length, 3); assert.ok(slots.every(s => s.userTime === null && s.takenByPatient === false));
  const d2 = buildDay(plan, { date: '2026-10-17', reminders: { [amox.id]: ['08:00', null, '20:00'] }, done: new Set([`${amox.id}:2026-10-17:0`]) });
  assert.deepEqual(d2.medications[0].slots.map(s => [s.userTime, s.takenByPatient]), [['08:00', true], [null, false], ['20:00', false]]);
});

test('start dates and durations are respected; unknown course start is disclosed', () => {
  assert.ok(buildDay(plan, { date: '2026-10-20' }).medications.some(m => m.item.name === 'clopidogrel'));
  const b = buildBriefing(buildDay(plan, { date: '2026-10-17' }), { lang: 'en', part: 'morning' }).map(s => s.text).join(' ');
  assert.match(b, /don’t say which day this course started/);
  const d = extractInstructions(pagesFromPlainText('Take amoxicillin 500 mg three times daily for 7 days starting October 10, 2026.'));
  assert.equal(buildDay(d, { date: '2026-10-16' }).medications.length, 1); assert.equal(buildDay(d, { date: '2026-10-17' }).medications.length, 0, 'day 8 is outside the 7-day course');
});

test('briefing is grounded, time-aware, never claims adherence, and keeps uncertain items separate', () => {
  for (const lang of ['en', 'es', 'hi']) for (const part of ['morning', 'afternoon', 'evening']) {
    const segs = buildBriefing(buildDay(plan, { date: '2026-10-17' }), { lang, part });
    const text = segs.map(s => s.text).join(' ');
    assert.ok(segs.some(s => s.kind === 'clarify'), `${lang}/${part} clarify segment`);
    assert.ok(!segs.some(s => s.kind === 'medication' && /warfarin|metoprolol/i.test(s.text)), 'unclear meds never read as tasks');
    assert.doesNotMatch(text, /you (?:have )?taken|ya tomó todas|ले ली है।$/i);
    if (part !== 'morning') assert.ok(segs.find(s => s.kind === 'medication').text.length > 0 && /doesn’t know|no sabe|नहीं पता/.test(text));
    assert.ok(segs.every(s => s.itemId === undefined || plan.items.some(i => i.id === s.itemId)), 'every item segment refers to a real plan item');
  }
  assert.equal(partOfDay(new Date('2026-10-17T03:00:00Z'), 'Asia/Kolkata'), 'morning');
  assert.equal(partOfDay(new Date('2026-10-17T13:00:00Z'), 'Asia/Kolkata'), 'evening');
});

test('empty plan and "only important" mode', () => {
  const empty = buildBriefing(buildDay(null, { date: '2026-10-17' }), { lang: 'hi', planPresent: false });
  assert.equal(empty.length, 2); assert.match(empty[1].text, /डिस्चार्ज/);
  const none = buildBriefing(buildDay(extractInstructions(pagesFromPlainText('Take warfarin 5 mg every evening.')), { date: '2026-10-17' }), { lang: 'en' });
  assert.match(none.map(s => s.text).join(' '), /don’t list any confirmed tasks for today/);
  const imp = buildBriefing(buildDay(plan, { date: '2026-10-17' }), { lang: 'en', mode: 'important' });
  assert.ok(!imp.some(s => s.kind === 'recovery' || s.kind === 'upcoming'));
});

test('timezone/DST-safe date arithmetic', () => {
  assert.equal(addDays('2026-03-07', 1), '2026-03-08'); assert.equal(addDays('2026-11-01', 1), '2026-11-02'); assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('.ics reminders: only clear schedulable medicines with patient-chosen times; escaped; course length honoured', () => {
  const amox = find('amoxicillin');
  const none = buildReminderIcs([{ item: amox, times: ['08:00'] }]);
  assert.equal(none.count, 0, 'a 7-day course without a start date is not exported');
  const { ics, count } = buildReminderIcs([{ item: amox, times: ['08:00', '14:00', 'bad'], startDate: '2026-10-17', startSource: 'patient' }, { item: find('warfarin'), times: ['18:00'], startDate: '2026-10-17' }, { item: find('ibuprofen'), times: ['09:00'] }]);
  assert.equal(count, 2); assert.match(ics, /RRULE:FREQ=DAILY;COUNT=7/); assert.match(ics, /Reminder time chosen by you/); assert.doesNotMatch(ics, /warfarin|ibuprofen/i);
  assert.equal(icsEscape('a;b,c\nBEGIN:VEVENT'), 'a\\;b\\,c BEGIN:VEVENT');
});

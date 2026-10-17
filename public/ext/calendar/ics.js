// ReminderDeliveryProvider (.ics export). Only CLEAR, schedulable medicines with times the
// patient chose, plus doctor visits (clear follow-ups from the document and visits the family added).
// Clinician timing and user-chosen times are labelled separately.
export function icsEscape(s) { return String(s).replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').slice(0, 900); }
function fold(line) { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); }
const ymd = iso => iso.replaceAll('-', '');
const stamp = () => `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;

/**
 * Visits (doctor appointments) as VEVENT lines.
 * visits: [{ uid, title, date: 'YYYY-MM-DD', time: 'HH:MM'|null, minutes?, location?, description?, alarms?: [minutesBefore] }]
 * A visit without a time becomes an all-day event, so no clock time is invented.
 */
export function visitEventLines(visits = []) {
  const lines = [];
  for (const v of visits) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date || '')) continue;
    const timed = /^([01]\d|2[0-3]):[0-5]\d$/.test(v.time || '');
    lines.push('BEGIN:VEVENT', `UID:${String(v.uid).replace(/[^\w.-]/g, '')}@clearcare.local`, stamp());
    if (timed) {
      // Floating local times (no time zone), like the medicine reminders above.
      const start = new Date(`${v.date}T${v.time}:00Z`), end = new Date(start.getTime() + (v.minutes || 60) * 60000);
      const local = d => d.toISOString().replace(/[-:]/g, '').slice(0, 15);
      lines.push(`DTSTART:${local(start)}`, `DTEND:${local(end)}`);
    } else lines.push(`DTSTART;VALUE=DATE:${ymd(v.date)}`);
    lines.push(fold(`SUMMARY:${icsEscape(v.title || 'Doctor visit')}`));
    if (v.location) lines.push(fold(`LOCATION:${icsEscape(v.location)}`));
    if (v.description) lines.push(fold(`DESCRIPTION:${icsEscape(v.description)}`));
    for (const m of v.alarms || []) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${Math.max(0, Math.round(m))}M`, fold(`DESCRIPTION:${icsEscape(v.title || 'Doctor visit')}`), 'END:VALARM');
    lines.push('END:VEVENT');
  }
  return lines;
}

/**
 * entries: [{ item, times: ['HH:MM'], startDate: 'YYYY-MM-DD', startSource: 'document'|'patient' }]
 */
export function buildReminderIcs(entries, { uidSeed = 'clearcare', visits = [] } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ClearCare//Patient reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  let count = 0;
  for (const e of entries) {
    const m = e.item;
    if (!m || m.category !== 'medication' || m.clarity !== 'clear' || !m.schedulable || ['STOP', 'HOLD'].includes(m.status)) continue;
    let days = null;
    if (m.duration?.value) { if (!e.startDate) continue; days = m.duration.unit === 'week' ? m.duration.value * 7 : m.duration.unit === 'day' ? m.duration.value : null; if (!days) continue; }
    for (const [i, t] of (e.times || []).entries()) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) continue;
      const start = e.startDate || new Date().toISOString().slice(0, 10);
      lines.push('BEGIN:VEVENT', `UID:${uidSeed}-${m.id}-${i}@clearcare.local`, stamp(), `DTSTART:${ymd(start)}T${t.replace(':', '')}00`, `RRULE:FREQ=DAILY${days ? `;COUNT=${days}` : ''}`,
        fold(`SUMMARY:${icsEscape(`Reminder: ${m.name || 'medicine'}${m.strength ? ` ${m.strength.value} ${m.strength.unit || ''}` : ''}`)}`),
        fold(`DESCRIPTION:${icsEscape(`Reminder time chosen by you. Your discharge document says: "${m.provenance.text}". Start date source: ${e.startSource || 'not stated'}. Check with your care team if anything changes.`)}`),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', fold(`DESCRIPTION:${icsEscape(`Reminder: ${m.name || 'medicine'}`)}`), 'END:VALARM', 'END:VEVENT');
      count++;
    }
  }
  const visitLines = visitEventLines(visits);
  lines.push(...visitLines, 'END:VCALENDAR');
  return { ics: lines.join('\r\n'), count: count + visitLines.filter(l => l === 'BEGIN:VEVENT').length };
}

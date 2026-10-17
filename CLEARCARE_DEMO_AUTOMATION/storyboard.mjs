// Storyboard for both videos: narration lines + the real actions performed in the running app.
// Every narrated claim describes something the scene shows. Patient data is synthetic.
// kind 'card' = generated title card (not the app); kind 'app' = live screen recording of ClearCare.

const DEMO_PDF = 'CLEARCARE_DEMO_AUTOMATION/fixtures/demo_arjun_appendectomy.pdf';

// ---------- shared scene actions (ctl: helpers from record.mjs) ----------
const A = {
  async overview(c) { await c.go('/'); await c.pause(1200); for (const sel of ['a[data-page="home"]', 'a[data-page="care"]', 'a[data-page="review"]', 'a[data-page="documents"]', '#cc-nav-today', '#cc-nav-calendar']) { await c.hover(sel); await c.pause(700); } await c.pause(800); },
  async onboarding(c) { await c.fresh(); await c.go('/#today'); await c.pause(1500); await c.click('[data-onb-voice="0"]'); await c.click('[data-onb-role="caregiver"]'); await c.click('[data-onb-keep="1"]'); await c.pause(600); await c.click('[data-act="onb-done"]'); await c.pause(800); },
  async upload(c) { await c.go('/#today'); await c.upload(DEMO_PDF); await c.pause(2200); await c.closeModal(); await c.scrollTo('.cc-doc'); await c.pause(1500); },
  async understand(c) { await c.go('/#today'); await c.click('[data-tab="medicines"]'); await c.pause(1200); await c.scrollTo('.cc-card-review'); await c.pause(1500); await c.clickIn('.cc-card-review', 'details.cc-source summary'); await c.pause(1500); await c.scrollTo('[data-tab="clarify"]'); await c.click('[data-tab="clarify"]'); await c.pause(1500); },
  async today(c) { await c.go('/#today'); await c.click('[data-tab="today"]'); await c.scrollTo('.cc-brief'); await c.pause(2500); await c.scrollTo('.cc-tabs'); await c.pause(1200); await c.click('[data-dose]'); await c.pause(1500); },
  async calendar(c) { await c.go('/#today'); await c.click('#cc-nav-calendar'); await c.pause(1800); await c.click('[data-agent-log] summary'); await c.pause(2500); await c.scrollTo('.cc-cal-grid'); await c.pause(1200); await c.click('[data-cal-day="2026-10-23"]'); await c.scrollTo('.cc-cal-agenda'); await c.pause(2200); await c.click('[data-cal-day="2026-10-17"]'); await c.scrollTo('.cc-cal-agenda'); await c.pause(1200); await c.click('.cc-med-list [data-dose]'); await c.pause(1500); },
  async addVisit(c) { await c.go('/#today'); await c.click('#cc-nav-calendar'); await c.pause(800); await c.click('.cc-cal-next [data-act="visit-add"]'); await c.type('input[name="who"]', 'Arjun'); await c.type('input[name="title"]', 'Dressing check with the nurse'); await c.fill('input[name="date"]', '2026-10-20'); await c.fill('input[name="time"]', '16:00'); await c.type('input[name="place"]', 'City Children’s Clinic'); await c.pause(500); await c.click('.cc-visit-form button[type="submit"]'); await c.pause(1500); await c.scrollTo('.cc-cal-next'); await c.pause(1500); },
  async voice(c) { await c.go('/#today'); await c.click('#cc-nav-calendar'); await c.pause(800); await c.scrollTo('.cc-cal-head'); await c.click('[data-act="cal-hear"]'); await c.pause(6000); await c.click('.cc-cal-head [data-act="stop"]'); await c.pause(800); await c.click('[data-tab="today"]'); await c.scrollTo('.cc-brief'); await c.click('[data-act="hear"]'); await c.pause(4500); await c.click('.cc-player [data-act="stop"]'); await c.pause(1000); },
  async hindi(c) { await c.go('/#today'); await c.click('[data-tab="today"]'); await c.click('[data-lang="hi"]'); await c.scrollTo('.cc-brief'); await c.pause(3000); await c.click('[data-tab="medicines"]'); await c.scrollTo('.cc-tabpanel'); await c.pause(2500); },
  async kannada(c) { await c.go('/#today'); await c.click('[data-tab="today"]'); await c.select('[data-xlang]', 'kn'); await c.waitTranslated(); await c.scrollTo('.cc-brief'); await c.pause(2500); await c.click('[data-act="hear"]'); await c.pause(5000); await c.click('.cc-player [data-act="stop"]'); await c.click('[data-tab="medicines"]'); await c.scrollTo('.cc-tabpanel'); await c.pause(2500); await c.select('[data-xlang]', ''); await c.click('[data-lang="en"]'); },
  async ask(c) { await c.go('/#today'); await c.click('[data-lang="en"]'); await c.scrollTo('.cc-ask'); await c.type('#cc-q', 'When is the follow-up?'); await c.click('.cc-ask-form button[type="submit"]'); await c.pause(2500); await c.type('#cc-q', 'Can you make that easier?', true); await c.click('.cc-ask-form button[type="submit"]'); await c.pause(2500); },
  async agent(c) { await c.go('/#today'); await c.waitAiSlot(); await c.scrollTo('.cc-ask'); await c.type('#cc-q', 'What does Arjun need to do tomorrow?'); await c.click('[data-act="agent"]'); await c.waitFor('.cc-agent-why', 150000); await c.pause(1200); await c.click('.cc-agent-why summary'); await c.scrollTo('.cc-agent'); await c.pause(2500); await c.scrollBy(450); await c.pause(2500); await c.scrollBy(450); await c.pause(2000); },
  async safety(c) { await c.go('/#today'); await c.scrollTo('.cc-ask'); await c.type('#cc-q', 'He has severe stomach pain and is vomiting blood'); await c.click('.cc-ask-form button[type="submit"]'); await c.pause(3500); await c.type('#cc-q', 'Can I double his amoxicillin?', true); await c.click('.cc-ask-form button[type="submit"]'); await c.pause(3500); await c.type('#cc-q', 'Should I stop the ondansetron?', true); await c.click('[data-act="agent"]'); await c.waitFor('.cc-agent-why', 20000); await c.scrollTo('.cc-agent'); await c.pause(3000); },
  async amd(c) { await c.go('/#today'); await c.waitAiSlot(); await c.click('[data-tab="recovery"]'); await c.scrollTo('.cc-tabpanel'); await c.clickIn('.cc-card', '[data-act="ai"]'); await c.waitFor('.cc-ai:not(:has-text("Asking AMD"))', 150000); await c.pause(2500); await c.scrollTo('.cc-amd-activity'); await c.click('[data-act="amd-refresh"]'); await c.pause(600); await c.click('.cc-amd-activity summary'); await c.scrollTo('.cc-amd-activity'); await c.pause(5000); },
  async recap(c) { await c.go('/#today'); await c.click('#cc-nav-calendar'); await c.pause(2000); await c.click('[data-tab="today"]'); await c.scrollTo('.cc-brief'); await c.pause(2000); }
};

// ---------- Video A: AMD hackathon demo (3–5 min) ----------
export const VIDEO_A = [
  { id: 'a01', kind: 'card', card: { title: 'ClearCare', subtitle: 'Recovery deserves understanding.', note: 'AMD Developer Hackathon: ACT III · Health and Wellbeing' }, lines: [
    'When a child comes home after surgery, the family is handed pages of instructions: medicines, warning signs, a follow-up visit.',
    'Those pages are often in medical English, and the person caring for the child may think in Hindi or Kannada.',
    'ClearCare turns the instructions a care team already wrote into a clear daily plan you can read, hear, and follow, without adding medical advice of its own.'] },
  { id: 'a02', kind: 'app', run: A.upload, lines: [
    'This is the real ClearCare application, running on this computer. The patient is synthetic.',
    'Arjun, aged twelve, had his appendix removed. His mother adds the discharge letter as a PDF.',
    'The document is read locally. ClearCare reports what it found, and how many instructions need checking.'] },
  { id: 'a03', kind: 'app', run: A.understand, lines: [
    'Every instruction keeps a link to its exact source line.',
    'One medicine, ondansetron, is written as "four", with no unit. ClearCare does not guess. It marks it for the care team, and shows the original words.'] },
  { id: 'a04', kind: 'app', run: A.calendar, lines: [
    'The Calendar Agent puts the papers on a family calendar automatically, and explains every decision.',
    'The follow-up with Doctor Mehta on October twenty third is added with reminders. Each medicine appears on the days it applies. Unclear items carry a warning instead of a guess.',
    'Doses can be ticked off, and everything stays after the page is closed and reopened.'] },
  { id: 'a05', kind: 'app', run: A.kannada, lines: [
    'Language matters. Here the plan is switched to Kannada.',
    'The Kannada text was produced by AMD-hosted AI. Medicine names, doses and numbers are locked before translation, and each line is checked against the English before it is shown.',
    'The plan can be read aloud with a Kannada voice. The screen recording cannot capture the app\'s sound, so the voice in use is shown on screen.'] },
  { id: 'a06', kind: 'app', run: A.agent, lines: [
    'Now a question for the Care Agent: what does Arjun need to do tomorrow?',
    'The agent plans its steps, uses its own tools on the plan and the calendar, and then makes one request to the AMD model to reason over that evidence.',
    'The answer shows its steps, the exact lines it relied on, and the safety checks it passed. If a check fails, the answer is withheld.'] },
  { id: 'a07', kind: 'app', run: A.safety, lines: [
    'ClearCare is not a doctor, and it is built to say so.',
    'A description of vomiting blood immediately shows emergency numbers. No AI is involved, and ClearCare never judges symptoms.',
    'Requests to double or stop a medicine are redirected to the care team, with the document\'s own words.'] },
  { id: 'a08', kind: 'app', run: A.amd, lines: [
    'AMD powers the language work: explanations, translations, and the agent\'s reasoning, using the DeepSeek V4 Flash model on AMD Developer Cloud\'s Token Factory.',
    'Every AI response is checked against the document before display. The activity panel shows real AMD request identifiers, the model that served each call, and its latency. No patient text is logged.'] },
  { id: 'a09', kind: 'card', card: { title: 'ClearCare', subtitle: 'Leaving the hospital shouldn\'t mean facing recovery alone.', note: 'Source-grounded · multilingual · voice-supported · AMD-powered' }, lines: [
    'ClearCare explains the care that was prescribed, in the family\'s language, every day, with clear limits.',
    'It is a working prototype with synthetic data, built for the AMD Developer Hackathon, Act Three.'] }
];

// ---------- Video B: self-guided stakeholder walkthrough (6–10 min) ----------
export const VIDEO_B = [
  { id: 'b01', kind: 'card', card: { title: 'ClearCare', subtitle: 'A guided walkthrough', note: 'Chapter 1 · What is ClearCare?' }, lines: [
    'Welcome. This walkthrough shows every main screen of ClearCare, so you can understand and evaluate it without a live demonstration.',
    'ClearCare helps patients and families after a hospital stay. It takes the discharge instructions a care team already wrote, and turns them into a clear daily plan, in the family\'s language, that can be read or heard.',
    'It does not diagnose, prescribe, or change treatment. All patient data in this video is synthetic.'] },
  { id: 'b02', kind: 'app', run: A.overview, lines: [
    'Chapter two: the main screen. On the left is the navigation.',
    'Overview is the home page. My care plan, Needs a second look, and My documents come from the original prototype.',
    'Today, Hear my day, is the daily check in. Family calendar is the recovery calendar. We will visit both.'] },
  { id: 'b03', kind: 'app', run: A.onboarding, lines: [
    'Chapter three: getting started. The first time ClearCare opens, a short welcome explains what it is: an AI tool that only explains what the care team wrote.',
    'The family chooses a language, whether the day should be read aloud automatically, who is using the app, whether to keep the plan on this computer, and the text size.',
    'No name, date of birth or account is needed. Here, a parent is helping a child recover.'] },
  { id: 'b04', kind: 'app', run: A.upload, lines: [
    'Chapter four: adding the discharge papers. The discharge letter is added as a PDF.',
    'The document is read on this computer. A summary line says how it was read, how many pages it has, and how many instructions need checking.'] },
  { id: 'b05', kind: 'app', run: A.understand, lines: [
    'Chapter five: understanding the document. Each medicine becomes a card with a plain explanation, labelled as coming from ClearCare\'s rules, not AI.',
    'The ondansetron line says only "four", with no unit. ClearCare will not guess, so it is marked for clarification, and the original wording is one click away.',
    'The Needs clarification tab collects everything to ask the care team about.'] },
  { id: 'b06', kind: 'app', run: A.today, lines: [
    'Chapter six: the daily dashboard. "Your day, in plain words" brings together what the papers say for today, as short lines that can be replayed one at a time.',
    'Below are views for today, tomorrow, upcoming items, medicines and recovery tasks. Doses are marked by the family. ClearCare never assumes a dose was taken.'] },
  { id: 'b07', kind: 'app', run: A.calendar, lines: [
    'Chapter seven: the recovery calendar. When papers are added, the Calendar Agent fills the calendar automatically.',
    'Its log explains each decision: what it added, what needs confirming, and what it skipped, quoting the source line and page.',
    'October twenty third shows the follow-up with Doctor Mehta, with reminders a day and an hour before. Medicine days are marked, and unclear medicines carry a warning sign.',
    'For today, the clear antibiotic can be ticked off dose by dose. These ticks stay after a refresh, and appear in the daily view too.'] },
  { id: 'b08', kind: 'app', run: A.addVisit, lines: [
    'Families can add their own visits, for example a dressing check for Arjun on Tuesday at four.',
    'Visits get reminders while ClearCare is open, and can be exported to a phone calendar as a standard calendar file.'] },
  { id: 'b09', kind: 'app', run: A.voice, lines: [
    'Chapter eight: voice guidance. Hear my calendar reads the next verified visit, today\'s medicines, and how many items need confirming.',
    'Stop ends speech immediately, so voices never overlap. Hear my day reads the daily plan, with pause, stop, and a speed control.',
    'The recording cannot capture the app\'s sound, so the status line shows which voice is speaking.'] },
  { id: 'b10', kind: 'app', run: A.hindi, lines: [
    'Chapter nine: languages. English, Spanish, and Hindi are built in. Their wording comes from ClearCare\'s reviewed rules, not from AI.',
    'Here is the same plan in Hindi. Medicine names, doses and numbers are identical to the English.'] },
  { id: 'b11', kind: 'app', run: A.kannada, lines: [
    'For other languages, such as Kannada, ClearCare asks AMD-hosted AI to translate its own English text.',
    'Medicine names, doses and numbers are locked before translation, and each line is checked against the English before it is shown. A line that fails stays in English, marked E N.',
    'The plan can then be read with a Kannada voice. Qualified human review of these translations is still needed before real use.'] },
  { id: 'b12', kind: 'app', run: A.ask, lines: [
    'Chapter ten: asking questions. Questions can be typed or spoken.',
    'When is the follow-up? The answer comes straight from the papers.',
    'Can you make that easier? ClearCare gives a simpler explanation of the same instruction, without changing its meaning.'] },
  { id: 'b13', kind: 'app', run: A.agent, lines: [
    'For questions that need several facts, there is the Care Agent. The question here is: what does Arjun need to do tomorrow?',
    'The agent plans which tools to use, checks tomorrow\'s schedule and searches the papers, then makes one request to the AMD model to reason over that evidence.',
    'Why this answer shows the steps, the reasoning, the exact lines used, and the safety checks. An answer that adds a number or loses a warning is withheld.'] },
  { id: 'b14', kind: 'app', run: A.safety, lines: [
    'Chapter eleven: safety. A message about severe stomach pain and vomiting blood shows emergency numbers at once. ClearCare never judges whether a symptom is dangerous.',
    'Can I double his amoxicillin? ClearCare cannot change medicines, so it points to the care team and quotes the papers.',
    'Asking the agent whether to stop a medicine gets the same fixed safety response, without any AI request.'] },
  { id: 'b15', kind: 'app', run: A.amd, lines: [
    'Chapter twelve: what AMD powers. Explain with AMD AI asks the DeepSeek V4 Flash model on AMD Developer Cloud\'s Token Factory to explain one instruction.',
    'Before anything is shown, ClearCare checks every number, unit, medicine name and warning against the original. If the AI changed one, the explanation is withheld.',
    'The AI activity panel lists real AMD request identifiers, the model that served each call, and the latency, without logging patient text.'] },
  { id: 'b16', kind: 'app', run: A.recap, lines: [
    'Chapter thirteen: putting it together. The papers become a checked plan, the plan fills the calendar, the family hears it in their language, and questions are answered from the papers, with clear limits.'] },
  { id: 'b17', kind: 'card', card: { title: 'ClearCare', subtitle: 'Leaving the hospital shouldn\'t mean facing recovery alone.', note: 'Chapter 14 · Next steps for evaluators' }, lines: [
    'ClearCare is a working prototype, tested with synthetic documents. Before real use, it needs clinical review of its wording, human review of each language, and a pilot with care teams.',
    'The source code, test results and AMD verification evidence are included with this submission. Thank you for watching.'] }
];

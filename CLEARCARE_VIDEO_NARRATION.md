# Video narration scripts

Generated from `CLEARCARE_DEMO_AUTOMATION/storyboard.mjs`. Voice: Microsoft Zira (Windows built-in OneCore speech), rate 0.95. Captions are the same text, burned in and provided as .srt files.

## Video A: CLEARCARE_AMD_ACT_III_DEMO.mp4

### a01

When a child comes home after surgery, the family is handed pages of instructions: medicines, warning signs, a follow-up visit. Those pages are often in medical English, and the person caring for the child may think in Hindi or Kannada. ClearCare turns the instructions a care team already wrote into a clear daily plan you can read, hear, and follow, without adding medical advice of its own.

### a02

This is the real ClearCare application, running on this computer. The patient is synthetic. Arjun, aged twelve, had his appendix removed. His mother adds the discharge letter as a PDF. The document is read locally. ClearCare reports what it found, and how many instructions need checking.

### a03

Every instruction keeps a link to its exact source line. One medicine, ondansetron, is written as "four", with no unit. ClearCare does not guess. It marks it for the care team, and shows the original words.

### a04

The Calendar Agent puts the papers on a family calendar automatically, and explains every decision. The follow-up with Doctor Mehta on October twenty third is added with reminders. Each medicine appears on the days it applies. Unclear items carry a warning instead of a guess. Doses can be ticked off, and everything stays after the page is closed and reopened.

### a05

Language matters. Here the plan is switched to Kannada. The Kannada text was produced by AMD-hosted AI. Medicine names, doses and numbers are locked before translation, and each line is checked against the English before it is shown. The plan can be read aloud with a Kannada voice. The screen recording cannot capture the app's sound, so the voice in use is shown on screen.

### a06

Now a question for the Care Agent: what does Arjun need to do tomorrow? The agent plans its steps, uses its own tools on the plan and the calendar, and then makes one request to the AMD model to reason over that evidence. The answer shows its steps, the exact lines it relied on, and the safety checks it passed. If a check fails, the answer is withheld.

### a07

ClearCare is not a doctor, and it is built to say so. A description of vomiting blood immediately shows emergency numbers. No AI is involved, and ClearCare never judges symptoms. Requests to double or stop a medicine are redirected to the care team, with the document's own words.

### a08

AMD powers the language work: explanations, translations, and the agent's reasoning, using the DeepSeek V4 Flash model on AMD Developer Cloud's Token Factory. Every AI response is checked against the document before display. The activity panel shows real AMD request identifiers, the model that served each call, and its latency. No patient text is logged.

### a09

ClearCare explains the care that was prescribed, in the family's language, every day, with clear limits. It is a working prototype with synthetic data, built for the AMD Developer Hackathon, Act Three.

## Video B: CLEARCARE_STAKEHOLDER_WALKTHROUGH.mp4

### b01

Welcome. This walkthrough shows every main screen of ClearCare, so you can understand and evaluate it without a live demonstration. ClearCare helps patients and families after a hospital stay. It takes the discharge instructions a care team already wrote, and turns them into a clear daily plan, in the family's language, that can be read or heard. It does not diagnose, prescribe, or change treatment. All patient data in this video is synthetic.

### b02

Chapter two: the main screen. On the left is the navigation. Overview is the home page. My care plan, Needs a second look, and My documents come from the original prototype. Today, Hear my day, is the daily check in. Family calendar is the recovery calendar. We will visit both.

### b03

Chapter three: getting started. The first time ClearCare opens, a short welcome explains what it is: an AI tool that only explains what the care team wrote. The family chooses a language, whether the day should be read aloud automatically, who is using the app, whether to keep the plan on this computer, and the text size. No name, date of birth or account is needed. Here, a parent is helping a child recover.

### b04

Chapter four: adding the discharge papers. The discharge letter is added as a PDF. The document is read on this computer. A summary line says how it was read, how many pages it has, and how many instructions need checking.

### b05

Chapter five: understanding the document. Each medicine becomes a card with a plain explanation, labelled as coming from ClearCare's rules, not AI. The ondansetron line says only "four", with no unit. ClearCare will not guess, so it is marked for clarification, and the original wording is one click away. The Needs clarification tab collects everything to ask the care team about.

### b06

Chapter six: the daily dashboard. "Your day, in plain words" brings together what the papers say for today, as short lines that can be replayed one at a time. Below are views for today, tomorrow, upcoming items, medicines and recovery tasks. Doses are marked by the family. ClearCare never assumes a dose was taken.

### b07

Chapter seven: the recovery calendar. When papers are added, the Calendar Agent fills the calendar automatically. Its log explains each decision: what it added, what needs confirming, and what it skipped, quoting the source line and page. October twenty third shows the follow-up with Doctor Mehta, with reminders a day and an hour before. Medicine days are marked, and unclear medicines carry a warning sign. For today, the clear antibiotic can be ticked off dose by dose. These ticks stay after a refresh, and appear in the daily view too.

### b08

Families can add their own visits, for example a dressing check for Arjun on Tuesday at four. Visits get reminders while ClearCare is open, and can be exported to a phone calendar as a standard calendar file.

### b09

Chapter eight: voice guidance. Hear my calendar reads the next verified visit, today's medicines, and how many items need confirming. Stop ends speech immediately, so voices never overlap. Hear my day reads the daily plan, with pause, stop, and a speed control. The recording cannot capture the app's sound, so the status line shows which voice is speaking.

### b10

Chapter nine: languages. English, Spanish, and Hindi are built in. Their wording comes from ClearCare's reviewed rules, not from AI. Here is the same plan in Hindi. Medicine names, doses and numbers are identical to the English.

### b11

For other languages, such as Kannada, ClearCare asks AMD-hosted AI to translate its own English text. Medicine names, doses and numbers are locked before translation, and each line is checked against the English before it is shown. A line that fails stays in English, marked E N. The plan can then be read with a Kannada voice. Qualified human review of these translations is still needed before real use.

### b12

Chapter ten: asking questions. Questions can be typed or spoken. When is the follow-up? The answer comes straight from the papers. Can you make that easier? ClearCare gives a simpler explanation of the same instruction, without changing its meaning.

### b13

For questions that need several facts, there is the Care Agent. The question here is: what does Arjun need to do tomorrow? The agent plans which tools to use, checks tomorrow's schedule and searches the papers, then makes one request to the AMD model to reason over that evidence. Why this answer shows the steps, the reasoning, the exact lines used, and the safety checks. An answer that adds a number or loses a warning is withheld.

### b14

Chapter eleven: safety. A message about severe stomach pain and vomiting blood shows emergency numbers at once. ClearCare never judges whether a symptom is dangerous. Can I double his amoxicillin? ClearCare cannot change medicines, so it points to the care team and quotes the papers. Asking the agent whether to stop a medicine gets the same fixed safety response, without any AI request.

### b15

Chapter twelve: what AMD powers. Explain with AMD AI asks the DeepSeek V4 Flash model on AMD Developer Cloud's Token Factory to explain one instruction. Before anything is shown, ClearCare checks every number, unit, medicine name and warning against the original. If the AI changed one, the explanation is withheld. The AI activity panel lists real AMD request identifiers, the model that served each call, and the latency, without logging patient text.

### b16

Chapter thirteen: putting it together. The papers become a checked plan, the plan fills the calendar, the family hears it in their language, and questions are answered from the papers, with clear limits.

### b17

ClearCare is a working prototype, tested with synthetic documents. Before real use, it needs clinical review of its wording, human review of each language, and a pilot with care teams. The source code, test results and AMD verification evidence are included with this submission. Thank you for watching.

# Calendar voice briefing tests

The Today view opens on a daily check-in.
1. A greeting matched to the time of day.
2. The date.
3. What is listed for today.
4. Each item, one by one.
5. "Please remember" restrictions.
6. Do-not-take items.
7. As-needed items.
8. A separate list of what needs clarification.
9. Warning signs.
10. What is coming up.
11. A calm close.

It has tabs for Today, Tomorrow, Upcoming, Medicines, Appointments, Recovery, Needs clarification and All.

| Requirement | Test | Result |
|---|---|---|
| Only clear, active items become tasks; STOP/HOLD go to "Do not take"; unclear items go to "Needs clarification" | `ext-calendar` day-plan test | PASS |
| No invented clock times. Slots show only times the patient chose, labelled "your choice". | Slots test | PASS |
| Nothing is marked taken automatically. "Taken" is only what the patient taps; the briefing says "You marked 1 of 3 as taken". | Slots test, E05 | PASS |
| Afternoon and evening: "ClearCare doesn't know which doses you've already taken" | Briefing test, 3 languages × 3 parts of day | PASS |
| Start dates respected, course length respected, unknown course start disclosed | Start/duration test | PASS |
| Upcoming appointments (14 days) mentioned; relative or incomplete visits sent to clarification | Day-plan test, E05 | PASS |
| Empty plan / nothing confirmed today says so | Empty test | PASS |
| "Only the important things" mode | Important-mode test | PASS |
| Timezone: date and part of day computed in the user's IANA zone; date maths safe across DST | `partOfDay`, `addDays` tests | PASS |
| Autoplay consent and fallback | E19 | PASS |
| `.ics` export of patient-chosen reminder times, only for schedulable medicines. A fixed-length course needs a start date (from the document, or Day 1 entered by the patient). Text escaped. | ICS test | PASS |
| The original appointment `.ics` export is still available | E03 | PASS |

## Reminder capabilities (kept distinct, no overclaiming)

| Reminder type | Status |
|---|---|
| In-app toast | Works **only while the page is open** |
| Browser notification | Opt-in; also only while the page is open |
| `.ics` file | The patient's own calendar app reminds them |
| Background, push or native reminders | **Not implemented** |

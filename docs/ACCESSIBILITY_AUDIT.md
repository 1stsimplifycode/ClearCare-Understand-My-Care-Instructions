# Accessibility audit (Today view)

| Check | Result |
|---|---|
| axe-core 4.10.2, WCAG 2.0/2.1 A and AA rules, on `#cc-today` with a loaded plan | **0 violations** (`docs/evidence/axe-today.json`). The first run found 14 colour-contrast failures; text colours were darkened and the scan was re-run. |
| Desktop only (by request) | The phone layout is removed. At 1366×900 Hindi renders fully. An 800 px window keeps the desktop sidebar and does not switch to a phone layout (E21); `docs/evidence/today-hi-desktop.png` |
| Original look retained | The Today view uses the original's fonts and component sizes. To pass WCAG AA contrast, its grey and green text is a shade darker than the original palette. The original screens are unchanged and were not part of this scan. |
| Control size | Buttons 30–37 px tall, matching the original UI |
| Type | 16–18 px body text for explanations; large primary "Hear my day" button |
| Semantics | Radio groups for language and mode (`aria-checked`); tablist / tab / tabpanel; `aria-pressed` toggles; `role=status` / `aria-live` for voice status and answers; `lang` attributes (`en-US`, `es-ES`, `hi-IN`) so screen readers pick the right voice |
| Keyboard | Native buttons, links, details and inputs; visible `:focus-visible` outlines |
| Motion | `prefers-reduced-motion` honoured |
| Print | Caregiver print stylesheet: controls hidden, original words shown |

**Not done:**
- Manual screen-reader passes (NVDA, JAWS, TalkBack).
- Testing with elderly or low-vision users.
- An audit of the **original** Overview page. It is outside the scope of this scan, and some of its original 8–10 px labels are likely to fail contrast.

# Speech integration and voice quality report

| Area | Implementation | Evidence |
|---|---|---|
| Text-to-speech | Browser Web Speech API, one utterance per transcript segment, so each segment can be highlighted and replayed | E2E E07–E09 (mock voices) |
| Voice selection | Voices from this device are used first. "Online" voices, which can send text to the browser vendor, are off by default. If no voice exists for the language, the app says so plainly; it never reads Hindi with an English voice. | E2E E20 (real headless Chromium, no voices) |
| Normalisation | `0.5 mg` → "zero point 5 milligrams" / "cero punto 5 miligramos" / "शून्य दशमलव 5 मिलीग्राम". "3,000" → "3000". BID, PRN and PO are expanded. Quotes and dashes are turned into pauses. | Unit tests |
| Verification before speaking | The numbers parsed back from the spoken text must equal the display numbers, and the negation count must not drop. If the check fails, the display text is spoken unmodified. | Unit tests (tampered speech rejected) |
| Transcript equals speech | The transcript shows the display text; speech is its verified normalisation. | E07 (segment count = utterance count) |
| Controls | Hear my day, pause/resume, stop, per-segment replay, speed slider 0.6–1.2, "Speak more slowly" (−0.15), language switch, per-card Listen | E07–E09 |
| Autoplay | Reads aloud automatically only if the patient has opted in **and** the Today view was opened by a real tap. If the browser blocks it ("not-allowed", or no start within 2 s), a visible message says "tap Hear my day". No user gestures are faked. | E19 |
| Speech-to-text | `SpeechRecognition` / `webkitSpeechRecognition` (Chrome, Edge). Starts only on a tap, after a one-time consent explaining that audio may go to the browser vendor. Shows a visible red listening state, then stops. No audio is stored. | E12 (mock recognition) |

**Not verified:**
- Real voice quality and pronunciation, which depend on the voices installed on the user's operating system. On Windows, add Hindi or Spanish voices under Settings › Time & language › Speech.
- Real speech recognition accuracy for Hindi, Spanish or code-mixed speech.
- No AMD-hosted speech model was used. None was verified as available, so none is claimed.

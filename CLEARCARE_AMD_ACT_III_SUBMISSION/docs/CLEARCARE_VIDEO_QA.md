# Video QA

## CLEARCARE_AMD_ACT_III_DEMO.mp4: produced and checked
Checked with `CLEARCARE_DEMO_AUTOMATION/validate-video.mjs` plus manual inspection of one frame per scene (`videos/CLEARCARE_AMD_ACT_III_DEMO_frames/`).
- MP4 (H.264 High, yuv420p) 1920×1080, 30 fps; AAC 48 kHz stereo narration (Microsoft Zira, Windows built-in voice); about 4 minutes; full decode without errors; 29 captions, in order and inside the video (burned in, plus `.srt`).
- Every scene is a live recording of the real app (Edge, real server, real AMD key) with synthetic data. Kannada lines were translated by AMD during an unrecorded rehearsal minutes earlier and served from ClearCare's cache while recording.
- In the recorded Care Agent scene, AMD's answer was **withheld** by ClearCare's checks. A false-alarm rule (multi-medicine negation) was found and fixed afterwards (109 tests pass); the video shows the stricter, pre-fix behaviour.
- Known issues: an approximately 15 s wait while the agent calls AMD (the key allows about 1 request a minute); one approximately 6 s pause at the end of the safety scene. The app's own speech is not audible, because there is no system-audio capture device on this PC; the voice in use is shown on screen.

## CLEARCARE_STAKEHOLDER_WALKTHROUGH.mp4: NOT PRODUCED
The 17-scene script, narration and automation are complete (`CLEARCARE_DEMO_AUTOMATION/storyboard.mjs`, `build-video.mjs B`, about 25 minutes to render). It was not rendered before the 5:45 pm deadline.

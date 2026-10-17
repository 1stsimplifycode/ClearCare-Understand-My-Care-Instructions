// Writes CLEARCARE_VIDEO_NARRATION.md and CLEARCARE_VIDEO_STORYBOARD.md from storyboard.mjs (single source of truth).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { VIDEO_A, VIDEO_B } from './storyboard.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const action = s => s.kind === 'card' ? `Title card: “${s.card.title}: ${s.card.subtitle}” (${s.card.note})` : `Live app — \`${s.run.name}\`: ` + (f => f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')))(s.run.toString()).replace(/await c\./g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
const narr = (title, list) => `## ${title}\n\n` + list.map(s => `### ${s.id}\n\n${s.lines.join(' ')}\n`).join('\n');
writeFileSync(join(root, 'CLEARCARE_VIDEO_NARRATION.md'), `# Video narration scripts\n\nGenerated from \`CLEARCARE_DEMO_AUTOMATION/storyboard.mjs\`. Voice: Microsoft Zira (Windows built-in OneCore speech), rate 0.95. Captions are the same text, burned in and provided as .srt files.\n\n${narr('Video A: CLEARCARE_AMD_ACT_III_DEMO.mp4', VIDEO_A)}\n${narr('Video B: CLEARCARE_STAKEHOLDER_WALKTHROUGH.mp4', VIDEO_B)}`);
const board = (title, list) => `## ${title}\n\n| Scene | What is on screen | Narration (first sentence) |\n|---|---|---|\n` + list.map(s => `| ${s.id} | ${action(s).replace(/\|/g, '/')} | ${s.lines[0].replace(/\|/g, '/')} |`).join('\n') + '\n';
writeFileSync(join(root, 'CLEARCARE_VIDEO_STORYBOARD.md'), `# Video storyboards\n\nEach "Live app" scene is performed automatically in the real running app (Microsoft Edge, Playwright over CDP, real server, real AMD key). Actions are listed as written in \`storyboard.mjs\`.\n\n${board('Video A (3–5 min)', VIDEO_A)}\n${board('Video B (6–10 min)', VIDEO_B)}`);
console.log('docs written');

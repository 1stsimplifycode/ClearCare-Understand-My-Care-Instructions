// Pulls full-resolution frames (no captions) from the raw scene recordings of Video A, for the deck.
//   node extract-shots.mjs <outDir>      → <id>-<n>.png candidates at several points in each clip
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const auto = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const man = JSON.parse(readFileSync(join(auto, '.work/A/manifest.json'), 'utf8'));
for (const s of man.scenes.filter(x => x.kind === 'app')) {
  const f = join(auto, '.work/A', `${s.id}.webm`); if (!existsSync(f)) continue;
  const start = s.clip.startAt, len = s.clip.elapsed;
  [0.35, 0.6, 0.85, 0.97].forEach((p, i) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(start + len * p), '-i', f, '-frames:v', '1', join(out, `${s.id}-${i}.png`)]));
}
console.log('frames written to', out);

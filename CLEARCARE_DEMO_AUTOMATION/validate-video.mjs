// Validates a finished MP4 + SRT: container, codecs, resolution, fps, duration, audio present and level,
// full decode without errors, caption timing inside the video. Prints JSON.
//   node validate-video.mjs <file.mp4>
import { execFileSync, spawnSync } from 'node:child_process';
import { statSync, readFileSync, existsSync } from 'node:fs';
const f = process.argv[2];
const run = (cmd, args) => { const r = spawnSync(cmd, args, { maxBuffer: 1 << 26 }); return (r.stdout || '').toString() + (r.stderr || '').toString(); };
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', f]).toString());
const v = probe.streams.find(s => s.codec_type === 'video'), a = probe.streams.find(s => s.codec_type === 'audio');
const duration = Number(probe.format.duration);
const decodeErrors = run('ffmpeg', ['-v', 'error', '-i', f, '-f', 'null', '-']).trim();
const vol = run('ffmpeg', ['-hide_banner', '-i', f, '-map', '0:a', '-af', 'volumedetect', '-f', 'null', '-']);
const mean = Number((vol.match(/mean_volume: (-?[\d.]+)/) || [])[1]), max = Number((vol.match(/max_volume: (-?[\d.]+)/) || [])[1]);
const silence = run('ffmpeg', ['-hide_banner', '-i', f, '-map', '0:a', '-af', 'silencedetect=n=-45dB:d=6', '-f', 'null', '-']);
const longSilences = [...silence.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map(m => ({ endsAt: Number(m[1]), seconds: Number(m[2]) }));
const srt = f.replace(/\.mp4$/, '.srt');
let captions = null;
if (existsSync(srt)) {
  const cues = [...readFileSync(srt, 'utf8').matchAll(/(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})/g)].map(m => [Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000, Number(m[5]) * 3600 + Number(m[6]) * 60 + Number(m[7]) + Number(m[8]) / 1000]);
  captions = { cues: cues.length, lastEnd: cues.at(-1)?.[1], allInsideVideo: cues.every(([s, e]) => e > s && e <= duration + 0.05), ordered: cues.every((c, i) => !i || c[0] >= cues[i - 1][0] - 0.01) };
}
console.log(JSON.stringify({
  file: f, bytes: statSync(f).size, container: probe.format.format_name, durationSec: Number(duration.toFixed(2)),
  video: v && { codec: v.codec_name, profile: v.profile, width: v.width, height: v.height, fps: v.r_frame_rate, pixFmt: v.pix_fmt },
  audio: a && { codec: a.codec_name, sampleRate: a.sample_rate, channels: a.channels, meanVolumeDb: mean, maxVolumeDb: max },
  fullDecodeErrors: decodeErrors ? decodeErrors.split('\n').slice(0, 5) : 'none',
  silencesOver6s: longSilences, captions
}, null, 2));

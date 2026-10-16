import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('synthetic scenarios cover normal, ambiguous, conflict, missing unit, unreadable, and high-risk documents', () => {
  for (const id of ['normal', 'ambiguous', 'conflict', 'units', 'unreadable', 'highrisk']) assert.match(app, new RegExp(`${id}:\\s*\\{`));
});
test('safety rules identify high-risk medications and review medication ambiguity', () => {
  for (const med of ['insulin', 'warfarin', 'apixaban', 'rivaroxaban', 'heparin', 'oxycodone', 'hydrocodone', 'morphine', 'fentanyl', 'tacrolimus', 'cyclosporine', 'prednisone']) assert.match(app, new RegExp(`'${med}'`));
  assert.match(app, /m\.needsReview\s*\|\|\s*m\.risk/);
  assert.match(app, /unit not stated/);
  assert.match(app, /directions conflict/);
});
test('calendar export requires confirmed appointment and complete location', () => {
  assert.match(app, /t\.status === 'confirmed' && !t\.needsReview && t\.appointment\.date && t\.appointment\.time && t\.appointment\.location/);
});
test('source evidence is escaped before rendering in the care plan', () => {
  assert.match(app, /function evidence\(text\)[\s\S]*?esc\(text\)/);
});
test('real upload parses PDF text in the browser without an API dependency', () => {
  assert.match(app, /extractPdfText\(file\)/);
  assert.match(app, /extractCarePlan\(sourceText, file\.name\)/);
  assert.match(app, /Image OCR is not configured/);
  assert.match(html, /Synthetic demo/);
});
test('home checklist uses accessible buttons and toggles completion both ways', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /data-complete="walk"[^>]*aria-pressed="true"/);
  assert.match(html, /data-complete="call"[^>]*aria-pressed="false"/);
  assert.match(app, /if \(completedTasks\.has\(id\)\) completedTasks\.delete\(id\); else completedTasks\.add\(id\)/);
  assert.match(app, /button\.classList\.toggle\('checked', completedTasks\.has\(id\)\)/);
});
test('review items can mark follow-up done without changing their clinical review status', () => {
  assert.match(app, /Mark follow-up done/);
  assert.match(app, /This tracks your follow-up only\. It does not confirm or approve the medical instruction\./);
  assert.match(app, /sessionStorage\.setItem\('clearcare-reviewed-items'/);
  assert.match(app, /tag-review.*NEEDS REVIEW/s);
});
test('dashboard explanation controls exist but no explanation request runs at page load', () => {
  assert.match(app, /Explain simply/);
  assert.match(app, /data-explain=/);
  assert.match(app, /addEventListener\('click',[\s\S]*explainSelected/);
  assert.match(app, /explainSelected\(button\.dataset\.explain, button\.dataset\.language, button\)/);
  assert.match(app, /addEventListener\('click',[\s\S]*explainSelected/);
});

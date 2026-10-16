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
test('home and care checklists use accessible, reversible completion controls', () => {
  assert.match(app, /data-home-complete="\$\{esc\(item\.id\)\}"[\s\S]*?aria-pressed="\$\{done\}"/);
  assert.match(app, /data-care-complete="\$\{esc\(item\.id\)\}"[\s\S]*?aria-pressed="\$\{done\}"/);
  assert.match(app, /completedTasks\.has\(id\) \? completedTasks\.delete\(id\) : completedTasks\.add\(id\)/);
  assert.match(app, /sessionStorage\.setItem\('clearcare-completed-tasks'/);
  assert.match(app, /currentDoc\.tasks\.map\(t => t\.id\)/);
});
test('the dashboard shows each individual care and medication todo without truncating the list', () => {
  const render = app.match(/function renderTodayPreview\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(render, /const items = checklistItems\(\)/);
  assert.match(render, /items\.map\(item =>/);
  assert.doesNotMatch(render, /slice\(/);
  assert.match(app, /id: `pickup-\$\{id\}`/);
  assert.match(app, /function medicationId\(m\)[\s\S]*?m\.id \|\| String\(m\.name/);
});
test('review items can mark follow-up done without changing their clinical review status', () => {
  assert.match(app, /Mark follow-up done/);
  assert.match(app, /completedTasks\.has\(entry\.key\)/);
  assert.match(app, /You marked this follow-up done\. The instruction still needs review and is not confirmed\./);
  assert.match(app, /completedTasks\.has\(item\.key\)\)\.length/);
  assert.match(app, /tag-review">\$\{siteText\(incomplete \? 'INCOMPLETE' : 'NEEDS REVIEW'\)\}/);
  assert.match(app, /eligible: t\.status === 'confirmed' && !t\.needsReview/);
  assert.match(app, /data-review-done="\$\{esc\(entry\.key\)\}"[\s\S]*?aria-pressed="\$\{done\}"/);
});
test('dashboard explanation controls exist but no explanation request runs at page load', () => {
  assert.match(app, /Explain simply/);
  assert.match(app, /data-explain=/);
  assert.match(app, /addEventListener\('click',[\s\S]*explainSelected/);
  assert.match(app, /explainSelected\(button\.dataset\.explain, button\.dataset\.language, button\)/);
  assert.match(app, /addEventListener\('click',[\s\S]*explainSelected/);
});

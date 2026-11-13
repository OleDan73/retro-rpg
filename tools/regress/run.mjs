// Regression runner for Michael's Quest. No dependencies: Node 22+ and an installed Edge or Chrome.
//
//   node tools/regress/run.mjs               run every scenario and compare with tools/regress/baseline
//   node tools/regress/run.mjs --update      overwrite the baseline with this run
//   node tools/regress/run.mjs --update-new  only add baseline entries that do not exist yet
//   node tools/regress/run.mjs --only a,b    run just these scenarios
//   node tools/regress/run.mjs --zoom        also write 4x screenshots to tools/regress/out/zoom
//
// How it works: the game is loaded in a headless browser with a fixed random seed and a fake clock
// (see shim.js), so every run is frame-for-frame identical. Each scenario starts from a save fixture
// written in the ORIGINAL save format (see fixtures.mjs), drives the game with key presses, and records
// canvas screenshots plus a dump of the game state and of the save in localStorage.
//
// Screenshots are compared by pixel hash, states by value. One difference is tolerated on purpose:
// `hero: 'michael'` in the player data, which old saves do not have.
// Baseline screenshots depend on the browser's text rendering, so regenerate them (from a known-good
// commit) when moving to another machine.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, SAVE_KEY } from './scenarios.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BASE = path.join(HERE, 'baseline');
const OUT = path.join(HERE, 'out');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

// ------------------------------------------------------------------ static server
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain',
};
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_BASE = `http://127.0.0.1:${server.address().port}/`;

// ------------------------------------------------------------------ browser + DevTools protocol
const exe = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find((p) => p && existsSync(p));
if (!exe) { console.error('No Edge/Chrome found. Set BROWSER to the executable path.'); process.exit(2); }

const profile = await mkdtemp(path.join(tmpdir(), 'mq-regress-'));
const browser = spawn(exe, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--disable-gpu', '--mute-audio', '--window-size=900,700', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const timer = setTimeout(() => reject(new Error('browser did not start')), 30000);
  browser.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(timer); resolve(m[1]); }
  });
  browser.on('exit', () => reject(new Error('browser exited early')));
});

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('DevTools socket error')); });
let nextId = 0;
const pending = new Map();
const pageErrors = [];
let onLoad = null;
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id) {
    const p = pending.get(m.id); pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
  } else if (m.method === 'Page.loadEventFired') { onLoad?.(); }
  else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    pageErrors.push(d.exception?.description || d.text);
  }
};
let sessionId;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
await send('Page.enable');
await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: await readFile(path.join(HERE, 'shim.js'), 'utf8') });

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function navigate() {
  const loaded = new Promise((r) => { onLoad = r; });
  await send('Page.navigate', { url: URL_BASE });
  await loaded;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ run scenarios
const hashes = {}, states = {}, checks = [], errors = [];
await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, 'zoom'), { recursive: true });
const list = SCENARIOS.filter((s) => !only || only.includes(s.name));
for (const sc of list) {
  try {
    await navigate(); // get onto the origin so localStorage can be prepared
    await evaluate(`localStorage.clear(); ${sc.save ? `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(sc.save))});` : ''} 0`);
    await navigate();
    for (let i = 0; !(await evaluate('window.__T.ready()')); i++) {
      if (i > 200) throw new Error('game loop never started');
      await sleep(50);
    }
    const out = await evaluate(`(async () => { const T = window.__T; T.zoom = ${flag('--zoom') ? 4 : 0}; await (${sc.run})(T, T.g); return { ...T.out }; })()`);
    for (const s of out.shots) {
      const key = `${sc.name}__${s.name}`;
      hashes[key] = s.hash;
      await writeFile(path.join(OUT, `${key}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
      if (s.zoom) await writeFile(path.join(OUT, 'zoom', `${key}.png`), Buffer.from(s.zoom.split(',')[1], 'base64'));
    }
    for (const [k, v] of Object.entries(out.states)) states[`${sc.name}__${k}`] = v;
    for (const c of out.checks) checks.push({ ...c, name: `${sc.name}: ${c.name}` });
    if (!out.fontOk) errors.push(`${sc.name}: game font was not loaded`);
    process.stdout.write('.');
  } catch (e) {
    errors.push(`${sc.name}: ${e.message.split('\n')[0]}`);
    process.stdout.write('E');
  }
}
process.stdout.write('\n');
for (const e of pageErrors) errors.push(`page error: ${String(e).split('\n')[0]}`);
await writeFile(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1));
await writeFile(path.join(OUT, 'states.json'), JSON.stringify(states, null, 1));

ws.close();
browser.kill();
server.close();
await sleep(300);
await rm(profile, { recursive: true, force: true }).catch(() => {});

// ------------------------------------------------------------------ compare with the baseline
const readJson = async (f) => (existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : {});
const baseHashes = await readJson(path.join(BASE, 'hashes.json'));
const baseStates = await readJson(path.join(BASE, 'states.json'));
// Old saves have no hero; the game treats that as Michael. Ignore exactly that difference.
function normalise(v) {
  if (Array.isArray(v)) return v.map(normalise);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) { if (k === 'hero' && v[k] === 'michael') continue; o[k] = normalise(v[k]); }
    return o;
  }
  return v;
}
function diffPaths(a, b, p = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return [`${p || '(root)'}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diffPaths(a[k], b[k], p ? `${p}.${k}` : k));
}
const same = [], changed = [], added = [];
for (const [k, h] of Object.entries(hashes)) {
  if (!(k in baseHashes)) added.push(`screenshot ${k}`);
  else if (baseHashes[k] !== h) changed.push(`screenshot ${k}`);
  else same.push(k);
}
for (const [k, s] of Object.entries(states)) {
  if (!(k in baseStates)) { added.push(`state ${k}`); continue; }
  const d = diffPaths(normalise(baseStates[k]), normalise(s));
  if (d.length) changed.push(`state ${k}\n      ${d.slice(0, 8).join('\n      ')}`); else same.push(k);
}
const missing = only ? [] : [...Object.keys(baseHashes).filter((k) => !(k in hashes)), ...Object.keys(baseStates).filter((k) => !(k in states))];
const failedChecks = checks.filter((c) => !c.ok);

if (flag('--update') || flag('--update-new')) {
  await mkdir(BASE, { recursive: true });
  const keep = flag('--update-new');
  const newHashes = keep ? { ...hashes, ...baseHashes } : (only ? { ...baseHashes, ...hashes } : hashes);
  const newStates = keep ? { ...states, ...baseStates } : (only ? { ...baseStates, ...states } : states);
  for (const k of Object.keys(hashes)) {
    if (keep && k in baseHashes) continue;
    await writeFile(path.join(BASE, `${k}.png`), await readFile(path.join(OUT, `${k}.png`)));
  }
  if (!keep && !only) for (const k of Object.keys(baseHashes)) if (!(k in hashes)) await rm(path.join(BASE, `${k}.png`), { force: true });
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  await writeFile(path.join(BASE, 'hashes.json'), JSON.stringify(sorted(newHashes), null, 1) + '\n');
  await writeFile(path.join(BASE, 'states.json'), JSON.stringify(sorted(newStates), null, 1) + '\n');
  console.log(`Baseline ${keep ? 'extended' : 'updated'}.`);
}

console.log(`Scenarios run: ${list.length}   screenshots: ${Object.keys(hashes).length}   states: ${Object.keys(states).length}`);
console.log(`Identical to baseline: ${same.length}   changed: ${changed.length}   new: ${added.length}   missing: ${missing.length}`);
console.log(`Checks: ${checks.length - failedChecks.length}/${checks.length} passed`);
for (const c of changed) console.log(`  CHANGED ${c}`);
for (const a of added) console.log(`  NEW     ${a}`);
for (const m of missing) console.log(`  MISSING ${m}`);
for (const c of failedChecks) console.log(`  FAILED  ${c.name} ${c.detail}`);
for (const e of errors) console.log(`  ERROR   ${e}`);
const bad = changed.length + missing.length + failedChecks.length + errors.length;
console.log(bad ? 'RESULT: DIFFERENCES FOUND' : 'RESULT: OK');
process.exit(bad ? 1 : 0);

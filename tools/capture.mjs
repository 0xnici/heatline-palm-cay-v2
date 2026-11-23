// Browser screenshot tool for HEATLINE: Palm Cay. Node built-ins only. It serves game/ over a
// tiny static server, launches the bundled headless Chrome with the DevTools protocol, poses each
// deterministic scene from shots.json, and writes the four JPEGs straight from Chrome's encoder.
// Nothing is composited, edited or fetched from the network.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');
const chromePath = '/home/hermes/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const scenes = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const profile = join(process.env.TMPDIR ?? '/tmp', 'heatline-capture-profile');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitFor(test, timeoutMs, label) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const value = await test();
    if (value) return value;
    await sleep(120);
  }
  throw new Error(`timed out waiting for ${label}`);
}

function serve() {
  const server = createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end('bad request'); return; }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(join(gameDir, pathname));
    if (!file.startsWith(gameDir)) { response.writeHead(403).end('no'); return; }
    try {
      if (!statSync(file).isFile()) throw new Error('not a file');
      const body = readFileSync(file);
      response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, port: server.address().port })));
}

function cdpConnection(wsUrl) {
  return new Promise((done, fail) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;
    ws.addEventListener('open', () => done({ send, close: () => ws.close() }));
    ws.addEventListener('error', (event) => fail(new Error(`CDP websocket failed: ${String(event.message ?? event)}`)));
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve: ok, reject: no } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) no(new Error(`${message.error.message ?? 'CDP error'}`));
        else ok(message.result);
      }
    });
    function send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolveResult, rejectResult) => {
        pending.set(id, { resolve: resolveResult, reject: rejectResult });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
  });
}

async function main() {
  mkdirSync(shotsDir, { recursive: true });
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const { server, port } = await serve();
  const chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--force-device-scale-factor=1',
    '--window-size=1280,720', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let cdp;
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    const debugPort = await waitFor(() => {
      try { return Number(readFileSync(portFile, 'utf8').split('\n')[0]); } catch { return null; }
    }, 20000, 'Chrome DevTools port');
    const targets = await waitFor(async () => {
      try {
        const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
        return list.find((t) => t.type === 'page') ?? null;
      } catch { return null; }
    }, 15000, 'Chrome page target');
    cdp = await cdpConnection(targets.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, screenWidth: 1280, screenHeight: 720 });

    for (const scene of scenes) {
      const url = `http://127.0.0.1:${port}/${scene.query}`;
      await cdp.send('Page.navigate', { url });
      await waitFor(async () => {
        const reply = await cdp.send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
        return reply.result?.value === true;
      }, 25000, `${scene.name} paint`);
      await sleep(120);
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg', quality: 82, fromSurface: true, captureBeyondViewport: false,
      });
      const target = join(shotsDir, scene.name);
      const bytes = Buffer.from(shot.data, 'base64');
      writeFileSync(target, bytes);
      console.log(`${scene.name}  ${bytes.length} bytes  ${scene.caption}`);
    }
  } finally {
    if (cdp) cdp.close();
    chrome.kill('SIGTERM');
    await sleep(300);
    if (!chrome.killed) chrome.kill('SIGKILL');
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
  const names = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
  console.log(`screenshots/: ${names.join(', ')}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

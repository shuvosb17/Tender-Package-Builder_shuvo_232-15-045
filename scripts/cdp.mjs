// Minimal headless-Chrome driver used for manual verification and README screenshots.
// Usage: node scripts/cdp.mjs <scenario.mjs> [baseUrl]
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const [scenarioPath, baseUrl = 'http://localhost:5173/'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const profile = await mkdtemp(join(tmpdir(), 'tpb-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--hide-scrollbars',
  '--window-size=1440,900',
  'about:blank',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {
    await sleep(200);
  }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: ok, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : ok(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push(`[console.${msg.params.type}] ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    logs.push(`[exception] ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  }
});
const send = (method, params = {}) =>
  new Promise((ok, reject) => {
    const id = ++seq;
    pending.set(id, { resolve: ok, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Runtime.enable');
await send('Page.enable');

const page = {
  send,
  sleep,
  logs,
  async viewport(width, height) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  },
  async goto(url) {
    await send('Page.navigate', { url });
    await sleep(1200);
  },
  async eval(expression) {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    return res.result.value;
  },
  async shot(path, { fullPage = false } = {}) {
    let clip;
    if (fullPage) {
      const { contentSize } = await send('Page.getLayoutMetrics');
      clip = { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 };
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, clip });
    await mkdir(dirname(resolve(path)), { recursive: true });
    await writeFile(path, Buffer.from(data, 'base64'));
  },
  async downloadsTo(dir) {
    await mkdir(resolve(dir), { recursive: true });
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: resolve(dir) });
  },
};

await page.viewport(1440, 900);
try {
  const scenario = await import(pathToFileURL(resolve(scenarioPath)).href);
  await scenario.default(page, baseUrl);
} catch (err) {
  console.error('Scenario failed:', err);
  process.exitCode = 1;
} finally {
  if (logs.length) console.log(logs.join('\n'));
  ws.close();
  chrome.kill();
}

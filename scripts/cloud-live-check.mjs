// Run only after the owner has authorized and deployed the matching access rules.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  terminate,
} from 'firebase/firestore';
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const db = getFirestore(
  initializeApp(
    {
      apiKey: 'AIzaSyAQll2Xvf321l3c9WYQehXFinMXY6u8LGc',
      projectId: 'classroom-gacha-rewards',
    },
    'cloud-live-verification',
  ),
);
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_PATH ||
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const codes = [],
  startedAt = new Date().toISOString();
const persist = () =>
  writeFileSync(
    'work/cloud-live-docs.json',
    JSON.stringify({ startedAt, codes }),
  );
const state = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('zhuyin-cloud-v1')));
const synced = (page) =>
  page.getByText('✓ 雲端已同步', { exact: true }).waitFor({ timeout: 60000 });
async function newDevice() {
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
  });
  await context.addInitScript(() => {
    window.__response = '你';
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() {
        setTimeout(() => {
          const result = [{ transcript: window.__response }];
          result.isFinal = true;
          this.onresult?.({ results: [result] });
          this.onend?.();
        }, 10);
      }
      abort() {}
    };
  });
  const page = await context.newPage();
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3001/');
  await page.getByRole('button', { name: '關卡與獎勵', exact: true }).click();
  await synced(page);
  codes.push((await state(page)).code);
  persist();
  return { context, page };
}
try {
  const a = await newDevice();
  await a.page.getByRole('button', { name: '換我讀', exact: true }).click();
  await a.page.getByText('讀對了！你真棒！').waitFor();
  await synced(a.page);
  const code = (await state(a.page)).code;
  const b = await newDevice();
  await b.page.getByRole('button', { name: '給大人看' }).click();
  await b.page.getByLabel('接續另一台裝置的進度').fill(code);
  b.page.once('dialog', (d) => d.accept());
  await b.page
    .getByRole('button', { name: '接續雲端進度', exact: true })
    .click();
  await b.page.getByText('已接續雲端進度。', { exact: true }).waitFor();
  assert.deepEqual((await state(b.page)).passed, ['0-1']);
  await b.page.evaluate(() => (window.__response = '我'));
  await b.page.getByRole('button', { name: '換我讀', exact: true }).click();
  await b.page.getByText('讀對了！你真棒！').waitFor();
  await synced(b.page);
  await a.page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('zhuyin-cloud-v1')).passed.length === 2,
  );
  console.log('PASS: real cloud write, separate browser restore, live merge.');
  const r = doc(db, 'zhuyinProgress', code);
  assert.equal((await getDoc(r)).data().passed.length, 2);
  for (const mutation of [
    { passed: ['bad'], updatedAt: serverTimestamp() },
    { passed: [], updatedAt: serverTimestamp() },
    { extra: 'forbidden', updatedAt: serverTimestamp() },
  ])
    await assert.rejects(
      updateDoc(r, mutation),
      (e) => e.code === 'permission-denied',
    );
  await assert.rejects(
    getDocs(collection(db, 'zhuyinProgress')),
    (e) => e.code === 'permission-denied',
  );
  console.log(
    'PASS: live rules reject collection listing, invalid item, loss of progress and extra fields.',
  );
  await b.context.setOffline(true);
  await b.page.getByRole('button', { name: '下一題', exact: true }).click();
  await b.page.evaluate(() => (window.__response = '左'));
  await b.page.getByRole('button', { name: '換我讀', exact: true }).click();
  await b.page.getByText('讀對了！你真棒！').waitFor();
  assert((await state(b.page)).passed.includes('0-3'));
  await a.page.getByRole('button', { name: '給大人看' }).click();
  a.page.once('dialog', (d) => d.accept());
  await a.page.getByRole('button', { name: '重新開始全部關卡' }).click();
  await a.page.getByText('雲端進度已重新開始。', { exact: true }).waitFor();
  await b.context.setOffline(false);
  await b.page.waitForFunction(
    () => {
      const s = JSON.parse(localStorage.getItem('zhuyin-cloud-v1'));
      return s.epoch === 1 && s.passed.length === 0;
    },
    { timeout: 60000 },
  );
  await synced(b.page);
  assert.deepEqual((await getDoc(r)).data().passed, []);
  console.log('PASS: real reset and offline stale-progress protection.');
  await b.page.reload();
  await b.page.getByRole('button', { name: '關卡與獎勵', exact: true }).click();
  await synced(b.page);
  assert.equal((await state(b.page)).code, code);
  assert.deepEqual((await state(b.page)).passed, []);
  await updateDoc(r, {
    passed: Array.from({ length: 10 }, (_, n) => `0-${n + 1}`),
    updatedAt: serverTimestamp(),
  });
  await b.page.getByText('10 顆星', { exact: true }).waitFor();
  await b.page.getByRole('button', { name: '10 顆星・扭蛋一次', exact: true }).click();
  await b.page.getByRole('dialog').waitFor();
  await b.page.getByRole('button', { name: '收下，繼續讀！' }).click();
  assert.equal((await getDoc(r)).data().draws.length, 1);
  await b.page.reload();
  await b.page.getByRole('button', { name: '關卡與獎勵', exact: true }).click();
  await synced(b.page);
  assert.equal((await state(b.page)).draws.length, 1);
  assert(await b.page.getByRole('button', { name: '10 顆星・扭蛋一次', exact: true }).isDisabled());
  console.log('PASS: live reward transaction, 10-star deduction and collection restored after reload.');
  console.log(
    'PASS: reload reads confirmed cloud progress. Speech input was simulated; database was live.',
  );
} finally {
  persist();
  await browser.close();
  await terminate(db);
}

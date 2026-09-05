import assert from 'node:assert/strict';
import { CloudProgress, CACHE_KEY, LEGACY_KEY } from '../lib/cloud-progress';
import type { ProgressBackend, RemoteProgress } from '../lib/progress-backend';
import {starsLeft,collectionOf,REWARDS} from '../lib/rewards';
const tick = () => new Promise((r) => setTimeout(r, 0));
Object.assign(globalThis, {
  window: new EventTarget(),
  document: Object.assign(new EventTarget(), { hidden: false }),
});
function cache(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}
const docs = new Map<string, RemoteProgress>();
const clients: CloudProgress[] = [];
class Backend implements ProgressBackend {
  offline = false;
  delay: (() => Promise<void>) | null = null;
  async read(code: string) {
    if (this.offline) throw Error('offline');
    return structuredClone(docs.get(code) || null);
  }
  async merge(code: string, local: { passed: string[]; epoch: number | null }) {
    if (this.offline) throw Error('offline');
    await this.delay?.();
    const old = docs.get(code);
    const value = old
      ? {
          epoch: old.epoch,
          draws:old.draws,
          passed:
            local.epoch !== null && local.epoch !== old.epoch
              ? old.passed
              : [...new Set([...old.passed, ...local.passed])],
        }
      : { epoch: 0, passed: [...local.passed],draws:[] };
    docs.set(code, structuredClone(value));
    return structuredClone(value);
  }
  async reset(code: string) {
    if (this.offline) throw Error('offline');
    const value = { passed: [], draws:[],epoch: docs.get(code)!.epoch + 1 };
    docs.set(code, value);
    return value;
  }
  async draw(code:string,epoch:number,ticket:number,reward:string){if(this.offline)throw Error('offline');const old=docs.get(code)!;if(old.epoch!==epoch)throw Error('stale');if(old.draws.length>ticket)return structuredClone(old);if(old.draws.length!==ticket||old.passed.length<(ticket+1)*10)throw Error('balance');const result={...old,draws:[...old.draws,reward]};docs.set(code,result);return structuredClone(result);}
  watch() {
    return () => {};
  }
}
function make(backend: Backend, storage: ReturnType<typeof cache>) {
  const c = new CloudProgress(() => {}, backend, storage);
  clients.push(c);
  return c;
}
try {
  assert.equal(REWARDS.length,24);
  assert.equal(new Set(REWARDS.map(r=>r.id)).size,24);
  assert.equal(collectionOf(['pokemon-25','pokemon-25'])[0].level,2);
  const rBackend=new Backend(),r=make(rBackend,cache({[LEGACY_KEY]:JSON.stringify(Array.from({length:20},(_,i)=>`0-${i+1}`))}));await tick();
  assert.equal(starsLeft(r.state.passed,r.state.draws),20);
  const clicks=await Promise.allSettled([r.draw(),r.draw()]);assert.equal(clicks.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.state.draws.length,1);assert.equal(starsLeft(r.state.passed,r.state.draws),10);
  const s=make(new Backend(),cache());await tick();await s.connect(r.state.code);const [first,second]=await Promise.all([r.draw(),s.draw()]);assert.equal(first,second);assert.equal(docs.get(r.state.code)!.draws.length,2);assert.equal(starsLeft(r.state.passed,r.state.draws),0);
  await assert.rejects(r.draw());r.pass('0-1');await tick();assert.equal(starsLeft(r.state.passed,r.state.draws),0);
  await r.reset();assert.deepEqual(r.state.draws,[]);assert.deepEqual(docs.get(r.state.code)!.draws,[]);
  console.log('PASS: 10-star cost, duplicate upgrade, single-device double-click guard, two-device ticket idempotency, insufficient stars, no repeat farming, reward reset.');
  const aBackend = new Backend(),
    aCache = cache({
      [LEGACY_KEY]: JSON.stringify(['0-1', '0-2', '0-2', 'bad']),
    }),
    a = make(aBackend, aCache);
  await tick();
  assert.equal(a.state.sync, 'saved');
  assert.deepEqual(docs.get(a.state.code)?.passed, ['0-1', '0-2']);
  assert.match(a.state.code, /^[a-f0-9]{32}$/);
  a.pass('0-1');
  await tick();
  assert.equal(a.state.passed.length, 2);
  const bBackend = new Backend(),
    bCache = cache(),
    b = make(bBackend, bCache);
  await tick();
  const bOriginal = b.state.code;
  await b.connect(a.state.code);
  assert.deepEqual(b.state.passed, a.state.passed);
  a.pass('0-3');
  b.pass('0-4');
  await tick();
  await a.sync();
  await b.sync();
  assert.deepEqual(
    new Set(a.state.passed),
    new Set(['0-1', '0-2', '0-3', '0-4']),
  );
  assert.deepEqual(new Set(b.state.passed), new Set(a.state.passed));
  bBackend.offline = true;
  b.pass('0-5');
  await tick();
  assert.equal(b.state.sync, 'pending');
  assert(JSON.parse(bCache.getItem(CACHE_KEY)!).passed.includes('0-5'));
  assert(!docs.get(a.state.code)!.passed.includes('0-5'));
  bBackend.offline = false;
  await b.sync();
  assert(docs.get(a.state.code)!.passed.includes('0-5'));
  bBackend.offline = true;
  b.pass('0-6');
  await tick();
  await a.reset();
  bBackend.offline = false;
  await b.sync();
  assert.equal(b.state.epoch, 1);
  assert.deepEqual(b.state.passed, []);
  assert.deepEqual(docs.get(a.state.code)?.passed, []);
  bBackend.offline = true;
  await assert.rejects(b.reset());
  assert.deepEqual(b.state.passed, []);
  bBackend.offline = false;
  await b.sync();
  const oldCode = b.state.code;
  await assert.rejects(b.connect('bad'));
  await assert.rejects(b.connect('f'.repeat(32)));
  assert.equal(b.state.code, oldCode);
  await b.connect(bOriginal);
  assert.deepEqual(b.state.passed, []);
  b.pass('0-7');
  await tick();
  assert.deepEqual(docs.get(oldCode)?.passed, []);
  let release!: () => void;
  aBackend.delay = () =>
    new Promise<void>((r) => {
      release = r;
    });
  a.pass('0-8');
  a.pass('0-9');
  release();
  aBackend.delay = null;
  await tick();
  await tick();
  assert(a.state.passed.includes('0-9'));
  assert(docs.get(a.state.code)!.passed.includes('0-9'));
  const cBackend = new Backend();
  const broken = {
    getItem() {
      throw Error('disabled storage');
    },
    setItem() {
      throw Error('disabled storage');
    },
  };
  const c = new CloudProgress(() => {}, cBackend, broken);
  clients.push(c);
  await tick();
  assert.equal(c.state.storage, false);
  assert.equal(c.state.sync, 'saved');
  const restore = make(new Backend(), aCache);
  await tick();
  assert.equal(restore.state.code, a.state.code);
  assert.deepEqual(new Set(restore.state.passed), new Set(a.state.passed));
  console.log(
    'PASS: migration, unique scoring, two-device merge, offline cache/retry, reset epoch, failed reset preservation, invalid code isolation, concurrent local changes, storage failure, reload recovery. Backend simulated; live rules not covered.',
  );
} finally {
  clients.forEach((c) => c.dispose());
}

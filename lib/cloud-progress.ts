import { firestoreBackend, type ProgressBackend } from './progress-backend';
import { cleanProgress } from './curriculum';
import {cleanDraws,chooseReward,starsLeft,DRAW_COST} from './rewards';
export const CACHE_KEY = 'zhuyin-cloud-v1';
export const LEGACY_KEY = 'zhuyin-quest-v1';
export type CloudState = {
  code: string;
  passed: string[];
  draws:string[];
  epoch: number | null;
  sync: 'loading' | 'saving' | 'saved' | 'pending';
  storage: boolean;
};
const validCode = (s: string) => /^[a-f0-9]{32}$/.test(s);
const union = (a: string[], b: string[]) => cleanProgress([...a, ...b]);
const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
const browserCache = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
};
export class CloudProgress {
  state: CloudState;
  private stop?: () => void;
  private disposed = false;
  private syncing = false;
  private again = false;
  private switching = false;
  private interval: ReturnType<typeof setInterval>;
  private version = 0;
  constructor(
    private notify: (s: CloudState) => void,
    private backend: ProgressBackend = firestoreBackend,
    private cache: Pick<Storage, 'getItem' | 'setItem'> = browserCache,
  ) {
    let cached: Partial<CloudState> | null = null,
      legacy: unknown = [],
      storage = true;
    try {
      cached = JSON.parse(this.cache.getItem(CACHE_KEY) || 'null');
      legacy = JSON.parse(this.cache.getItem(LEGACY_KEY) || '[]');
    } catch {
      storage = false;
    }
    const usable =
      cached && typeof cached.code === 'string' && validCode(cached.code);
    this.state = {
      code: usable ? cached!.code! : makeCode(),
      passed: cleanProgress(usable ? cached!.passed : legacy),
      draws:cleanDraws(usable?cached!.draws:[]),
      epoch:
        usable && Number.isInteger(cached?.epoch) && Number(cached?.epoch) >= 0
          ? Number(cached?.epoch)
          : null,
      sync: 'loading',
      storage,
    };
    this.emit();
    this.watch();
    void this.sync();
    window.addEventListener('online', this.retry);
    document.addEventListener('visibilitychange', this.focus);
    this.interval = setInterval(() => {
      if (!document.hidden && this.state.sync === 'pending') void this.sync();
    }, 15000);
  }
  private retry = () => {
    void this.sync();
  };
  private focus = () => {
    if (!document.hidden) void this.sync();
  };
  private emit() {
    if (this.disposed) return;
    try {
      this.cache.setItem(
        CACHE_KEY,
        JSON.stringify({
          code: this.state.code,
          passed: this.state.passed,
          draws:this.state.draws,
          epoch: this.state.epoch,
        }),
      );
      this.cache.setItem(LEGACY_KEY, JSON.stringify(this.state.passed));
    } catch {
      this.state.storage = false;
    }
    this.notify({ ...this.state, passed: [...this.state.passed],draws:[...this.state.draws] });
  }
  private watch() {
    this.stop?.();
    const code = this.state.code;
    this.stop = this.backend.watch(
      code,
      (remote) => {
        if (this.disposed || code !== this.state.code || this.switching) return;
        const epoch = remote.epoch,
          passed = remote.passed;
        if (!Number.isInteger(epoch)) return;
        if (this.state.epoch !== null && epoch < this.state.epoch) return;
        this.state.passed =
          this.state.epoch !== null && epoch > this.state.epoch
            ? passed
            : union(passed, this.state.passed);
        this.state.draws=remote.draws;
        this.state.epoch = epoch;
        this.state.sync = same(passed, this.state.passed) ? 'saved' : 'saving';
        this.emit();
        if (!same(passed, this.state.passed)) void this.sync();
      },
      () => {
        if (code === this.state.code) {
          this.state.sync = 'pending';
          this.emit();
        }
      },
    );
  }
  async sync() {
    if (this.disposed || this.switching) return;
    if (this.syncing) {
      this.again = true;
      return;
    }
    this.syncing = true;
    this.again = false;
    const captured = {
      code: this.state.code,
      passed: [...this.state.passed],
      epoch: this.state.epoch,
      version: this.version,
    };
    this.state.sync = 'saving';
    this.emit();
    try {
      const result = await this.backend.merge(captured.code, captured);
      if (this.disposed || captured.version !== this.version) return;
      // A reset observed while this transaction was in flight always wins over its old response.
      if (this.state.epoch !== null && result.epoch < this.state.epoch) return;
      this.state.passed =
        captured.epoch !== null && result.epoch !== captured.epoch
          ? result.passed
          : union(result.passed, this.state.passed);
      this.state.draws=this.state.epoch===result.epoch&&this.state.draws.length>result.draws.length?this.state.draws:result.draws;
      this.state.epoch = result.epoch;
      const dirty = !same(result.passed, this.state.passed);
      this.state.sync = dirty ? 'saving' : 'saved';
      this.again = dirty;
      this.emit();
    } catch {
      if (!this.disposed && captured.version === this.version) {
        this.state.sync = 'pending';
        this.emit();
      }
    } finally {
      this.syncing = false;
      if (this.again && !this.disposed) {
        this.again = false;
        void this.sync();
      }
    }
  }
  pass(id: string) {
    if (this.switching || this.disposed) return;
    this.state.passed = union(this.state.passed, [id]);
    this.state.sync = 'saving';
    this.emit();
    void this.sync();
  }
  async connect(input: string) {
    const code = input.replace(/[\s-]/g, '').toLowerCase();
    if (!validCode(code)) throw new Error('請輸入完整的 32 碼學習代碼。');
    if (this.syncing || this.switching || this.state.sync !== 'saved')
      throw new Error('請先完成目前進度的雲端同步，再切換學習代碼。');
    this.switching = true;
    try {
      const data = await this.backend.read(code);
      if (!data) throw new Error('找不到這個學習代碼，請確認原裝置已同步。');
      this.version++;
      this.state = {
        ...this.state,
        code,
        passed: data.passed,
        draws:data.draws,
        epoch: data.epoch,
        sync: 'saved',
      };
      this.emit();
      this.watch();
    } catch (e) {
      throw new Error(
        e instanceof Error && e.message.startsWith('找不到')
          ? e.message
          : '無法連上雲端，請確認網路後重試。',
      );
    } finally {
      this.switching = false;
    }
  }
  async reset() {
    if (this.syncing || this.switching)
      throw new Error('正在同步，請稍候再重設。');
    this.switching = true;
    this.state.sync = 'saving';
    this.emit();
    try {
      const data = await this.backend.reset(this.state.code);
      this.version++;
      this.state.passed = data.passed;
      this.state.draws=data.draws;
      this.state.epoch = data.epoch;
      this.state.sync = 'saved';
      this.emit();
    } catch {
      this.state.sync = 'pending';
      this.emit();
      throw new Error('重設尚未完成，原進度已保留。請連線後再試。');
    } finally {
      this.switching = false;
    }
  }
  async draw(){
    if(this.disposed||this.syncing||this.switching||this.state.sync!=='saved'||this.state.epoch===null)throw new Error('先把進度同步好，再來扭蛋。');
    if(starsLeft(this.state.passed,this.state.draws)<DRAW_COST)throw new Error('再收集一些星星，就能扭蛋了。');
    const ticket=this.state.draws.length;this.switching=true;this.state.sync='saving';this.emit();
    try{const data=await this.backend.draw(this.state.code,this.state.epoch,ticket,chooseReward());this.state.passed=data.passed;this.state.draws=data.draws;this.state.epoch=data.epoch;this.state.sync='saved';this.emit();return data.draws[ticket];}
    catch{this.state.sync='pending';this.emit();throw new Error('扭蛋結果還沒確認，請重新同步後查看圖鑑。');}
    finally{this.switching=false;}
  }
  dispose() {
    this.disposed = true;
    this.stop?.();
    clearInterval(this.interval);
    window.removeEventListener('online', this.retry);
    document.removeEventListener('visibilitychange', this.focus);
  }
}

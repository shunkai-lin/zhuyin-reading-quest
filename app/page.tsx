'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Volume2,
  ArrowRight,
  LockKeyhole,
  Star,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { levels, isMatch, unlocked, type Item } from '../lib/curriculum';
import { registerProgressTool } from '../lib/webmcp';
import { CloudProgress, type CloudState } from '../lib/cloud-progress';
import RewardsPanel from './rewards-panel';
import PhonicsDemo from './phonics-demo';
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Rec;
  webkitSpeechRecognition?: new () => Rec;
};
function Zhuyin({ value }: { value: string }) {
  const tone = value.match(/[ˊˇˋ˙]/)?.[0] || '';
  return (
    <span className={'zhuyin ' + (tone === '˙' ? 'neutral' : '')}>
      <span>{value.replace(/[ˊˇˋ˙]/g, '')}</span>
      {tone && <span className="tone">{tone}</span>}
    </span>
  );
}
export default function Home() {
  const [demo, setDemo] = useState<Item | null>(null);
  const [focusReading, setFocusReading] = useState(true);
  const [ready, setReady] = useState(false),
    [passed, setPassed] = useState<string[]>([]),
    [level, setLevel] = useState(0),
    [index, setIndex] = useState(0);
  const [status, setStatus] = useState('按下麥克風，換你讀讀看！'),
    [phase, setPhase] = useState<'idle' | 'listening' | 'speaking' | 'success'>(
      'idle',
    );
  const [supported, setSupported] = useState(true),
    [audio, setAudio] = useState(true),
    [storage, setStorage] = useState(true),
    [help, setHelp] = useState(false);
  const [cloud, setCloud] = useState<CloudState | null>(null),
    [codeInput, setCodeInput] = useState(''),
    [cloudMessage, setCloudMessage] = useState(''),
    [cloudBusy, setCloudBusy] = useState(false);
  const store = useRef<CloudProgress | null>(null);
  const rec = useRef<Rec | null>(null),
    token = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = levels[level].items[index],
    count = levels[level].items.filter((x) => passed.includes(x.id)).length;
  const busy = phase === 'listening' || phase === 'speaking' || cloudBusy;
  const progressRef = useRef(passed);
  useEffect(() => {
    progressRef.current = passed;
  }, [passed]);
  useEffect(
    () =>
      registerProgressTool(() => ({
        counts: levels.map(
          (l) =>
            l.items.filter((i) => progressRef.current.includes(i.id)).length,
        ),
        unlockedLevel: unlocked(progressRef.current) + 1,
      })),
    [],
  );
  // Restore the cloud profile and retain the last local cache while connecting.
  // oxlint-disable-next-line react/react-compiler, react-hooks/exhaustive-deps
  useEffect(() => {
    let first = true,
      epoch: number | null = null;
    const controller = new CloudProgress((s) => {
      setCloud(s);
      setPassed(s.passed);
      setStorage(s.storage);
      if (first) {
        const l = unlocked(s.passed);
        setLevel(l);
        setIndex(
          Math.max(
            0,
            levels[l].items.findIndex((x) => !s.passed.includes(x.id)),
          ),
        );
        first = false;
      } else if (epoch !== null && s.epoch !== null && s.epoch > epoch) {
        cancel();
        setLevel(0);
        setIndex(0);
        setStatus('進度已重新開始，我們再讀一次。');
      }
      epoch = s.epoch;
      setReady(true);
    });
    store.current = controller;
    const w = window as SpeechWindow;
    // Browser capability detection occurs once after mounting, outside server rendering.
    // oxlint-disable-next-line react/react-compiler
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    setAudio('speechSynthesis' in window);
    return () => {
      controller.dispose();
      // Cancel the latest active session, deliberately not the value captured at mount.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      token.current++;
      rec.current?.abort();
      window.speechSynthesis?.cancel();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  // React compiler lint cannot hoist this callback; this app uses the standard React runtime.
  // oxlint-disable-next-line react/react-compiler
  function cancel() {
    setDemo(null);
    token.current++;
    rec.current?.abort();
    rec.current = null;
    window.speechSynthesis?.cancel();
    if (timer.current) clearTimeout(timer.current);
    setPhase('idle');
  }
  // The lint compiler currently cannot hoist this event callback; no React compiler is used in this build.
  // oxlint-disable-next-line react/react-compiler
  useEffect(() => {
    const f = () => {
      if (document.hidden) {
        cancel();
        setStatus('休息一下，回來再按麥克風。');
      }
    };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);
  function speak(target: Item, correction = false) {
    if (!correction && Array.from(target.text).length === 1) {
      cancel();
      setDemo(target);
      return;
    }
    speakWhole(target, correction);
  }
  function speakWhole(target: Item, correction = false) {
    cancel();
    if (!('speechSynthesis' in window)) {
      setStatus('這個瀏覽器無法播放，請大人陪你讀注音。');
      return;
    }
    const t = token.current;
    setPhase('speaking');
    setStatus(correction ? '沒關係，聽一遍，再試一次。' : '仔細聽，跟著讀。');
    const u = new SpeechSynthesisUtterance(target.text);
    u.lang = 'zh-TW';
    u.rate = 0.65;
    const voices = window.speechSynthesis.getVoices();
    u.voice =
      voices.find((v) => /^zh[-_]TW/i.test(v.lang)) ||
      voices.find((v) => /^zh/i.test(v.lang)) ||
      null;
    const finish = () => {
      if (t !== token.current) return;
      setPhase('idle');
      setStatus('換你讀讀看！');
      if (timer.current) clearTimeout(timer.current);
    };
    u.onend = finish;
    u.onerror = () => {
      finish();
      setStatus('聲音沒有播出，請再按「聽示範」。');
    };
    window.speechSynthesis.speak(u);
    timer.current = setTimeout(() => {
      if (t === token.current) {
        cancel();
        setStatus('請再按「聽示範」播放一次。');
      }
    }, 20000);
  }
  function listen() {
    cancel();
    const w = window as SpeechWindow,
      Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) {
      setStatus('請用 iPad 的 Safari 開啟，並請大人確認語音設定。');
      return;
    }
    const r: Rec = new Constructor();
    rec.current = r;
    const t = token.current;
    let result = false;
    r.lang = 'zh-TW';
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.onresult = (e) => {
      if (t !== token.current || result) return;
      const last = e.results[e.results.length - 1];
      if (!last.isFinal) return;
      result = true;
      const heard = Array.from(last).map((x) => x.transcript);
      r.abort();
      if (timer.current) clearTimeout(timer.current);
      if (heard.some((x) => isMatch(item, x))) {
        store.current?.pass(item.id);
        setPhase('success');
        setStatus('讀對了！你真棒！');
      } else {
        speak(item, true);
      }
    };
    r.onerror = (e) => {
      if (t !== token.current || result) return;
      result = true;
      setPhase('idle');
      if (timer.current) clearTimeout(timer.current);
      setStatus(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? '請大人允許麥克風與語音辨識，再試一次。'
          : e.error === 'network'
            ? '網路暫時沒有連上，連線後再試一次。'
            : '沒有聽清楚，再按一次麥克風。',
      );
    };
    r.onend = () => {
      if (t !== token.current || result) return;
      setPhase('idle');
      setStatus('沒有聽清楚，再按一次麥克風。');
      if (timer.current) clearTimeout(timer.current);
    };
    setPhase('listening');
    setStatus('我在聽，請大聲讀出來。');
    try {
      r.start();
      timer.current = setTimeout(() => {
        if (t === token.current) {
          cancel();
          setStatus('沒有聽清楚，再試一次。');
        }
      }, 15000);
    } catch {
      cancel();
      setStatus('麥克風還沒準備好，請再試一次。');
    }
  }
  function move(l: number, i: number) {
    cancel();
    setLevel(l);
    setIndex(i);
    setStatus('按下麥克風，換你讀讀看！');
  }
  function next() {
    if (count === levels[level].items.length && level < 2) {
      move(
        level + 1,
        Math.max(
          0,
          levels[level + 1].items.findIndex((x) => !passed.includes(x.id)),
        ),
      );
      return;
    }
    const list = levels[level].items;
    for (let j = 1; j <= list.length; j++) {
      const n = (index + j) % list.length;
      if (!passed.includes(list[n].id)) {
        move(level, n);
        return;
      }
    }
    move(level, (index + 1) % list.length);
  }
  async function connect() {
    if (!store.current) return;
    if (!window.confirm('切換後會顯示這個學習代碼的進度。確定接續嗎？')) return;
    setCloudBusy(true);
    setCloudMessage('正在讀取雲端進度…');
    try {
      await store.current.connect(codeInput);
      const p = store.current.state.passed,
        l = unlocked(p);
      move(
        l,
        Math.max(
          0,
          levels[l].items.findIndex((x) => !p.includes(x.id)),
        ),
      );
      setCodeInput('');
      setCloudMessage('已接續雲端進度。');
    } catch (e) {
      setCloudMessage((e as Error).message);
    } finally {
      setCloudBusy(false);
    }
  }
  async function reset() {
    if (
      !store.current ||
      !window.confirm(
        '確定清除這個學習代碼的成績、星星與收藏圖鑑？所有使用同一代碼的裝置都會重新開始。',
      )
    )
      return;
    setCloudBusy(true);
    try {
      await store.current.reset();
      move(0, 0);
      setCloudMessage('雲端進度已重新開始。');
    } catch (e) {
      setCloudMessage((e as Error).message);
    } finally {
      setCloudBusy(false);
    }
  }
  return (
    <main className={focusReading ? 'focus-reading' : ''}>
      {demo && <PhonicsDemo key={demo.id} item={demo} onClose={() => setDemo(null)}
        onWhole={() => { setDemo(null); speakWhole(demo); }} />}
      <header>
        <div className="brand">
          <span className="brand-icon">
            <BookOpen size={28} />
          </span>
          <div>
            <h1>注音闖關樂</h1>
            <p>每天讀一點，進步一點點</p>
          </div>
        </div>
        <button
          className="help"
          onClick={() => setHelp(!help)}
          aria-expanded={help}
        >
          給大人看
        </button>
      </header>
      <div
        className={
          'cloud-status ' + (cloud?.sync === 'pending' ? 'pending' : '')
        }
      >
        <output aria-live="polite">
          {cloud?.sync === 'saved'
            ? '✓ 雲端已同步'
            : cloud?.sync === 'pending'
              ? '進度暫存在這台裝置，連線後再同步'
              : cloud?.sync === 'saving'
                ? '正在同步雲端進度…'
                : '正在連接雲端…'}
        </output>
        {cloud?.sync === 'pending' && (
          <button onClick={() => void store.current?.sync()}>重新同步</button>
        )}
      </div>
      <RewardsPanel cloud={cloud} busy={busy} onDraw={async()=>{if(!store.current)throw new Error('雲端還沒準備好，請稍候。');setCloudBusy(true);try{return await store.current.draw();}finally{setCloudBusy(false);}}}/>
      <nav aria-label="學習關卡">
        {levels.map((l, n) => (
          <button
            key={l.name}
            className={'level ' + (level === n ? 'active' : '')}
            disabled={!ready || n > unlocked(passed) || busy}
            onClick={() =>
              move(
                n,
                Math.max(
                  0,
                  l.items.findIndex((x) => !passed.includes(x.id)),
                ),
              )
            }
          >
            <span className="level-num">
              {n > unlocked(passed) ? <LockKeyhole size={24} /> : n + 1}
            </span>
            <span>
              {l.name}
              <small>
                {n === 0 ? '50 個字' : n === 1 ? '50 個詞' : '20 個句子'}
              </small>
            </span>
          </button>
        ))}
      </nav>
      <section className="workspace">
        <aside className="journey">
          <span className="eyebrow">我的小小成就</span>
          <div className="star-disc">
            <Star size={66} fill="currentColor" />
          </div>
          <strong>
            {count}
            <span> / {levels[level].items.length}</span>
          </strong>
          <p>
            {count === levels[level].items.length
              ? '這一級完成了！'
              : '每讀對一題，就前進一步。'}
          </p>
          <progress
            value={count}
            max={levels[level].items.length}
            aria-label="本級通過進度"
          />
          <div className="stamps" aria-label={`已通過 ${count} 題`}>
            {Array.from({ length: 10 }, (_, n) => (
              <span
                key={n}
                className={
                  count > n * (levels[level].items.length / 10) ? 'earned' : ''
                }
              >
                ★
              </span>
            ))}
          </div>
          <p className="encourage">
            慢慢讀，
            <br />
            你一定做得到。
          </p>
        </aside>
        <article className={'practice ' + (phase === 'success' ? 'won' : '')}>
          <div className="card-top">
            <button className="reading-view" onClick={() => setFocusReading(!focusReading)}>
              {focusReading ? '關卡與獎勵' : '放大練習'}
            </button>
            <span>第 {index + 1} 題</span>
            <span>
              {passed.includes(item.id)
                ? '✓ 已經會讀了'
                : level === 0
                  ? '看字・讀注音'
                  : level === 1
                    ? '兩個字一起讀'
                    : '一句話慢慢讀'}
            </span>
          </div>
          <div
            className={'reading level-' + level}
            aria-label={`${item.text}，${item.zhuyin.join(' ')}`}
          >
            {Array.from(item.text).map((c, n) => (
              <span className="syllable" key={n}>
                <span className="hanzi">{c}</span>
                {item.zhuyin[n] && <Zhuyin value={item.zhuyin[n]} />}
              </span>
            ))}
          </div>
          {phase === 'success' && (
            <div className="big-circle" aria-label="答對，大圈圈">
              ○
            </div>
          )}
          <output className="feedback" aria-live="polite">
            {status}
          </output>
          <div className="actions">
            <button
              className="secondary"
              disabled={!ready || busy || !audio}
              onClick={() => speak(item)}
            >
              <Volume2 />
              聽示範
            </button>
            {phase === 'success' ? (
              <button className="primary" disabled={cloudBusy} onClick={next}>
                {count === levels[level].items.length
                  ? level === 2
                    ? '再練一次'
                    : '前往下一級'
                  : '下一題'}
                <ArrowRight />
              </button>
            ) : (
              <button
                className={
                  'primary ' + (phase === 'listening' ? 'listening' : '')
                }
                disabled={
                  !ready || phase === 'speaking' || !supported || cloudBusy
                }
                onClick={
                  phase === 'listening'
                    ? () => {
                        cancel();
                        setStatus('準備好，再按一次。');
                      }
                    : listen
                }
              >
                <Mic />
                {phase === 'listening' ? '停止聆聽' : '換我讀'}
              </button>
            )}
          </div>
          {!supported && (
            <p className="notice">
              這個瀏覽器沒有語音辨識。請改用 iPad Safari，仍可按「聽示範」練習。
            </p>
          )}
          {!storage && (
            <p className="notice">目前無法儲存進度，關閉網頁前請大人協助。</p>
          )}
        </article>
      </section>
      <footer>
        先聽、再讀，一次學會一小步。<span>一年級上學期・注音練習</span>
      </footer>
      {help && (
        <section className="parents">
          <h2>陪孩子一起練習</h2>
          <section className="cloud-panel">
            <h3>我的學習代碼</h3>
            <p>在另一台裝置輸入相同代碼，就能接著讀。</p>
            <code className="learning-code">
              {cloud?.code.match(/.{1,4}/g)?.join('-') || '連接中…'}
            </code>
            <button
              className="secondary"
              disabled={!cloud}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(cloud!.code);
                  setCloudMessage('學習代碼已複製，請妥善保留。');
                } catch {
                  setCloudMessage('請長按上方代碼，選取並複製。');
                }
              }}
            >
              複製學習代碼
            </button>
            <label htmlFor="learning-code">接續另一台裝置的進度</label>
            <input
              id="learning-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="輸入或貼上學習代碼"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={64}
            />
            <button
              className="secondary"
              disabled={busy || !codeInput.trim() || cloud?.sync !== 'saved'}
              onClick={() => void connect()}
            >
              接續雲端進度
            </button>
            <output aria-live="polite">{cloudMessage}</output>
          </section>
          <p>
            請用 iPad Safari
            開啟此網站，允許麥克風與語音辨識；若無法使用，請確認
            Siri／聽寫設定與網路。每題首次讀對才計分，50 字 → 50 詞 → 20
            句。進度儲存在網路資料庫，這台裝置另留暫存。請先保留學習代碼，換裝置或清除瀏覽器資料後，輸入代碼即可接續。持有代碼的人可以讀取或重設這份進度，請勿公開分享。
          </p>
          <p>
            系統以語音辨識文字輔助判讀，無法精準評量聲母、韻母與聲調。辨識不同時會播放示範，不代表孩子一定讀錯。網站不錄存聲音；瀏覽器語音服務可能傳送聲音至其服務供應商處理。
          </p>
          <p>
            生字來自教育部教育百科標示的 115
            學年度翰林一上清單；版本以該清單為準，尚未逐頁對照紙本課本。雙字詞含課表詞與生字延伸詞，句子為自編練習，非課文原句。注音採台灣注音符號，示範為整字／詞朗讀。
          </p>
          <a
            href="https://pedia.cloud.edu.tw/Bookmark/Textword?category=國語&degree=1&press=翰林版&year=115_1"
            target="_blank"
            rel="noreferrer"
          >
            查看生字來源 ↗
          </a>
          <details>
            <summary>查看本級題目</summary>
            <div className="word-list">
              {levels[level].items.map((x) => (
                <span key={x.id}>
                  {x.text} · {x.source === 'textbook' ? '課表' : '延伸'}
                </span>
              ))}
            </div>
          </details>
          <button
            className="reset"
            disabled={busy || cloud?.sync !== 'saved'}
            onClick={() => void reset()}
          >
            <RotateCcw />
            重新開始全部關卡
          </button>
        </section>
      )}
    </main>
  );
}

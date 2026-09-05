import { useEffect, useRef, useState } from 'react';
import type { Item } from '../lib/curriculum';
import { readingSteps } from '../lib/phonics';
import media from '../lib/phonics-media.json';

export default function PhonicsDemo({ item, onClose, onWhole }: {
  item: Item; onClose: () => void; onWhole: () => void;
}) {
  const steps = readingSteps(item).filter(s => s.kind !== 'word');
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const step = steps[index];
  const src = (media as Record<string, string>)[step.symbols];
  useEffect(() => {
    dialog.current?.showModal();
    const element = video.current;
    return () => { element?.pause(); };
  }, []);
  useEffect(() => {
    const element = video.current;
    let active = true;
    const play = element?.play();
    play?.catch(() => { if (active) setMessage('按影片的播放鍵，聽這個音。'); });
    return () => { active = false; element?.pause(); };
  }, [index]);
  function next() {
    if (index + 1 < steps.length) { setMessage(''); setIndex(index + 1); }
    else onWhole();
  }
  return <dialog ref={dialog} className="phonics-dialog" onCancel={onClose} onClose={onClose}>
    <div className="phonics-heading"><h2>先分開，再合起來讀</h2><button onClick={onClose}>關閉示範</button></div>
    <p className="phonics-current">{step.label} <strong>{step.symbols}</strong></p>
    <div className="phonics-steps" aria-label="拆音順序">
      {steps.map((s, n) => <button key={n} aria-current={n === index ? 'step' : undefined}
        onClick={() => { setMessage(''); setIndex(n); }}>{s.symbols}</button>)}
      <button onClick={onWhole}>合音：{item.text} {item.zhuyin[0]}</button>
    </div>
    <video ref={video} src={src} controls playsInline preload="metadata"
      onEnded={next} onPlay={() => setMessage('')}
      onError={() => setMessage('影片暫時無法播放，可以開啟翰林原站重試。')}>
      <track kind="captions" srcLang="zh-TW" label={step.symbols}
        src={'data:text/vtt;charset=utf-8,' + encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 01:00:00.000\n${step.label}：${step.symbols}\n`)} />
    </video>
    <output>{message || '聽完會自動接著播放下一個音，最後讀完整單字。'}</output>
    <div className="phonics-bottom"><a href="https://kidsvideo1.hle.com.tw/" target="_blank" rel="noreferrer">示範來源：翰林注音符號發音網</a>
      <button onClick={next}>{index + 1 < steps.length ? '下一個音' : '合起來讀'}</button></div>
  </dialog>;
}

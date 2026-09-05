/* oxlint-disable next/no-img-element -- This static Vite app uses public PNGs without a Next image server. */
import {useEffect,useRef,useState} from 'react';
import {Gift,BookOpen,Star,X} from 'lucide-react';
import {DRAW_COST,REWARDS,collectionOf,rewardById,starsLeft} from '../lib/rewards';
import type {CloudState} from '../lib/cloud-progress';
function RewardImage({id}:{id:string}){const [failed,setFailed]=useState(false),reward=rewardById(id)!;return failed?<span className="reward-fallback" aria-label="圖片暫時沒有載入">🎁</span>:<img src={reward.img} alt={reward.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;}
export default function RewardsPanel({cloud,busy,onDraw}:{cloud:CloudState|null;busy:boolean;onDraw:()=>Promise<string>}){
 const [show,setShow]=useState(false),[drawing,setDrawing]=useState(false),[result,setResult]=useState<string|null>(null),[message,setMessage]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),balance=starsLeft(cloud?.passed||[],cloud?.draws||[]),owned=collectionOf(cloud?.draws||[]);
 useEffect(()=>{if(result&&!dialog.current?.open)dialog.current?.showModal();if(!result&&dialog.current?.open)dialog.current.close();},[result]);
 async function draw(){if(drawing)return;setDrawing(true);setMessage('扭蛋轉轉轉…');try{const id=await onDraw();setResult(id);setMessage('已收進你的圖鑑！');}catch(e){setMessage((e as Error).message);}finally{setDrawing(false);}}
 const resultItem=result?rewardById(result):undefined,resultLevel=owned.find(x=>x.id===result)?.level||1;
 return <section className="rewards" aria-label="星星獎勵">
  <div className="reward-bar"><strong><Star fill="currentColor"/>{balance} 顆星</strong><button className="draw-button" onClick={()=>void draw()} disabled={!cloud||busy||drawing||cloud.sync!=='saved'||balance<DRAW_COST}><Gift/>{drawing?'扭蛋轉轉轉…':'10 顆星・扭蛋一次'}</button><button className="collection-button" onClick={()=>setShow(!show)} aria-expanded={show}><BookOpen/>我的圖鑑（{owned.length}）</button></div>
  <p className="reward-hint">{balance>=DRAW_COST?'可以扭蛋囉！':'再收集 '+(DRAW_COST-balance)+' 顆星，就能扭蛋。'} 新通過一題得 1 顆星。</p>
  {message&&<output className="reward-message" aria-live="polite">{message}</output>}
  {show&&<div className="collection"><h2>我的寶可夢圖鑑</h2><p>收集 {owned.length}／{REWARDS.length} 種・共 {cloud?.draws.length||0} 次扭蛋。重複抽到，角色就升一級！</p>{!owned.length&&<p>每學會 10 題，就有一位新夥伴的機會。</p>}<div className="collection-grid">{REWARDS.map(r=>{const got=owned.find(x=>x.id===r.id);return <article className={'reward-card '+(!got?'unowned':'')} key={r.id}>{got?<><RewardImage id={r.id}/><strong>{r.name}</strong><span>Lv.{got.level}</span></>:<><span className="mystery" aria-hidden="true">？</span><strong>等你來發現</strong></>}</article>;})}</div></div>}
  <dialog ref={dialog} className="reward-dialog" onClose={()=>setResult(null)}><button className="dialog-close" aria-label="關閉獎勵" onClick={()=>setResult(null)}><X/></button>{resultItem&&<><p>{resultLevel>1?'角色升級了！':'認識新夥伴！'}</p><RewardImage key={resultItem.id} id={resultItem.id}/><h2>{resultItem.name}</h2><strong>{resultLevel>1?`升到 Lv.${resultLevel}！`:'已加入我的圖鑑'}</strong><button className="draw-button" onClick={()=>setResult(null)}>收下，繼續讀！</button></>}</dialog>
 </section>;
}

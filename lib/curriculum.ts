import data from './curriculum.json';
export type Item={id:string;text:string;zhuyin:string[];source:string};
export const levels: {name:string;items:Item[]}[]=data;
export function normalize(s:string){return s.normalize('NFKC').replace(/[\s\p{P}]/gu,'');}
const homophones:Record<string,string>={'妳':'你','祢':'你','祂':'他','她':'他','牠':'他','祂們':'他們','再':'在','座':'坐','早':'早','田':'田'};
export function isMatch(item:Item,heard:string){const n=normalize(heard);return n===item.text|| (item.text.length===1&&homophones[n]===item.text);}
export function cleanProgress(p:unknown):string[]{const valid=new Set(levels.flatMap(l=>l.items.map(i=>i.id)));return Array.isArray(p)?[...new Set(p.filter((x):x is string=>typeof x==='string'&&valid.has(x)))]:[];}
export function unlocked(p:string[]){return levels[0].items.every(x=>p.includes(x.id))?(levels[1].items.every(x=>p.includes(x.id))?2:1):0;}

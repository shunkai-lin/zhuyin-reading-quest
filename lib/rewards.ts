import pool from './reward-pool.json';
export const REWARDS=pool;
export const DRAW_COST=10;
export const rewardById=(id:string)=>REWARDS.find(r=>r.id===id);
export const cleanDraws=(value:unknown):string[]=>Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'&&Boolean(rewardById(x))).slice(0,12):[];
export const starsLeft=(passed:string[],draws:string[])=>Math.max(0,passed.length-draws.length*DRAW_COST);
export function chooseReward(){const limit=Math.floor(2**32/REWARDS.length)*REWARDS.length;let n:number;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=limit);return REWARDS[n%REWARDS.length].id;}
export function collectionOf(draws:string[]){const counts=new Map<string,number>();draws.forEach(id=>counts.set(id,(counts.get(id)||0)+1));return [...counts].map(([id,level])=>({...rewardById(id)!,level}));}

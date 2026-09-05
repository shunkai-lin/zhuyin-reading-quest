// Test-only backend. Selected solely by vite.rewards-test.config.ts; never used in production.
import type {ProgressBackend,RemoteProgress} from '../lib/progress-backend';
const data=new Map<string,RemoteProgress>();
export const firestoreBackend:ProgressBackend={
 async read(code){return data.get(code)||null;},
 async merge(code,local){const old=data.get(code);const value=old?{...old,passed:old.epoch!==local.epoch&&local.epoch!==null?old.passed:[...new Set([...old.passed,...local.passed])]}:{passed:local.passed,draws:[],epoch:0};data.set(code,value);return value;},
 async reset(code){const value={passed:[],draws:[],epoch:data.get(code)!.epoch+1};data.set(code,value);return value;},
 async draw(code,epoch,ticket){const old=data.get(code)!;if(old.epoch!==epoch||old.passed.length<(ticket+1)*10)throw Error('Not enough stars');if(old.draws.length>ticket)return old;const value={...old,draws:[...old.draws,'pokemon-25']};data.set(code,value);return value;},
 watch(){return()=>{};},
};

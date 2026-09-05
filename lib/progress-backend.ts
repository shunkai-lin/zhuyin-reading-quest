import {
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { cleanProgress } from './curriculum';
import { cleanDraws, rewardById, DRAW_COST } from './rewards';
export type RemoteProgress = { passed: string[]; epoch: number; draws:string[] };
export interface ProgressBackend {
  read(code: string): Promise<RemoteProgress | null>;
  merge(
    code: string,
    local: { passed: string[]; epoch: number | null },
  ): Promise<RemoteProgress>;
  reset(code: string): Promise<RemoteProgress>;
  draw(code:string,epoch:number,ticket:number,reward:string):Promise<RemoteProgress>;
  watch(
    code: string,
    receive: (remote: RemoteProgress) => void,
    failed: () => void,
  ): () => void;
}
const ref = (code: string) => doc(db, 'zhuyinProgress', code);
const parse = (data: Record<string, unknown>): RemoteProgress => {
  if (
    !Number.isInteger(data.epoch) ||
    Number(data.epoch) < 0 ||
    data.version !== 1 ||
    !Array.isArray(data.passed)
  )
    throw new Error('Invalid cloud progress');
  return { passed: cleanProgress(data.passed), epoch: Number(data.epoch),draws:cleanDraws(data.draws) };
};
export const firestoreBackend: ProgressBackend = {
  async read(code) {
    const snap = await getDocFromServer(ref(code));
    return snap.exists() ? parse(snap.data()) : null;
  },
  async merge(code, local) {
    return runTransaction(db, async (tx) => {
      const r = ref(code),
        snap = await tx.get(r);
      if (!snap.exists()) {
        if (local.epoch !== null) throw new Error('Remote profile missing');
        tx.set(r, {
          passed: local.passed,
          draws:[],
          epoch: 0,
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return { passed: local.passed, epoch: 0,draws:[] };
      }
      const remote = parse(snap.data());
      const passed =
        local.epoch !== null && local.epoch !== remote.epoch
          ? remote.passed
          : cleanProgress([...remote.passed, ...local.passed]);
      if (passed.length !== remote.passed.length)
        tx.update(r, { passed, updatedAt: serverTimestamp() });
      return { passed, epoch: remote.epoch,draws:remote.draws };
    });
  },
  async reset(code) {
    return runTransaction(db, async (tx) => {
      const r = ref(code),
        snap = await tx.get(r);
      if (!snap.exists()) throw new Error('Missing profile');
      const epoch = parse(snap.data()).epoch + 1;
      tx.update(r, { passed: [], draws:[],epoch, updatedAt: serverTimestamp() });
      return { passed: [], draws:[],epoch };
    });
  },
  async draw(code,epoch,ticket,reward){
    if(!rewardById(reward)||!Number.isInteger(ticket)||ticket<0)throw new Error('Invalid reward request');
    return runTransaction(db,async tx=>{const r=ref(code),snap=await tx.get(r);if(!snap.exists())throw new Error('Missing profile');const old=parse(snap.data());if(old.epoch!==epoch)throw new Error('Progress was reset');
      // The ticket index is an idempotency key: retries and simultaneous devices receive the same committed reward.
      if(old.draws.length>ticket)return old;
      if(old.draws.length!==ticket||old.passed.length<(ticket+1)*DRAW_COST)throw new Error('Not enough stars');
      const draws=[...old.draws,reward];tx.update(r,{draws,updatedAt:serverTimestamp()});return{...old,draws};
    });
  },
  watch(code, receive, failed) {
    return onSnapshot(
      ref(code),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.fromCache || !snap.exists()) return;
        try {
          receive(parse(snap.data()));
        } catch {
          failed();
        }
      },
      failed,
    );
  },
};

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Firebase web configuration is public. Access is restricted by firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyAQll2Xvf321l3c9WYQehXFinMXY6u8LGc',
  authDomain: 'classroom-gacha-rewards.firebaseapp.com',
  projectId: 'classroom-gacha-rewards',
};
export const db = getFirestore(
  initializeApp(firebaseConfig, 'zhuyin-reading-quest'),
);

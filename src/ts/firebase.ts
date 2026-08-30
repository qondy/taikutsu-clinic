import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// NOTE: Firebase の Web 設定は秘匿情報ではなく、実質的な防御は firestore.rules 側で行う。
// （他のミニアプリと同様に、この値はコミットして良い）
const firebaseConfig = {
  apiKey: 'AIzaSyC4W4OYteUD4ibZqGy1cVXEdEGiUBkoRDA',
  authDomain: 'taikutsu-clinic.firebaseapp.com',
  projectId: 'taikutsu-clinic',
  storageBucket: 'taikutsu-clinic.firebasestorage.app',
  messagingSenderId: '827392225999',
  appId: '1:827392225999:web:9b5e440aad9c0214417dba',
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

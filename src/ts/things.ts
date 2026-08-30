import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { Thing, ThingCategory, ThingStatus } from './types';

export const THING_STATUSES: { key: ThingStatus; label: string }[] = [
  { key: 'active', label: '継続中' },
  { key: 'revived', label: '復活した' },
  { key: 'closed', label: '一区切りついた' },
];

export function statusLabel(key: string): string {
  return THING_STATUSES.find((s) => s.key === key)?.label ?? '継続中';
}

function toThing(id: string, data: DocumentData): Thing {
  const rawHeat = typeof data.heat === 'number' ? data.heat : 3;
  return {
    id,
    name: data.name ?? '',
    category: (data.category ?? 'other') as ThingCategory,
    startedYm: data.startedYm ?? null,
    heat: Math.min(5, Math.max(1, Math.round(rawHeat))),
    note: data.note ?? '',
    status: (data.status ?? 'active') as ThingStatus,
    archived: data.archived ?? false,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function subscribeThings(uid: string, callback: (things: Thing[]) => void): () => void {
  const q = query(collection(db, 'users', uid, 'things'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => toThing(d.id, d.data())));
  });
}

export function createThing(
  uid: string,
  input: { name: string; category: ThingCategory; startedYm: string | null; heat: number; note: string },
): Promise<string> {
  return addDoc(collection(db, 'users', uid, 'things'), {
    name: input.name,
    category: input.category,
    startedYm: input.startedYm,
    heat: input.heat,
    note: input.note,
    status: 'active' as ThingStatus,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => ref.id);
}

export function updateThing(
  uid: string,
  thingId: string,
  patch: Partial<Pick<Thing, 'name' | 'category' | 'startedYm' | 'heat' | 'note' | 'status' | 'archived'>>,
): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'things', thingId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export function deleteThing(uid: string, thingId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'things', thingId));
}

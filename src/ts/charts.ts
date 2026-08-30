import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { Chart, PrescriptionItem, PrescriptionKind } from './types';
import { Suggestion } from './prescriber';

function toChart(id: string, data: DocumentData): Chart {
  return {
    id,
    thingId: data.thingId ?? '',
    causeTags: Array.isArray(data.causeTags) ? data.causeTags : [],
    note: data.note ?? '',
    items: Array.isArray(data.items)
      ? data.items.map((a: DocumentData): PrescriptionItem => ({
          text: a.text ?? '',
          reason: a.reason ?? '',
          kind: (a.kind === 'newfun' ? 'newfun' : 'knowhow') as PrescriptionKind,
          done: a.done ?? false,
        }))
      : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function subscribeCharts(uid: string, callback: (charts: Chart[]) => void): () => void {
  const q = query(collection(db, 'users', uid, 'charts'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => toChart(d.id, d.data())));
  });
}

export function createChart(
  uid: string,
  input: { thingId: string; causeTags: string[]; note: string },
  suggestions: Suggestion[],
): Promise<string> {
  const items: PrescriptionItem[] = suggestions.map((s) => ({
    text: s.text,
    reason: s.reason,
    kind: s.kind,
    done: false,
  }));
  return addDoc(collection(db, 'users', uid, 'charts'), {
    thingId: input.thingId,
    causeTags: input.causeTags,
    note: input.note,
    items,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => ref.id);
}

export function updateChartItems(uid: string, chartId: string, items: PrescriptionItem[]): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'charts', chartId), {
    items,
    updatedAt: serverTimestamp(),
  });
}

export function deleteChart(uid: string, chartId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'charts', chartId));
}

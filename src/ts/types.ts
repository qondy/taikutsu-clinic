import { Timestamp } from 'firebase/firestore';

export type ThingCategory =
  | 'hobby'
  | 'exercise'
  | 'study'
  | 'work'
  | 'habit'
  | 'community'
  | 'collection'
  | 'other';

export type ThingStatus = 'active' | 'revived' | 'closed';

export interface Thing {
  id: string;
  name: string;
  category: ThingCategory;
  startedYm: string | null; // 'YYYY-MM'
  heat: number; // 1..5 いまの熱量
  note: string;
  status: ThingStatus;
  archived: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type PrescriptionKind = 'knowhow' | 'newfun';

export interface PrescriptionItem {
  text: string;
  reason: string;
  kind: PrescriptionKind;
  done: boolean;
}

/** 診断カルテ（1回の飽き診断とその処方） */
export interface Chart {
  id: string;
  thingId: string;
  causeTags: string[];
  note: string;
  items: PrescriptionItem[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

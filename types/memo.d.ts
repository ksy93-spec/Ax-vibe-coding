// 큰 글씨 메모장의 저장 모양과 src/core.js API. 참고용입니다(빌드에 쓰지 않음).
// localStorage 'big-memo.v1' 과 백업 .json 파일이 이 State 모양입니다.

export interface Memo {
  id: string;
  text: string;
  created: number;          // ms
  updated: number;          // ms
  pinned: boolean;          // 목록 맨 위에 고정
  deletedAt: number | null; // 지운 시각. 30일 지나면 없어짐
}

export interface Reminder {
  id: string;
  time: string;    // 'HH:MM' 24시간
  text: string;
  daily: boolean;  // 매일 반복. false 면 한 번 울리고 목록에서 빠짐
  on: boolean;
  next: number;    // 다음에 울릴 시각(ms). 'N분 뒤' 알림은 초 단위까지 정확
}

export interface TalkLine { at: number; text: string; }

export interface Settings {
  size: number;    // core.SIZES 의 인덱스 (0~5)
  theme: 'light' | 'dark' | 'cream';
  bold: boolean;
  sound: boolean;  // 알림 때 소리도 낼지
}

export interface State {
  version: 1;
  memos: Memo[];
  currentId: string | null;
  settings: Settings;
  phrases: string[];   // 자주 쓰는 말
  reminders: Reminder[];
  talk: TalkLine[];    // 최근 core.TALK_KEEP 개
}

/** window.App.core (Node 에서는 require('./src/core.js')) */
export interface Core {
  SIZES: number[];
  DEFAULT_SIZE: number;
  THEMES: { id: Settings['theme']; name: string }[];
  DEFAULT_PHRASES: string[];
  TRASH_KEEP_DAYS: number;
  TALK_KEEP: number;
  uid(now: number, rand: number): string;
  dateKey(d: Date): string;                       // 'YYYY-MM-DD'
  timeText(d: Date): string;                      // '오후 3:24'
  hhmmText(hhmm: string): string;                 // '15:24' -> '오후 3:24'
  clockText(d: Date): { date: string; time: string };
  stampText(ts: number, now: Date): string;       // '오늘 오후 3:24' / '어제 …' / '3월 3일' / '2025년 3월 3일'
  titleOf(text: string, max?: number): string;
  sortMemos(memos: Memo[]): Memo[];
  searchMemos(memos: Memo[], query: string): Memo[];
  purgeTrash(memos: Memo[], now: Date): Memo[];
  parseHHMM(s: string): { h: number; m: number } | null;
  nextOccurrence(hhmm: string, now: Date): number | null;
  dueReminders(reminders: Reminder[], now: Date): Reminder[];
  afterFired(r: Reminder, now: Date): Reminder | null;
  isLate(r: Reminder, now: Date): boolean;
  toHHMM(ampm: 'am' | 'pm', h12: string | number, minute: string | number): string;
  afterMinutes(min: number, now: Date): { time: string; next: number };
  emptyState(now: Date, rand: number): State;
  normalize(raw: unknown, now: Date, rand: number): State;  // 모양이 다르면 Error('메모장 백업 파일이 아닙니다.')
  mergeBackup(state: State, backup: State): { added: number; replaced: number };
  talkToText(talk: TalkLine[], now: Date): string;
  fileStamp(d: Date): string;                     // '20261008-1524'
}

// Date utilities — timezone-safe using Date.UTC with local date components

export function getLocalDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function getDayIndex(date: Date = new Date()): number {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  // Use Date.UTC to get a stable epoch independent of timezone shifts
  const epochMs = Date.UTC(y, m, d);
  // Days since 1970-01-01
  return Math.floor(epochMs / (1000 * 60 * 60 * 24));
}

export function daysBetween(dayKey1: string, dayKey2: string): number {
  const [y1, m1, d1] = dayKey1.split('-').map(Number);
  const [y2, m2, d2] = dayKey2.split('-').map(Number);
  const ms1 = Date.UTC(y1, m1 - 1, d1);
  const ms2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((ms2 - ms1) / (1000 * 60 * 60 * 24));
}

export function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000;
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${weekdays[dt.getUTCDay()]})`;
}

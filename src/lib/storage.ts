// LocalStorage-based state persistence

import type { AppState, LeitnerEntry } from '@/types';
import { getLocalDayKey } from '@/lib/dateUtils';

const STORAGE_KEY = 'toeic_vocab_state_v1';

const LEITNER_INTERVALS = [1, 3, 7, 14, 30]; // Box 1~5

function todayEpochMs(): number {
  const today = getLocalDayKey();
  const [y, m, d] = today.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function defaultState(): AppState {
  return {
    progress: {},
    leitner: {},
    streak: 0,
    lastStreakDay: null,
    bestStreak: 0,
    quizResults: [],
    wrongNote: [],
    completedDays: [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    // Merge with defaults for forward-compat
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function getLeitnerInterval(box: number): number {
  const idx = Math.min(Math.max(box - 1, 0), LEITNER_INTERVALS.length - 1);
  return LEITNER_INTERVALS[idx];
}

export function createLeitnerEntry(wordId: string): LeitnerEntry {
  return {
    wordId,
    box: 1,
    nextReview: todayEpochMs() + getLeitnerInterval(1) * 24 * 60 * 60 * 1000,
    lastReviewed: null,
    correctCount: 0,
    wrongCount: 0,
    pinned: false,
  };
}

export function promoteLeitner(entry: LeitnerEntry): LeitnerEntry {
  const newBox = Math.min(entry.box + 1, 5);
  const interval = getLeitnerInterval(newBox);
  return {
    ...entry,
    box: newBox,
    nextReview: todayEpochMs() + interval * 24 * 60 * 60 * 1000,
    lastReviewed: Date.now(),
    correctCount: entry.correctCount + 1,
  };
}

export function resetLeitner(entry: LeitnerEntry): LeitnerEntry {
  return {
    ...entry,
    box: 1,
    nextReview: todayEpochMs() + 1 * 24 * 60 * 60 * 1000,
    lastReviewed: Date.now(),
    wrongCount: entry.wrongCount + 1,
  };
}

export function isDue(entry: LeitnerEntry): boolean {
  return entry.nextReview <= Date.now();
}

export function getDueWordIds(state: AppState): string[] {
  return Object.values(state.leitner)
    .filter((e) => isDue(e))
    .map((e) => e.wordId);
}



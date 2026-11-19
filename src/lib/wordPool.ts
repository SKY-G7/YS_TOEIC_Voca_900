import type { Word } from '@/types';

import '@/data/words_001';

export function getAllWords(): Word[] {
  const batches = window.WORD_BATCHES || [];
  const merged: Word[] = [];
  for (const batch of batches) {
    for (const w of batch) {
      merged.push(w);
    }
  }
  // Sort by id for stable ordering
  merged.sort((a, b) => a.id.localeCompare(b.id));
  return merged;
}

export function getWordById(id: string, pool?: Word[]): Word | undefined {
  const words = pool ?? getAllWords();
  return words.find((w) => w.id === id);
}

export function getWordsByLevel(level: number, pool?: Word[]): Word[] {
  const words = pool ?? getAllWords();
  return words.filter((w) => w.level === level);
}

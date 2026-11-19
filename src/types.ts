export type Level = 700 | 800 | 900;
export type POS = 'n' | 'v' | 'adj' | 'adv' | 'phr';
export type BlankForm = 'base' | 'third' | 'past' | 'pp' | 'ing' | 'plural' | 'adj' | 'adv' | null;

export type FormValue = string | null | undefined;

export interface WordForms {
  base?: FormValue;
  third?: FormValue;
  past?: FormValue;
  pp?: FormValue;
  ing?: FormValue;
  plural?: FormValue;
  adj?: FormValue;
  adv?: FormValue;
}

export interface Word {
  id: string;
  level: Level;
  pos: POS;
  word: string;
  meaning: string;
  collocation: string;
  example: string;
  example_ko: string;
  blank_sentence: string;
  blank_answer: string;
  blank_form: BlankForm;
  forms: WordForms | null;
}

export interface LeitnerEntry {
  wordId: string;
  box: number; // 1..5
  nextReview: number; // timestamp (ms)
  lastReviewed: number | null;
  correctCount: number;
  wrongCount: number;
  pinned: boolean;
}

export interface ProgressEntry {
  wordId: string;
  known: boolean; // true = "알아요", false = "몰라요"
  timestamp: number;
  dayKey: string; // YYYY-MM-DD
}

export interface AppState {
  progress: Record<string, ProgressEntry[]>; // wordId -> history
  leitner: Record<string, LeitnerEntry>; // wordId -> entry
  streak: number;
  lastStreakDay: string | null; // dayKey of last completed day
  bestStreak: number;
  quizResults: QuizResult[];
  wrongNote: string[]; // wordIds in wrong note
  completedDays: string[]; // list of dayKeys where today's 20 were completed
}

export interface QuizResult {
  date: string;
  type: 'meaning' | 'blank';
  total: number;
  correct: number;
  wrongWordIds: string[];
}

export type TabKey = 'today' | 'quiz' | 'review' | 'dashboard';
export type ReviewTab = 'due' | 'all' | 'pinned';

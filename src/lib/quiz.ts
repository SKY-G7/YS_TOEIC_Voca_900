// Quiz generation with grammar-correct distractors

import type { Word } from '@/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface QuizQuestion {
  wordId: string;
  type: 'meaning' | 'blank';
  question: string;
  questionKo?: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  word: Word;
}

// Generate a Type B (blank fill) question if enough grammar-matching distractors exist
function tryBlankQuestion(word: Word, pool: Word[]): QuizQuestion | null {
  if (!word.blank_form || !word.forms) return null;
  const formKey = word.blank_form;
  const correctAnswer = word.forms[formKey as keyof typeof word.forms];
  if (!correctAnswer) return null;

  // Find distractors: same pos, same form exists, different answer
  const candidates = pool.filter((w) => {
    if (w.id === word.id) return false;
    if (w.pos !== word.pos) return false;
    if (!w.forms || !w.blank_form) return false;
    if (w.blank_form !== formKey) return false;
    const val = w.forms[formKey as keyof typeof w.forms];
    if (!val) return false;
    if (val === correctAnswer) return false;
    return true;
  });

  if (candidates.length < 3) return null;

  const distractors = shuffle(candidates).slice(0, 3).map((w) => {
    return w.forms![formKey as keyof typeof w.forms]!;
  });

  const choices = shuffle([correctAnswer, ...distractors]);
  const answerIndex = choices.indexOf(correctAnswer);

  return {
    wordId: word.id,
    type: 'blank',
    question: word.blank_sentence,
    choices,
    answerIndex,
    explanation: `${word.word} — ${word.meaning}\n${word.example}\n${word.example_ko}`,
    word,
  };
}

// Generate a Type A (meaning 4-choice) question
function meaningQuestion(word: Word, pool: Word[]): QuizQuestion {
  const distractorPool = pool.filter((w) => w.id !== word.id && w.meaning !== word.meaning);
  const distractors = shuffle(distractorPool).slice(0, 3).map((w) => w.meaning);
  const choices = shuffle([word.meaning, ...distractors]);
  const answerIndex = choices.indexOf(word.meaning);

  return {
    wordId: word.id,
    type: 'meaning',
    question: word.word,
    questionKo: word.collocation,
    choices,
    answerIndex,
    explanation: `${word.word} — ${word.meaning}\n${word.example}\n${word.example_ko}`,
    word,
  };
}

export function generateQuiz(pool: Word[], count: number, fromIds?: string[]): QuizQuestion[] {
  let source: Word[];
  if (fromIds && fromIds.length > 0) {
    source = fromIds
      .map((id) => pool.find((w) => w.id === id))
      .filter((w): w is Word => w !== undefined);
  } else {
    source = shuffle(pool).slice(0, count);
  }

  const questions: QuizQuestion[] = [];
  for (const word of source) {
    if (questions.length >= count) break;
    // 50% chance to try blank question, else meaning
    const tryBlank = Math.random() < 0.5;
    if (tryBlank) {
      const bq = tryBlankQuestion(word, pool);
      if (bq) {
        questions.push(bq);
        continue;
      }
    }
    questions.push(meaningQuestion(word, pool));
  }

  return questions;
}

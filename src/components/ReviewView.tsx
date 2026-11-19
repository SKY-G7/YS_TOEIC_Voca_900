import { useState, useMemo, useCallback } from 'react';
import { Volume2, Star, ChevronRight, Inbox, Clock, CheckCircle2 } from 'lucide-react';
import type { Word, AppState, ReviewTab } from '@/types';
import { speak } from '@/lib/tts';
import { formatDayKey } from '@/lib/dateUtils';
import { isDue } from '@/lib/storage';

interface ReviewViewProps {
  pool: Word[];
  state: AppState;
  onReviewAnswer: (wordId: string, known: boolean) => void;
  onPin: (wordId: string) => void;
  onTTSFail: () => void;
}

const BOX_LABELS = ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'];
const BOX_INTERVALS = ['1일', '3일', '7일', '14일', '30일'];
const BOX_COLORS = [
  'bg-rose-100 text-rose-600',
  'bg-orange-100 text-orange-600',
  'bg-amber-100 text-amber-600',
  'bg-lime-100 text-lime-600',
  'bg-green-100 text-green-600',
];

export function ReviewView({
  pool,
  state,
  onReviewAnswer,
  onPin,
  onTTSFail,
}: ReviewViewProps) {
  const [tab, setTab] = useState<ReviewTab>('due');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const wordMap = useMemo(() => {
    const m = new Map<string, Word>();
    for (const w of pool) m.set(w.id, w);
    return m;
  }, [pool]);

  const dueEntries = useMemo(() => {
    return Object.values(state.leitner)
      .filter((e) => isDue(e))
      .sort((a, b) => a.nextReview - b.nextReview);
  }, [state.leitner]);

  const allEntries = useMemo(() => {
    return Object.values(state.leitner).sort((a, b) => a.nextReview - b.nextReview);
  }, [state.leitner]);

  const pinnedEntries = useMemo(() => {
    return Object.values(state.leitner).filter((e) => e.pinned);
  }, [state.leitner]);

  const currentEntries = tab === 'due' ? dueEntries : tab === 'all' ? allEntries : pinnedEntries;

  const handleReviewAnswer = useCallback(
    (known: boolean) => {
      if (!reviewingId) return;
      onReviewAnswer(reviewingId, known);
      setReviewingId(null);
    },
    [reviewingId, onReviewAnswer],
  );

  // --- Review card mode ---
  if (reviewingId) {
    const word = wordMap.get(reviewingId);
    if (!word) {
      setReviewingId(null);
      return null;
    }
    const entry = state.leitner[reviewingId];

    return (
      <div className="flex flex-col items-center pt-4 pb-8 px-4">
        <div className="w-full max-w-md mb-4 flex items-center justify-between">
          <button
            onClick={() => setReviewingId(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 목록으로
          </button>
          {entry && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${BOX_COLORS[entry.box - 1]}`}>
              {BOX_LABELS[entry.box - 1]} · {BOX_INTERVALS[entry.box - 1]}
            </span>
          )}
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 uppercase tracking-wide">{word.pos}</span>
            <button
              onClick={() => speak(word.word, onTTSFail)}
              className="p-2 rounded-full hover:bg-blue-50 transition-colors active:scale-90"
            >
              <Volume2 className="w-5 h-5 text-blue-500" />
            </button>
          </div>
          <div className="text-center py-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{word.word}</h2>
            <div className="w-12 h-1 bg-gray-200 rounded-full mb-4 mx-auto" />
            <p className="text-xl font-semibold text-blue-600 mb-4">{word.meaning}</p>
            <p className="text-sm text-gray-500 mb-2">{word.collocation}</p>
            <div className="bg-gray-50 rounded-xl p-3 mt-3 text-left">
              <p className="text-sm text-gray-700 italic leading-relaxed mb-1">"{word.example}"</p>
              <p className="text-xs text-gray-400">{word.example_ko}</p>
            </div>
            {word.blank_sentence && (
              <div className="bg-blue-50 rounded-xl p-3 mt-3 text-left">
                <p className="text-xs text-blue-400 mb-1">빈칸 문제</p>
                <p className="text-sm text-gray-700">{word.blank_sentence}</p>
                <p className="text-xs text-green-600 mt-1">정답: {word.blank_answer}</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4 text-center">이 단어를 알고 있나요?</p>
        <div className="flex items-center gap-6">
          <button
            onClick={() => handleReviewAnswer(false)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center group-active:scale-90 transition-transform">
              <span className="text-rose-500 text-xl font-bold">✕</span>
            </div>
            <span className="text-xs text-rose-400 font-medium">몰라요</span>
          </button>
          <button
            onClick={() => handleReviewAnswer(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center group-active:scale-90 transition-transform">
              <span className="text-green-500 text-xl font-bold">✓</span>
            </div>
            <span className="text-xs text-green-400 font-medium">알아요</span>
          </button>
        </div>
        {entry && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            정답 시: {BOX_LABELS[Math.min(entry.box, 4)]} ({BOX_INTERVALS[Math.min(entry.box, 4)]})<br />
            오답 시: Box 1 (내일 복습)
          </p>
        )}
      </div>
    );
  }

  // --- List mode ---
  return (
    <div className="flex flex-col pt-4 pb-8 px-4">
      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-4 max-w-md mx-auto w-full">
        {[
          { key: 'due' as ReviewTab, label: `오늘 복습 (${dueEntries.length})`, icon: Clock },
          { key: 'all' as ReviewTab, label: `전체 (${allEntries.length})`, icon: Inbox },
          { key: 'pinned' as ReviewTab, label: `Pin (${pinnedEntries.length})`, icon: Star },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {currentEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">
            {tab === 'due' ? '📭' : tab === 'pinned' ? '⭐' : '📦'}
          </div>
          <p className="text-gray-500 text-sm">
            {tab === 'due'
              ? '오늘 복습할 단어가 없어요!'
              : tab === 'pinned'
                ? 'Pin한 단어가 없어요'
                : '아직 학습한 단어가 없어요'}
          </p>
        </div>
      ) : (
        <div className="max-w-md mx-auto w-full space-y-2">
          {currentEntries.map((entry) => {
            const word = wordMap.get(entry.wordId);
            if (!word) return null;
            const due = isDue(entry);
            return (
              <button
                key={entry.wordId}
                onClick={() => setReviewingId(entry.wordId)}
                className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between text-left hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{word.word}</h3>
                    {entry.pinned && (
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{word.meaning}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${BOX_COLORS[entry.box - 1]}`}>
                      {BOX_LABELS[entry.box - 1]}
                    </span>
                    {due ? (
                      <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        복습 필요
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        {formatDayKey(new Date(entry.nextReview).toISOString().slice(0, 10))}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300">
                      ✓{entry.correctCount} ✗{entry.wrongCount}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

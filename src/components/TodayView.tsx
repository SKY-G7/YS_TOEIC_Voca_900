import { useMemo, useState } from 'react';
import { Volume2, Star, Check, X, ChevronDown } from 'lucide-react';
import type { Word, AppState, POS } from '@/types';
import { getDayIndex, getLocalDayKey, formatDayKey } from '@/lib/dateUtils';
import { speak } from '@/lib/tts';

interface TodayViewProps {
  pool: Word[];
  state: AppState;
  onAnswer: (wordId: string, known: boolean) => void;
  onPin: (wordId: string) => void;
  onTTSFail: () => void;
  onComplete: () => void;
}

const POS_LABELS: Record<POS, string> = {
  n: '명사',
  v: '동사',
  adj: '형용사',
  adv: '부사',
  phr: '이어동사',
};

const POS_BADGE_COLORS: Record<POS, string> = {
  n: 'bg-blue-100 text-blue-600',
  v: 'bg-green-100 text-green-600',
  adj: 'bg-amber-100 text-amber-600',
  adv: 'bg-teal-100 text-teal-600',
  phr: 'bg-rose-100 text-rose-600',
};

export function TodayView({
  pool,
  state,
  onAnswer,
  onPin,
  onTTSFail,
  onComplete,
}: TodayViewProps) {
  const today20 = useMemo(() => {
    const dayIndex = getDayIndex();
    const start = (dayIndex * 20) % pool.length;
    const result: Word[] = [];
    for (let i = 0; i < Math.min(20, pool.length); i++) {
      result.push(pool[(start + i) % pool.length]);
    }
    return result;
  }, [pool]);

  const todayKey = getLocalDayKey();
  const todayProgress = useMemo(() => {
    return today20.filter((w) => {
      const entries = state.progress[w.id];
      return entries && entries.some((e) => e.dayKey === todayKey);
    });
  }, [today20, state.progress, todayKey]);

  const completedCount = todayProgress.length;
  const completed = completedCount >= today20.length;
  const progressPct = (completedCount / today20.length) * 100;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getTodayAnswer = (wordId: string): boolean | null => {
    const entries = state.progress[wordId];
    if (!entries) return null;
    const todayEntry = [...entries].reverse().find((e) => e.dayKey === todayKey);
    return todayEntry ? todayEntry.known : null;
  };

  const handleToggle = (wordId: string) => {
    setExpandedId((prev) => (prev === wordId ? null : wordId));
  };

  const handleTTS = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    speak(word, onTTSFail);
  };

  const handlePin = (e: React.MouseEvent, wordId: string) => {
    e.stopPropagation();
    onPin(wordId);
  };

  const handleAnswer = (wordId: string, known: boolean) => {
    onAnswer(wordId, known);
    if (completedCount + 1 >= today20.length) {
      onComplete();
    }
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">오늘의 학습 완료!</h2>
        <p className="text-gray-500 text-sm mb-6">
          {formatDayKey(todayKey)}<br />
          20개 단어를 모두 학습했어요.
        </p>
        <button
          onClick={() => setExpandedId(null)}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors active:scale-95 mb-3"
        >
          다시 학습하기
        </button>
        <button
          onClick={onComplete}
          className="text-blue-500 text-sm font-medium hover:underline"
        >
          퀴즈 풀러가기 →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 pb-8 px-4">
      <div className="max-w-md mx-auto w-full">
        {/* Date and progress */}
        <p className="text-center text-sm text-gray-500 mb-2">{formatDayKey(todayKey)}</p>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-center text-xs text-gray-400 mb-4">
          {completedCount} / {today20.length} 완료
        </p>

        {/* Word list */}
        <div className="space-y-2">
          {today20.map((word, i) => {
            const isExpanded = expandedId === word.id;
            const answer = getTodayAnswer(word.id);
            const isPinned = state.leitner[word.id]?.pinned ?? false;
            const answered = answer !== null;

            return (
              <div
                key={word.id}
                className={`bg-white rounded-2xl border transition-all duration-200 ${
                  isExpanded
                    ? 'border-blue-200 shadow-md'
                    : 'border-gray-100 shadow-sm'
                }`}
              >
                {/* Word row */}
                <button
                  onClick={() => handleToggle(word.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <span className={`text-xs font-medium w-5 text-center shrink-0 ${answered ? 'text-gray-300' : 'text-gray-400'}`}>
                    {i + 1}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${POS_BADGE_COLORS[word.pos]}`}>
                    {POS_LABELS[word.pos]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold truncate ${answered ? 'text-gray-700' : 'text-gray-900'}`}>
                        {word.word}
                      </span>
                      {isPinned && (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{word.meaning}</p>
                  </div>
                  {/* Status indicator */}
                  {answered ? (
                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${answer ? 'bg-green-100' : 'bg-rose-100'}`}>
                      {answer ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-500" />
                      )}
                    </span>
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3">
                    {/* Pronunciation + meaning */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <button
                        onClick={(e) => handleTTS(e, word.word)}
                        className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                      >
                        <Volume2 className="w-4 h-4 text-white" />
                      </button>
                      <div className="text-sm text-gray-500">
                        <span className="text-gray-400">발음 듣기</span>
                      </div>
                      <button
                        onClick={(e) => handlePin(e, word.id)}
                        className={`ml-auto w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
                          isPinned ? 'bg-amber-50' : 'bg-gray-100'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isPinned ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                      </button>
                    </div>

                    {/* Meaning */}
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 mt-0.5 shrink-0 w-8">뜻</span>
                      <p className="text-sm font-medium text-gray-800">{word.meaning}</p>
                    </div>

                    {/* Collocation */}
                    {word.collocation && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 mt-0.5 shrink-0 w-8">활용</span>
                        <p className="text-sm text-gray-600">{word.collocation}</p>
                      </div>
                    )}

                    {/* Example */}
                    <div className="bg-blue-50/50 rounded-xl p-3">
                      <p className="text-xs text-blue-400 font-medium mb-1">예문</p>
                      <p className="text-sm text-gray-700 italic leading-relaxed mb-1.5">
                        {word.example}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {word.example_ko}
                      </p>
                    </div>

                    {/* Answer buttons */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => handleAnswer(word.id, false)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                          answer === false
                            ? 'bg-rose-500 text-white'
                            : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        몰라요
                      </button>
                      <button
                        onClick={() => handleAnswer(word.id, true)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                          answer === true
                            ? 'bg-green-500 text-white'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        알아요
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

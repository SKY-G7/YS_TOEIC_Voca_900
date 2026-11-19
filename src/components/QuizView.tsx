import { useState, useMemo, useCallback } from 'react';
import { Check, X, Volume2, RotateCcw, ChevronRight } from 'lucide-react';
import type { Word, AppState } from '@/types';
import { generateQuiz, type QuizQuestion } from '@/lib/quiz';
import { speak } from '@/lib/tts';
import { getLocalDayKey, formatDayKey } from '@/lib/dateUtils';

interface QuizViewProps {
  pool: Word[];
  state: AppState;
  onQuizComplete: (correct: number, total: number, wrongWordIds: string[]) => void;
  onTTSFail: () => void;
}

export function QuizView({ pool, state, onQuizComplete, onTTSFail }: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ question: QuizQuestion; correct: boolean; selected: number }[]>([]);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const startQuiz = useCallback(
    (mode: 'today' | 'random' | 'wrong') => {
      let sourceIds: string[] | undefined;
      if (mode === 'today') {
        // Use today's 20 words
        const dayIndex = Math.floor(Date.now() / 86400000);
        const start = (dayIndex * 20) % pool.length;
        const ids: string[] = [];
        for (let i = 0; i < Math.min(10, pool.length); i++) {
          ids.push(pool[(start + i) % pool.length].id);
        }
        sourceIds = ids;
      } else if (mode === 'wrong') {
        sourceIds = state.wrongNote;
        if (sourceIds.length === 0) {
          // No wrong words, fallback to random
          sourceIds = undefined;
        }
      }
      const qs = generateQuiz(pool, mode === 'today' ? 10 : 10, sourceIds);
      setQuestions(qs);
      setCurrentIdx(0);
      setSelectedIdx(null);
      setAnswers([]);
      setStarted(true);
      setFinished(false);
    },
    [pool, state.wrongNote],
  );

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    const q = questions[currentIdx];
    const correct = idx === q.answerIndex;
    setAnswers((prev) => [...prev, { question: q, correct, selected: idx }]);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedIdx(null);
    } else {
      // Finished
      const correctCount = answers.filter((a) => a.correct).length;
      const wrongIds = answers.filter((a) => !a.correct).map((a) => a.question.wordId);
      onQuizComplete(correctCount, questions.length, wrongIds);
      setFinished(true);
    }
  };

  // --- Start screen ---
  if (!started) {
    const wrongCount = state.wrongNote.length;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">스마트 퀴즈</h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          뜻 맞추기 & 빈칸 채우기<br />
          10문제로 실력 점검!
        </p>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => startQuiz('today')}
            className="w-full p-4 bg-blue-500 text-white rounded-2xl font-medium text-sm hover:bg-blue-600 transition-colors active:scale-95 flex items-center justify-between"
          >
            <span>오늘의 단어로 퀴즈</span>
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => startQuiz('random')}
            className="w-full p-4 bg-slate-700 text-white rounded-2xl font-medium text-sm hover:bg-slate-800 transition-colors active:scale-95 flex items-center justify-between"
          >
            <span>무작위 단어 퀴즈</span>
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => startQuiz('wrong')}
            disabled={wrongCount === 0}
            className="w-full p-4 bg-rose-50 text-rose-600 rounded-2xl font-medium text-sm hover:bg-rose-100 transition-colors active:scale-95 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>오답노트 퀴즈 ({wrongCount}개)</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // --- Result screen ---
  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    const wrongAnswers = answers.filter((a) => !a.correct);
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="flex flex-col items-center pt-6 pb-8 px-4">
        <div className="text-5xl mb-3">{score >= 80 ? '🏆' : score >= 50 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{score}점</h2>
        <p className="text-gray-500 text-sm mb-6">
          {correctCount} / {questions.length} 정답 · {formatDayKey(getLocalDayKey())}
        </p>

        {wrongAnswers.length > 0 && (
          <div className="w-full max-w-md">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-rose-500 rounded-full" />
              틀린 문제 ({wrongAnswers.length})
            </h3>
            <div className="space-y-3 mb-6">
              {wrongAnswers.map((a, i) => {
                const q = a.question;
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            q.type === 'blank'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {q.type === 'blank' ? '빈칸' : '뜻'}
                        </span>
                        <span className="text-xs text-gray-400">{q.word.word}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(q.word.word, onTTSFail);
                        }}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Volume2 className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {q.type === 'blank' ? q.question : q.question}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-rose-500">
                        <X className="w-3.5 h-3.5 shrink-0" />
                        <span>내 답: {q.choices[a.selected]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>정답: {q.choices[q.answerIndex]}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-xs text-gray-500 italic">{q.word.example}</p>
                      <p className="text-xs text-gray-400 mt-1">{q.word.example_ko}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setStarted(false);
              setFinished(false);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            다시 풀기
          </button>
        </div>
      </div>
    );
  }

  // --- Quiz in progress ---
  const q = questions[currentIdx];
  if (!q) return null;

  return (
    <div className="flex flex-col items-center pt-4 pb-8 px-4">
      <div className="w-full max-w-md mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            {currentIdx + 1} / {questions.length}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              q.type === 'blank'
                ? 'bg-purple-100 text-purple-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {q.type === 'blank' ? '빈칸 채우기' : '뜻 맞추기'}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-6 mb-6">
        {q.type === 'meaning' ? (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <h3 className="text-3xl font-bold text-gray-900">{q.question}</h3>
              <button
                onClick={() => speak(q.question, onTTSFail)}
                className="p-2 rounded-full hover:bg-blue-50 transition-colors active:scale-90"
              >
                <Volume2 className="w-5 h-5 text-blue-500" />
              </button>
            </div>
            {q.questionKo && (
              <p className="text-sm text-gray-400">{q.questionKo}</p>
            )}
            <p className="text-xs text-gray-400 mt-3">알맞은 뜻을 고르세요</p>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-lg text-gray-800 leading-relaxed text-center mb-2">
              {q.question}
            </p>
            <p className="text-xs text-gray-400 text-center">빈칸에 들어갈 알맞은 형태를 고르세요</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-md space-y-3">
        {q.choices.map((choice, idx) => {
          let style = 'bg-white border-gray-200 text-gray-700 hover:border-blue-300';
          if (selectedIdx !== null) {
            if (idx === q.answerIndex) {
              style = 'bg-green-50 border-green-400 text-green-700';
            } else if (idx === selectedIdx) {
              style = 'bg-rose-50 border-rose-400 text-rose-700';
            } else {
              style = 'bg-white border-gray-100 text-gray-400';
            }
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selectedIdx !== null}
              className={`w-full p-4 rounded-2xl border-2 font-medium text-sm transition-all active:scale-[0.98] flex items-center justify-between ${style}`}
            >
              <span>{choice}</span>
              {selectedIdx !== null && idx === q.answerIndex && (
                <Check className="w-5 h-5 text-green-500" />
              )}
              {selectedIdx !== null && idx === selectedIdx && idx !== q.answerIndex && (
                <X className="w-5 h-5 text-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      {selectedIdx !== null && (
        <button
          onClick={handleNext}
          className="mt-6 px-8 py-3 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors active:scale-95"
        >
          {currentIdx < questions.length - 1 ? '다음 문제' : '결과 보기'}
        </button>
      )}
    </div>
  );
}

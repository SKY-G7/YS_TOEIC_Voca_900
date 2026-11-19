import { useMemo } from 'react';
import { Flame, BookOpen, Target, Award } from 'lucide-react';
import type { Word, AppState } from '@/types';
import { getLocalDayKey, formatDayKey } from '@/lib/dateUtils';

interface DashboardViewProps {
  pool: Word[];
  state: AppState;
}

function getTreeStage(streak: number): { emoji: string; label: string; color: string } {
  if (streak === 0) return { emoji: '🌱', label: '씨앗', color: 'text-gray-400' };
  if (streak <= 2) return { emoji: '🌿', label: '싹', color: 'text-green-400' };
  if (streak <= 6) return { emoji: '🌿', label: '묘목', color: 'text-green-500' };
  if (streak <= 13) return { emoji: '🌳', label: '어린 나무', color: 'text-green-600' };
  if (streak <= 29) return { emoji: '🌳', label: '큰 나무', color: 'text-green-700' };
  return { emoji: '🌳', label: '거목', color: 'text-emerald-700' };
}

function getFlameScale(streak: number): number {
  return 1 + Math.min(streak, 30) * 0.03;
}

export function DashboardView({ pool, state }: DashboardViewProps) {
  const todayKey = getLocalDayKey();

  const stats = useMemo(() => {
    const totalWords = pool.length;
    const learnedWords = Object.keys(state.leitner).length;
    const todayProgress = Object.entries(state.progress).filter(([, entries]) =>
      entries.some((e) => e.dayKey === todayKey),
    ).length;

    // Total quiz stats
    const totalQuizzes = state.quizResults.length;
    const totalQuizCorrect = state.quizResults.reduce((sum, r) => sum + r.correct, 0);
    const totalQuizQuestions = state.quizResults.reduce((sum, r) => sum + r.total, 0);
    const avgScore =
      totalQuizQuestions > 0 ? Math.round((totalQuizCorrect / totalQuizQuestions) * 100) : 0;

    // Known vs unknown from today's progress
    let todayKnown = 0;
    let todayUnknown = 0;
    for (const entries of Object.values(state.progress)) {
      const todayEntry = entries.find((e) => e.dayKey === todayKey);
      if (todayEntry) {
        if (todayEntry.known) todayKnown++;
        else todayUnknown++;
      }
    }

    return {
      totalWords,
      learnedWords,
      todayProgress,
      totalQuizzes,
      avgScore,
      todayKnown,
      todayUnknown,
    };
  }, [pool, state, todayKey]);

  const treeStage = getTreeStage(state.streak);
  const flameScale = getFlameScale(state.streak);
  const progressPct = stats.totalWords > 0 ? (stats.learnedWords / stats.totalWords) * 100 : 0;
  const hasGlow = state.streak >= 7;

  return (
    <div className="flex flex-col pt-4 pb-8 px-4">
      <div className="max-w-md mx-auto w-full">
        {/* Date */}
        <p className="text-center text-sm text-gray-500 mb-4">{formatDayKey(todayKey)}</p>

        {/* Streak & Flame card */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-6 mb-4 border border-orange-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-orange-500 font-medium mb-1">연속 학습</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-orange-600">{state.streak}</span>
                <span className="text-sm text-orange-400">일</span>
              </div>
              <p className="text-xs text-orange-400 mt-1">최고: {state.bestStreak}일</p>
            </div>
            <div
              className="relative flex items-center justify-center"
              style={{
                transform: `scale(${flameScale})`,
                transition: 'transform 0.5s ease-out',
              }}
            >
              {hasGlow && (
                <div
                  className="absolute inset-0 rounded-full bg-orange-400 blur-xl animate-glow-pulse"
                  style={{ width: '60px', height: '60px' }}
                />
              )}
              <Flame
                className={`relative ${hasGlow ? 'animate-glow-flicker' : ''}`}
                style={{
                  width: '48px',
                  height: '48px',
                  color: state.streak > 0 ? '#f97316' : '#d1d5db',
                  fill: state.streak > 0 ? '#fb923c' : 'transparent',
                }}
              />
            </div>
          </div>
          <div className="text-xs text-orange-400 bg-white/50 rounded-lg px-3 py-2">
            오늘의 20단어를 모두 완료해야 스트릭이 유지됩니다
          </div>
        </div>

        {/* Tree growth card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 mb-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium mb-1">나무 성장</p>
              <p className={`text-xl font-bold ${treeStage.color}`}>{treeStage.label}</p>
              <div className="mt-2 flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((s) => {
                  const thresholds = [0, 1, 3, 7, 14, 30];
                  const reached = state.streak >= thresholds[s];
                  return (
                    <div
                      key={s}
                      className={`h-1.5 w-6 rounded-full ${reached ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400" style={{ width: '150px' }}>
                <span>0</span><span>1</span><span>3</span><span>7</span><span>14</span><span>30+</span>
              </div>
            </div>
            <div className="text-6xl">{treeStage.emoji}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-3xl p-6 mb-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">전체 진도율</span>
            </div>
            <span className="text-sm font-bold text-blue-600">
              {stats.learnedWords} / {stats.totalWords}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">{progressPct.toFixed(1)}%</p>
        </div>

        {/* Today stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">오늘 학습</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayProgress}<span className="text-sm text-gray-400">/20</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">퀴즈 평균</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.avgScore}<span className="text-sm text-gray-400">점</span></p>
          </div>
        </div>

        {/* Today known/unknown */}
        {stats.todayProgress > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <span className="text-sm font-medium text-gray-700 mb-3 block">오늘 학습 결과</span>
            <div className="flex gap-4">
              <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.todayKnown}</p>
                <p className="text-xs text-green-500 mt-1">알아요</p>
              </div>
              <div className="flex-1 bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-rose-500">{stats.todayUnknown}</p>
                <p className="text-xs text-rose-400 mt-1">몰라요</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

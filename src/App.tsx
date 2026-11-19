import { useState, useEffect, useCallback, useMemo } from 'react';
import { Home, HelpCircle, RefreshCw, BarChart3 } from 'lucide-react';
import type { AppState, TabKey, ProgressEntry, LeitnerEntry } from '@/types';
import { getAllWords } from '@/lib/wordPool';
import {
  loadState,
  saveState,
  createLeitnerEntry,
  promoteLeitner,
  resetLeitner,
} from '@/lib/storage';
import { getLocalDayKey, daysBetween } from '@/lib/dateUtils';
import { initTTS, warmUpTTS } from '@/lib/tts';
import { TodayView } from '@/components/TodayView';
import { QuizView } from '@/components/QuizView';
import { ReviewView } from '@/components/ReviewView';
import { DashboardView } from '@/components/DashboardView';
import { ToastContainer, useToast } from '@/components/Toast';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const { toasts, showToast } = useToast();
  const pool = useMemo(() => getAllWords(), []);

  // Persist state on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Initialize TTS
  useEffect(() => {
    initTTS();
  }, []);

  // Warm up TTS on first user interaction
  useEffect(() => {
    const handler = () => {
      warmUpTTS();
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('click', handler);
    };
    document.addEventListener('touchstart', handler, { once: true });
    document.addEventListener('click', handler, { once: true });
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('click', handler);
    };
  }, []);

  // Check streak on mount — if a day was skipped, reset streak
  useEffect(() => {
    const todayKey = getLocalDayKey();
    if (state.lastStreakDay) {
      const gap = daysBetween(state.lastStreakDay, todayKey);
      if (gap > 1 && state.streak > 0) {
        setState((prev) => ({ ...prev, streak: 0 }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Core actions ---

  const handleAnswer = useCallback(
    (wordId: string, known: boolean) => {
      const todayKey = getLocalDayKey();
      setState((prev) => {
        const progressEntry: ProgressEntry = {
          wordId,
          known,
          timestamp: Date.now(),
          dayKey: todayKey,
        };

        // Update progress
        const existingProgress = prev.progress[wordId] || [];
        const newProgress = {
          ...prev.progress,
          [wordId]: [...existingProgress, progressEntry],
        };

        // Update Leitner
        const existingLeitner = prev.leitner[wordId];
        let newLeitner: LeitnerEntry;
        if (existingLeitner) {
          newLeitner = known ? promoteLeitner(existingLeitner) : resetLeitner(existingLeitner);
        } else {
          newLeitner = known ? promoteLeitner(createLeitnerEntry(wordId)) : createLeitnerEntry(wordId);
        }

        // If unknown, add to wrong note
        const newWrongNote = known
          ? prev.wrongNote.filter((id) => id !== wordId)
          : [...new Set([...prev.wrongNote, wordId])];

        return {
          ...prev,
          progress: newProgress,
          leitner: { ...prev.leitner, [wordId]: newLeitner },
          wrongNote: newWrongNote,
        };
      });
    },
    [],
  );

  const handleTodayComplete = useCallback(() => {
    const todayKey = getLocalDayKey();
    setState((prev) => {
      if (prev.completedDays.includes(todayKey)) return prev;

      const newStreak = prev.streak + 1;
      const newBestStreak = Math.max(prev.bestStreak, newStreak);

      return {
        ...prev,
        streak: newStreak,
        bestStreak: newBestStreak,
        lastStreakDay: todayKey,
        completedDays: [...prev.completedDays, todayKey],
      };
    });
    showToast('오늘의 20단어 완료! 스트릭 +1');
  }, [showToast]);

  const handlePin = useCallback((wordId: string) => {
    setState((prev) => {
      const existing = prev.leitner[wordId];
      const entry = existing
        ? { ...existing, pinned: !existing.pinned }
        : { ...createLeitnerEntry(wordId), pinned: true };
      return {
        ...prev,
        leitner: { ...prev.leitner, [wordId]: entry },
      };
    });
  }, []);

  const handleReviewAnswer = useCallback(
    (wordId: string, known: boolean) => {
      setState((prev) => {
        const existing = prev.leitner[wordId];
        if (!existing) return prev;
        const newEntry = known ? promoteLeitner(existing) : resetLeitner(existing);
        const newWrongNote = known
          ? prev.wrongNote.filter((id) => id !== wordId)
          : [...new Set([...prev.wrongNote, wordId])];
        return {
          ...prev,
          leitner: { ...prev.leitner, [wordId]: newEntry },
          wrongNote: newWrongNote,
        };
      });
    },
    [],
  );

  const handleQuizComplete = useCallback(
    (correct: number, total: number, wrongWordIds: string[]) => {
      const todayKey = getLocalDayKey();
      setState((prev) => ({
        ...prev,
        quizResults: [
          ...prev.quizResults,
          {
            date: todayKey,
            type: 'meaning',
            total,
            correct,
            wrongWordIds,
          },
        ],
        wrongNote: [...new Set([...prev.wrongNote, ...wrongWordIds])],
      }));
    },
    [],
  );

  const handleTTSFail = useCallback(() => {
    showToast('크롬 또는 사파리 브라우저에서 열어주세요');
  }, [showToast]);

  // --- Tab config ---
  const tabs: { key: TabKey; label: string; icon: typeof Home }[] = [
    { key: 'today', label: '오늘', icon: Home },
    { key: 'quiz', label: '퀴즈', icon: HelpCircle },
    { key: 'review', label: '복습', icon: RefreshCw },
    { key: 'dashboard', label: '통계', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-none">TOEIC Vocab</h1>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">700 → 900+ Master</p>
            </div>
          </div>
          {state.streak > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded-full">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-bold text-orange-600">{state.streak}</span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-md mx-auto w-full">
        {activeTab === 'today' && (
          <TodayView
            pool={pool}
            state={state}
            onAnswer={handleAnswer}
            onPin={handlePin}
            onTTSFail={handleTTSFail}
            onComplete={handleTodayComplete}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizView
            pool={pool}
            state={state}
            onQuizComplete={handleQuizComplete}
            onTTSFail={handleTTSFail}
          />
        )}
        {activeTab === 'review' && (
          <ReviewView
            pool={pool}
            state={state}
            onReviewAnswer={handleReviewAnswer}
            onPin={handlePin}
            onTTSFail={handleTTSFail}
          />
        )}
        {activeTab === 'dashboard' && <DashboardView pool={pool} state={state} />}
      </main>

      {/* Bottom tab bar */}
      <nav className="sticky bottom-0 z-30 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <div className="max-w-md mx-auto flex">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                activeTab === key ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon
                className="w-5 h-5"
                style={activeTab === key ? { fill: 'currentColor', opacity: 0.1 } : {}}
              />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

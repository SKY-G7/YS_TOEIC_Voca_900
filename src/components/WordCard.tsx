import { useRef, useState, useCallback } from 'react';
import { Volume2, Star } from 'lucide-react';
import type { Word } from '@/types';
import { speak } from '@/lib/tts';

interface WordCardProps {
  word: Word;
  index: number;
  total: number;
  onSwipeLeft: () => void; // 몰라요
  onSwipeRight: () => void; // 알아요
  onPin: () => void;
  pinned: boolean;
  onTTSFail: () => void;
}

export function WordCard({
  word,
  index,
  total,
  onSwipeLeft,
  onSwipeRight,
  onPin,
  pinned,
  onTTSFail,
}: WordCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleStart = useCallback((x: number, y: number) => {
    startX.current = x;
    startY.current = y;
    moved.current = false;
    setIsDragging(true);
    setAnimating(false);
  }, []);

  const handleMove = useCallback((x: number, y: number) => {
    const dx = x - startX.current;
    const dy = y - startY.current;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
    setDragX(dx);
    setDragY(dy);
  }, []);

  const handleEnd = useCallback(() => {
    const dx = dragX;
    const dy = dragY;
    setIsDragging(false);
    setAnimating(true);

    if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // Swipe
      if (dx > 0) {
        setDragX(400);
        setTimeout(() => {
          onSwipeRight();
          setDragX(0);
          setAnimating(false);
        }, 250);
      } else {
        setDragX(-400);
        setTimeout(() => {
          onSwipeLeft();
          setDragX(0);
          setAnimating(false);
        }, 250);
      }
    } else {
      // Snap back
      if (!moved.current) {
        // Tap — flip
        setFlipped((f) => !f);
      }
      setDragX(0);
      setDragY(0);
      setTimeout(() => setAnimating(false), 250);
    }
  }, [dragX, dragY, onSwipeLeft, onSwipeRight]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleStart(t.clientX, t.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  };
  const onTouchEnd = () => handleEnd();

  // Mouse handlers (for desktop testing)
  const onMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX, e.clientY);
  };
  const onMouseUp = () => {
    if (isDragging) handleEnd();
  };

  const handleTTS = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    speak(word.word, onTTSFail);
  };

  const handlePin = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onPin();
  };

  const rotation = dragX * 0.05;
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 300);

  const levelColor =
    word.level === 700
      ? 'from-blue-400 to-blue-600'
      : word.level === 800
        ? 'from-amber-400 to-orange-500'
        : 'from-rose-400 to-rose-600';

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{index + 1}</span>
        <span>/</span>
        <span>{total}</span>
      </div>

      {/* Swipe hints */}
      <div className="absolute top-1/2 left-2 -translate-y-1/2 text-green-500 font-bold text-sm opacity-60 pointer-events-none">
        알아요 →
      </div>
      <div className="absolute top-1/2 right-2 -translate-y-1/2 text-rose-500 font-bold text-sm opacity-60 pointer-events-none">
        ← 몰라요
      </div>

      <div
        ref={cardRef}
        className="relative w-[88%] h-[420px] cursor-pointer"
        style={{
          transform: `translate(${dragX}px, ${dragY}px) rotate(${rotation}deg)`,
          transition: animating ? 'transform 0.25s ease-out' : 'none',
          opacity,
          touchAction: 'pan-y',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Card flip container */}
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front — English side */}
          <div
            className="absolute inset-0 rounded-3xl bg-white shadow-xl border border-gray-100 flex flex-col p-6"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={`text-xs font-bold text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${levelColor}`}
              >
                {word.level}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePin}
                  onTouchEnd={handlePin}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-90"
                >
                  <Star
                    className={`w-5 h-5 ${pinned ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                  />
                </button>
                <button
                  onClick={handleTTS}
                  onTouchEnd={handleTTS}
                  className="p-2 rounded-full hover:bg-blue-50 transition-colors active:scale-90"
                >
                  <Volume2 className="w-5 h-5 text-blue-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                {word.pos === 'phr' ? 'Phrasal Verb' : word.pos}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 break-words">
                {word.word}
              </h2>
              <div className="w-12 h-1 bg-gray-200 rounded-full mb-4" />
              <p className="text-sm text-gray-500 leading-relaxed">
                {word.collocation}
              </p>
            </div>

            <div className="text-center text-xs text-gray-300 mt-2">
              탭해서 뜻 보기
            </div>
          </div>

          {/* Back — Korean side */}
          <div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl flex flex-col p-6"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {word.pos}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePin}
                  onTouchEnd={handlePin}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-90"
                >
                  <Star
                    className={`w-5 h-5 ${pinned ? 'fill-amber-400 text-amber-400' : 'text-gray-500'}`}
                  />
                </button>
                <button
                  onClick={handleTTS}
                  onTouchEnd={handleTTS}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-90"
                >
                  <Volume2 className="w-5 h-5 text-blue-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <h2 className="text-2xl font-bold text-white mb-3">
                {word.word}
              </h2>
              <p className="text-xl font-semibold text-blue-300 mb-4">
                {word.meaning}
              </p>
              <div className="w-full bg-white/5 rounded-xl p-3 mt-2">
                <p className="text-sm text-gray-300 italic leading-relaxed mb-2">
                  "{word.example}"
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {word.example_ko}
                </p>
              </div>
            </div>

            <div className="text-center text-xs text-gray-600 mt-2">
              탭해서 단어 보기
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6 mt-6">
        <button
          onClick={onSwipeLeft}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-14 h-14 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center group-active:scale-90 transition-transform">
            <span className="text-rose-500 text-xl font-bold">✕</span>
          </div>
          <span className="text-xs text-rose-400 font-medium">몰라요</span>
        </button>
        <button
          onClick={onSwipeRight}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center group-active:scale-90 transition-transform">
            <span className="text-green-500 text-xl font-bold">✓</span>
          </div>
          <span className="text-xs text-green-400 font-medium">알아요</span>
        </button>
      </div>
    </div>
  );
}

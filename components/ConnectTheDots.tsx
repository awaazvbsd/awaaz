import React, { useState, useRef, useEffect, useCallback } from 'react';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';

interface ConnectTheDotsProps {
  onConnect: (classNum: number, section: string) => void;
  isEnabled: boolean;
  selectedClass?: number | null;
}

// Only show grades 6 and above (classes 6-10)
const CLASSES = Array.from({ length: 7 }, (_, i) => i + 6);
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const ConnectTheDots: React.FC<ConnectTheDotsProps> = ({ onConnect, isEnabled, selectedClass }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number; classNum: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const resetState = useCallback(() => {
    setStartPos(null);
    setCurrentPos(null);
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      resetState();
    }
  }, [isEnabled, resetState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>, classNum: number) => {
    if (!isEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    setStartPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
      classNum,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!startPos) return;
    const containerRect = containerRef.current!.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    });
  };

  const handleMouseUp = (section: string) => {
    if (startPos) {
      onConnect(startPos.classNum, section);
    }
    resetState();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>, classNum: number) => {
    if (!isEnabled) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    setStartPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
      classNum,
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!startPos) return;
    const touch = e.touches[0];
    const containerRect = containerRef.current!.getBoundingClientRect();
    setCurrentPos({
      x: touch.clientX - containerRect.left,
      y: touch.clientY - containerRect.top,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!startPos || !currentPos) {
      resetState();
      return;
    }

    // Check if touch ended over a section button
    const containerRect = containerRef.current!.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);

    const sectionButton = elements.find(el => el.getAttribute('data-section'));
    if (sectionButton) {
      const section = sectionButton.getAttribute('data-section');
      if (section) {
        onConnect(startPos.classNum, section);
      }
    }

    resetState();
  };

  const handleMouseLeaveAndUp = () => {
    resetState();
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center w-full max-w-[440px] mx-auto p-4 relative select-none touch-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseUp={handleMouseLeaveAndUp}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={handleMouseLeaveAndUp}
    >
      <GlassCard className="w-full p-8 md:p-10 !rounded-[32px] border-white/10 shadow-2xl relative overflow-visible">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-widest text-white uppercase">IDENTITY SELECT</h1>
          <p className="text-xs font-bold text-white/70 mt-3 uppercase tracking-[0.2em] leading-relaxed">
            Drag from your <span className="text-purple-400">Class</span> to your <span className="text-indigo-400">Section</span>
          </p>
        </div>

        <div className="flex justify-between items-start w-full px-2 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2 hidden md:block" />

          {/* Classes Column */}
          <div className="flex flex-col gap-4 z-10">
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2 text-center">Grades</p>
            {CLASSES.map((classNum) => (
              <button
                key={`class-${classNum}`}
                onMouseDown={(e) => handleMouseDown(e, classNum)}
                onTouchStart={(e) => handleTouchStart(e, classNum)}
                className={cn(
                  "w-20 h-14 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-2xl text-white text-xl font-bold transition-all duration-300 select-none touch-none",
                  "hover:bg-purple-500/20 hover:border-purple-500/50 hover:scale-105 active:scale-95",
                  (startPos?.classNum === classNum || selectedClass === classNum) && "bg-purple-500 border-purple-400 shadow-lg shadow-purple-500/40"
                )}
              >
                {classNum}
              </button>
            ))}
          </div>

          {/* Sections Column */}
          <div className="flex flex-col gap-4 z-10">
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2 text-center">Section</p>
            {SECTIONS.map((section) => (
              <button
                key={`section-${section}`}
                data-section={section}
                onMouseUp={() => handleMouseUp(section)}
                className={cn(
                  "w-20 h-14 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-2xl text-white text-xl font-bold transition-all duration-300 select-none touch-none",
                  "hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:scale-105 active:scale-95"
                )}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        {startPos && currentPos && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <line
              x1={startPos.x}
              y1={startPos.y}
              x2={currentPos.x}
              y2={currentPos.y}
              stroke="url(#line-gradient)"
              strokeWidth="4"
              strokeDasharray="8 8"
              strokeLinecap="round"
              className="animate-[dash_1s_linear_infinite]"
            />
            <defs>
              <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
        )}
      </GlassCard>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -16;
          }
        }
      `}</style>
    </div>
  );
};

export default ConnectTheDots;
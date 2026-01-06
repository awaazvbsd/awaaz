import React, { useState } from 'react';
import { mapSelfReportValueToScore, recordSelfReport } from '../utils/adaptiveStress';

interface SelfReportSliderProps {
  className?: string;
  initialScore?: number;
  onSubmit?: (score: number) => void;
}

const LABELS: Record<number, string> = {
  1: 'Very calm',
  2: 'Mostly calm',
  3: 'Neutral',
  4: 'Noticeably stressed',
  5: 'Highly stressed',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scoreToSliderValue = (score?: number) => {
  if (typeof score !== 'number') return 3;
  return clamp(Math.round(((score - 20) / 80) * 4 + 1), 1, 5);
};

export const SelfReportSlider: React.FC<SelfReportSliderProps> = ({ className, initialScore, onSubmit }) => {
  const [value, setValue] = useState(() => scoreToSliderValue(initialScore));
  const [submitted, setSubmitted] = useState(Boolean(initialScore));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const mappedScore = mapSelfReportValueToScore(value);
      recordSelfReport(mappedScore);
      onSubmit?.(mappedScore);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`w-full rounded-2xl bg-green-500/10 border border-green-500/40 p-4 text-sm text-green-200 ${className || ''}`}>
        Thanks! We'll use your input to improve future analyses.
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/80 ${className || ''}`}>
      <p className="font-medium text-white mb-2">How stressed did you feel during this recording?</p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-white/70">Calm</span>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1 accent-purple-primary"
        />
        <span className="text-xs text-white/70">Very stressed</span>
      </div>
      <div className="text-center text-sm text-white mt-2">{LABELS[value]}</div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 h-9 rounded-xl bg-purple-primary text-white text-sm font-semibold disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Save self-report'}
        </button>
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="flex-1 h-9 rounded-xl border border-white/20 text-white/80 text-sm"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default SelfReportSlider;


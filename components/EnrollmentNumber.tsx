import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';

interface EnrollmentNumberProps {
  onSubmit: (enrollmentNumber: string) => void;
}

const EnrollmentNumber: React.FC<EnrollmentNumberProps> = ({ onSubmit }) => {
  const [enrollmentNumber, setEnrollmentNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollmentNumber.trim()) {
      onSubmit(enrollmentNumber.trim());
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <GlassCard className="p-10 md:p-12 !rounded-[40px] border-white/10 shadow-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white uppercase mb-2">ENROLLMENT NUMBER</h1>
        <p className="text-xs font-bold text-white/50 mb-10 uppercase tracking-[0.2em] leading-relaxed">
          Please enter your <span className="text-purple-400">Enrollment Number</span> to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="relative group">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={enrollmentNumber}
              onChange={(e) => setEnrollmentNumber(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-[24px] text-white text-center text-5xl font-bold py-8 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:outline-none transition-all duration-300 placeholder:text-white/5"
              placeholder="000000"
              autoFocus
            />
            <div className="absolute inset-0 rounded-[24px] bg-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          </div>

          <button
            type="submit"
            disabled={!enrollmentNumber.trim()}
            className={cn(
              "w-full py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 shadow-2xl",
              enrollmentNumber.trim()
                ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
                : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5"
            )}
          >
            Authenticate Identity
          </button>
        </form>
      </GlassCard>
    </div>
  );
};

export default EnrollmentNumber;
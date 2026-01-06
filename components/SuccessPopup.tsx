import React from 'react';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';
import { CheckCircleIcon } from './icons/index';

interface SuccessPopupProps {
  accountNumber: string;
  onProceed: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ accountNumber, onProceed }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in-95 duration-500">
      <GlassCard className="w-full max-w-[420px] p-10 !rounded-[40px] border-white/10 shadow-3xl text-center relative overflow-hidden group">
        {/* Animated Background Element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full group-hover:bg-purple-500/20 transition-colors duration-700" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-700" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-400/20 to-green-500/10 border border-green-500/30 flex items-center justify-center mb-8 shadow-lg shadow-green-500/10 animate-pulse">
            <CheckCircleIcon className="w-10 h-10 text-green-400" />
          </div>

          <h2 className="text-4xl font-bold tracking-tight text-white uppercase mb-3">MISSION SUCCESS</h2>
          <p className="text-xs font-bold text-white/70 mb-10 uppercase tracking-[0.2em] leading-relaxed">
            Your secure account has been <span className="text-green-400">Initialized</span>.
          </p>

          <div className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-[24px] mb-10 group/code hover:border-purple-500/30 transition-colors duration-500">
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-3">Core Identity Code</p>
            <span className="text-4xl font-bold tracking-[0.25em] text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] select-text cursor-text">
              {accountNumber}
            </span>
          </div>

          <p className="text-xs font-bold text-white/60 mb-10 max-w-[240px]">
            Please memorize this code. It is mandatory for all future system access.
          </p>

          <button
            onClick={onProceed}
            className="w-full py-5 rounded-2xl text-xs font-bold uppercase tracking-widest bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-2xl shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Enter Dashboard
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default SuccessPopup;

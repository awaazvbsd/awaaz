import React, { useState, useRef, useMemo } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from './icons/index';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';

interface PasswordSetupProps {
  accountNumber: string;
  onSubmit: (password: string) => void;
}

const PasswordSetup: React.FC<PasswordSetupProps> = ({ accountNumber, onSubmit }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pinJoined = useMemo(() => pin.join(''), [pin]);
  const isPinCorrect = useMemo(() => pinJoined === accountNumber, [pinJoined, accountNumber]);
  const isPasswordValid = useMemo(() => password.length >= 6, [password]);
  const doPasswordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword]);

  const isFormValid = isPinCorrect && isPasswordValid && doPasswordsMatch;

  const getDigitValidation = (index: number) => {
    if (pin[index] === '') return 'neutral';
    return pin[index] === accountNumber[index] ? 'correct' : 'incorrect';
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    if (/^[0-9]?$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      if (value && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSubmit(password);
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto p-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <GlassCard className="p-8 md:p-10 !rounded-[40px] border-white/10 shadow-3xl">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-8 text-center">IDENTITY CONFIRMATION</h2>
          <div className="flex items-center gap-3 relative justify-center">
            {pin.map((digit, i) => {
              const validation = getDigitValidation(i);
              return (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(e, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className={cn(
                    "w-full aspect-[4/5] text-4xl font-bold text-center rounded-[20px] border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                    validation === 'correct' ? "bg-green-500/10 border-green-500/50 text-green-400" :
                      validation === 'incorrect' ? "bg-red-500/10 border-red-500/50 text-red-400" :
                        "bg-white/[0.03] border-white/10 text-white shadow-inner"
                  )}
                />
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-8 md:p-10 !rounded-[40px] border-white/10 shadow-3xl space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-2">CREATE SECURITY KEY</h2>

          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-purple-400 transition-colors">
              <LockIcon className="w-5 h-5" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-white/[0.03] border border-white/10 rounded-[22px] py-5 px-14 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-white/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-white/10 hover:text-white/40 transition-colors"
            >
              {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-purple-400 transition-colors">
              <LockIcon className="w-5 h-5" />
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Verify Security Key"
              className="w-full bg-white/[0.03] border border-white/10 rounded-[22px] py-5 px-14 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-white/60"
            />
          </div>

          <div className="space-y-1 px-1">
            {!isPasswordValid && password.length > 0 && (
              <p className="text-red-400/60 text-[9px] font-black uppercase tracking-widest">Insufficient length (min. 6)</p>
            )}
            {!doPasswordsMatch && confirmPassword.length > 0 && (
              <p className="text-red-400/60 text-[9px] font-black uppercase tracking-widest">Key mismatch detected</p>
            )}
          </div>
        </GlassCard>

        <button
          type="submit"
          disabled={!isFormValid}
          className={cn(
            "w-full py-5 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500 shadow-3xl",
            isFormValid
              ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5"
          )}
        >
          Initialize Core Account
        </button>
      </form>
    </div>
  );
};

export default PasswordSetup;

import React, { useState, useRef } from 'react';
import { BeamsBackground } from './ui/beams-background';
import { SlideToUnlock } from './ui/reward-card';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';
import { Eye, EyeSlash } from './Icons';
import { AnimatedLogo } from './ui/AnimatedLogo';

interface SignInScreenProps {
  onSignIn: (code: string, password: string, userType: 'student' | 'teacher') => void;
  onCreateAccount: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ onSignIn, onCreateAccount }) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [sliderKey, setSliderKey] = useState(0);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const codeString = code.join('');

    if (codeString.length !== 4) {
      alert('Please enter a 4-digit code');
      setSliderKey(prev => prev + 1); // Reset slider
      return;
    }

    if (!password) {
      alert('Please enter your password');
      setSliderKey(prev => prev + 1); // Reset slider
      return;
    }

    setIsLoading(true);
    try {
      await onSignIn(codeString, password, userType);
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed. Please check your credentials.');
      setSliderKey(prev => prev + 1); // Reset slider on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen w-screen flex items-center justify-center px-4 overflow-hidden bg-transparent font-sans text-white">
      <div className="absolute inset-0 z-0">
        <BeamsBackground intensity="medium" />
      </div>

      <GlassCard className="relative z-10 w-full max-w-[420px] p-8 md:p-10 !rounded-[40px] border-white/10 shadow-3xl">
        <div className="flex flex-col items-center justify-center mb-8">
          <AnimatedLogo size={140} className="-mb-4" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* User Type Selection */}
          <div className="space-y-2.5">
            <div className="flex p-1.5 bg-black/40 backdrop-blur-md rounded-[24px] border border-white/5 gap-1.5">
              <button
                type="button"
                onClick={() => setUserType('student')}
                className={cn(
                  "flex-1 py-4 px-4 rounded-[18px] text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
                  userType === 'student'
                    ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-500/20 scale-[1.02] ring-1 ring-white/10"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setUserType('teacher')}
                className={cn(
                  "flex-1 py-4 px-4 rounded-[18px] text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
                  userType === 'teacher'
                    ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-500/20 scale-[1.02] ring-1 ring-white/10"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                Teacher
              </button>
            </div>
          </div>

          {/* 4-Digit Code */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 ml-2 block">
              {userType === 'teacher' ? 'Admin Credential' : 'Core Identity Code'}
            </label>
            <div className="flex justify-between gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { codeInputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  pattern="[0-9]"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-full aspect-[4/5] bg-white/[0.04] border border-white/10 rounded-[20px] text-4xl font-bold text-center text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 placeholder:text-white/10"
                  required
                />
              ))}
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 ml-2 block">
              Security Key
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={userType === 'teacher' ? 'Enter admin secret' : 'Your secure key'}
                className="w-full bg-white/[0.04] border border-white/10 rounded-[22px] py-5 px-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-white/60"
                required
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-3 min-w-[44px] min-h-[44px] rounded-xl transition-all text-white/40 hover:text-white/60 active:text-white/80 active:scale-95 hover:bg-white/5"
              >
                {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <SlideToUnlock
              key={sliderKey}
              onUnlock={handleSubmit}
              sliderText={`Authorize as ${userType === 'teacher' ? 'Teacher' : 'Student'} →`}
              className="h-16"
              shimmer={true}
              unlockedContent={<div className="h-16 flex items-center justify-center"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>}
            >
              <div className="hidden"></div>
            </SlideToUnlock>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs font-bold text-white/70 uppercase tracking-[0.2em]">
            New to Awaaz?{' '}
            <button
              onClick={onCreateAccount}
              className="ml-1 text-purple-400 hover:text-purple-300 active:text-purple-200 active:scale-95 transition-all uppercase"
            >
              Create Account
            </button>
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default SignInScreen;


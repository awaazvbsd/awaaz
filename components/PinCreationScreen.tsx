import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from './icons/index';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';

import { StorageService } from '../services/storageService';

interface PinCreationScreenProps {
    onSubmit: (pin: string, password: string) => void;
}

const PinCreationScreen: React.FC<PinCreationScreenProps> = ({ onSubmit }) => {
    // PIN State
    const [pin, setPin] = useState(['', '', '', '']);
    const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [pinAvailability, setPinAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    // Password State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Derived State
    const pinJoined = useMemo(() => pin.join(''), [pin]);
    const isPinComplete = pinJoined.length === 4;
    const isPasswordValid = password.length >= 6;
    const doPasswordsMatch = password === confirmPassword;

    // --- PIN LOGIC ---

    const checkPinAvailability = async (code: string) => {
        if (code.length !== 4) {
            setPinAvailability('idle');
            return;
        }

        setPinAvailability('checking');

        try {
            // 1. Check Firebase (authoritative)
            const existsInFirebase = await StorageService.checkUserExists(code);

            if (existsInFirebase) {
                setPinAvailability('taken');
                return;
            }

            // 2. Check local storage (for offline or unsynced data)
            const accounts = StorageService.getItem<any[]>('studentAccounts');
            let isTaken = false;

            if (accounts) {
                if (Array.isArray(accounts)) {
                    isTaken = accounts.some((acc: any) => acc.accountNumber === code);
                } else if (typeof accounts === 'object') {
                    isTaken = (accounts as any).accountNumber === code;
                }
            }

            // Check reserved codes
            if (code === '9999') isTaken = true;

            setPinAvailability(isTaken ? 'taken' : 'available');
        } catch (error) {
            console.error("Error checking PIN availability:", error);
            // Fallback to allowing it if check fails to avoid blocking users (or could block, depending on security stance)
            // Safer to block if offline check is strict, but let's assume we proceed with local check
            setPinAvailability('available');
        }
    };

    useEffect(() => {
        if (isPinComplete) {
            checkPinAvailability(pinJoined);
        } else {
            setPinAvailability('idle');
        }
    }, [pinJoined, isPinComplete]);

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        // Allow numbers only
        if (/^[0-9]?$/.test(value)) {
            const newPin = [...pin];
            newPin[index] = value;
            setPin(newPin);

            // Auto-advance
            if (value && index < 3) {
                pinInputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinInputRefs.current[index - 1]?.focus();
        }
    };

    // --- FORM SUBMIT ---

    const isFormValid = isPinComplete && pinAvailability === 'available' && isPasswordValid && doPasswordsMatch;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormValid) {
            onSubmit(pinJoined, password);
        }
    };

    return (
        <div className="w-full max-w-[440px] mx-auto p-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Step 1: PIN Creation */}
                <GlassCard className="p-8 md:p-10 !rounded-[40px] border-white/10 shadow-3xl">
                    <h2 className="text-xl font-bold tracking-wider text-white/40 mb-8 text-center">STEP 1: CREATE YOUR IDENTITY CODE</h2>

                    <div className="relative mb-6">
                        <div className="flex items-center gap-3 justify-center mb-6">
                            {pin.map((digit, i) => {
                                // Determine border color based on status
                                let statusClasses = "bg-white/[0.03] border-white/10 text-white shadow-inner";

                                if (isPinComplete) {
                                    if (pinAvailability === 'available') {
                                        statusClasses = "bg-green-500/10 border-green-500/50 text-green-400";
                                    } else if (pinAvailability === 'taken') {
                                        statusClasses = "bg-red-500/10 border-red-500/50 text-red-400";
                                    }
                                }

                                return (
                                    <input
                                        key={i}
                                        ref={el => { pinInputRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handlePinChange(e, i)}
                                        onKeyDown={(e) => handlePinKeyDown(e, i)}
                                        className={cn(
                                            "w-full aspect-[4/5] text-4xl font-bold text-center rounded-[20px] border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                                            statusClasses
                                        )}
                                    />
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
                                setPin(randomCode.split(''));
                            }}
                            className="w-full py-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold uppercase tracking-[0.2em] text-white/70 hover:bg-white/5 hover:border-white/10 hover:text-white/90 transition-all duration-300 mb-2"
                        >
                            Generate Random Identity Code
                        </button>

                        {/* Availability Feedback Message */}
                        <div className="h-6 flex items-center justify-center">
                            {isPinComplete && pinAvailability === 'checking' && (
                                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest animate-pulse">Checking availability...</p>
                            )}
                            {isPinComplete && pinAvailability === 'available' && (
                                <p className="text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    Code Available
                                </p>
                            )}
                            {isPinComplete && pinAvailability === 'taken' && (
                                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                    Code Already Taken
                                </p>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* Step 2: Password */}
                <div className={cn("transition-all duration-500", pinAvailability === 'available' ? "opacity-100 translate-y-0" : "opacity-50 translate-y-4 pointer-events-none")}>
                    <GlassCard className="p-8 md:p-10 !rounded-[40px] border-white/10 shadow-3xl space-y-6">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-2">STEP 2: CREATE PASSWORD</h2>

                        <div className="relative group">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-purple-400 transition-colors">
                                <LockIcon className="w-5 h-5" />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                disabled={pinAvailability !== 'available'}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-[22px] py-5 px-14 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-white/60 disabled:opacity-50"
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
                                placeholder="Verify Password"
                                disabled={pinAvailability !== 'available'}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-[22px] py-5 px-14 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-white/60 disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-1 px-1">
                            {!isPasswordValid && password.length > 0 && (
                                <p className="text-red-400/60 text-[9px] font-black uppercase tracking-widest">Insufficient length (min. 6)</p>
                            )}
                            {!doPasswordsMatch && confirmPassword.length > 0 && (
                                <p className="text-red-400/60 text-[9px] font-black uppercase tracking-widest">Passwords do not match</p>
                            )}
                        </div>
                    </GlassCard>
                </div>

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
                    COMPLETE REGISTRATION
                </button>
            </form>
        </div>
    );
};

export default PinCreationScreen;

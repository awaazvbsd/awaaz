'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Award, Star } from 'lucide-react'; // Using Lucide icons as fallback for badge graphic
import confetti from 'canvas-confetti';
import { OnboardingService } from '../../services/onboardingService';

interface CompletionCelebrationProps {
    studentCode: string;
    onClose: () => void;
}

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({ studentCode, onClose }) => {

    useEffect(() => {
        // Trigger confetti
        const end = Date.now() + 3 * 1000;
        const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());

        // Optionally force "First Steps" badge logic here or ensure it's synced
        // For now, we assume the backend/service layer handles the actual data update,
        // this is just the visual layer.
    }, [studentCode]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-full max-w-md bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/50 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-indigo-500/10 blur-3xl pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white"
                >
                    <X size={24} />
                </button>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative z-10 flex flex-col items-center"
                >
                    <h2 className="text-3xl font-bolder text-white mb-2 tracking-tight">You're All Set Up!</h2>
                    <p className="text-indigo-200 mb-8">You've unlocked the <span className="text-yellow-400 font-bold">First Steps</span> badge!</p>

                    {/* Badge Visual */}
                    <motion.div
                        initial={{ rotateY: 90 }}
                        animate={{ rotateY: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="w-40 h-40 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.4)] mb-8 relative border-4 border-yellow-200"
                    >
                        <Award size={80} className="text-white drop-shadow-lg" />
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full m-[-8px]"
                        />
                        <div className="absolute bottom-[-10px] bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/50 shadow-md">
                            BADGE UNLOCKED
                        </div>
                    </motion.div>

                    <p className="text-slate-300 text-sm mb-8 leading-relaxed max-w-xs">
                        Keep completing sessions and daily tasks to level up your tier from Wood to Diamond!
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={onClose}
                            className="w-full bg-white text-indigo-900 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg active:scale-95"
                        >
                            View My Achievements
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white/60 text-sm font-medium hover:text-white py-2"
                        >
                            Continue to Dashboard
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

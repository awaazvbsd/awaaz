'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Zap } from 'lucide-react';

interface SessionStartTransitionProps {
    onComplete: () => void;
}

export const SessionStartTransition: React.FC<SessionStartTransitionProps> = ({ onComplete }) => {
    const [mounted, setMounted] = React.useState(false);
    const [stage, setStage] = React.useState(0);

    React.useEffect(() => {
        setMounted(true);

        // Animation Sequence
        // 0-500ms: Fade In
        // 500-1500ms: Text & Icon Reveal
        // 1500-2500ms: "Warp" / Zoom effect
        // 2500ms: Complete

        const timer1 = setTimeout(() => setStage(1), 100);
        const timer2 = setTimeout(() => setStage(2), 1800);
        const timer3 = setTimeout(() => {
            onComplete();
        }, 2500);

        return () => {
            setMounted(false);
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [onComplete]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence mode="wait">
            <motion.div
                key="session-transition"
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Background Ambient Glow */}
                <motion.div
                    className="absolute inset-0 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[100px]"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col items-center">

                    {/* Icon Transform */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={stage >= 1 ? { scale: 1, rotate: 0 } : {}}
                        transition={{ type: "spring", damping: 12, stiffness: 100 }}
                        className="mb-8 relative"
                    >
                        {/* Ripple Effect Behind Icon */}
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                className="absolute inset-0 rounded-full border border-purple-400/30"
                                initial={{ scale: 1, opacity: 0 }}
                                animate={{ scale: 2.5, opacity: 0 }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.4,
                                    ease: "easeOut"
                                }}
                            />
                        ))}

                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.5)] border-4 border-white/20">
                            <Mic className="text-white w-14 h-14" />
                        </div>
                    </motion.div>

                    {/* Text Stagger */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={stage >= 1 ? { opacity: 1, y: 0 } : {}}
                        className="text-center"
                    >
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white tracking-tight mb-4">
                            INITIALIZING
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-purple-300 uppercase tracking-[0.2em] font-medium text-sm">
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            <span>Prepare for Analysis</span>
                            <Sparkles className="w-4 h-4 animate-pulse" />
                        </div>
                    </motion.div>

                    {/* Loading Bar */}
                    <motion.div
                        className="mt-12 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={stage >= 1 ? { opacity: 1 } : {}}
                    >
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                        />
                    </motion.div>

                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

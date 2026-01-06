'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    TreeDeciduous,
    Mountain,
    Sparkles,
    Coins,
    Shield,
    Sword,
    Medal,
    Crown,
    Flame,
    Gem,
    ChevronUp,
    X
} from 'lucide-react';
import { MaterialTier } from '../../types';

interface TierLevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    newTier: MaterialTier;
    previousTier?: MaterialTier;
}

// Icon mapping for tiers
const TIER_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    TreeDeciduous,
    Mountain,
    Sparkles,
    Coins,
    Shield,
    Sword,
    Medal,
    Crown,
    Flame,
    Gem,
};

// Particle colors for each tier
const TIER_PARTICLE_COLORS: Record<string, string[]> = {
    Wood: ['#8B4513', '#A0522D', '#D2691E'],
    Stone: ['#6B7280', '#9CA3AF', '#D1D5DB'],
    Quartz: ['#E5E7EB', '#F3F4F6', '#FFFFFF', '#C4B5FD'],
    Copper: ['#B87333', '#CD853F', '#DEB887'],
    Bronze: ['#CD7F32', '#DAA520', '#FFD700'],
    Iron: ['#4B5563', '#6B7280', '#9CA3AF'],
    Silver: ['#C0C0C0', '#D3D3D3', '#E8E8E8', '#FFFFFF'],
    Gold: ['#FFD700', '#FFA500', '#FFE4B5', '#FFFFFF'],
    Obsidian: ['#1F1F2E', '#6B21A8', '#9333EA', '#C084FC'],
    Diamond: ['#FF6B6B', '#FFE66D', '#4ECB71', '#00D4FF', '#9B59B6'],
};

export const TierLevelUpModal: React.FC<TierLevelUpModalProps> = ({
    isOpen,
    onClose,
    newTier,
    previousTier
}) => {
    const [showContent, setShowContent] = React.useState(false);
    const [animationStage, setAnimationStage] = React.useState(0);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Animation sequence
    React.useEffect(() => {
        if (isOpen) {
            setShowContent(true);
            setAnimationStage(0);

            // Stage 1: Show "Level Up!" text
            const timer1 = setTimeout(() => setAnimationStage(1), 300);
            // Stage 2: Show tier transition
            const timer2 = setTimeout(() => setAnimationStage(2), 800);
            // Stage 3: Show new tier details
            const timer3 = setTimeout(() => setAnimationStage(3), 1500);
            // Stage 4: Fire confetti
            const timer4 = setTimeout(() => {
                setAnimationStage(4);
                fireConfetti(newTier.name);
            }, 2000);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
                clearTimeout(timer4);
            };
        } else {
            setShowContent(false);
            setAnimationStage(0);
        }
    }, [isOpen, newTier.name]);

    const fireConfetti = (tierName: string) => {
        const colors = TIER_PARTICLE_COLORS[tierName] || ['#a855f7', '#8b5cf6'];
        const duration = 3500;
        const end = Date.now() + duration;

        const frame = () => {
            // Left cannon
            confetti({
                particleCount: 4,
                angle: 60,
                spread: 70,
                origin: { x: 0, y: 0.6 },
                colors,
                startVelocity: 55,
                zIndex: 10001,
            });

            // Right cannon
            confetti({
                particleCount: 4,
                angle: 120,
                spread: 70,
                origin: { x: 1, y: 0.6 },
                colors,
                startVelocity: 55,
                zIndex: 10001,
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };

    const TierIcon = TIER_ICONS[newTier.iconName] || Gem;
    const PrevTierIcon = previousTier ? (TIER_ICONS[previousTier.iconName] || TreeDeciduous) : null;

    if (!isOpen || !mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center"
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative z-10 flex flex-col items-center text-center px-8 py-12 max-w-md mx-4"
                >

                    {/* Level Up Text */}
                    <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={animationStage >= 1 ? { scale: 1, rotate: 0 } : { scale: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <ChevronUp className="text-yellow-400 w-8 h-8 animate-bounce" />
                            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400">
                                LEVEL UP!
                            </h1>
                            <ChevronUp className="text-yellow-400 w-8 h-8 animate-bounce" />
                        </div>
                    </motion.div>

                    {/* Tier Transition */}
                    <div className="flex items-center gap-6 mb-8">
                        {/* Previous Tier (if exists) */}
                        {previousTier && PrevTierIcon && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={animationStage >= 2 ? { opacity: 0.4, x: 0 } : { opacity: 0 }}
                                    className="flex flex-col items-center"
                                >
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center opacity-50"
                                        style={{ background: previousTier.accentColor.gradient }}
                                    >
                                        <PrevTierIcon className="text-white/80" size={32} />
                                    </div>
                                    <span className="text-white/40 text-sm mt-2">{previousTier.name}</span>
                                </motion.div>

                                {/* Arrow */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={animationStage >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0 }}
                                    className="text-white/60 text-3xl"
                                >
                                    →
                                </motion.div>
                            </>
                        )}

                        {/* New Tier */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0, x: 30 }}
                            animate={animationStage >= 2 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                            className="flex flex-col items-center"
                        >
                            <motion.div
                                animate={animationStage >= 3 ? {
                                    scale: [1, 1.1, 1],
                                    boxShadow: [
                                        `0 0 20px ${newTier.accentColor.primary}40`,
                                        `0 0 60px ${newTier.accentColor.primary}80`,
                                        `0 0 30px ${newTier.accentColor.primary}60`,
                                    ]
                                } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
                                style={{ background: newTier.accentColor.gradient }}
                            >
                                <TierIcon className="text-white drop-shadow-lg" size={48} />
                            </motion.div>
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={animationStage >= 3 ? { opacity: 1, y: 0 } : { opacity: 0 }}
                                className="text-white font-bold text-xl mt-3"
                            >
                                {newTier.name}
                            </motion.span>
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={animationStage >= 3 ? { opacity: 1 } : { opacity: 0 }}
                                className="text-white/60 text-sm"
                            >
                                Level {newTier.level}
                            </motion.span>
                        </motion.div>
                    </div>

                    {/* New Color Unlocked */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={animationStage >= 4 ? { opacity: 1, y: 0 } : { opacity: 0 }}
                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <Sparkles className="text-yellow-400 w-5 h-5" />
                            <span className="text-white font-semibold">New Color Unlocked!</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div
                                className="w-12 h-12 rounded-full shadow-lg border-2 border-white/30"
                                style={{ background: newTier.accentColor.gradient }}
                            />
                            <div className="text-left">
                                <div className="text-white font-medium">{newTier.name} Theme</div>
                                <div className="text-white/60 text-sm">Available in Achievement Center</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Continue Button */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={animationStage >= 4 ? { opacity: 1, y: 0 } : { opacity: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={onClose}
                        className="mt-8 px-8 py-3 rounded-full font-semibold text-white transition-all hover:scale-105 active:scale-95"
                        style={{ background: newTier.accentColor.gradient }}
                    >
                        Continue
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default TierLevelUpModal;

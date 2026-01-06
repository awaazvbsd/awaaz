'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star,
    Zap,
    Flame,
    Sparkles,
    ChevronRight,
    TreeDeciduous,
    Mountain,
    Coins,
    Shield,
    Sword,
    Medal,
    Crown,
    Gem
} from 'lucide-react';
import {
    calculateTier,
    getTierProgress,
    getGamificationData,
    saveGamificationData,
    setSelectedAccentTier,
    applyAccentColor,
    MATERIAL_TIERS,
    checkTierUp
} from '../../services/gamificationService';
import { MaterialTier } from '../../types';
import { AccentColorPicker } from './AccentColorPicker';
import { TierLevelUpModal } from './TierLevelUpModal';

const MotionDiv = motion.div as any;

interface GamifiedSolutionLibraryProps {
    className?: string;
    suggestions?: Array<{ id: string; label: string; type: 'immediate' | 'longterm'; completed: boolean }>;
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

export const GamifiedSolutionLibrary: React.FC<GamifiedSolutionLibraryProps> = ({ className, suggestions = [] }) => {
    const [completedTasks, setCompletedTasks] = React.useState(0);
    const [currentTier, setCurrentTier] = React.useState<MaterialTier>(MATERIAL_TIERS[0]);
    const [selectedAccentTier, setSelectedAccentTierState] = React.useState(1);
    const [streak, setStreak] = React.useState(0);
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const [showLevelUp, setShowLevelUp] = React.useState(false);
    const [newTierData, setNewTierData] = React.useState<{ newTier: MaterialTier; previousTier: MaterialTier } | null>(null);
    const [studentCode, setStudentCode] = React.useState<string>('');

    const previousTasksRef = React.useRef<number>(0);

    // Initialize on mount
    React.useEffect(() => {
        const userData = localStorage.getItem('userData');
        if (!userData) return;

        try {
            const parsed = JSON.parse(userData);
            const code = parsed.accountNumber;
            setStudentCode(code);

            // Load gamification data
            const gamData = getGamificationData(code);
            setCompletedTasks(gamData.completedTasks);
            setCurrentTier(calculateTier(gamData.completedTasks));
            setSelectedAccentTierState(gamData.selectedAccentTier);
            previousTasksRef.current = gamData.completedTasks;

            // Apply saved accent color
            applyAccentColor(gamData.selectedAccentTier);

            // Load streak data
            const streakKey = `streak_data_${code}`;
            const savedStreakData = localStorage.getItem(streakKey);
            if (savedStreakData) {
                const streakData = JSON.parse(savedStreakData);
                setStreak(streakData.currentStreak || 0);
            }
        } catch (error) {
            console.error('Error initializing gamification:', error);
        }
    }, []);

    // Listen for task completion updates
    React.useEffect(() => {
        const updateFromStorage = () => {
            if (!studentCode) return;

            try {
                // Count completed tasks from suggestions
                const completionKey = `suggestions_completed_${studentCode}`;
                const saved = localStorage.getItem(completionKey);
                const completedMap = saved ? JSON.parse(saved) : {};
                const allCompletedTaskIds = Object.keys(completedMap).filter(id => completedMap[id] === true);
                const newTaskCount = allCompletedTaskIds.length;

                // Save to gamification data
                const gamData = getGamificationData(studentCode);
                const lastShown = gamData.lastTierShown || 0;

                // Check for tier up
                const tierUp = checkTierUp(previousTasksRef.current, newTaskCount);
                if (tierUp && newTaskCount > previousTasksRef.current) {
                    // Only show if the new tier is higher than what we've already shown
                    // This prevents re-showing popups on page reload/sync
                    if (tierUp.level > lastShown) {
                        const previousTier = calculateTier(previousTasksRef.current);
                        setNewTierData({ newTier: tierUp, previousTier });
                        setShowLevelUp(true);

                        // Update persisted last shown tier immediately
                        gamData.lastTierShown = tierUp.level;
                    }
                }

                // Update state
                setCompletedTasks(newTaskCount);
                setCurrentTier(calculateTier(newTaskCount));
                previousTasksRef.current = newTaskCount;

                // Update and save gamification data
                gamData.completedTasks = newTaskCount;
                gamData.currentTier = calculateTier(newTaskCount).level;

                // Ensure lastTierShown is preserved/updated
                if (gamData.lastTierShown === null || (tierUp && tierUp.level > (gamData.lastTierShown || 0))) {
                    if (tierUp) gamData.lastTierShown = tierUp.level;
                }

                saveGamificationData(studentCode, gamData);

                // Update streak
                const streakKey = `streak_data_${studentCode}`;
                const savedStreakData = localStorage.getItem(streakKey);
                if (savedStreakData) {
                    const streakData = JSON.parse(savedStreakData);
                    setStreak(streakData.currentStreak || 0);
                }
            } catch (error) {
                console.error('Error updating gamification data:', error);
            }
        };

        // Listen for custom events
        window.addEventListener('suggestionsUpdated', updateFromStorage);
        window.addEventListener('taskCompleted', updateFromStorage);

        // Poll periodically
        const interval = setInterval(updateFromStorage, 2000);

        return () => {
            window.removeEventListener('suggestionsUpdated', updateFromStorage);
            window.removeEventListener('taskCompleted', updateFromStorage);
            clearInterval(interval);
        };
    }, [studentCode]);

    const handleSelectColor = (tierLevel: number) => {
        if (!studentCode) return;
        setSelectedAccentTierState(tierLevel);
        setSelectedAccentTier(studentCode, tierLevel);
    };

    const tierProgress = getTierProgress(completedTasks);
    const TierIcon = TIER_ICONS[currentTier.iconName] || Gem;

    return (
        <div className={`w-full max-w-md mx-auto relative accent-transition ${className}`}>
            {/* Level Up Modal */}
            {newTierData && (
                <TierLevelUpModal
                    isOpen={showLevelUp}
                    onClose={() => {
                        setShowLevelUp(false);
                        setNewTierData(null);
                    }}
                    newTier={newTierData.newTier}
                    previousTier={newTierData.previousTier}
                />
            )}

            <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-xl rounded-2xl p-6 shadow-2xl"
            >

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                        <h2 className="text-xl font-bold text-white">My Achievements</h2>
                    </div>
                </div>

                {/* Tier Card - Featured Section */}
                <MotionDiv
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl p-5 mb-6"
                    style={{ background: currentTier.accentColor.gradient }}
                >
                    {/* Decorative glow */}
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            background: `radial-gradient(circle at 30% 30%, ${currentTier.accentColor.primary}80, transparent 50%)`,
                        }}
                    />

                    <div className="relative flex items-center gap-4">
                        {/* Tier Icon */}
                        <MotionDiv
                            animate={{
                                scale: [1, 1.05, 1],
                                rotate: [0, 2, -2, 0],
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
                        >
                            <TierIcon
                                size={32}
                                className={currentTier.name === 'Quartz' ? 'text-slate-700' : 'text-white'}
                            />
                        </MotionDiv>

                        {/* Tier Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-medium ${['Quartz', 'Gold'].includes(currentTier.name) ? 'text-slate-600' : 'text-white/70'}`}>
                                    Level {currentTier.level}
                                </span>
                            </div>
                            <h3 className={`text-2xl font-bold ${['Quartz', 'Gold'].includes(currentTier.name) ? 'text-slate-800' : 'text-white'}`}>
                                {currentTier.name}
                            </h3>
                            <p className={`text-sm ${['Quartz', 'Gold'].includes(currentTier.name) ? 'text-slate-600' : 'text-white/70'}`}>
                                {completedTasks} tasks completed
                            </p>
                        </div>
                    </div>

                    {/* Progress to Next Tier */}
                    {tierProgress.nextTier && (
                        <div className="relative mt-4">
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className={['Quartz', 'Gold'].includes(currentTier.name) ? 'text-slate-600' : 'text-white/70'}>
                                    Progress to {tierProgress.nextTier.name}
                                </span>
                                <span className={['Quartz', 'Gold'].includes(currentTier.name) ? 'text-slate-700' : 'text-white/90'}>
                                    {tierProgress.current}/{tierProgress.max}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                                <MotionDiv
                                    initial={{ width: 0 }}
                                    animate={{ width: `${tierProgress.percentage}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="h-full bg-white/80 rounded-full"
                                />
                            </div>
                        </div>
                    )}

                    {tierProgress.nextTier === null && (
                        <div className="relative mt-4 text-center">
                            <span className="text-white/90 text-sm font-medium">🏆 Maximum Level Reached!</span>
                        </div>
                    )}
                </MotionDiv>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {/* Total Points */}
                    <MotionDiv
                        whileHover={{ scale: 1.05 }}
                        className="accent-bg-subtle rounded-xl p-3 border accent-border-subtle text-center"
                    >
                        <Star className="w-5 h-5 accent-text mx-auto mb-1" />
                        <div className="text-lg font-bold text-white">{completedTasks * 10}</div>
                        <div className="text-xs text-purple-300">Points</div>
                    </MotionDiv>

                    {/* Streak */}
                    <MotionDiv
                        whileHover={{ scale: 1.05 }}
                        className="bg-orange-500/20 rounded-xl p-3 border border-orange-400/30 text-center"
                    >
                        <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-white">{streak}</div>
                        <div className="text-xs text-orange-300">Day Streak</div>
                    </MotionDiv>

                    {/* Tasks */}
                    <MotionDiv
                        whileHover={{ scale: 1.05 }}
                        className="bg-blue-500/20 rounded-xl p-3 border border-blue-400/30 text-center"
                    >
                        <Zap className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-white">{completedTasks}</div>
                        <div className="text-xs text-blue-300">Tasks</div>
                    </MotionDiv>
                </div>

                {/* Theme Colors Section */}
                <div className="border-t border-white/10 pt-5">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full flex items-center justify-between text-left mb-3 group"
                    >
                        <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} />
                            Theme Colors
                        </h3>
                        <MotionDiv
                            animate={{ rotate: showColorPicker ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRight size={16} className="text-purple-400 group-hover:text-purple-300" />
                        </MotionDiv>
                    </button>

                    <AnimatePresence>
                        {showColorPicker && (
                            <MotionDiv
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <AccentColorPicker
                                    currentTier={currentTier.level}
                                    selectedTier={selectedAccentTier}
                                    onSelectColor={handleSelectColor}
                                />
                            </MotionDiv>
                        )}
                    </AnimatePresence>
                </div>
            </MotionDiv>
        </div >
    );
};

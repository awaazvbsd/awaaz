'use client';

import * as React from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
const MotionDiv = motion.div as any;
const MotionP = motion.p as any;
const MotionSVG = motion.svg as any;
import {
    Droplet,
    Moon,
    Footprints,
    Music,
    BookOpen,
    Wind,
    Utensils,
    Brain,
    Users,
    Sun,
    Sparkles,
    Smile,
    Coffee,
    CheckSquare
} from 'lucide-react';
import { StorageService } from '../../services/storageService';

// --- Types ---
interface SuggestionItem {
    id: string;
    label: string;
    type: 'immediate' | 'longterm';
    completed: boolean;
}

interface FloatingWellbeingBarProps {
    className?: string;
    onTasksCompleted?: () => void;
}

// --- Constants ---
const ITEMS_PER_PAGE = 4;

const defaultItems = [
    { id: '1', label: 'Drink 8 glasses of water', defaultChecked: false },
    { id: '2', label: 'Sleep 7-8 hours tonight', defaultChecked: false },
    { id: '3', label: 'Read 10 pages today', defaultChecked: false },
    { id: '4', label: 'Take a 10-minute walk', defaultChecked: false },
    { id: '5', label: 'Practice 5 minutes of meditation', defaultChecked: false },
    { id: '6', label: 'Eat a healthy meal', defaultChecked: false },
];

// --- Utilities ---
const convertSuggestionsToItems = (suggestions: SuggestionItem[]) => {
    const immediate = suggestions.filter(s => s.type === 'immediate');
    const longTerm = suggestions.filter(s => s.type === 'longterm');
    return [...immediate, ...longTerm].map((suggestion) => ({
        id: suggestion.id,
        label: suggestion.label,
        defaultChecked: suggestion.completed,
        suggestionId: suggestion.id
    }));
};

const getIconForSuggestion = (text: string) => {
    const t = text.toLowerCase();

    if (t.includes('water') || t.includes('drink') || t.includes('hydrate'))
        return <Droplet className="w-5 h-5 text-cyan-400" />;
    if (t.includes('sleep') || t.includes('rest') || t.includes('nap') || t.includes('bed') || t.includes('night'))
        return <Moon className="w-5 h-5 text-indigo-400" />;
    if (t.includes('walk') || t.includes('run') || t.includes('exercise') || t.includes('stretch') || t.includes('yoga') || t.includes('move'))
        return <Footprints className="w-5 h-5 text-emerald-400" />;
    if (t.includes('hum') || t.includes('sing') || t.includes('voice') || t.includes('throat') || t.includes('vocal') || t.includes('sigh'))
        return <Music className="w-5 h-5 text-rose-400" />;
    if (t.includes('read') || t.includes('book') || t.includes('study') || t.includes('learn') || t.includes('focus'))
        return <BookOpen className="w-5 h-5 text-amber-400" />;
    if (t.includes('breath') || t.includes('lung') || t.includes('air') || t.includes('inhale') || t.includes('exhale'))
        return <Wind className="w-5 h-5 text-sky-400" />;
    if (t.includes('eat') || t.includes('meal') || t.includes('food') || t.includes('diet') || t.includes('fruit') || t.includes('veg'))
        return <Utensils className="w-5 h-5 text-orange-400" />;
    if (t.includes('meditate') || t.includes('calm') || t.includes('relax') || t.includes('mind') || t.includes('peace') || t.includes('gratitude'))
        return <Brain className="w-5 h-5 text-violet-400" />;
    if (t.includes('friend') || t.includes('social') || t.includes('talk') || t.includes('family') || t.includes('call'))
        return <Users className="w-5 h-5 text-pink-400" />;
    if (t.includes('sun') || t.includes('outside') || t.includes('nature') || t.includes('fresh'))
        return <Sun className="w-5 h-5 text-yellow-400" />;
    if (t.includes('smile') || t.includes('happy') || t.includes('laugh') || t.includes('joy'))
        return <Smile className="w-5 h-5 text-yellow-300" />;
    if (t.includes('coffee') || t.includes('tea'))
        return <Coffee className="w-5 h-5 text-amber-700" />;

    return <Sparkles className="w-5 h-5 text-yellow-200" />;
};

// --- SVG Filter for Ripple/Warp ---
const RippleFilter = () => (
    <svg className="hidden">
        <defs>
            <filter id="water-ripple" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>
    </svg>
);

export const FloatingWellbeingBar: React.FC<FloatingWellbeingBarProps> = ({ className, onTasksCompleted }) => {
    // Load all items from storage
    const loadAllItems = React.useCallback(() => {
        const userData = StorageService.getItem<any>('userData');
        if (userData) {
            try {
                const studentCode = userData.accountNumber;

                // 1. Fetch teacher-assigned tasks from SessionPlan
                const plansKey = 'awaaz_session_plans'; // Const from planningService
                const savedPlans = StorageService.getItem<Record<string, any>>(plansKey);
                let teacherTasks: SuggestionItem[] = [];

                if (savedPlans) {
                    const plan = savedPlans[studentCode];
                    if (plan && plan.isActive && plan.assignedTasks) {
                        teacherTasks = plan.assignedTasks
                            .filter((t: string) => t.trim() !== '')
                            .map((label: string, idx: number) => ({
                                id: `teacher_${idx}`,
                                label: label,
                                type: 'immediate',
                                completed: false
                            }));
                    }
                }

                // 2. Fetch AI suggestions
                const suggestionsKey = `suggestions_${studentCode}`;
                const suggestionsData = StorageService.getItem<any>(suggestionsKey);
                let aiItems: any[] = [];

                if (suggestionsData) {
                    if (suggestionsData.suggestions && suggestionsData.suggestions.length > 0) {
                        const completionKey = `suggestions_completed_${studentCode}`;
                        const completedMap = StorageService.getItem<Record<string, boolean>>(completionKey) || {};
                        const suggestionsWithCompletion = suggestionsData.suggestions.map((s: SuggestionItem) => ({
                            ...s,
                            completed: completedMap[s.id] || false
                        }));
                        aiItems = convertSuggestionsToItems(suggestionsWithCompletion);
                    }
                }

                // 3. Merge: Teacher tasks FIRST
                const teacherItems = teacherTasks.map(t => ({
                    id: t.id,
                    label: t.label,
                    defaultChecked: false,
                    suggestionId: t.id
                }));

                const merged = [...teacherItems, ...(aiItems.length > 0 ? aiItems : defaultItems)];

                // Deduplicate by label (case insensitive) to avoid redundancy
                const seen = new Set();
                return merged.filter(item => {
                    const l = item.label.toLowerCase();
                    if (seen.has(l)) return false;
                    seen.add(l);
                    return true;
                });

            } catch (error) { console.error(error); }
        }
        return defaultItems;
    }, []);

    const [allItems, setAllItems] = React.useState(() => loadAllItems());
    const [checked, setChecked] = React.useState<boolean[]>(() => {
        const items = loadAllItems();
        const userData = StorageService.getItem<any>('userData');
        if (userData && items.length > 0) {
            try {
                const code = userData.accountNumber;
                const map = StorageService.getItem<Record<string, boolean>>(`suggestions_completed_${code}`) || {};
                return items.map(item => {
                    const id = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
                    return map[id] || false;
                });
            } catch { }
        }
        return items.map(i => !!i.defaultChecked);
    });

    const [currentPage, setCurrentPage] = React.useState(0);
    const [expandedId, setExpandedId] = React.useState<string | number | null>(null);
    const isInitialMount = React.useRef(true);

    // Calculate pagination
    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const displayedItems = allItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Navigation handlers
    const goToPreviousPage = () => {
        setCurrentPage(prev => Math.max(0, prev - 1));
    };

    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
    };

    // Save completion state
    React.useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const userData = StorageService.getItem<any>('userData');
        if (userData && allItems.length > 0) {
            try {
                const code = userData.accountNumber;
                const key = `suggestions_completed_${code}`;
                const map = StorageService.getItem<Record<string, boolean>>(key) || {};

                allItems.forEach((item, idx) => {
                    const id = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
                    const wasCompleted = map[id] === true;
                    map[id] = checked[idx];

                    // If task was just completed, record completion date and dispatch event
                    if (checked[idx] && !wasCompleted) {
                        const todayDate = new Date().toISOString().split('T')[0];
                        const streakCompletionKey = `streak_completions_${code}`;
                        const streakDates = StorageService.getItem<Record<string, string>>(streakCompletionKey) || {};
                        streakDates[id] = todayDate;
                        StorageService.setItem(streakCompletionKey, streakDates, code, 'state');

                        // Dispatch event for gamification system
                        window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { taskId: id, date: todayDate } }));
                    }
                });
                StorageService.setItem(key, map, code, 'state');

                // Check if all tasks completed
                if (checked.every(c => c === true) && allItems.length > 0) {
                    if (onTasksCompleted) onTasksCompleted();
                }
            } catch (e) { console.error(e); }
        }
    }, [checked, allItems, onTasksCompleted]);

    // Listen for external storage updates (Sync from Firebase)
    React.useEffect(() => {
        const handleStorageUpdate = (e: CustomEvent<{ key: string, data: any }>) => {
            const userData = StorageService.getItem<any>('userData');
            if (userData) {
                const code = userData.accountNumber;
                const completionKey = `suggestions_completed_${code}`;
                const plansKey = 'awaaz_session_plans';

                // Case: Session Plan updated (new tasks assigned)
                if (e.detail.key === plansKey) {
                    console.log('[FloatingWellbeingBar] Received session plan update, reloading tasks...');
                    loadAllItems();
                }

                if (e.detail.key === completionKey) {
                    console.log('[FloatingWellbeingBar] Received storage update for completions, refreshing UI');
                    const map = e.detail.data as Record<string, boolean>;

                    // Update checked state based on new data
                    setChecked(prevChecked => {
                        return allItems.map(item => {
                            const id = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
                            return map[id] === true;
                        });
                    });
                }
            }
        };

        window.addEventListener('storage_key_updated', handleStorageUpdate as EventListener);
        return () => window.removeEventListener('storage_key_updated', handleStorageUpdate as EventListener);
    }, [allItems, loadAllItems]);

    const handleToggle = React.useCallback((globalIdx: number) => {
        setChecked(prev => {
            const next = [...prev];
            next[globalIdx] = !next[globalIdx];
            return next;
        });
    }, []);

    // Calculate completion stats
    const completedCount = checked.filter(c => c).length;
    const totalCount = allItems.length;

    return (
        <div id="daily-wellness-section" className={`w-full max-w-md mx-auto relative ${className}`}>
            <RippleFilter />

            {/* Header Section */}
            <div className="flex items-center justify-between px-1 mb-3">
                <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-purple-400" />
                    <h2 className="text-white/90 text-lg font-semibold tracking-tight">Daily Wellness Tasks</h2>
                </div>
                <span className="text-sm text-purple-300">
                    {completedCount}/{totalCount}
                </span>
            </div>

            {/* Tasks Container */}
            <div className="relative overflow-hidden pl-1 pr-1 pb-1">
                <MotionDiv
                    className="flex flex-col gap-3 min-h-[220px] touch-pan-y"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(e, { offset, velocity }) => {
                        const swipeThreshold = 50;
                        if (offset.x > swipeThreshold) {
                            goToPreviousPage();
                        } else if (offset.x < -swipeThreshold) {
                            goToNextPage();
                        }
                    }}
                >
                    <AnimatePresence mode="wait">
                        <MotionDiv
                            key={currentPage}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-3 w-full"
                        >
                            {displayedItems.map((item, idx) => {
                                const globalIdx = startIndex + idx;
                                const isChecked = checked[globalIdx];
                                const isExpanded = expandedId === item.id;

                                return (
                                    <TaskCard
                                        key={item.id}
                                        item={item}
                                        isChecked={isChecked}
                                        isExpanded={isExpanded}
                                        onToggle={() => handleToggle(globalIdx)}
                                        onExpand={() => setExpandedId(isExpanded ? null : item.id)}
                                    />
                                );
                            })}
                        </MotionDiv>
                    </AnimatePresence>
                </MotionDiv>

                {/* Page Indicator Dots */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-3 mt-5">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentPage(idx)}
                                className={`
                                    h-2 rounded-full transition-all duration-300
                                    ${currentPage === idx
                                        ? 'w-6 bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]'
                                        : 'w-2 bg-slate-600 hover:bg-slate-500'
                                    }
                                `}
                                aria-label={`Go to page ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-component for individual task ---
interface TaskCardProps {
    item: any;
    isChecked: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onExpand: () => void;
}

const TaskCard: React.FC<TaskCardProps> = React.memo(({ item, isChecked, isExpanded, onToggle, onExpand }) => {
    const controls = useAnimation();
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (isChecked) {
            controls.start({
                scale: [1, 1.05, 1],
                filter: ["url(#water-ripple)", "none"],
                transition: { duration: 0.6, ease: "easeOut" }
            });
        }
    }, [isChecked, controls]);

    const handleMouseDown = () => {
        longPressTimer.current = setTimeout(() => {
            if (!isChecked) {
                onToggle();
                if (navigator.vibrate) navigator.vibrate(50);
            }
        }, 500);
    };

    const handleMouseUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    return (
        <MotionDiv
            /* layout prop removed to prevent jitter on mobile */
            className={`
                relative overflow-hidden rounded-2xl backdrop-blur-2xl border transition-all duration-300
                ${isChecked ? 'accent-bg-subtle accent-border-subtle' : 'bg-blue-950/[0.02] border-white/5 hover:bg-blue-900/10'}
            `}
            style={{ width: '100%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={controls}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            {/* Ripple/Glow Effect Container */}
            {isChecked && (
                <MotionDiv
                    layoutId={`ripple-${item.id}`}
                    className="absolute inset-0 bg-blue-500/5 z-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                />
            )}

            <div className="relative z-10 p-4 flex items-center justify-between gap-4">
                {/* Check Circle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0
                        ${isChecked ? 'accent-border accent-bg-solid' : 'border-white/30 hover:border-white/60'}
                    `}
                >
                    {isChecked && (
                        <MotionSVG
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3.5 h-3.5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </MotionSVG>
                    )}
                </button>

                {/* Text Content */}
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={onExpand}
                >
                    <div className="relative">
                        <MotionP
                            layout="position"
                            className={`text-sm text-white font-medium leading-relaxed ${isChecked ? 'line-through opacity-50' : ''}`}
                        >
                            {isExpanded ? item.label : (
                                <span className="block truncate pr-8">{item.label}</span>
                            )}
                        </MotionP>

                        {/* Fade gradient for truncated text */}
                        {!isExpanded && !isChecked && (
                            <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-blue-900/0 via-blue-900/0 to-transparent pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    {getIconForSuggestion(item.label)}
                </div>
            </div>
        </MotionDiv>
    );
});

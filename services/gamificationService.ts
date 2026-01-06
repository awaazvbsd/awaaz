import { MaterialTier, GamificationData, TierAccentColor } from '../types';
import { StorageService } from './storageService';

// ===== Tier Definitions =====
// ... (rest of the definitions are same, I will keep them but replace the storage functions)

export const MATERIAL_TIERS: MaterialTier[] = [
    {
        level: 1,
        name: 'Wood',
        tasksMin: 0,
        tasksMax: 5,
        accentColor: { primary: '#8B4513', secondary: '#A0522D', gradient: 'linear-gradient(135deg, #8B4513, #A0522D)' },
        iconName: 'TreeDeciduous',
    },
    {
        level: 2,
        name: 'Stone',
        tasksMin: 6,
        tasksMax: 11,
        accentColor: { primary: '#78716C', secondary: '#A8A29E', gradient: 'linear-gradient(135deg, #78716C, #A8A29E)' },
        iconName: 'Mountain',
    },
    {
        level: 3,
        name: 'Quartz',
        tasksMin: 12,
        tasksMax: 17,
        accentColor: { primary: '#C4B5FD', secondary: '#A78BFA', gradient: 'linear-gradient(135deg, #C4B5FD, #A78BFA)' },
        iconName: 'Sparkles',
    },
    {
        level: 4,
        name: 'Copper',
        tasksMin: 18,
        tasksMax: 23,
        accentColor: { primary: '#B87333', secondary: '#CD853F', gradient: 'linear-gradient(135deg, #B87333, #CD853F)' },
        iconName: 'Coins',
    },
    {
        level: 5,
        name: 'Bronze',
        tasksMin: 24,
        tasksMax: 29,
        accentColor: { primary: '#CD7F32', secondary: '#DAA520', gradient: 'linear-gradient(135deg, #CD7F32, #DAA520)' },
        iconName: 'Shield',
    },
    {
        level: 6,
        name: 'Iron',
        tasksMin: 30,
        tasksMax: 35,
        accentColor: { primary: '#4B5563', secondary: '#6B7280', gradient: 'linear-gradient(135deg, #4B5563, #6B7280)' },
        iconName: 'Sword',
    },
    {
        level: 7,
        name: 'Silver',
        tasksMin: 36,
        tasksMax: 41,
        accentColor: { primary: '#94A3B8', secondary: '#64748B', gradient: 'linear-gradient(135deg, #94A3B8, #64748B)' },
        iconName: 'Medal',
    },
    {
        level: 8,
        name: 'Gold',
        tasksMin: 42,
        tasksMax: 47,
        accentColor: { primary: '#FFD700', secondary: '#FFA500', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },
        iconName: 'Crown',
    },
    {
        level: 9,
        name: 'Obsidian',
        tasksMin: 48,
        tasksMax: 53,
        accentColor: { primary: '#9333EA', secondary: '#7C3AED', gradient: 'linear-gradient(135deg, #9333EA, #7C3AED)' },
        iconName: 'Flame',
    },
    {
        level: 10,
        name: 'Diamond',
        tasksMin: 54,
        tasksMax: null,
        accentColor: {
            primary: '#06B6D4',
            secondary: '#8B5CF6',
            gradient: 'linear-gradient(135deg, #06B6D4, #3B82F6, #8B5CF6)'
        },
        iconName: 'Gem',
    },
];

// ... (calculateTier, getTierProgress, etc. remain unchanged)

export function calculateTier(completedTasks: number): MaterialTier {
    for (let i = MATERIAL_TIERS.length - 1; i >= 0; i--) {
        if (completedTasks >= MATERIAL_TIERS[i].tasksMin) {
            return MATERIAL_TIERS[i];
        }
    }
    return MATERIAL_TIERS[0];
}

export function getTierProgress(completedTasks: number): { current: number; max: number; percentage: number; nextTier: MaterialTier | null } {
    const currentTier = calculateTier(completedTasks);
    const nextTier = MATERIAL_TIERS.find(t => t.level === currentTier.level + 1) || null;
    if (!nextTier) return { current: completedTasks, max: completedTasks, percentage: 100, nextTier: null };
    const tierStart = currentTier.tasksMin;
    const tierEnd = nextTier.tasksMin;
    const progress = completedTasks - tierStart;
    const range = tierEnd - tierStart;
    const percentage = Math.min((progress / range) * 100, 100);
    return { current: progress, max: range, percentage, nextTier };
}

export function checkTierUp(previousTasks: number, currentTasks: number): MaterialTier | null {
    const previousTier = calculateTier(previousTasks);
    const currentTier = calculateTier(currentTasks);
    if (currentTier.level > previousTier.level) return currentTier;
    return null;
}

export function getUnlockedColors(currentTierLevel: number): MaterialTier[] {
    return MATERIAL_TIERS.filter(tier => tier.level <= currentTierLevel);
}

export function getTierByLevel(level: number): MaterialTier | undefined {
    return MATERIAL_TIERS.find(t => t.level === level);
}

// ===== Hybrid Storage Management =====

const GAMIFICATION_KEY_PREFIX = 'gamification_data_';

/**
 * Get gamification data for a student
 */
export function getGamificationData(studentCode: string): GamificationData {
    const key = `${GAMIFICATION_KEY_PREFIX}${studentCode}`;
    const saved = StorageService.getItem<GamificationData>(key);

    if (saved) {
        return saved;
    }

    // Default data
    return {
        completedTasks: 0,
        currentTier: 1,
        selectedAccentTier: 1,
        lastTierShown: null,
    };
}

/**
 * Save gamification data for a student
 */
export function saveGamificationData(studentCode: string, data: GamificationData): void {
    const key = `${GAMIFICATION_KEY_PREFIX}${studentCode}`;
    StorageService.setItem(key, data, studentCode, 'state');
}

/**
 * Update completed tasks and check for tier up
 */
export function updateCompletedTasks(studentCode: string, newTaskCount: number): MaterialTier | null {
    const data = getGamificationData(studentCode);
    const previousTasks = data.completedTasks;

    data.completedTasks = newTaskCount;
    const newTier = checkTierUp(previousTasks, newTaskCount);
    if (newTier) {
        data.currentTier = newTier.level;
    }

    saveGamificationData(studentCode, data);
    return newTier;
}

/**
 * Set selected accent color tier
 */
export function setSelectedAccentTier(studentCode: string, tierLevel: number): void {
    const data = getGamificationData(studentCode);
    if (tierLevel <= data.currentTier) {
        data.selectedAccentTier = tierLevel;
        saveGamificationData(studentCode, data);
    }
}

/**
 * Apply accent color to document root
 */
export function applyAccentColor(tierLevel: number): void {
    const tier = getTierByLevel(tierLevel);
    if (!tier) return;

    const root = document.documentElement;
    root.style.setProperty('--accent-primary', tier.accentColor.primary);
    root.style.setProperty('--accent-secondary', tier.accentColor.secondary);
    root.style.setProperty('--accent-gradient', tier.accentColor.gradient);

    // Apply via static key for convenience (doesn't sync to firebase, purely local preference)
    StorageService.setItem('selected_accent_tier', tierLevel.toString(), 'default', 'state');
}

/**
 * Load and apply saved accent color on app start
 */
export function loadSavedAccentColor(): void {
    const savedTier = StorageService.getItem<string>('selected_accent_tier');
    if (savedTier) {
        applyAccentColor(parseInt(savedTier, 10));
    }
}

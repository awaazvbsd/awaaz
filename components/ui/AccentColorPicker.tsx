'use client';

import * as React from 'react';
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
    Lock,
    Check
} from 'lucide-react';
import {
    MATERIAL_TIERS,
    applyAccentColor
} from '../../services/gamificationService';

interface AccentColorPickerProps {
    currentTier: number;
    selectedTier: number;
    onSelectColor: (tierLevel: number) => void;
    className?: string;
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

export const AccentColorPicker: React.FC<AccentColorPickerProps> = ({
    currentTier,
    selectedTier,
    onSelectColor,
    className = '',
}) => {
    const handleColorSelect = (tierLevel: number) => {
        if (tierLevel <= currentTier) {
            onSelectColor(tierLevel);
            applyAccentColor(tierLevel);
        }
    };

    return (
        <div className={`${className}`}>
            {/* Color Grid - improved spacing */}
            <div className="grid grid-cols-5 gap-4 p-2">
                {MATERIAL_TIERS.map((tier) => {
                    const isUnlocked = tier.level <= currentTier;
                    const isSelected = tier.level === selectedTier;
                    const TierIcon = TIER_ICONS[tier.iconName] || Gem;

                    return (
                        <button
                            key={tier.level}
                            onClick={() => handleColorSelect(tier.level)}
                            disabled={!isUnlocked}
                            className={`
                                relative w-10 h-10 rounded-lg flex items-center justify-center
                                transition-all duration-200
                                ${isUnlocked
                                    ? 'cursor-pointer hover:scale-110 hover:shadow-lg'
                                    : 'cursor-not-allowed opacity-40'
                                }
                                ${isSelected ? 'ring-2 ring-white scale-110' : ''}
                            `}
                            style={{
                                background: isUnlocked ? tier.accentColor.gradient : '#374151',
                            }}
                            title={`${tier.name}${!isUnlocked ? ' (Locked)' : ''}`}
                        >
                            {/* Tier Icon or Lock */}
                            {isUnlocked ? (
                                <TierIcon
                                    size={18}
                                    className={tier.name === 'Quartz' ? 'text-slate-600' : 'text-white/90'}
                                />
                            ) : (
                                <Lock size={14} className="text-white/50" />
                            )}

                            {/* Selected Checkmark */}
                            {isSelected && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                    <Check size={10} className="text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Info text */}
            <p className="text-xs text-slate-400 mt-3 text-center">
                Complete tasks to unlock more colors
            </p>
        </div>
    );
};

export default AccentColorPicker;

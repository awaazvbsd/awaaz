/**
 * ============================================================================
 * CONSOLIDATED VOCAL STRESS ANALYSIS ALGORITHM V3.0
 * ============================================================================
 * 
 * This single file contains the complete, self-contained algorithm for vocal
 * stress analysis. It is designed to be easily portable and has no external
 * dependencies within this project.
 * 
 * It features a dual-mode analysis system:
 * 1. Population-Based Analysis: Compares vocal data against gender-adaptive
 *    population norms.
 * 2. Personal Baseline Analysis: Compares vocal data against a user's own
 *    calibrated "calm" state for higher precision.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum StressLevel {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
}

export interface MeasureValues {
    jitter: number;
    shimmer: number;
    f0Mean: number;
    f0Range: number;
    speechRate: number;
    f1: number;
    f2: number;
}

export interface StressResultType {
    level: StressLevel;
    score: number;
    explanation: string;
    stressType?: string;
}

export type ProfileType = 'male' | 'female' | 'mixed';

// ============================================================================
// V2.0: POPULATION-BASED ANALYSIS CONSTANTS AND FUNCTIONS
// ============================================================================

interface VocalProfile {
    name: string;
    f0Mean: { optimal: number; normal: [number, number]; caution: [number, number] };
    f0Range: { optimal: number; normal: [number, number]; caution: [number, number] };
    f1: { optimal: number; normal: [number, number] };
    f2: { optimal: number; normal: [number, number] };
    speechRate: { optimal: number; normal: [number, number]; caution: [number, number] };
}

const VOCAL_PROFILES: { [key: string]: VocalProfile } = {
    male: { name: 'Male Adult', f0Mean: { optimal: 120, normal: [85, 180], caution: [75, 200] }, f0Range: { optimal: 30, normal: [15, 50], caution: [10, 70] }, f1: { optimal: 500, normal: [350, 650] }, f2: { optimal: 1500, normal: [1200, 1800] }, speechRate: { optimal: 145, normal: [120, 170], caution: [100, 190] } },
    female: { name: 'Female Adult', f0Mean: { optimal: 210, normal: [165, 255], caution: [150, 280] }, f0Range: { optimal: 35, normal: [20, 60], caution: [15, 80] }, f1: { optimal: 550, normal: [400, 700] }, f2: { optimal: 1650, normal: [1400, 1900] }, speechRate: { optimal: 145, normal: [120, 170], caution: [100, 190] } },
    mixed: { name: 'Mixed/Unknown', f0Mean: { optimal: 150, normal: [80, 220], caution: [70, 250] }, f0Range: { optimal: 32, normal: [15, 55], caution: [10, 75] }, f1: { optimal: 520, normal: [350, 700] }, f2: { optimal: 1550, normal: [1200, 1900] }, speechRate: { optimal: 145, normal: [120, 170], caution: [100, 190] } }
};

const JITTER_THRESHOLDS = { normal: 1.04, mild: 2.0, moderate: 5.0, severe: 8.0 };
const SHIMMER_THRESHOLDS = { normal: 3.81, mild: 6.0, moderate: 12.0, severe: 18.0 };
const ENHANCED_WEIGHTS = { jitter: 2.5, shimmer: 2.5, f0Mean: 1.8, f0Range: 1.3, speechRate: 1.6, f1: 0.4, f2: 0.4, interactions: 1.2 };
type SensitivityConfig = { factor: number; offset: number; exponent: number };
const POPULATION_SENSITIVITY: SensitivityConfig = { factor: 0.75, offset: -10, exponent: 0.95 };
const BASELINE_SENSITIVITY: SensitivityConfig = { factor: 0.9, offset: -3, exponent: 0.85 };

const clampScore = (value: number) => Math.min(100, Math.max(0, value));
const applySensitivityAdjustment = (value: number, config: SensitivityConfig) => {
    const normalized = Math.max(0, value) / 100;
    const eased = Math.pow(normalized, config.exponent);
    const scaled = eased * 100;
    const adjusted = scaled * config.factor + config.offset;
    return clampScore(adjusted);
};

const calculatePopulationScores = (values: MeasureValues, profile: VocalProfile) => {
    const calculateJitterScore = (jitter: number): number => {
        if (jitter < JITTER_THRESHOLDS.normal) return 0;
        if (jitter < JITTER_THRESHOLDS.mild) {
            const excess = jitter - JITTER_THRESHOLDS.normal;
            return 3 * (1 - Math.exp(-excess * 2));
        }
        if (jitter < JITTER_THRESHOLDS.moderate) {
            const progress = (jitter - JITTER_THRESHOLDS.mild) / (JITTER_THRESHOLDS.moderate - JITTER_THRESHOLDS.mild);
            return 3 + (4 * progress);
        }
        const excess = Math.min(jitter - JITTER_THRESHOLDS.moderate, JITTER_THRESHOLDS.severe - JITTER_THRESHOLDS.moderate);
        const maxExcess = JITTER_THRESHOLDS.severe - JITTER_THRESHOLDS.moderate;
        return 7 + (3 * Math.pow(excess / maxExcess, 0.7));
    };

    const calculateShimmerScore = (shimmer: number): number => {
        if (shimmer < SHIMMER_THRESHOLDS.normal) return 0;
        if (shimmer < SHIMMER_THRESHOLDS.mild) {
            const excess = shimmer - SHIMMER_THRESHOLDS.normal;
            return 3 * (1 - Math.exp(-excess * 1.5));
        }
        if (shimmer < SHIMMER_THRESHOLDS.moderate) {
            const progress = (shimmer - SHIMMER_THRESHOLDS.mild) / (SHIMMER_THRESHOLDS.moderate - SHIMMER_THRESHOLDS.mild);
            return 3 + (4 * progress);
        }
        const excess = Math.min(shimmer - SHIMMER_THRESHOLDS.moderate, SHIMMER_THRESHOLDS.severe - SHIMMER_THRESHOLDS.moderate);
        const maxExcess = SHIMMER_THRESHOLDS.severe - SHIMMER_THRESHOLDS.moderate;
        return 7 + (3 * Math.pow(excess / maxExcess, 0.7));
    };

    const calculateF0Score = (f0: number, profile: VocalProfile): number => {
        const { optimal, normal, caution } = profile.f0Mean;
        if (f0 >= normal[0] && f0 <= normal[1]) {
            const distFromOptimal = Math.abs(f0 - optimal);
            const normalRange = (normal[1] - normal[0]) / 2;
            return 1.5 * (distFromOptimal / normalRange);
        }
        if (f0 >= caution[0] && f0 <= caution[1]) {
            const inLowerCaution = f0 < normal[0];
            const dist = inLowerCaution ? (normal[0] - f0) : (f0 - normal[1]);
            const cautionRange = inLowerCaution ? (normal[0] - caution[0]) : (caution[1] - normal[1]);
            return 1.5 + (4.5 * Math.pow(dist / cautionRange, 1.2));
        }
        return 6 + (4 * Math.min(1, Math.abs(f0 - optimal) / (optimal * 0.8)));
    };

    const calculateF0RangeScore = (range: number, profile: VocalProfile): number => {
        const { optimal, normal, caution } = profile.f0Range;
        if (range >= normal[0] && range <= normal[1]) {
            const distFromOptimal = Math.abs(range - optimal);
            const normalRange = (normal[1] - normal[0]) / 2;
            return 1.0 * (distFromOptimal / normalRange);
        }
        if (range >= caution[0] && range <= caution[1]) {
            const inLowerCaution = range < normal[0];
            const dist = inLowerCaution ? (normal[0] - range) : (range - normal[1]);
            const cautionRange = inLowerCaution ? (normal[0] - caution[0]) : (caution[1] - normal[1]);
            const multiplier = inLowerCaution ? 1.5 : 1.0;
            return 1 + (multiplier * 4 * Math.pow(dist / cautionRange, 1.1));
        }
        return 5 + (5 * Math.min(1, Math.abs(range - optimal) / optimal));
    };

    const calculateSpeechRateScore = (rate: number, profile: VocalProfile): number => {
        const { optimal, normal, caution } = profile.speechRate;
        if (rate >= normal[0] && rate <= normal[1]) {
            const distFromOptimal = Math.abs(rate - optimal);
            const normalRange = (normal[1] - normal[0]) / 2;
            return 1.0 * (distFromOptimal / normalRange);
        }
        if (rate >= caution[0] && rate <= caution[1]) {
            const inLowerCaution = rate < normal[0];
            const dist = inLowerCaution ? (normal[0] - rate) : (rate - normal[1]);
            const cautionRange = inLowerCaution ? (normal[0] - caution[0]) : (caution[1] - normal[1]);
            const multiplier = inLowerCaution ? 1.0 : 1.3;
            return 1 + (multiplier * 5 * Math.pow(dist / cautionRange, 1.15));
        }
        return 6 + (4 * Math.min(1, Math.abs(rate - optimal) / (optimal * 0.4)));
    };

    const calculateFormantScore = (formant: number, profile: VocalProfile, formantNum: 1 | 2): number => {
        const range = formantNum === 1 ? profile.f1 : profile.f2;
        const { optimal, normal } = range;
        if (formant >= normal[0] && formant <= normal[1]) {
            const distFromOptimal = Math.abs(formant - optimal);
            const normalRange = (normal[1] - normal[0]) / 2;
            return 2.0 * (distFromOptimal / normalRange);
        }
        const dist = formant < normal[0] ? (normal[0] - formant) : (formant - normal[1]);
        const normalRange = (normal[1] - normal[0]) / 2;
        return 2 + (4 * Math.min(1, dist / normalRange));
    };

    return {
        jitter: calculateJitterScore(values.jitter),
        shimmer: calculateShimmerScore(values.shimmer),
        f0Mean: calculateF0Score(values.f0Mean, profile),
        f0Range: calculateF0RangeScore(values.f0Range, profile),
        speechRate: calculateSpeechRateScore(values.speechRate, profile),
        f1: calculateFormantScore(values.f1, profile, 1),
        f2: calculateFormantScore(values.f2, profile, 2)
    };
};

const calculateStressFromPopulation = (values: MeasureValues, profileType: ProfileType): StressResultType => {
    const profile = VOCAL_PROFILES[profileType];
    const scores = calculatePopulationScores(values, profile);

    const calculateInteractionEffects = (scores: { [key: string]: number }): number => {
        let bonus = 0;
        if (scores.jitter > 5 && scores.shimmer > 5) bonus += 0.4 * Math.min(scores.jitter, scores.shimmer);
        if (scores.f0Mean > 5 && scores.speechRate > 5) bonus += 0.3 * Math.min(scores.f0Mean, scores.speechRate);
        // HNR interaction removed
        return bonus;
    };

    const interactionScore = calculateInteractionEffects(scores);

    let totalWeightedScore = Object.entries(scores).reduce((acc, [key, score]) => {
        const weight = ENHANCED_WEIGHTS[key as keyof typeof ENHANCED_WEIGHTS];
        return acc + (score * weight);
    }, 0);
    let totalWeight = Object.values(ENHANCED_WEIGHTS).reduce((acc, weight) => acc + weight, 0) - ENHANCED_WEIGHTS.interactions;
    totalWeightedScore += interactionScore * ENHANCED_WEIGHTS.interactions;
    totalWeight += ENHANCED_WEIGHTS.interactions;

    const rawScore = (totalWeightedScore / totalWeight) * 10;
    const finalScore = applySensitivityAdjustment(rawScore, POPULATION_SENSITIVITY);

    // Cap the score at 59 for population-based analysis (first-time users)
    // This ensures they are never classified as "High Risk" (>= 67) without a baseline
    // The user specifically requested values less than 60% for first-time users
    const cappedScore = Math.min(59, finalScore);

    if (cappedScore >= 67) return { level: StressLevel.High, score: cappedScore, explanation: 'High stress detected based on significant deviation from population norms. Vocal markers indicate acute physiological arousal or strain.' };
    if (cappedScore >= 35) return { level: StressLevel.Medium, score: cappedScore, explanation: 'Medium stress indicated. Some vocal parameters show moderate deviation from typical patterns, suggesting heightened cognitive load or emotional engagement.' };
    return { level: StressLevel.Low, score: cappedScore, explanation: 'Low stress detected. Vocal biomarkers are within normal ranges for the selected profile, reflecting a relaxed physiological state.' };
};

// ============================================================================
// V3.0: PERSONAL BASELINE-BASED ANALYSIS
// ============================================================================

const BASELINE_WEIGHTS = { jitter: 2.8, shimmer: 2.8, f0Mean: 2.5, f0Range: 2.2, speechRate: 2.0, interactions: 1.5 };

const calculateDeviationScores = (current: MeasureValues, baseline: MeasureValues) => {
    const safeRatio = (a: number, b: number) => (b > 0 ? a / b : 1);

    const jitterRatio = safeRatio(current.jitter, baseline.jitter);
    const shimmerRatio = safeRatio(current.shimmer, baseline.shimmer);
    const f0MeanDeviation = (current.f0Mean - baseline.f0Mean) / baseline.f0Mean; // % change
    const f0RangeDeviation = (current.f0Range - baseline.f0Range) / baseline.f0Range; // % change
    const speechRateDeviation = (current.speechRate - baseline.speechRate) / baseline.speechRate; // % change
    const scores = {
        jitter: 0, shimmer: 0, f0Mean: 0, f0Range: 0, speechRate: 0,
        details: { f0MeanDeviation, f0RangeDeviation, speechRateDeviation, jitterRatio, shimmerRatio }
    };

    // Improved thresholds: More gradual contribution starting from smaller deviations
    // This prevents overly low scores when all biomarkers are slightly within normal ranges

    // Jitter: Higher is worse. Now starts contributing once it exceeds ~1.1x (10% increase) over baseline
    if (jitterRatio > 1.1) {
        if (jitterRatio > 1.3) {
            scores.jitter = 5 * Math.log10(jitterRatio / 1.3 * 9 + 1);
        } else {
            // Gradual contribution for 1.1x to 1.3x range
            const progress = (jitterRatio - 1.1) / (1.3 - 1.1); // 0 to 1
            scores.jitter = 1.5 * progress; // Start near 0, reach ~1.5 at 1.3x
        }
    }

    // Shimmer: Higher is worse. Same relaxed thresholds as jitter (starts at ~1.1x)
    if (shimmerRatio > 1.1) {
        if (shimmerRatio > 1.3) {
            scores.shimmer = 5 * Math.log10(shimmerRatio / 1.3 * 9 + 1);
        } else {
            // Gradual contribution for 1.1x to 1.3x range
            const progress = (shimmerRatio - 1.1) / (1.3 - 1.1);
            scores.shimmer = 1.5 * progress;
        }
    }

    // F0 Mean: Both higher and lower are bad. Already contributes for any deviation.
    // Increased sensitivity to be more responsive to pitch changes
    scores.f0Mean = 9 * Math.pow(Math.abs(f0MeanDeviation), 0.65); // More responsive to pitch changes

    // F0 Range: Both higher (agitated) and lower (monotone) are bad. Monotone is worse.
    const f0RangePenalty = f0RangeDeviation < 0 ? 1.4 : 1; // Slightly reduced penalty
    scores.f0Range = 9 * Math.pow(Math.abs(f0RangeDeviation), 0.7) * f0RangePenalty; // More responsive to pitch variability changes

    // Speech Rate: Both higher and lower are bad. Already contributes for any deviation.
    // Fine-tuned sensitivity
    scores.speechRate = 7 * Math.pow(Math.abs(speechRateDeviation), 1.0); // Reduced from 8, linear scaling

    return scores;
};

const calculateBaselineInteraction = (scores: any) => {
    let interactionBonus = 0;
    // Agitation Pattern: High pitch + fast speech
    // Reduced multiplier to prevent over-scoring
    if (scores.details.f0MeanDeviation > 0.1 && scores.details.speechRateDeviation > 0.1) {
        interactionBonus += 0.35 * Math.min(scores.f0Mean, scores.speechRate); // Reduced from 0.5
    }
    // Fatigue/Depressive Pattern: Monotone + slow speech
    if (scores.details.f0RangeDeviation < -0.2 && scores.details.speechRateDeviation < -0.1) {
        interactionBonus += 0.45 * Math.min(scores.f0Range, scores.speechRate); // Reduced from 0.6
    }
    // Vocal Strain Pattern: High instability
    if (scores.jitter > 4 && scores.shimmer > 4) {
        interactionBonus += 0.3 * (scores.jitter + scores.shimmer); // Reduced from 0.4
    }
    return interactionBonus;
};

const generateBaselineExplanation = (level: StressLevel, scores: any): { explanation: string; stressType?: string } => {
    const { details } = scores;
    let stressType: string | undefined;
    if (level === StressLevel.Low) {
        return { explanation: 'Low stress detected. Your vocal patterns are consistent with your calibrated calm baseline, indicating a relaxed physiological state.' };
    }

    const formatPercent = (n: number) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(0)}%`;
    const issues: string[] = [];
    if (scores.f0Mean > 3) issues.push(`pitch changed by ${formatPercent(details.f0MeanDeviation)}`);
    if (scores.jitter > 3) issues.push(`vocal jitter increased by ${formatPercent(details.jitterRatio - 1)}`);
    if (scores.shimmer > 3) issues.push(`shimmer increased by ${formatPercent(details.shimmerRatio - 1)}`);
    // HNR removed
    if (scores.f0Range > 3) issues.push(`pitch variation changed by ${formatPercent(details.f0RangeDeviation)}`);
    if (scores.speechRate > 3) issues.push(`speech rate changed by ${formatPercent(details.speechRateDeviation)}`);

    if (details.f0MeanDeviation > 0.1 && details.speechRateDeviation > 0.1) stressType = "Acute Agitation";
    else if (details.f0RangeDeviation < -0.2 && details.speechRateDeviation < -0.1) stressType = "Vocal Fatigue";
    else if (details.jitterRatio > 1.5 && details.shimmerRatio > 1.5) stressType = "Vocal Strain";

    const explanation = `${level} stress detected. Key deviations from your baseline: ${issues.slice(0, 3).join(', ')}. This vocal profile shows a notable shift from your normal state.`;
    return { explanation, stressType };
};

const calculateStressFromBaseline = (current: MeasureValues, baseline: MeasureValues, sensitivityMultiplier: number = 1.0): StressResultType => {
    const scores = calculateDeviationScores(current, baseline);
    const interactionScore = calculateBaselineInteraction(scores);

    // Fix: Iterate over actual score keys, not weight keys
    const scoreKeys = ['jitter', 'shimmer', 'f0Mean', 'f0Range', 'speechRate'] as const;

    let totalWeightedScore = scoreKeys.reduce((acc, key) => {
        const weight = BASELINE_WEIGHTS[key];
        return acc + (scores[key] * weight);
    }, 0);

    let totalWeight = scoreKeys.reduce((acc, key) => acc + BASELINE_WEIGHTS[key], 0);
    totalWeightedScore += interactionScore * BASELINE_WEIGHTS.interactions;
    totalWeight += BASELINE_WEIGHTS.interactions;

    // Increased multiplier from 6.5 to 8.5 for better responsiveness
    // Apply adaptive sensitivity multiplier before sensitivity adjustment
    const rawScore = (totalWeightedScore / totalWeight) * 8.5 * sensitivityMultiplier;
    const finalScore = applySensitivityAdjustment(rawScore, BASELINE_SENSITIVITY);
    let level: StressLevel;
    if (finalScore >= 67) level = StressLevel.High;
    else if (finalScore >= 30) level = StressLevel.Medium;
    else level = StressLevel.Low;

    const { explanation, stressType } = generateBaselineExplanation(level, scores);
    return { level, score: finalScore, explanation, stressType };
};

// ============================================================================
// MAIN DISPATCH FUNCTION (Primary Export)
// ============================================================================

/**
 * Validates that baseline values are complete and valid for stress calculation.
 * @param baseline The baseline measure values to validate
 * @returns true if baseline is valid, false otherwise
 */
const isValidBaseline = (baseline: MeasureValues): boolean => {
    // Check that all critical baseline values are positive and non-zero
    // These are the values used in ratio calculations, so they must be > 0
    return (
        baseline.f0Mean > 0 &&
        baseline.jitter > 0 &&
        baseline.shimmer > 0 &&
        baseline.speechRate > 0 &&
        baseline.f0Range > 0 &&
        // Ensure values are within reasonable ranges (not NaN or Infinity)
        isFinite(baseline.f0Mean) &&
        isFinite(baseline.jitter) &&
        isFinite(baseline.shimmer) &&
        isFinite(baseline.speechRate) &&
        isFinite(baseline.f0Range)
    );
};

/**
 * Calculates the vocal stress level using either the population-based or
 * personal baseline algorithm.
 * 
 * @param values The current vocal parameter measurements.
 * @param profileType The vocal profile to use for population-based analysis.
 * @param baselineValues Optional. The user's calibrated baseline measurements. If provided,
 *                       the high-precision baseline algorithm will be used.
 * @returns A StressResultType object with the stress level, score, and detailed explanation.
 */
export const calculateStressLevel = (
    values: MeasureValues,
    profileType: ProfileType = 'mixed',
    baselineValues: MeasureValues | null = null,
    sensitivityMultiplier: number = 1.0
): StressResultType => {
    // Only use baseline mode if baseline values are valid
    if (baselineValues && isValidBaseline(baselineValues)) {
        return calculateStressFromBaseline(values, baselineValues, sensitivityMultiplier);
    } else {
        // Fall back to population-based analysis if baseline is invalid or missing
        return calculateStressFromPopulation(values, profileType);
    }
};


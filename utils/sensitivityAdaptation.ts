import type { MeasureValues } from './stressAnalysis';
import { StorageService } from '../services/storageService';

export interface SensitivityState {
  version: number;
  baseSensitivity: number; // Current sensitivity multiplier (starts at 1.0)
  recentStressScores: number[]; // Rolling window of last N session scores
  sessionsSinceCalibration: number; // Total analysis sessions count
  lastUpdated: string;
}

const DEFAULT_STATE: SensitivityState = {
  version: 1,
  baseSensitivity: 1.0,
  recentStressScores: [],
  sessionsSinceCalibration: 0,
  lastUpdated: new Date().toISOString(),
};

const STORAGE_PREFIX = 'sensitivityState';
const CONSERVATIVE_WINDOW = 5; // Keep conservative for first 5 sessions
const ROLLING_WINDOW_SIZE = 5; // Track last 5 sessions for pattern detection
const MAX_SENSITIVITY = 1.3; // Cap at 30% boost
const MIN_SENSITIVITY = 1.0; // Never go below baseline

const getCurrentStudentId = (): string => {
  if (typeof window === 'undefined') return 'default';
  const userData = StorageService.getItem<any>('userData');
  return userData?.accountNumber || 'default';
};

const getStorageKey = (studentId?: string) => `${STORAGE_PREFIX}:${studentId || getCurrentStudentId()}`;

export const loadSensitivityState = (studentId?: string): SensitivityState => {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  const key = getStorageKey(studentId);
  const parsed = StorageService.getItem<any>(key);
  if (parsed) {
    return {
      ...DEFAULT_STATE,
      ...parsed,
      recentStressScores: parsed.recentStressScores || [],
    };
  }
  return { ...DEFAULT_STATE };
};

export const saveSensitivityState = (state: SensitivityState, studentId?: string) => {
  if (typeof window === 'undefined') return;
  const id = studentId || getCurrentStudentId();
  StorageService.setItem(getStorageKey(id), state, id, 'state');
};

/**
 * Updates sensitivity state based on a new session's stress score.
 * Returns the current sensitivity multiplier to use for future sessions.
 */
export const updateSensitivityFromSession = (stressScore: number, studentId?: string): number => {
  const id = studentId || getCurrentStudentId();
  const state = loadSensitivityState(id);

  // Add new score to rolling window
  const updatedScores = [...state.recentStressScores, stressScore];
  // Keep only last N scores
  const recentScores = updatedScores.slice(-ROLLING_WINDOW_SIZE);

  const sessionsCount = state.sessionsSinceCalibration + 1;

  let newSensitivity = state.baseSensitivity;

  // Conservative start: Keep sensitivity at 1.0 for first few sessions
  if (sessionsCount <= CONSERVATIVE_WINDOW) {
    newSensitivity = 1.0;
  } else {
    // Pattern detection: Analyze recent scores
    const avgRecent = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const highStressCount = recentScores.filter(s => s > 20).length;
    const veryHighStressCount = recentScores.filter(s => s > 30).length;

    // Calculate pattern strength (0-2 scale)
    let patternStrength = 0;

    // Moderate pattern: average > 25 and at least 3 sessions > 20
    if (avgRecent > 25 && highStressCount >= 3) {
      patternStrength = 1.0;
    }

    // Strong pattern: average > 35 and at least 3 sessions > 30
    if (avgRecent > 35 && veryHighStressCount >= 3) {
      patternStrength = 2.0;
    }

    // Gradual increase: sensitivity = 1.0 + (patternStrength * 0.15)
    newSensitivity = 1.0 + (patternStrength * 0.15);

    // Decay rule: If recent sessions return to low stress, gradually reduce sensitivity
    if (avgRecent < 20 && highStressCount < 2) {
      // Decay back toward 1.0 over time
      newSensitivity = Math.max(MIN_SENSITIVITY, state.baseSensitivity * 0.95);
    }

    // Clamp to valid range
    newSensitivity = Math.min(MAX_SENSITIVITY, Math.max(MIN_SENSITIVITY, newSensitivity));
  }

  const updatedState: SensitivityState = {
    ...state,
    baseSensitivity: newSensitivity,
    recentStressScores: recentScores,
    sessionsSinceCalibration: sessionsCount,
    lastUpdated: new Date().toISOString(),
  };

  saveSensitivityState(updatedState, id);
  return newSensitivity;
};

/**
 * Gets the current sensitivity multiplier without updating state.
 */
export const getCurrentSensitivityMultiplier = (studentId?: string): number => {
  const state = loadSensitivityState(studentId);
  return state.baseSensitivity;
};

/**
 * Resets sensitivity state (e.g., after new calibration).
 */
export const resetSensitivityState = (studentId?: string) => {
  const id = studentId || getCurrentStudentId();
  saveSensitivityState({ ...DEFAULT_STATE }, id);
};





import { MeasureValues } from './stressAnalysis';
import { StorageService } from '../services/storageService';

const ADAPTIVE_FEATURES = ['jitter', 'shimmer', 'f0Mean', 'f0Range', 'speechRate'] as const;
type AdaptiveFeature = (typeof ADAPTIVE_FEATURES)[number];

export type AdaptiveFeatureMap = Record<AdaptiveFeature, number>;

export interface AdaptiveStressState {
  version: number;
  weights: AdaptiveFeatureMap;
  bias: number;
  sessions: number;
  lastLabel?: number;
  lastUpdated?: string;
  lastSession?: {
    timestamp: string;
    deltas: AdaptiveFeatureMap;
    adjustedScore: number;
    baseScore: number;
  };
}

const DEFAULT_STATE: AdaptiveStressState = {
  version: 1,
  weights: {
    jitter: 1.8,
    shimmer: 1.8,
    f0Mean: 1.2,
    f0Range: 1.0,
    speechRate: 1.0,
  },
  bias: 0,
  sessions: 0,
};

const STORAGE_PREFIX = 'adaptiveStressState';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampScore = (value: number) => clamp(value, 0, 100);
const clampWeight = (value: number) => clamp(value, -5, 5);
const clampBias = (value: number) => clamp(value, -15, 15);

const getCurrentStudentId = (): string => {
  if (typeof window === 'undefined') return 'default';
  const userData = StorageService.getItem<any>('userData');
  return userData?.accountNumber || 'default';
};

const getStorageKey = (studentId?: string) => `${STORAGE_PREFIX}:${studentId || getCurrentStudentId()}`;

export const loadAdaptiveState = (studentId?: string): AdaptiveStressState => {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  const key = getStorageKey(studentId);
  const parsed = StorageService.getItem<any>(key);
  if (parsed) {
    return {
      ...DEFAULT_STATE,
      ...parsed,
      weights: { ...DEFAULT_STATE.weights, ...(parsed?.weights || {}) },
    };
  }
  return { ...DEFAULT_STATE };
};

export const saveAdaptiveState = (state: AdaptiveStressState, studentId?: string) => {
  if (typeof window === 'undefined') return;
  const id = studentId || getCurrentStudentId();
  StorageService.setItem(getStorageKey(id), state, id, 'state');
};

export const computeAdaptiveDeltas = (
  current: MeasureValues,
  baseline?: MeasureValues | null
): AdaptiveFeatureMap => {
  if (!baseline) {
    return ADAPTIVE_FEATURES.reduce((acc, feature) => {
      acc[feature] = 0;
      return acc;
    }, {} as AdaptiveFeatureMap);
  }

  const ratio = (curr: number, base: number) => (base > 0 ? (curr - base) / base : 0);

  return {
    jitter: ratio(current.jitter, baseline.jitter),
    shimmer: ratio(current.shimmer, baseline.shimmer),
    f0Mean: ratio(current.f0Mean, baseline.f0Mean),
    f0Range: ratio(current.f0Range, baseline.f0Range),
    speechRate: ratio(current.speechRate, baseline.speechRate),
  };
};

export const applyAdaptiveAdjustment = ({
  baseScore,
  deltas,
  studentId,
}: {
  baseScore: number;
  deltas: AdaptiveFeatureMap;
  studentId?: string;
}): { adjustedScore: number; state: AdaptiveStressState } => {
  const id = studentId || getCurrentStudentId();
  const state = loadAdaptiveState(id);
  const contribution = ADAPTIVE_FEATURES.reduce((sum, feature) => {
    return sum + state.weights[feature] * deltas[feature];
  }, state.bias);

  const adjustedScore = clampScore(baseScore + contribution);
  const timestamp = new Date().toISOString();
  const updatedState: AdaptiveStressState = {
    ...state,
    sessions: state.sessions + 1,
    lastUpdated: timestamp,
    lastSession: {
      timestamp,
      deltas,
      adjustedScore,
      baseScore,
    },
  };
  saveAdaptiveState(updatedState, id);
  return { adjustedScore, state: updatedState };
};

export const recordSelfReport = (label: number, studentId?: string): AdaptiveStressState | null => {
  if (typeof window === 'undefined') return null;
  const id = studentId || getCurrentStudentId();
  const state = loadAdaptiveState(id);
  if (!state.lastSession) {
    return state;
  }

  const target = clampScore(label);
  const error = target - state.lastSession.adjustedScore;
  const learningRate = 0.02;

  const updatedWeights = { ...state.weights };
  ADAPTIVE_FEATURES.forEach((feature) => {
    const delta = state.lastSession?.deltas[feature] || 0;
    updatedWeights[feature] = clampWeight(updatedWeights[feature] + learningRate * error * delta);
  });

  const updatedState: AdaptiveStressState = {
    ...state,
    weights: updatedWeights,
    bias: clampBias(state.bias + learningRate * error * 0.5),
    lastLabel: target,
    lastUpdated: new Date().toISOString(),
  };

  saveAdaptiveState(updatedState, id);
  return updatedState;
};

export const mapSelfReportValueToScore = (sliderValue: number) => {
  const clamped = clamp(sliderValue, 1, 5);
  const normalized = (clamped - 1) / 4; // 0 to 1
  return Math.round(20 + normalized * 80); // map to 20-100
};

export const getAdaptiveFeatureNames = () => ADAPTIVE_FEATURES.slice();


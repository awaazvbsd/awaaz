import { calculateStressLevel, StressLevel, type MeasureValues } from '../utils/stressAnalysis.ts';

const calmProfile: MeasureValues = {
  jitter: 0.35,
  shimmer: 2.1,
  f0Mean: 140,
  f0Range: 38,
  speechRate: 150,
  f1: 520,
  f2: 1550,
};

const stressedProfile: MeasureValues = {
  jitter: 1.8,
  shimmer: 6.2,
  f0Mean: 205,
  f0Range: 20,
  speechRate: 190,
  f1: 600,
  f2: 1700,
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const calmResult = calculateStressLevel(calmProfile, 'mixed');
assert(
  calmResult.level === StressLevel.Low,
  `Expected calm scenario to be Low stress, received ${calmResult.level}`
);

const stressedPopulation = calculateStressLevel(stressedProfile, 'mixed');
assert(
  stressedPopulation.score >= calmResult.score,
  'Stressed profile should score higher than calm profile without baseline'
);

const stressedBaseline = calculateStressLevel(stressedProfile, 'mixed', calmProfile);
assert(
  stressedBaseline.score > calmResult.score + 5,
  'Baseline comparison should increase stress score relative to calm'
);

const subtleShiftProfile: MeasureValues = {
  jitter: 0.6,
  shimmer: 3.2,
  f0Mean: 150,
  f0Range: 30,
  speechRate: 140,
  f1: 540,
  f2: 1500,
};

const subtleResult = calculateStressLevel(subtleShiftProfile, 'mixed', calmProfile);
assert(
  subtleResult.score < stressedBaseline.score,
  'Subtle deviations should score lower than pronounced stress cases'
);

console.log('✅ stressAnalysis smoke tests passed');


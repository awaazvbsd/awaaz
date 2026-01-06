import {
  loadSensitivityState,
  updateSensitivityFromSession,
  getCurrentSensitivityMultiplier,
  resetSensitivityState,
} from '../utils/sensitivityAdaptation';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock window.localStorage for browser environment
if (typeof window === 'undefined') {
  (global as any).window = {
    localStorage: localStorageMock,
  };
} else {
  (window as any).localStorage = localStorageMock;
}

// Test: Conservative start for first 5 sessions
console.log('Test 1: Conservative sensitivity for first 5 sessions');
localStorageMock.clear();
let multiplier = 1.0;
for (let i = 0; i < 5; i++) {
  multiplier = updateSensitivityFromSession(30); // Moderate stress
  assert(multiplier === 1.0, `Session ${i + 1} should have sensitivity 1.0, got ${multiplier}`);
}
console.log('✓ Passed: First 5 sessions maintain sensitivity 1.0');

// Test: Increase sensitivity after pattern
console.log('\nTest 2: Sensitivity increases after pattern of elevated stress');
localStorageMock.clear();
// First 5 sessions - should stay at 1.0
for (let i = 0; i < 5; i++) {
  updateSensitivityFromSession(15); // Low stress
}

// Next 5 sessions with elevated stress
multiplier = 1.0;
for (let i = 0; i < 5; i++) {
  multiplier = updateSensitivityFromSession(35); // High stress
}

assert(multiplier > 1.0, `Sensitivity should increase after pattern, got ${multiplier}`);
assert(multiplier <= 1.3, `Sensitivity should cap at 1.3, got ${multiplier}`);
console.log(`✓ Passed: Sensitivity increased to ${multiplier.toFixed(2)} after pattern`);

// Test: Sensitivity caps at 1.3
console.log('\nTest 3: Sensitivity caps at 1.3 maximum');
localStorageMock.clear();
// Build up many high-stress sessions
for (let i = 0; i < 20; i++) {
  updateSensitivityFromSession(50); // Very high stress
}

multiplier = getCurrentSensitivityMultiplier();
assert(multiplier <= 1.3, `Sensitivity should cap at 1.3, got ${multiplier}`);
console.log(`✓ Passed: Sensitivity capped at ${multiplier.toFixed(2)}`);

// Test: Reset functionality
console.log('\nTest 4: Reset sensitivity state');
localStorageMock.clear();
// Build up some state
for (let i = 0; i < 10; i++) {
  updateSensitivityFromSession(30);
}

const beforeReset = getCurrentSensitivityMultiplier();
resetSensitivityState();
const afterReset = getCurrentSensitivityMultiplier();

assert(afterReset === 1.0, 'After reset, sensitivity should be 1.0');
console.log(`✓ Passed: Reset from ${beforeReset.toFixed(2)} to ${afterReset.toFixed(2)}`);

// Test: Session count tracking
console.log('\nTest 5: Session count tracking');
localStorageMock.clear();
for (let i = 0; i < 10; i++) {
  updateSensitivityFromSession(20);
}

const state = loadSensitivityState();
assert(state.sessionsSinceCalibration === 10, `Should have 10 sessions, got ${state.sessionsSinceCalibration}`);
console.log(`✓ Passed: Tracked ${state.sessionsSinceCalibration} sessions`);

// Test: Rolling window
console.log('\nTest 6: Rolling window of recent scores');
localStorageMock.clear();
for (let i = 0; i < 10; i++) {
  updateSensitivityFromSession(i * 5); // Varying scores
}

const finalState = loadSensitivityState();
assert(finalState.recentStressScores.length <= 5, `Rolling window should be max 5, got ${finalState.recentStressScores.length}`);
console.log(`✓ Passed: Rolling window size is ${finalState.recentStressScores.length}`);

console.log('\n✅ All sensitivity adaptation tests passed!');


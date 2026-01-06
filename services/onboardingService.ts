import { OnboardingState, OnboardingStage, INITIAL_ONBOARDING_STATE } from '../types/onboarding';
import { StorageService } from './storageService';

const ONBOARDING_KEY_PREFIX = 'onboarding_state_';

export const OnboardingService = {
    /**
     * Get the current onboarding state for a user
     */
    getState: (studentCode: string): OnboardingState => {
        if (!studentCode) return INITIAL_ONBOARDING_STATE;

        const key = `${ONBOARDING_KEY_PREFIX}${studentCode}`;
        const saved = StorageService.getItem<OnboardingState>(key);
        if (saved) {
            return saved;
        }

        return INITIAL_ONBOARDING_STATE;
    },

    /**
     * Initialize onboarding for a brand new user
     */
    initializeForNewUser: (studentCode: string) => {
        if (!studentCode) return;

        const key = `${ONBOARDING_KEY_PREFIX}${studentCode}`;

        // Only initialize if no state exists
        if (!StorageService.getItem(key)) {
            const newState: OnboardingState = {
                ...INITIAL_ONBOARDING_STATE,
                isNewUser: true
            };
            OnboardingService.saveState(studentCode, newState);
        }
    },

    /**
     * Update the current stage of onboarding
     */
    updateStage: (studentCode: string, stage: OnboardingStage) => {
        const state = OnboardingService.getState(studentCode);
        if (!state.isNewUser || state.isSkipped) return;

        state.stage = stage;
        OnboardingService.saveState(studentCode, state);
    },

    /**
     * Mark a specific step as completed
     */
    completeStep: (studentCode: string, step: keyof OnboardingState['stepsCompleted']) => {
        const state = OnboardingService.getState(studentCode);
        if (!state.isNewUser || state.isSkipped) return;

        state.stepsCompleted[step] = true;

        // Auto-advance logic based on completion
        if (step === 'welcome') {
            state.hasSeenWelcome = true;
            state.stage = 'session_prompt';
        } else if (step === 'firstSession') {
            state.stage = 'chat_prompt';
        } else if (step === 'firstChat') {
            state.stage = 'wellness_prompt';
        } else if (step === 'firstWellness') {
            state.stage = 'calibration_prompt';
        } else if (step === 'calibration') {
            state.stage = 'completed';
        }

        OnboardingService.saveState(studentCode, state);
    },

    /**
     * Permanently skip onboarding for this user
     */
    skipOnboarding: (studentCode: string) => {
        const state = OnboardingService.getState(studentCode);
        state.isSkipped = true;
        OnboardingService.saveState(studentCode, state);
    },

    /**
     * Save state using Hybrid Storage
     */
    saveState: (studentCode: string, state: OnboardingState) => {
        const key = `${ONBOARDING_KEY_PREFIX}${studentCode}`;
        StorageService.setItem(key, state, studentCode, 'state');

        // Dispatch event so components can react reactively
        window.dispatchEvent(new CustomEvent('onboardingUpdated', {
            detail: { studentCode, state }
        }));
    }
};

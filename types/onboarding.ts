export type OnboardingStage = 'welcome' | 'calibration_prompt' | 'session_prompt' | 'chat_prompt' | 'wellness_prompt' | 'completed';

export interface OnboardingState {
    stage: OnboardingStage;
    stepsCompleted: {
        welcome: boolean;
        calibration: boolean;
        firstSession: boolean;
        firstChat: boolean;
        firstWellness: boolean;
    };
    hasSeenWelcome: boolean;
    isSkipped: boolean;
    isNewUser: boolean; // Flag to determine if the user is eligible for onboarding
}

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
    stage: 'welcome',
    stepsCompleted: {
        welcome: false,
        calibration: false,
        firstSession: false,
        firstChat: false,
        firstWellness: false
    },
    hasSeenWelcome: false,
    isSkipped: false,
    isNewUser: false
};

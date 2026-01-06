import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FloatingWellbeingBar } from './ui/floating-wellbeing-bar';
import { StorageService } from '../services/storageService';
import { GamifiedSolutionLibrary } from './ui/gamified-solution-library';
import AnimatedLogo from './ui/AnimatedLogo';
import StudentChatModal from './StudentChatModal';
import { MessageCircle, X } from './Icons';


import { motion, AnimatePresence } from 'framer-motion';
import { StartSessionButton } from './ui/StartSessionButton';

import { WelcomeCarousel } from './onboarding/WelcomeCarousel';
import { SpotlightOverlay } from './onboarding/SpotlightOverlay';
import { CompletionCelebration } from './onboarding/CompletionCelebration';
import { OnboardingService } from '../services/onboardingService';
import { OnboardingState, INITIAL_ONBOARDING_STATE } from '../types/onboarding';

interface DashboardProps {
    onStartVoiceSession: () => void;
    onStartCalibration?: () => void;
    onSignOut?: () => void;
}

interface UserData {
    class?: number;
    section?: string;
    enrollment?: string;
    accountNumber?: string;
    password?: string;
}

// Bypassing strict className lint check with a local alias
const MotionDiv = motion.div as any;

const Dashboard: React.FC<DashboardProps> = ({ onStartVoiceSession, onStartCalibration, onSignOut }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string; type: 'immediate' | 'longterm'; completed: boolean }>>([]);
    const accountsButtonRef = useRef<HTMLButtonElement>(null);

    // Onboarding State
    const [onboardingState, setOnboardingState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE);
    const [isOnboardingLoading, setIsOnboardingLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Auto-open modal during calibration onboarding
    useEffect(() => {
        if (onboardingState.stage === 'calibration_prompt') {
            setIsModalOpen(true);
        }
    }, [onboardingState.stage]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (userData?.accountNumber) {
            const state = OnboardingService.getState(userData.accountNumber);
            setOnboardingState(state);
            setIsOnboardingLoading(false);
        }

        const handleOnboardingUpdate = (e: CustomEvent<{ state: OnboardingState }>) => {
            setOnboardingState(e.detail.state);
        };
        // Cast to EventListener to satisfy TS
        const listener = handleOnboardingUpdate as unknown as EventListener;
        window.addEventListener('onboardingUpdated', listener);
        return () => window.removeEventListener('onboardingUpdated', listener);
    }, [userData?.accountNumber]);

    const handleWelcomeComplete = () => {
        if (userData?.accountNumber) {
            OnboardingService.completeStep(userData.accountNumber, 'welcome');
        }
    };


    useEffect(() => {
        // Load user data from localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            try {
                const parsed = JSON.parse(storedUserData);
                setUserData(parsed);

                // Load suggestions for gamified library
                const studentCode = parsed.accountNumber;
                if (studentCode) {
                    const suggestionsKey = `suggestions_${studentCode}`;
                    const savedSuggestions = localStorage.getItem(suggestionsKey);
                    if (savedSuggestions) {
                        const suggestionsData = JSON.parse(savedSuggestions);
                        if (suggestionsData.suggestions) {
                            const completionKey = `suggestions_completed_${studentCode}`;
                            const savedCompletion = localStorage.getItem(completionKey);
                            const completedMap = savedCompletion ? JSON.parse(savedCompletion) : {};
                            const suggestionsWithCompletion = suggestionsData.suggestions.map((s: any) => ({
                                ...s,
                                completed: completedMap[s.id] || false
                            }));
                            setSuggestions(suggestionsWithCompletion);
                        }
                    }
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }

        // Listen for suggestions updates
        const handleSuggestionsUpdate = () => {
            const storedUserData = localStorage.getItem('userData');
            if (storedUserData) {
                try {
                    const parsed = JSON.parse(storedUserData);
                    const studentCode = parsed.accountNumber;
                    if (studentCode) {
                        const suggestionsKey = `suggestions_${studentCode}`;
                        const savedSuggestions = localStorage.getItem(suggestionsKey);
                        if (savedSuggestions) {
                            const suggestionsData = JSON.parse(savedSuggestions);
                            if (suggestionsData.suggestions) {
                                const completionKey = `suggestions_completed_${studentCode}`;
                                const savedCompletion = localStorage.getItem(completionKey);
                                const completedMap = savedCompletion ? JSON.parse(savedCompletion) : {};
                                const suggestionsWithCompletion = suggestionsData.suggestions.map((s: any) => ({
                                    ...s,
                                    completed: completedMap[s.id] || false
                                }));
                                setSuggestions(suggestionsWithCompletion);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error loading suggestions:', error);
                }
            }
        };

        window.addEventListener('suggestionsUpdated', handleSuggestionsUpdate);

        // Subscribe to real-time session plan updates
        StorageService.subscribeToSessionPlans();

        return () => {
            window.removeEventListener('suggestionsUpdated', handleSuggestionsUpdate);
            StorageService.unsubscribeFromSessionPlans();
        };
    }, []);

    const startSession = useCallback(() => {
        onStartVoiceSession();
    }, [onStartVoiceSession]);

    const logout = useCallback(() => {
        if (confirm('Are you sure you want to logout?')) {
            if (onSignOut) {
                onSignOut();
            } else {
                // Fallback if onSignOut is not provided
                window.location.href = 'signin.html';
            }
        }
    }, [onSignOut]);

    // Close modal when clicking outside
    const handleOutsideClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            setIsModalOpen(false);
        }
    }, []);

    const handleChatOpen = useCallback(() => {
        setIsChatOpen(true);
    }, []);

    const handleChatClose = useCallback(() => {
        setIsChatOpen(false);
    }, []);

    const toggleModal = useCallback(() => {
        setIsModalOpen(prev => !prev);
    }, []);

    // Memoize user display data
    const userDisplayData = useMemo(() => {
        if (!userData) return null;
        return {
            accountInfo: userData.class ? `Class ${userData.class}${userData.section ? ` - Section ${userData.section}` : ''}` : 'Student Profile',
            accountCode: userData.accountNumber || '----',
            studentName: userData.enrollment || `Student ${userData.accountNumber}`,
            hasAccountNumber: !!userData.accountNumber
        };
    }, [userData]);

    const modalVariants = {
        hidden: {
            opacity: 0,
            y: isMobile ? '100%' : -20,
            x: isMobile ? 0 : 20,
            scale: isMobile ? 1 : 0.9
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            transition: {
                type: 'spring',
                damping: 25,
                stiffness: 300
            }
        },
        exit: {
            opacity: 0,
            y: isMobile ? '100%' : -20,
            x: isMobile ? 0 : 20,
            scale: isMobile ? 1 : 0.9,
            transition: {
                duration: 0.2
            }
        }
    };

    return (
        <>
            <style>{`
                body {
                    margin: 0;
                    padding: 0;
                    background-color: transparent;
                    font-family: 'Inter', sans-serif;
                    color: #ffffff;
                    min-height: 100vh;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 40px;
                    background-color: transparent;
                    width: 100%;
                }

                .header .flex {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .app-logo h1 {
                    margin: 0;
                    font-size: 36px;
                    font-family: 'Playfair Display', serif;
                    font-weight: 700;
                    background: linear-gradient(135deg, #a855f7, #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .accounts-btn {
                    background: none;
                    border: 1px solid #333333;
                    border-radius: 50px;
                    padding: 12px;
                    min-width: 44px;
                    min-height: 44px;
                    color: #a0a0a0;
                    cursor: pointer;
                    transition: border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease, transform 0.15s ease;
                    position: relative;
                    z-index: 1010;
                    -webkit-tap-highlight-color: transparent;
                }

                .accounts-btn:hover,
                .accounts-btn:active {
                    border-color: #a855f7;
                    color: #a855f7;
                }

                .accounts-btn:active {
                    transform: scale(0.95);
                    background-color: rgba(168, 85, 247, 0.15);
                }

                .accounts-btn.active {
                    border-color: #a855f7;
                    color: #a855f7;
                    background-color: rgba(168, 85, 247, 0.1);
                }

                .accounts-icon {
                    width: 24px;
                    height: 24px;
                    fill: currentColor;
                    stroke: currentColor;
                    transition: transform 0.3s ease;
                }

                .main-content {
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 40px;
                    padding-bottom: 100px;
                    max-width: 2000px;
                    margin: 0 auto;
                    width: 100%;
                    min-height: calc(100vh - 100px);
                }

                .calibration-section {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    z-index: 100;
                }



                .notification-dot {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 12px;
                    height: 12px;
                    background-color: #ef4444;
                    border-radius: 50%;
                    border: 2px solid #000000;
                    z-index: 10;
                }

                .accounts-btn {
                    position: relative;
                }

                .wellbeing-widget {
                    width: fit-content;
                    max-width: fit-content;
                }

                .calibration-btn {
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    border: none;
                    border-radius: 12px;
                    padding: 12px 20px;
                    min-height: 44px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4);
                    font-size: 15px;
                    font-weight: 600;
                    color: #000000;
                    -webkit-tap-highlight-color: transparent;
                }

                .calibration-btn:hover,
                .calibration-btn:active {
                    transform: translateY(-2px) scale(1.05);
                    box-shadow: 0 8px 24px rgba(251, 191, 36, 0.5);
                }

                .calibration-btn:active {
                    transform: scale(0.98);
                }

                .calibration-icon {
                    width: 16px;
                    height: 16px;
                    fill: #000000;
                }


                /* Popup Styles */
                .modal-overlay {
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    transition: all 0.3s ease;
                }

                .modal-content {
                    background: rgba(40, 40, 45, 0.8);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    padding: 32px;
                    border-radius: 24px;
                    width: 340px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    position: fixed;
                    top: 90px;
                    right: 40px;
                    z-index: 1001;
                    box-shadow: 
                        0 20px 60px -10px rgba(0, 0, 0, 0.6),
                        0 0 0 1px rgba(255, 255, 255, 0.05) inset,
                        0 0 40px rgba(0, 0, 0, 0.2);
                    transform-origin: top right;
                }

                @media (max-width: 640px) {
                    .modal-content {
                        top: auto;
                        bottom: 0;
                        right: 0;
                        left: 0;
                        width: 100%;
                        border-radius: 32px 32px 0 0;
                        padding-bottom: 40px;
                        border-bottom: none;
                        border-left: none;
                        border-right: none;
                        background: rgba(17, 17, 23, 0.95);
                    }

                    .header {
                        padding: 15px 20px;
                    }

                    .main-content {
                        padding: 20px;
                    }
                }

                .close {
                    position: absolute;
                    right: 20px;
                    top: 20px;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    color: #a0a0a0;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                }

                .account-info {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .account-name {
                    font-size: 20px;
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 5px;
                }

                .account-code {
                    font-size: 13px;
                    color: #94a3b8;
                    font-weight: 500;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 4px 12px;
                    border-radius: 20px;
                    display: inline-block;
                    margin-top: 8px;
                }

                .logout-btn {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #ef4444;
                    cursor: pointer;
                    width: 100%;
                    transition: all 0.2s ease;
                    margin-top: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.3);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
                }

                .logout-btn:active {
                    transform: scale(0.98);
                }

                .menu-btn {
                    background: rgba(251, 191, 36, 0.08);
                    border: 1px solid rgba(251, 191, 36, 0.2);
                    border-radius: 16px;
                    padding: 16px 20px;
                    width: 100%;
                    text-align: center;
                    color: #fbbf24;
                    font-size: 15px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    position: relative;
                    overflow: hidden;
                }

                .menu-btn:hover {
                    background: rgba(251, 191, 36, 0.15);
                    border-color: rgba(251, 191, 36, 0.4);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px -6px rgba(251, 191, 36, 0.2);
                    color: #fbbf24;
                }

                .menu-btn svg {
                    width: 20px;
                    height: 20px;
                    fill: #fbbf24;
                    filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.3));
                    transition: transform 0.3s ease;
                }

                .menu-btn:hover svg {
                    transform: scale(1.1);
                    fill: #fcd34d;
                }
            `}</style>
            <div className="header">
                <div className="app-logo">
                    <AnimatedLogo size={isMobile ? 60 : 100} />
                </div>
                <div className="flex gap-4 items-center">
                    {/* SyncStatusIndicator removed as per user request */}
                    {onboardingState.stage !== 'session_prompt' && onboardingState.stage !== 'calibration_prompt' && (
                        <>
                            <button
                                id="chat-btn"
                                className="accounts-btn"
                                onClick={handleChatOpen}
                                title="Messages"
                            >
                                <MessageCircle className="accounts-icon" />
                                <span className="notification-dot"></span>
                            </button>
                            <button
                                ref={accountsButtonRef}
                                id="accounts-trigger-btn"
                                className={`accounts-btn ${isModalOpen ? 'active' : ''}`}
                                onClick={toggleModal}
                            >
                                <MotionDiv
                                    animate={{ rotate: isModalOpen ? 90 : 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    {isModalOpen ? (
                                        <X className="accounts-icon" />
                                    ) : (
                                        <svg className="accounts-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    )}
                                </MotionDiv>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="main-content">
                <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto">
                    <div id="start-session-btn" className="relative z-20 w-full flex flex-col items-center">
                        <StartSessionButton onStart={startSession} />
                    </div>

                    {/* Floating Wellbeing Bar - Positioned below Start Session */}
                    <div className="w-full relative z-10">
                        <FloatingWellbeingBar />
                    </div>

                    {/* Gamified Solution Library */}
                    {userDisplayData?.hasAccountNumber && (
                        <div className="w-full relative z-10 mt-6">
                            <GamifiedSolutionLibrary suggestions={suggestions} />
                        </div>
                    )}
                </div>


            </div>



            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <MotionDiv
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={handleOutsideClick}
                        />
                        <MotionDiv
                            id="account-modal-content"
                            className="modal-content"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="account-info">
                                <div className="account-name">
                                    {userDisplayData?.accountInfo || 'Student Profile'}
                                </div>
                                <div className="account-code">{userDisplayData?.accountCode || '----'}</div>
                            </div>

                            {/* Calibration Menu Item */}
                            {onStartCalibration && (
                                <button
                                    id="calibration-btn"
                                    onClick={() => {
                                        if (onStartCalibration) onStartCalibration();
                                        setIsModalOpen(false);
                                    }}
                                    className="menu-btn"
                                >
                                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                        <path d="M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                                    </svg>
                                    Your Voice Settings
                                </button>
                            )}

                            <button className="logout-btn" onClick={logout}>Logout</button>
                        </MotionDiv>
                    </>
                )}
            </AnimatePresence>

            {/* Student Chat Modal */}
            {userDisplayData?.hasAccountNumber && (
                <StudentChatModal
                    isOpen={isChatOpen}
                    onClose={handleChatClose}
                    studentId={userData!.accountNumber!}
                    studentName={userDisplayData.studentName}
                />
            )}

            {/* Onboarding Components */}
            <AnimatePresence>
                {/* Stage 1: Welcome Carousel */}
                {!isOnboardingLoading && onboardingState.stage === 'welcome' && !onboardingState.isSkipped && userData?.accountNumber && (
                    <WelcomeCarousel
                        studentCode={userData.accountNumber}
                        onComplete={handleWelcomeComplete}
                    />
                )}

                {/* Stage 2 PRE: Calibration Prompt (handled by calibration-btn pulse, but we can manage state) */}

                {/* Stage 2: Session Prompt */}
                {onboardingState.stage === 'session_prompt' && (
                    <SpotlightOverlay
                        key="spotlight-session"
                        targetId="start-session-btn"
                        title="Start Your Journey"
                        message="Click here to begin your first wellness session with our AI."
                        onComplete={() => {
                            if (userData?.accountNumber) {
                                OnboardingService.completeStep(userData.accountNumber, 'firstSession');
                            }
                        }}
                        onSkip={() => { }}
                        studentCode={userData?.accountNumber || ''}
                        step={1}
                        totalSteps={4}
                    />
                )}

                {/* Stage 3: Chat Prompt */}
                {onboardingState.stage === 'chat_prompt' && (
                    <SpotlightOverlay
                        key="spotlight-chat"
                        targetId="chat-btn"
                        title="Connect with Counselors"
                        message="Need to talk to someone? Connect with our dedicated school counselors for support anytime."
                        onComplete={() => {
                            if (userData?.accountNumber) {
                                OnboardingService.completeStep(userData.accountNumber, 'firstChat');
                            }
                        }}
                        onSkip={() => { }}
                        studentCode={userData?.accountNumber || ''}
                        step={2}
                        totalSteps={4}
                    />
                )}

                {/* Stage 4: Daily Wellness Tasks Prompt */}
                {onboardingState.stage === 'wellness_prompt' && (
                    <SpotlightOverlay
                        key="spotlight-wellness"
                        targetId="daily-wellness-section"
                        title="Daily Wellness Tasks"
                        message="Complete simple daily tasks suggested by your teacher or AI to maintain your wellbeing."
                        onComplete={() => {
                            if (userData?.accountNumber) {
                                OnboardingService.completeStep(userData.accountNumber, 'firstWellness');
                            }
                        }}
                        onSkip={() => { }}
                        studentCode={userData?.accountNumber || ''}
                        step={3}
                        totalSteps={4}
                    />
                )}

                {/* Stage 5: Calibration Prompt */}
                {onboardingState.stage === 'calibration_prompt' && (
                    <SpotlightOverlay
                        key="spotlight-calibration"
                        targetId="calibration-btn"
                        additionalTargetIds={['account-modal-content', 'accounts-trigger-btn']}
                        title="Calibrate Your Voice"
                        message="Set up your voice baseline here for accurate stress tracking."
                        onComplete={() => {
                            if (userData?.accountNumber) {
                                OnboardingService.completeStep(userData.accountNumber, 'calibration');
                                // Finish onboarding - remove badge modal entirely as requested
                                OnboardingService.skipOnboarding(userData.accountNumber);
                                if (onStartCalibration) onStartCalibration();
                            }
                        }}
                        onSkip={() => { }}
                        studentCode={userData?.accountNumber || ''}
                        step={4}
                        totalSteps={4}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default Dashboard;
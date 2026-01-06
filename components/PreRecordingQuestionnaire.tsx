import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { ArrowLeft, ChevronRight, Mic } from 'lucide-react';
import { BeamsBackground } from './ui/beams-background';
import { InfinityLoader } from '@/components/ui/infinity-loader';
import type { PreAnalysisQuestion, PreAnalysisSession } from '../types';
import {
  generatePersonalizedQuestions,
  getStudentHistory,
  getCurrentStudentId,
  getDefaultQuestions,
  generateId,
} from '../services/personalizationService';
import { getQuestionsForSession } from '../services/planningService';

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface PreRecordingQuestionnaireProps {
  onSubmit: (answers: QuestionnaireAnswers, questions: PreAnalysisQuestion[]) => void;
  onBack: () => void;
  studentId?: string;
}

export type ResponseOption =
  | 'Strongly Disagree'
  | 'Disagree'
  | 'Neutral'
  | 'Agree'
  | 'Strongly Agree'
  | 'Yes'
  | 'No'
  | "I'm not sure";

export interface QuestionAnswer {
  question: string;
  answer: ResponseOption | null;
}

export interface QuestionnaireAnswers {
  [questionId: string]: ResponseOption | string | number;
}

export interface PreAnalysisData {
  session: PreAnalysisSession;
  answers: QuestionnaireAnswers;
}

// Legacy response options for fallback
const SCALE_OPTIONS = ['1', '2', '3', '4', '5'];
const YES_NO_OPTIONS: ResponseOption[] = ['Yes', 'No'];

const ILLNESS_CHECK_QUESTION: PreAnalysisQuestion = {
  id: 'mandatory_illness_check',
  text: "Before we begin, are you feeling physically ill today? (e.g., cold, flu, fever)",
  type: 'yes-no',
  category: 'general'
};

const ScaleSlider = ({ value, onChange }: { value: number | null, onChange: (val: number) => void }) => {
  const labels = {
    1: 'Very Low',
    2: 'Low',
    3: 'Moderate',
    4: 'High',
    5: 'Very High'
  };

  const numericValue = value || 3; // Default to mid-point if null, but visual only

  return (
    <div className="w-full py-6 px-2">
      <div className="relative mb-8">
        {/* Track */}
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500/50 to-purple-500 absolute top-0 left-0 transition-all duration-300 ease-out"
            style={{ width: `${((numericValue - 1) / 4) * 100}%` }}
          />
        </div>

        {/* Thumb (Visual only, input handles interaction) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg shadow-purple-500/50 border-2 border-purple-500 transition-all duration-300 ease-out pointer-events-none z-10"
          style={{ left: `calc(${((numericValue - 1) / 4) * 100}% - 12px)` }}
        >
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={numericValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />

        {/* Markers */}
        <div className="absolute top-4 left-0 w-full h-4 pointer-events-none">
          {[1, 2, 3, 4, 5].map((num) => (
            <div
              key={num}
              className="absolute top-0 flex flex-col items-center gap-1 transition-all duration-300"
              style={{ left: `${((num - 1) / 4) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className={`w-1 h-2 rounded-full transition-colors duration-300 ${num <= numericValue ? 'bg-purple-500' : 'bg-surface'}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center bg-surface/30 rounded-xl p-4 border border-white/5">
        <span className="text-2xl font-bold text-white w-12 text-center">{numericValue}</span>
        <span className="text-lg font-medium text-purple-200">
          {labels[numericValue as keyof typeof labels]}
        </span>
      </div>
    </div>
  );
};

const PreRecordingQuestionnaire: React.FC<PreRecordingQuestionnaireProps> = ({
  onSubmit,
  onBack,
  studentId: propStudentId,
}) => {
  const [step, setStep] = useState(0);
  const [showIllnessCheck, setShowIllnessCheck] = useState(false);

  // Dynamic questions state
  const [questions, setQuestions] = useState<PreAnalysisQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [loaderComplete, setLoaderComplete] = useState(false);
  const [sessionId] = useState(() => generateId());

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [openEndedAnswer, setOpenEndedAnswer] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const finalTranscriptRef = useRef<string>('');
  const questionIndexRef = useRef<number>(currentQuestionIndex);
  const recognitionQuestionIndexRef = useRef<number>(-1);
  const isRecordingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const userStoppedRef = useRef<boolean>(false);

  // Load personalized questions on mount
  const loadQuestions = React.useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      const studentId = propStudentId || getCurrentStudentId();
      const history = getStudentHistory(studentId);
      const questions = await getQuestionsForSession(studentId, history);
      setQuestions(questions);
    } catch (e) {
      console.error('[Questionnaire] Failed to load questions:', e);
      setQuestions(getDefaultQuestions());
    } finally {
      setLoaderComplete(true);
      setTimeout(() => { setIsLoadingQuestions(false); setShowLoader(false); }, 1000);
    }
  }, [propStudentId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Listen for external storage updates (Sync from Firebase)
  useEffect(() => {
    const handleStorageUpdate = (e: CustomEvent<{ key: string, data: any }>) => {
      if (e.detail.key === 'awaaz_session_plans') {
        console.log('[Questionnaire] Received session plan update, reloading questions...');
        loadQuestions();
      }
    };

    window.addEventListener('storage_key_updated', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage_key_updated', handleStorageUpdate as EventListener);
  }, [loadQuestions]);

  // Keep question index ref in sync
  useEffect(() => {
    questionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  const activeQuestion = showIllnessCheck ? ILLNESS_CHECK_QUESTION : questions[currentQuestionIndex];
  const isLastQuestion = !showIllnessCheck && (currentQuestionIndex === questions.length - 1);
  const isScaleQuestion = activeQuestion?.type === 'scale-1-5';
  const isYesNoQuestion = activeQuestion?.type === 'yes-no';
  const isMultipleChoice = activeQuestion?.type === 'multiple-choice';
  const isOpenEnded = activeQuestion?.type === 'open-ended';

  const getResponseOptions = (): string[] => {
    if (!activeQuestion) return [];
    if (isScaleQuestion) return SCALE_OPTIONS;
    if (isYesNoQuestion) return YES_NO_OPTIONS;
    if (isMultipleChoice && activeQuestion.options) return activeQuestion.options;
    return [];
  };
  const responseOptions = getResponseOptions();

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (recognitionQuestionIndexRef.current !== questionIndexRef.current) return;

        let newFinalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinalTranscript += transcript + ' ';
          } else {
            if (i === event.results.length - 1) {
              interimTranscript = transcript;
            }
          }
        }

        if (newFinalTranscript.trim()) {
          finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + newFinalTranscript).trim();
        }

        const newText = finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
        setOpenEndedAnswer(newText);

        if (finalTranscriptRef.current) {
          setAnswers(prev => ({ ...prev, [questionIndexRef.current]: finalTranscriptRef.current }));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        isRecordingRef.current = false;
        isStartingRef.current = false;
        recognitionQuestionIndexRef.current = -1;
      };

      recognition.onend = () => {
        const wasRecording = isRecordingRef.current;
        const userStopped = userStoppedRef.current;

        setIsRecording(false);
        isRecordingRef.current = false;
        isStartingRef.current = false;

        if (recognitionQuestionIndexRef.current !== questionIndexRef.current) return;

        if (finalTranscriptRef.current) {
          const finalText = finalTranscriptRef.current.trim();
          setOpenEndedAnswer(finalText);
        }

        // Auto-restart if needed (logic preserved)
        if (wasRecording && !userStopped && recognitionQuestionIndexRef.current === questionIndexRef.current) {
          setTimeout(() => {
            // Re-check refs
            if (recognitionRef.current && recognitionQuestionIndexRef.current === questionIndexRef.current && !userStoppedRef.current) {
              try {
                recognitionRef.current.start();
                setIsRecording(true);
                isRecordingRef.current = true;
              } catch (e) { }
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        userStoppedRef.current = true;
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Sync answers/questions
  useEffect(() => {
    // Stop recording on question switch
    if ((isRecording || isRecordingRef.current) && recognitionRef.current) {
      userStoppedRef.current = true;
      try { recognitionRef.current.stop(); } catch (e) { }
      setIsRecording(false);
      isRecordingRef.current = false;
    }
    recognitionQuestionIndexRef.current = -1;

    if (activeQuestion) {
      const savedAnswer = answers[activeQuestion.id];
      setSelectedAnswer(savedAnswer !== undefined ? savedAnswer : null);

      // Load saved answer for open-ended questions
      if (activeQuestion.type === 'open-ended' && typeof savedAnswer === 'string') {
        setOpenEndedAnswer(savedAnswer);
        finalTranscriptRef.current = savedAnswer;
      } else {
        setOpenEndedAnswer('');
        finalTranscriptRef.current = '';
      }
    }
  }, [currentQuestionIndex, showIllnessCheck, activeQuestion, answers]);

  const handleAnswerChange = (answer: string | number) => {
    if (!activeQuestion) return;
    setSelectedAnswer(answer);
    setAnswers(prev => ({
      ...prev,
      [activeQuestion.id]: answer
    }));
  };

  const handleOpenEndedChange = (text: string) => {
    setOpenEndedAnswer(text);
    setSelectedAnswer(text || null);
    if (!showIllnessCheck && activeQuestion) {
      setAnswers(prev => ({
        ...prev,
        [activeQuestion.id]: text
      }));
    }
  };

  const startRecognition = () => { /* ... simplified ... */
    if (!recognitionRef.current) return;
    isStartingRef.current = true;
    userStoppedRef.current = false;
    finalTranscriptRef.current = typeof selectedAnswer === 'string' ? selectedAnswer : '';
    recognitionQuestionIndexRef.current = questionIndexRef.current;
    try {
      recognitionRef.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;
    } catch (e) {
      console.error(e);
    }
    isStartingRef.current = false;
  };
  const stopRecognition = () => {
    if (!recognitionRef.current) return;
    userStoppedRef.current = true;
    try { recognitionRef.current.stop(); } catch (e) { }
    setIsRecording(false);
    isRecordingRef.current = false;
  };
  const handleToggleRecording = () => {
    if (isRecording) stopRecognition();
    else startRecognition();
  };

  const handleNext = () => {
    if (!activeQuestion) return;
    if (selectedAnswer === null) return;

    // Save answer
    const updatedAnswers = {
      ...answers,
      [activeQuestion.id]: selectedAnswer
    };
    setAnswers(updatedAnswers);

    if (showIllnessCheck) {
      // Submit everything including the illness check
      onSubmit(updatedAnswers, [...questions, ILLNESS_CHECK_QUESTION]);
    } else if (isLastQuestion) {
      // Go to illness check
      setShowIllnessCheck(true);
    } else {
      // Next normal question
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (showIllnessCheck) {
      // If they skipped, maybe going back cancels skip? Or if existing flow...
      // Assuming regular flow logic:
      setShowIllnessCheck(false);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setShowIllnessCheck(true);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (selectedAnswer !== null) {
        handleNext();
      }
    },
    onSwipedRight: () => {
      if (!showIllnessCheck && currentQuestionIndex > 0) {
        handlePrevious();
      } else if (showIllnessCheck) {
        setShowIllnessCheck(false);
      }
    },
    trackMouse: true,
  });

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen w-full bg-background-primary text-text-primary flex flex-col relative">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <BeamsBackground intensity="medium" className="!z-0" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 relative">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-4">
              {(!showIllnessCheck || currentQuestionIndex > 0) && (
                <button
                  onClick={onBack} // Global back might need logic adjustment
                  className="p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-primary"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-xl font-semibold">Pre-Recording Assessment</h1>
            </div>
            {!showIllnessCheck && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
              >
                Skip Questions
              </button>
            )}
          </div>

          {/* Progress Bar (Hidden during illness check) */}
          {!showIllnessCheck && (
            <>
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-primary to-purple-light"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <p className="text-sm text-text-muted mt-2 text-center">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-center relative z-10" {...handlers}>
        <div className="max-w-2xl mx-auto px-4 py-8 w-full">
          {(showLoader || (!activeQuestion && !showIllnessCheck)) ? (
            <div className="flex flex-col items-center justify-center py-16">
              <InfinityLoader
                statusText="Preparing your personalized questions..."
                isComplete={loaderComplete}
              />
            </div>
          ) : (activeQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={showIllnessCheck ? 'illness' : currentQuestionIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="bg-background-secondary rounded-xl p-8 border-2 border-surface mb-8">
                  <div className="flex items-start gap-4 mb-6">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-primary/20 text-purple-primary flex items-center justify-center text-lg font-semibold">
                      {showIllnessCheck ? '!' : (currentQuestionIndex + 1)}
                    </span>
                    <h2 className="text-xl font-semibold text-text-primary flex-1 pt-1 leading-relaxed">
                      {activeQuestion.text}
                    </h2>
                  </div>

                  {responseOptions.length > 0 && (
                    <div className="space-y-3">
                      {isScaleQuestion ? (
                        <ScaleSlider
                          value={selectedAnswer ? parseInt(selectedAnswer.toString()) : 3}
                          onChange={(val) => handleAnswerChange(val.toString())}
                        />
                      ) : (
                        responseOptions.map((option) => {
                          const isSelected = selectedAnswer === option;
                          return (
                            <label
                              key={option}
                              onClick={() => handleAnswerChange(option)}
                              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-purple-primary/20 border-2 border-purple-primary shadow-lg shadow-purple-primary/20' : 'bg-surface/50 border-2 border-transparent hover:bg-surface hover:border-purple-primary/30'}`}
                            >
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-purple-primary bg-purple-primary scale-110' : 'border-text-muted'}`}>
                                {isSelected && <div className="w-3 h-3 rounded-full bg-white" />}
                              </div>
                              <span className={`text-base flex-1 ${isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                                {option}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}

                  {isOpenEnded && (
                    <div className="space-y-4">
                      <div className={`relative rounded-xl border-2 transition-all duration-300 ${isRecording ? 'border-purple-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-surface bg-surface/30'}`}>
                        <textarea
                          ref={textareaRef}
                          value={openEndedAnswer}
                          onChange={(e) => handleOpenEndedChange(e.target.value)}
                          placeholder="Type your answer here or use the microphone..."
                          className="w-full h-32 bg-transparent p-4 text-text-primary placeholder:text-text-muted outline-none resize-none"
                        />
                        <button
                          onClick={handleToggleRecording}
                          className={`absolute bottom-3 right-3 p-3 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50' : 'bg-purple-primary hover:bg-purple-light shadow-lg shadow-purple-primary/30'}`}
                        >
                          <Mic className={`w-5 h-5 text-white ${isRecording ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                      <p className="text-xs text-text-muted italic px-1">
                        {isRecording ? 'Listening... Tip: Speak clearly. Tap the mic to stop.' : 'Tip: You can use your voice to answer.'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ))}

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4">
            {/* Previous: Logic depends on if we are in Illness check */}
            <button
              onClick={showIllnessCheck ? () => setShowIllnessCheck(false) : handlePrevious}
              disabled={!showIllnessCheck && currentQuestionIndex === 0}
              className={`flex-1 py-4 px-6 min-h-[44px] rounded-xl font-medium text-text-secondary bg-surface hover:bg-surface/80 active:bg-surface/60 active:scale-[0.98] transition-all duration-200 border border-surface/50 ${(!showIllnessCheck && currentQuestionIndex === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={selectedAnswer === null}
              className={`
                flex-1 py-4 px-6 rounded-xl font-semibold text-white
                flex items-center justify-center gap-2
                bg-gradient-to-r from-purple-primary to-purple-light
                hover:from-purple-light hover:to-purple-primary
                transition-all duration-200
                shadow-lg shadow-purple-primary/30
                hover:shadow-xl hover:shadow-purple-primary/40
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-[1.02] active:scale-[0.98]
              `}
            >
              {showIllnessCheck ? 'Start Session' : (isLastQuestion ? 'Continue' : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreRecordingQuestionnaire;

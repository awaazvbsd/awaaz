import React, { useEffect, useState } from 'react';
import type { AnalysisData, Biomarker } from '../types';
import GlassCard from './GlassCard';
import { ChevronLeft } from './Icons';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { LiquidButton } from './ui/liquid-button';
import { InfinityLoader } from '@/components/ui/infinity-loader';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StorageService } from '../services/storageService';

interface PostAnalysisSuggestionsScreenProps {
  analysisData: AnalysisData;
  onBack: () => void;
  onClose: () => void;
}

const MotionDiv = motion.div as any;

const positiveAffirmations = [
  "Thank you for taking this step toward understanding yourself better",
  "We appreciate you taking time for your well-being today",
  "You took an important step today—we're proud of you",
  "You're on the right path to understanding your stress better",
  "Every session brings you closer to better self-awareness",
  "We're here to support you on your wellness journey",
  "You're taking control of your stress, one session at a time",
  "Every insight brings you closer to balance",
  "You've given yourself the gift of self-awareness today",
  "Small steps lead to meaningful change—you're making progress"
];

// Generate personalized suggestions using Gemini AI
const generateSuggestionsWithGemini = async (
  stressLevel: number,
  biomarkers: Biomarker[],
  aiSummary?: string,
  questionnaireAnswers?: { [questionId: string]: string | number },
  liveSessionAnswers?: { questionText: string; studentAnswer: string }[]
): Promise<{ immediate: string[]; longTerm: string[]; nextSession: number }> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' }, { apiVersion: 'v1beta' });

    // Analyze problematic biomarkers
    const problematicBiomarkers = biomarkers.filter(b => b.status === 'red' || b.status === 'orange');
    const biomarkerDetails = problematicBiomarkers.map(b => `${b.name}: ${b.value} (${b.status})`).join(', ');

    // Determine stress category
    const stressCategory = stressLevel < 34 ? 'low' : stressLevel < 67 ? 'moderate' : 'high';

    // Build student context from LIVE SESSION answers (priority) and questionnaire
    let studentContext = '';

    // Priority 1: Live conversation with Gemini (most valuable context)
    if (liveSessionAnswers && liveSessionAnswers.length > 0) {
      const liveContextLines = liveSessionAnswers.map(qa =>
        `- Q: "${qa.questionText.substring(0, 80)}..."\n  A: "${qa.studentAnswer}"`
      );
      studentContext += `\n\n🎯 STUDENT'S LIVE CONVERSATION (HIGHEST PRIORITY CONTEXT):\n${liveContextLines.join('\n\n')}`;
    }

    // Priority 2: Pre-recording questionnaire answers
    if (questionnaireAnswers && Object.keys(questionnaireAnswers).length > 0) {
      const contextLines = Object.entries(questionnaireAnswers).map(([, answer]) => `- "${answer}"`);
      studentContext += `\n\nPRE-SESSION QUESTIONNAIRE:\n${contextLines.join('\n')}`;
    }

    // Add instruction if we have any context
    if (studentContext) {
      studentContext += `\n\n⚠️ CRITICAL INSTRUCTION: The student mentioned SPECIFIC problems above. You MUST include at least 2 suggestions that DIRECTLY address their specific concerns with practical, actionable advice. Do NOT give generic wellness tips if specific issues were mentioned.`;
    }

    const prompt = `You are a strict personal mentor. Your goal is to solve the user's SPECIFIC problems.
    
    CONTEXT ANALYSIS:
    - Stress Level: ${stressLevel}/100 (${stressCategory})
    - Biomarkers: ${biomarkerDetails || 'None'}
    
    USER'S EXACT WORDS (LIVE CONVERSATION):
    ${studentContext || "No specific conversation recorded."}
    
    CRITICAL INSTRUCTION - READ CAREFULLY:
    1. **IGNORE GENERIC ADVICE**: If the user mentioned "math", "exams", "parents", "sleep", or "friends", your suggestions MUST be about that.
    2. **BAN LIST**: Do NOT suggest "drink water", "eat healthy", "take a walk", or "meditate" UNLESS the user explicitly asked about health/fitness.
    3. **SPECIFICITY**: If they said "I failed math", suggest "Review math errors with teacher". If they said "I can't sleep", suggest "No screens 1hr before bed".
    4. **STRICT COUNT**: EXACTLY 6 suggestions (3 immediate, 3 long-term).
    5. **LENGTH**: Each suggestion MUST be 3-8 words MAX. Examples: "Review math with teacher", "Journal for 5 mins daily". NO EXPLANATIONS.
    
    OUTPUT FORMAT (JSON ONLY):
    {"immediate": ["action1", "action2", "action3"], "longTerm": ["habit1", "habit2", "habit3"]}
    
    Generate personalized (NOT generic) suggestions now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonText);

    // STRICT ENFORCEMENT: Ensure max 6 total suggestions, max 3 per category
    let immediate = Array.isArray(parsed.immediate) ? parsed.immediate : [];
    let longTerm = Array.isArray(parsed.longTerm) ? parsed.longTerm : [];

    // Trim each category to max 3
    immediate = immediate.slice(0, 3);
    longTerm = longTerm.slice(0, 3);

    // Calculate current total
    let total = immediate.length + longTerm.length;

    // If total exceeds 6, trim long-term to fit
    if (total > 6) {
      longTerm = longTerm.slice(0, 6 - immediate.length);
      total = immediate.length + longTerm.length;
    }

    // Ensure we have at least 2 in each category if we have room (but never exceed 6)
    if (total < 6) {
      if (immediate.length < 2 && total + 1 <= 6) {
        immediate.push("Practice deep breathing");
        total++;
      }
      if (longTerm.length < 2 && total + 1 <= 6) {
        longTerm.push("Establish consistent daily routine");
        total++;
      }
    }

    // Final safety check: ensure we never exceed 6
    if (total > 6) {
      // Trim long-term first, then immediate if needed
      const excess = total - 6;
      if (longTerm.length >= excess) {
        longTerm = longTerm.slice(0, longTerm.length - excess);
      } else {
        const remainingExcess = excess - longTerm.length;
        longTerm = [];
        immediate = immediate.slice(0, immediate.length - remainingExcess);
      }
    }

    // Determine next session based on stress level
    let nextSession = 14; // 2 weeks default
    if (stressLevel >= 67) {
      nextSession = 3; // 3 days for high stress
    } else if (stressLevel >= 34) {
      nextSession = 7; // 1 week for moderate stress
    }

    // Final return with strict limits
    return {
      immediate: immediate.slice(0, 3), // Max 3
      longTerm: longTerm.slice(0, Math.min(3, 6 - immediate.length)), // Max 3, but ensure total <= 6
      nextSession
    };
  } catch (error) {
    console.error('Error generating suggestions with Gemini:', error);
    // Fallback to basic suggestions if Gemini fails
    return getFallbackSuggestions(stressLevel, biomarkers, aiSummary);
  }
};

// Fallback function if Gemini fails - STRICTLY enforces max 6 total
const getFallbackSuggestions = (
  stressLevel: number,
  biomarkers: Biomarker[],
  aiSummary?: string
): { immediate: string[]; longTerm: string[]; nextSession: number } => {
  const isHighStress = stressLevel >= 67;
  const isModerateStress = stressLevel >= 34 && stressLevel < 67;

  let immediate: string[] = [];
  let longTerm: string[] = [];

  if (isHighStress) {
    // High stress: 3 immediate + 3 long-term = 6 total
    immediate = [
      "Practice box breathing for 2 minutes",
      "Drink warm herbal tea",
      "Stretch neck and shoulders"
    ];
    longTerm = [
      "Get 7-9 hours of sleep nightly",
      "Exercise 3-4 times per week",
      "Consider therapy or counseling"
    ];
  } else if (isModerateStress) {
    // Moderate stress: 3 immediate + 3 long-term = 6 total
    immediate = [
      "Practice deep breathing for 5 minutes",
      "Take a short walk outside",
      "Listen to calming music"
    ];
    longTerm = [
      "Maintain consistent sleep schedule",
      "Exercise 30 minutes, 3-4 times weekly",
      "Practice daily mindfulness meditation"
    ];
  } else {
    // Low stress: 3 immediate + 3 long-term = 6 total
    immediate = [
      "Continue mindfulness practice",
      "Connect with supportive friends",
      "Appreciate your positive state"
    ];
    longTerm = [
      "Keep a consistent wake-up time", // More specific than "sleep schedule"
      "Engage in 20 mins of daily cardio",
      "Start a specific gratitude journal"
    ];
  }

  // STRICT ENFORCEMENT: Ensure exactly 6 total, max 3 per category
  // All cases already have 3+3=6, so we just need to ensure we don't exceed limits
  let finalImmediate = immediate.slice(0, 3);
  let finalLongTerm = longTerm.slice(0, 3);

  // Ensure total never exceeds 6
  const total = finalImmediate.length + finalLongTerm.length;
  if (total > 6) {
    // Trim long-term to fit
    finalLongTerm = finalLongTerm.slice(0, 6 - finalImmediate.length);
  }

  return {
    immediate: finalImmediate,
    longTerm: finalLongTerm,
    nextSession: isHighStress ? 3 : isModerateStress ? 7 : 14
  };
};

const PostAnalysisSuggestionsScreen: React.FC<PostAnalysisSuggestionsScreenProps> = ({
  analysisData,
  onBack,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<{ immediate: string[]; longTerm: string[]; nextSession: number }>({
    immediate: [],
    longTerm: [],
    nextSession: 14
  });
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [loaderComplete, setLoaderComplete] = useState(false);

  const handlers = useSwipeable({
    onSwipedRight: () => {
      onBack();
    },
    trackMouse: true,
  });

  const stressLevel = analysisData.stressLevel;
  const affirmation = positiveAffirmations[Math.floor(Math.random() * positiveAffirmations.length)];

  // Track the last analysis date to prevent duplicate generation
  const lastAnalysisDateRef = React.useRef<string | null>(null);

  // Generate suggestions using Gemini AI when component mounts
  useEffect(() => {
    // Prevent duplicate generation for the same analysis
    if (analysisData.date === lastAnalysisDateRef.current) {
      return;
    }
    lastAnalysisDateRef.current = analysisData.date;

    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const generated = await generateSuggestionsWithGemini(
          stressLevel,
          analysisData.biomarkers || [],
          analysisData.aiSummary,
          analysisData.questionnaireAnswers,
          analysisData.liveSessionAnswers
        );

        // STRICT VALIDATION: Ensure max 6 total, max 3 per category
        let finalImmediate = generated.immediate.slice(0, 3);
        let finalLongTerm = generated.longTerm.slice(0, 3);

        // Ensure total never exceeds 6
        const total = finalImmediate.length + finalLongTerm.length;
        if (total > 6) {
          // Trim long-term to fit
          finalLongTerm = finalLongTerm.slice(0, 6 - finalImmediate.length);
        }

        // Debug log to verify count
        const finalTotal = finalImmediate.length + finalLongTerm.length;
        console.log(`[Suggestions] Immediate: ${finalImmediate.length}, Long-term: ${finalLongTerm.length}, Total: ${finalTotal}`);

        if (finalTotal > 6) {
          console.error(`[ERROR] Suggestions exceed 6! Total: ${finalTotal}`);
          // Emergency fix
          finalLongTerm = finalLongTerm.slice(0, Math.max(0, 6 - finalImmediate.length));
        }

        setSuggestions({
          immediate: finalImmediate,
          longTerm: finalLongTerm,
          nextSession: generated.nextSession
        });
      } catch (error) {
        console.error('Error loading suggestions:', error);
        // Use fallback
        const fallback = getFallbackSuggestions(
          stressLevel,
          analysisData.biomarkers || [],
          analysisData.aiSummary
        );
        setSuggestions(fallback);
      } finally {
        setLoaderComplete(true);
        setTimeout(() => { setLoading(false); setShowLoader(false); }, 1000);
      }
    };

    loadSuggestions();
  }, [stressLevel, analysisData.biomarkers, analysisData.aiSummary, analysisData.date]);

  // Save suggestions to localStorage for the todo list
  useEffect(() => {
    const userData = StorageService.getItem<any>('userData');
    if (userData) {
      try {
        const studentCode = userData.accountNumber;

        // Generate unique IDs for this session's suggestions
        const timestamp = Date.now();

        // Combine immediate and long-term suggestions
        const allSuggestions = [
          ...suggestions.immediate.map((s, idx) => ({
            id: `immediate-${timestamp}-${idx}`,
            label: s,
            type: 'immediate' as const,
            completed: false
          })),
          ...suggestions.longTerm.map((s, idx) => ({
            id: `longterm-${timestamp}-${idx}`,
            label: s,
            type: 'longterm' as const,
            completed: false
          }))
        ];

        // Save suggestions for this student
        const suggestionsKey = `suggestions_${studentCode}`;
        const suggestionsData = {
          stressLevel,
          suggestions: allSuggestions,
          date: new Date().toISOString(),
          nextSession: suggestions.nextSession
        };
        StorageService.setItem(suggestionsKey, suggestionsData, studentCode, 'state');

        // Dispatch custom event to notify todo list to refresh
        window.dispatchEvent(new Event('suggestionsUpdated'));
      } catch (error) {
        console.error('Error saving suggestions:', error);
      }
    }
  }, [stressLevel, suggestions]);

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 max-w-2xl mx-auto bg-background-primary/95 backdrop-blur-sm">
      <button
        onClick={onBack}
        className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20 active:bg-purple-primary/30 active:scale-95"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <h1 className="text-lg font-medium text-white">Suggestions</h1>
      <div className="w-11 h-11" /> {/* Spacer for centering */}
    </header>
  );

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.4
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.4
      }
    }
  };

  return (
    <div className="min-h-screen w-full p-4 pt-[80px] pb-10 max-w-2xl mx-auto" {...handlers}>
      <Header />

      <MotionDiv
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Top Banner - Positive Affirmation */}
        <MotionDiv variants={itemVariants}>
          <div className="bg-purple-dark rounded-2xl p-5">
            <p className="text-base font-medium text-white text-center leading-relaxed">
              {affirmation}
            </p>
          </div>
        </MotionDiv>

        {/* Main Section - Personalized Suggestions */}
        <MotionDiv variants={itemVariants}>
          <div className="bg-surface rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 text-left">Personalized Suggestions</h2>

            {showLoader ? (
              <div className="flex items-center justify-center py-8">
                <InfinityLoader
                  statusText="Generating personalized suggestions..."
                  isComplete={loaderComplete}
                />
              </div>
            ) : (
              <>
                {/* Immediate Actions */}
                <div className="mb-6">
                  <h3 className="text-base font-bold text-purple-light mb-4 text-left">Immediate Actions</h3>
                  <div className="space-y-3">
                    {suggestions.immediate.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="bg-background-secondary rounded-xl p-4">
                        <p className="text-sm text-white leading-relaxed text-left">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Long-term Wellness */}
                <div>
                  <h3 className="text-base font-bold text-purple-light mb-4 text-left">Long-term Wellness</h3>
                  <div className="space-y-3">
                    {suggestions.longTerm.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="bg-background-secondary rounded-xl p-4">
                        <p className="text-sm text-white leading-relaxed text-left">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </MotionDiv>

        {/* Close/Finish Button */}
        <MotionDiv variants={itemVariants} className="pt-4">
          <LiquidButton
            onClick={onClose}
            className="w-full h-14 rounded-2xl flex items-center justify-center font-medium"
          >
            Return to Dashboard
          </LiquidButton>
        </MotionDiv>
      </MotionDiv>
    </div>
  );
};

export default PostAnalysisSuggestionsScreen;


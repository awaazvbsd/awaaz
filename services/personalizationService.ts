/**
 * Personalization Service
 * Central service for all personalization logic including:
 * - Student history management
 * - AI-powered question generation
 * - Session data storage
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    StudentProfile,
    StudentHistory,
    PreAnalysisQuestion,
    PreAnalysisSession,
    SessionData,
    LearningAnalytics,
    LiveSessionQuestion,
} from '../types';
import { StorageService } from './storageService';

const STORAGE_KEY_PREFIX = 'awaaz_student_';

// Generate unique ID
export const generateId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get current student ID from localStorage
export const getCurrentStudentId = (): string => {
    if (typeof window === 'undefined') return 'default';
    const userData = StorageService.getItem<any>('userData');
    return userData?.accountNumber || 'default';
};

// Load student history from localStorage
export const getStudentHistory = (studentId?: string): StudentHistory | null => {
    if (typeof window === 'undefined') return null;
    const id = studentId || getCurrentStudentId();
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    return StorageService.getItem<StudentHistory>(key);
};

// Save student history to localStorage
export const saveStudentHistory = (history: StudentHistory, studentId?: string): void => {
    if (typeof window === 'undefined') return;
    const id = studentId || getCurrentStudentId();
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    StorageService.setItem(key, history, id, 'state');
};

// Initialize student profile if not exists
export const initializeStudentProfile = (studentId?: string, name?: string): StudentHistory => {
    const id = studentId || getCurrentStudentId();
    const existingHistory = getStudentHistory(id);

    if (existingHistory) {
        return existingHistory;
    }

    // Create new profile
    const newHistory: StudentHistory = {
        profile: {
            studentId: id,
            name: name || 'Student',
            createdAt: new Date().toISOString(),
        },
        sessions: [],
        learningAnalytics: {
            topicsStruggledWith: [],
            averageSessionDuration: 0,
            consistencyScore: 0,
            totalSessions: 0,
            averageStressLevel: 0,
        },
    };

    saveStudentHistory(newHistory, id);
    return newHistory;
};

// Save session data
export const saveSessionData = (sessionData: SessionData, studentId?: string): void => {
    const id = studentId || getCurrentStudentId();
    const history = getStudentHistory(id) || initializeStudentProfile(id);

    // Add session to history
    history.sessions.push(sessionData);

    // Update learning analytics
    updateLearningAnalytics(history);

    saveStudentHistory(history, id);
};

// Update learning analytics based on all sessions
const updateLearningAnalytics = (history: StudentHistory): void => {
    const sessions = history.sessions;
    if (sessions.length === 0) return;

    const totalSessions = sessions.length;
    const totalStress = sessions.reduce((sum, s) => sum + (s.voiceAnalysis?.stressLevel || 0), 0);
    const averageStressLevel = totalStress / totalSessions;

    // Calculate consistency (sessions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = sessions.filter(s => new Date(s.date) > thirtyDaysAgo);
    const consistencyScore = Math.min(100, (recentSessions.length / 4) * 100); // 4 sessions/month = 100%

    history.learningAnalytics = {
        ...history.learningAnalytics,
        totalSessions,
        averageStressLevel: Math.round(averageStressLevel),
        consistencyScore: Math.round(consistencyScore),
        topicsStruggledWith: history.learningAnalytics?.topicsStruggledWith || [],
        averageSessionDuration: history.learningAnalytics?.averageSessionDuration || 0,
    };
};

// Summarize history for AI prompts
export const summarizeHistoryForAI = (history: StudentHistory | null): string => {
    if (!history || history.sessions.length === 0) {
        return 'This is a new student with no previous session history.';
    }

    const recentSessions = history.sessions.slice(-5); // Last 5 sessions
    const avgStress = history.learningAnalytics?.averageStressLevel || 0;
    const totalSessions = history.learningAnalytics?.totalSessions || 0;

    // Extract common themes from previous answers
    const allPreAnalysisAnswers = recentSessions
        .map(s => s.preAnalysisSession?.answers || {})
        .filter(a => Object.keys(a).length > 0);

    const allLiveAnswers = recentSessions
        .flatMap(s => s.liveSessionQuestions || [])
        .slice(-10); // Last 10 live answers

    return `
Student Profile:
- Total Sessions: ${totalSessions}
- Average Stress Level: ${avgStress}%
- Consistency Score: ${history.learningAnalytics?.consistencyScore || 0}%

Recent Pre-Analysis Answers (last ${allPreAnalysisAnswers.length} sessions):
${JSON.stringify(allPreAnalysisAnswers, null, 2)}

Recent Live Session Responses:
${allLiveAnswers.map(qa => `Q: "${qa.questionText.substring(0, 50)}..." A: "${qa.studentAnswer.substring(0, 100)}..."`).join('\n')}
  `.trim();
};

// Generate personalized pre-analysis questions using AI
export const generatePersonalizedQuestions = async (
    history: StudentHistory | null
): Promise<PreAnalysisQuestion[]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '';

    if (!apiKey) {
        console.warn('[PersonalizationService] No API key, using default questions');
        return getDefaultQuestions();
    }

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const historySummary = summarizeHistoryForAI(history);

        const prompt = `You are generating personalized pre-session check-in questions for a student wellbeing app.

${historySummary}

Generate 4 personalized, closed-ended questions that:
1. Are relevant to this student's history and patterns
2. Use simple language appropriate for students aged 10-18
3. Are quick to answer (scale, yes/no, or multiple choice)
4. Cover different aspects: stress, focus, sleep, social

Return ONLY a JSON array with this exact structure:
[
  {
    "id": "q1",
    "text": "Question text here?",
    "type": "scale-1-5" | "yes-no" | "multiple-choice",
    "options": ["Option 1", "Option 2", "Option 3"] // only for multiple-choice
    "category": "stress" | "sleep" | "focus" | "social" | "academic" | "general"
  }
]

Example question formats:
- Scale: "On a scale of 1-5, how would you rate your sleep quality last night? (1=Very Poor, 5=Excellent)"
- Yes/No: "Have you been feeling overwhelmed with schoolwork lately?"
- Multiple Choice: "Which best describes your mood right now?" with options

Do not include markdown code blocks. Return only valid JSON.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(cleaned) as PreAnalysisQuestion[];

        // Validate and add IDs if missing
        return questions.map((q, i) => ({
            ...q,
            id: q.id || `q${i + 1}_${generateId()}`,
        }));

    } catch (e) {
        console.error('[PersonalizationService] Failed to generate questions:', e);
        return getDefaultQuestions();
    }
};

// Default fallback questions
export const getDefaultQuestions = (): PreAnalysisQuestion[] => [
    {
        id: 'default_1',
        text: 'On a scale of 1-5, how stressed have you been feeling today? (1=Very Calm, 5=Very Stressed)',
        type: 'scale-1-5',
        category: 'stress',
    },
    {
        id: 'default_2',
        text: 'Did you get enough sleep last night?',
        type: 'yes-no',
        category: 'sleep',
    },
    {
        id: 'default_3',
        text: 'How would you describe your focus level today?',
        type: 'multiple-choice',
        options: ['Very Focused', 'Somewhat Focused', 'Easily Distracted', 'Cannot Focus'],
        category: 'focus',
    },
    {
        id: 'default_4',
        text: 'Have you talked to a friend or family member about your feelings recently?',
        type: 'yes-no',
        category: 'social',
    },
];

// Get all previous pre-analysis answers for a student
export const getAllPreAnalysisAnswers = (studentId?: string): PreAnalysisSession[] => {
    const history = getStudentHistory(studentId);
    if (!history) return [];

    return history.sessions
        .map(s => s.preAnalysisSession)
        .filter((pa): pa is PreAnalysisSession => pa !== undefined);
};

// Get all previous live session answers for a student
export const getAllLiveSessionAnswers = (studentId?: string): LiveSessionQuestion[] => {
    const history = getStudentHistory(studentId);
    if (!history) return [];

    return history.sessions.flatMap(s => s.liveSessionQuestions || []);
};

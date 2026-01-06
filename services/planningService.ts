/**
 * Planning Service
 * Manages counselor session plans for students
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    SessionPlan,
    CounselorQuestion,
    PreAnalysisQuestion,
    StudentHistory,
    PreAnalysisCategory
} from '../types';
import { generatePersonalizedQuestions, generateId } from './personalizationService';
import { StorageService } from './storageService';

const PLANS_KEY = 'awaaz_session_plans';

export const FALLBACK_QUESTIONS: PreAnalysisQuestion[] = [
    { id: 'fb1', text: "What is one thing you are looking forward to this week?", type: 'multiple-choice', options: ["Friendships", "Sports", "Holidays", "Other"], category: 'general' },
    { id: 'fb2', text: "How is your energy level today?", type: 'scale-1-5', category: 'general' },
    { id: 'fb3', text: "Is there anything specifically bothering you right now?", type: 'yes-no', category: 'stress' },
    { id: 'fb4', text: "Have you been able to spend time with friends or family?", type: 'yes-no', category: 'social' },
    { id: 'fb5', text: "Do you feel prepared for your upcoming classes?", type: 'scale-1-5', category: 'academic' },
];

// ========== CRUD Operations ==========

export const getAllSessionPlans = (): Record<string, SessionPlan> => {
    try {
        return StorageService.getItem<Record<string, SessionPlan>>(PLANS_KEY) || {};
    } catch (e) {
        console.error('[PlanningService] Error reading all plans:', e);
        return {};
    }
};

export const getSessionPlan = (studentId: string): SessionPlan | null => {
    try {
        const plans = getAllSessionPlans();
        let plan = plans[studentId];

        // Try case-insensitive lookup if exact match fails
        if (!plan) {
            const key = Object.keys(plans).find(k => k.toLowerCase() === studentId.toLowerCase());
            if (key) plan = plans[key];
        }

        return plan?.isActive ? plan : null;
    } catch (e) {
        console.error('[PlanningService] Error reading plan:', e);
        return null;
    }
};

export const saveSessionPlan = (plan: SessionPlan): void => {
    try {
        const plans = getAllSessionPlans();
        plans[plan.studentId] = {
            ...plan,
            updatedAt: new Date().toISOString()
        };
        StorageService.setItem(PLANS_KEY, plans, '9999', 'global');
        console.log('[PlanningService] Plan saved for student:', plan.studentId);
    } catch (e) {
        console.error('[PlanningService] Error saving plan:', e);
    }
};

export const deleteSessionPlan = (studentId: string): void => {
    try {
        const plans = getAllSessionPlans();
        delete plans[studentId];
        StorageService.setItem(PLANS_KEY, plans, '9999', 'global');
        console.log('[PlanningService] Plan deleted for student:', studentId);
    } catch (e) {
        console.error('[PlanningService] Error deleting plan:', e);
    }
};

export const deactivateSessionPlan = (studentId: string): void => {
    try {
        const plan = getSessionPlan(studentId);
        if (plan) {
            saveSessionPlan({ ...plan, isActive: false });
        }
    } catch (e) {
        console.error('[PlanningService] Error deactivating plan:', e);
    }
};

// ========== Helpers ==========

export const createEmptyPlan = (studentId: string, studentName?: string): SessionPlan => ({
    planId: generateId(),
    studentId,
    studentName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customQuestions: [],
    focusTopic: '',
    focusIntensity: 'gentle',
    assignedTasks: [],
    isActive: true,
    useForNextSessionOnly: false,
});

export const createEmptyQuestion = (category: PreAnalysisCategory = 'general'): CounselorQuestion => ({
    id: generateId(),
    text: '',
    type: 'scale-1-5',
    category,
    createdAt: new Date().toISOString(),
});

// ========== AI Logic ==========

const generateComplementaryQuestions = async (
    counselorQuestions: CounselorQuestion[],
    count: number
): Promise<PreAnalysisQuestion[]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '';

    if (!apiKey) {
        console.warn('[PlanningService] No API key, skipping AI questions');
        return FALLBACK_QUESTIONS.slice(0, count).map((q, i) => ({
            ...q,
            id: `fb_noapi_${Date.now()}_${i}`
        }));
    }

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const exampleQuestions = counselorQuestions
            .map(q => `- "${q.text}" (Type: ${q.type}, Category: ${q.category})`)
            .join('\n');

        const prompt = `A school counselor has set the following custom questions for a student's wellbeing check-in:

${exampleQuestions}

Generate exactly ${count} more questions that:
1. COMPLEMENT these questions (explore the SAME topics in more depth, don't ask about different topics)
2. Are appropriate for students aged 10-18
3. Use similar question types: scale-1-5, yes-no, or multiple-choice
4. Add new angles or deeper exploration of the topics already covered
5. Are sensitive, non-judgmental, and supportive

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "id": "ai_1",
    "text": "Question text here",
    "type": "scale-1-5",
    "category": "stress"
  }
]

Valid types: "scale-1-5", "yes-no", "multiple-choice"
Valid categories: "stress", "sleep", "focus", "social", "academic", "general"
For multiple-choice, add "options": ["Option1", "Option2", "Option3"]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text()
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const questions = JSON.parse(text) as PreAnalysisQuestion[];

        // Validate and clean up
        return questions.slice(0, count).map((q, i) => ({
            id: q.id || `ai_${i + 1}`,
            text: q.text,
            type: q.type || 'scale-1-5',
            options: q.options,
            category: q.category || 'general',
        }));

    } catch (e) {
        console.error('[PlanningService] AI question generation failed:', e);
        // Fallback to defaults
        return FALLBACK_QUESTIONS.slice(0, count).map((q, i) => ({
            ...q,
            id: `fb_err_${Date.now()}_${i}`
        }));
    }
};

export const generateQuestionsByTopic = async (
    topic: string,
    count: number
): Promise<PreAnalysisQuestion[]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '';

    if (!apiKey) {
        console.warn('[PlanningService] No API key, skipping AI questions');
        return FALLBACK_QUESTIONS.slice(0, count).map((q, i) => ({
            ...q,
            id: `fb_noapi_${Date.now()}_${i}`
        }));
    }

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `A school counselor wants to ask a student questions about "${topic}".

Generate exactly ${count} questions that:
1. Are directly related to "${topic}"
2. Are appropriate for students aged 10-18
3. Use question types: scale-1-5, yes-no, or multiple-choice
4. Are sensitive, non-judgmental, and supportive

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "id": "ai_1",
    "text": "Question text here",
    "type": "scale-1-5",
    "category": "general"
  }
]

Valid types: "scale-1-5", "yes-no", "multiple-choice"
Valid categories: "stress", "sleep", "focus", "social", "academic", "general"
For multiple-choice, add "options": ["Option1", "Option2", "Option3"]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text()
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const questions = JSON.parse(text) as PreAnalysisQuestion[];

        // Validate and clean up
        return questions.slice(0, count).map((q, i) => ({
            id: q.id || `ai_topic_${i + 1}`,
            text: q.text,
            type: q.type || 'scale-1-5',
            options: q.options,
            category: q.category || 'general',
        }));

    } catch (e) {
        console.error('[PlanningService] AI question generation by topic failed:', e);
        // Fallback to defaults
        return FALLBACK_QUESTIONS.slice(0, count).map((q, i) => ({
            ...q,
            id: `fb_err_${Date.now()}_${i}`
        }));
    }
};

export const generateAndSavePlan = async (plan: SessionPlan): Promise<void> => {
    // 1. Calculate how many AI questions we need
    const validQuestions = plan.customQuestions.filter(q => q.text.trim() !== '');
    const targetTotal = 4;
    const remaining = Math.max(0, targetTotal - validQuestions.length);

    let generatedQuestions: PreAnalysisQuestion[] = [];

    // 2. Generate if needed
    if (remaining > 0 && validQuestions.length > 0) {
        console.log(`[PlanningService] Pre-generating ${remaining} AI questions...`);
        generatedQuestions = await generateComplementaryQuestions(validQuestions, remaining);
    }

    // 3. Save plan with generated questions
    saveSessionPlan({
        ...plan,
        generatedQuestions,
        isActive: true
    });
};

const counselorToPreAnalysis = (q: CounselorQuestion): PreAnalysisQuestion => ({
    id: q.id,
    text: q.text,
    type: q.type === 'scale-1-10'
        ? 'multiple-choice'
        : q.type as 'scale-1-5' | 'yes-no' | 'multiple-choice' | 'open-ended',
    options: q.type === 'scale-1-10'
        ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
        : q.options,
    category: q.category,
});

export const getQuestionsForSession = async (
    studentId: string,
    studentHistory: StudentHistory | null
): Promise<PreAnalysisQuestion[]> => {
    const plan = getSessionPlan(studentId);

    // No plan or no custom questions? Use default AI generation
    if (!plan || plan.customQuestions.length === 0) {
        console.log('[PlanningService] No custom plan, using AI generation');
        return generatePersonalizedQuestions(studentHistory);
    }

    // Filter out empty questions
    const validQuestions = plan.customQuestions.filter(q => q.text.trim() !== '');

    if (validQuestions.length === 0) {
        console.log('[PlanningService] No valid questions in plan, using AI generation');
        return generatePersonalizedQuestions(studentHistory);
    }

    const targetTotal = 4;

    // Counselor provided enough questions? Use only theirs
    if (validQuestions.length >= targetTotal) {
        console.log('[PlanningService] Using counselor questions only');
        return validQuestions.map(counselorToPreAnalysis);
    }

    // Check if we have pre-generated questions
    if (plan.generatedQuestions && plan.generatedQuestions.length > 0) {
        console.log('[PlanningService] Using pre-generated AI questions from plan');

        // Mark one-time plan as inactive after use
        if (plan.useForNextSessionOnly) {
            deactivateSessionPlan(studentId);
        }

        return [
            ...validQuestions.map(counselorToPreAnalysis),
            ...plan.generatedQuestions
        ];
    }

    // FALLBACK: Generate on the fly (shouldn't happen if saved correctly, but safe fallback)
    const remaining = Math.max(0, targetTotal - validQuestions.length);
    console.log(`[PlanningService] generatedQuestions missing. Generating ${remaining} complementaries on-the-fly...`);
    const aiQuestions = await generateComplementaryQuestions(validQuestions, remaining);

    // Mark one-time plan as inactive after use
    if (plan.useForNextSessionOnly) {
        deactivateSessionPlan(studentId);
    }

    // Merge: Counselor first, then AI
    return [
        ...validQuestions.map(counselorToPreAnalysis),
        ...aiQuestions,
    ];
};

// ========== Constants ==========

export const QUESTION_TYPE_LABELS: Record<string, { label: string; description: string; icon: string }> = {
    'scale-1-5': { label: 'Scale (1-5)', description: 'Rate from 1 to 5', icon: '📊' },
    'scale-1-10': { label: 'Scale (1-10)', description: 'Rate from 1 to 10', icon: '📏' },
    'yes-no': { label: 'Yes / No', description: 'Simple binary choice', icon: '✅' },
    'multiple-choice': { label: 'Multiple Choice', description: 'Custom options (2-6)', icon: '📝' },
    'open-ended': { label: 'Open Ended', description: 'Free text response', icon: '💬' },
};

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    stress: { label: 'Stress', color: 'text-red-400' },
    sleep: { label: 'Sleep', color: 'text-blue-400' },
    focus: { label: 'Focus', color: 'text-yellow-400' },
    social: { label: 'Social', color: 'text-green-400' },
    academic: { label: 'Academic', color: 'text-purple-400' },
    general: { label: 'General', color: 'text-gray-400' },
};

export const MCQ_TEMPLATES = [
    { text: "How have you been sleeping lately?", options: ["Sleeping well", "Trouble falling asleep", "Waking up often", "Nightmares"] },
    { text: "How is your focus in class?", options: ["Very focused", "Distracted sometimes", "Hard to focus", "Cannot focus at all"] },
    { text: "Have you felt overwhelmed this week?", options: ["Not at all", "A little bit", "Quiet often", "Very overwhelmed"] },
    { text: "How are your friendships going?", options: ["Great", "Good", "Complicated", "Lonely"] },
];

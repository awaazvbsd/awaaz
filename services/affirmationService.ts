/**
 * Affirmation Service
 * Generates personalized positive affirmations based on pre-analysis answers
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PreAnalysisSession } from '../types';
import { repeatStatements } from '../constants';

// Generate personalized affirmations based on pre-analysis answers
export const generatePersonalizedAffirmations = async (
    preAnalysisAnswers: PreAnalysisSession | null
): Promise<string[]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '';

    // If no API key or no answers, use default affirmations
    if (!apiKey || !preAnalysisAnswers || Object.keys(preAnalysisAnswers.answers).length === 0) {
        console.log('[AffirmationService] Using default affirmations');
        return getDefaultAffirmations();
    }

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Build context from answers
        const answersContext = preAnalysisAnswers.questions.map(q => {
            const answer = preAnalysisAnswers.answers[q.id];
            return `Q: ${q.text}\nA: ${answer}`;
        }).join('\n\n');

        const prompt = `Based on these pre-session check-in answers from a student:

${answersContext}

Generate 5 personalized positive affirmations that:
1. Directly address any concerns or areas mentioned
2. Are encouraging and supportive
3. Use simple, clear language suitable for students aged 10-18
4. Are in first person ("I am...", "I can...", "I trust...")
5. Are short enough to repeat aloud easily (under 15 words each)

Examples of good personalized affirmations:
- If student mentioned stress about exams: "I trust my preparation and approach challenges with calm focus."
- If student mentioned sleep issues: "I deserve rest and my body knows how to find peaceful sleep."
- If student mentioned social worries: "I am worthy of friendship and my presence matters."

Return ONLY a JSON array of 5 strings. Do not include markdown code blocks.

Example format:
["I am capable of handling today's challenges", "My efforts are leading me to success", "I deserve peace and calm", "I trust myself to make good choices", "I am growing stronger every day"]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const affirmations = JSON.parse(cleaned) as string[];

        // Validate we got an array of strings
        if (Array.isArray(affirmations) && affirmations.length > 0) {
            return affirmations.slice(0, 5);
        }

        return getDefaultAffirmations();

    } catch (e) {
        console.error('[AffirmationService] Failed to generate affirmations:', e);
        return getDefaultAffirmations();
    }
};

// Default affirmations (from constants.ts repeatStatements)
export const getDefaultAffirmations = (): string[] => {
    // Return first 5 repeat statements as default affirmations
    return repeatStatements.slice(0, 5);
};

// Get affirmations with fallback handling
export const getAffirmationsForSession = async (
    preAnalysisAnswers: PreAnalysisSession | null
): Promise<{ affirmations: string[]; isPersonalized: boolean }> => {
    try {
        if (preAnalysisAnswers && Object.keys(preAnalysisAnswers.answers).length > 0) {
            const personalized = await generatePersonalizedAffirmations(preAnalysisAnswers);
            return { affirmations: personalized, isPersonalized: true };
        }
    } catch (e) {
        console.error('[AffirmationService] Error getting personalized affirmations:', e);
    }

    return { affirmations: getDefaultAffirmations(), isPersonalized: false };
};

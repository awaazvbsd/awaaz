/**
 * Report Service
 * Auto-generates detailed counselor reports after session completion
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    CounselorReport,
    SessionData,
    StudentHistory,
} from '../types';
import { summarizeHistoryForAI, generateId } from './personalizationService';

// Generate counselor report immediately after session ends
export const generateCounselorReport = async (
    session: SessionData,
    history: StudentHistory | null
): Promise<CounselorReport> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '';

    if (!apiKey) {
        console.warn('[ReportService] No API key, using default report');
        return getDefaultReport(session);
    }

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const historySummary = summarizeHistoryForAI(history);

        const prompt = `Generate a CONCISE, ACTION-ORIENTED counselor report for a student wellbeing session.
KEEP IT BRIEF. Use bullet points. Avoid flowery language.

SESSION DATA:
- Session ID: ${session.sessionId}
- Date: ${session.date}
- Stress Level: ${session.voiceAnalysis?.stressLevel || 'N/A'}%
- Voice Analysis Summary: ${session.voiceAnalysis?.aiSummary || 'N/A'}

PRE-ANALYSIS ANSWERS:
${JSON.stringify(session.preAnalysisSession?.answers || {}, null, 2)}

LIVE SESSION Q&A (what the student said during the conversation):
${session.liveSessionQuestions?.map(qa => `
Q: ${qa.questionText}
A: ${qa.studentAnswer}
`).join('\n') || 'No live Q&A recorded'}

STUDENT HISTORY:
${historySummary}

Generate a report with the following sections. BE CONCISE.

1. Pre-Analysis Summary: 1-2 sentences. Directly state key issues mentioned (e.g., "Student reported lack of sleep.").
2. Live Session Summary: 1-2 sentences. Summarize the core topic of their conversation.
3. Key Insights: 3-4 short bullet points. Combine voice analysis + their words.
4. Reported Concerns: Bullet points of SPECIFIC problems mentioned by the student (e.g., "Failing math", "Fighting with friends"). CRITICAL: If they mentioned a specific problem, it MUST be here.
5. Recommendations: 3 specific, actionable steps for the counselor/teacher.
5. Advice: 3 specific, actionable steps for the counselor/teacher.
6. Overall Assessment: 1 sentence summary of their status.

IMPORTANT: If "LIVE SESSION Q&A" contains data, YOU MUST USE IT in "Reported Concerns". Do not ignore it.

Return ONLY valid JSON in this exact format:
{
  "preAnalysisSummary": "...",
  "liveSessionSummary": "...",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "concernAreas": ["concern1"] or [],
  "recommendations": ["rec1", "rec2"],
  "overallAssessment": "..."
}

Do not include markdown code blocks.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const reportData = JSON.parse(cleaned);

        return {
            sessionId: session.sessionId,
            generatedAt: new Date().toISOString(),
            preAnalysisSummary: reportData.preAnalysisSummary || '',
            liveSessionSummary: reportData.liveSessionSummary || '',
            keyInsights: reportData.keyInsights || [],
            concernAreas: reportData.concernAreas || [],
            recommendations: reportData.recommendations || [],
            overallAssessment: reportData.overallAssessment || '',
        };

    } catch (e) {
        console.error('[ReportService] Failed to generate report:', e);
        return getDefaultReport(session);
    }
};

// Default fallback report
const getDefaultReport = (session: SessionData): CounselorReport => {
    const stressLevel = session.voiceAnalysis?.stressLevel || 0;
    const stressCategory = stressLevel > 70 ? 'elevated' : stressLevel > 40 ? 'moderate' : 'low';

    return {
        sessionId: session.sessionId,
        generatedAt: new Date().toISOString(),
        preAnalysisSummary: `Student completed pre-session check-in on ${session.date}.`,
        liveSessionSummary: `Session conducted with voice analysis. Stress level detected: ${stressLevel}%.`,
        keyInsights: [
            `Overall stress level: ${stressCategory}`,
            `Session completed successfully`,
            'Voice biomarkers analyzed',
        ],
        concernAreas: stressLevel > 70 ? ['Elevated stress levels detected'] : [],
        recommendations: [
            'Continue regular check-ins',
            stressLevel > 60 ? 'Consider follow-up conversation' : 'Monitor progress',
        ],
        overallAssessment: `Student shows ${stressCategory} stress levels. Continue monitoring and provide support as needed.`,
    };
};

// Format report for display
export const formatReportForDisplay = (report: CounselorReport): string => {
    return `
## Counselor Report
**Generated:** ${new Date(report.generatedAt).toLocaleString()}

### Stress Snapshot (Pre-Analysis)
${report.preAnalysisSummary}

### Live Session Summary
${report.liveSessionSummary}

### Reported Concerns (Student's Voice)
${report.concernAreas.length > 0 ? report.concernAreas.map(c => `- ⚠️ ${c}`).join('\n') : 'No specific concerns reported.'}

### Key Insights
${report.keyInsights.map(i => `- ${i}`).join('\n')}

### Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}

### Overall Assessment
${report.overallAssessment}
  `.trim();
};

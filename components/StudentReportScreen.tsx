import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText } from './Icons';
import GlassCard from './GlassCard';
import type { AnalysisData, Student } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InfinityLoader } from '@/components/ui/infinity-loader';

interface StudentReportScreenProps {
  student: Student;
  analysisData: AnalysisData;
  onBack: () => void;
  onSaveReport?: (report: string) => void;
}

const QUESTIONS = [
  "I have been feeling more anxious or stressed than usual lately.",
  "I find it difficult to relax or calm my mind.",
  "Please describe what situations or thoughts make you feel most stressed or anxious.",
  "What strategies or activities help you feel more relaxed or calm?",
  "Are you currently sick or experiencing any illness?"
];

// Fallback template generator (used while loading or on error)
const generateFallbackReport = (student: Student, analysisData: AnalysisData): string => {
  const questionnaireAnswers = analysisData.questionnaireAnswers || {};
  const stressLevel = analysisData.stressLevel;
  const hasAnswers = Object.keys(questionnaireAnswers).length > 0;

  let report = `## Student Report: ${student.name}\n\n`;
  report += `**Account ID:** ${student.code}\n`;
  report += `**Class:** ${student.class}-${student.section}\n`;
  report += `**Assessment Date:** ${new Date(analysisData.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}\n\n`;

  report += `### Overall Stress Assessment\n\n`;

  if (stressLevel >= 67) {
    report += `The student's stress level is **high** (${stressLevel.toFixed(1)}%), indicating significant stress that may require attention and support.\n\n`;
  } else if (stressLevel >= 34) {
    report += `The student's stress level is **moderate** (${stressLevel.toFixed(1)}%), suggesting some stress that should be monitored.\n\n`;
  } else {
    report += `The student's stress level is **low** (${stressLevel.toFixed(1)}%), indicating generally good stress management.\n\n`;
  }

  if (hasAnswers) {
    report += `### Questionnaire Responses Summary\n\n`;

    const responses: string[] = [];
    Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      if (questionIndex < QUESTIONS.length) {
        const question = QUESTIONS[questionIndex];
        responses.push(`**Q${questionIndex + 1}:** ${question}\n**Response:** ${answer}\n`);
      }
    });

    report += responses.join('\n') + '\n';
  }

  report += `### Recommendations\n\n`;
  report += `- Regular stress check-ins\n`;
  report += `- Brief breathing exercises\n`;

  report += `\n---\n`;
  report += `*This report is generated based on voice stress analysis and questionnaire responses.*`;

  return report;
};

const generateAIReportWithGemini = async (student: Student, analysisData: AnalysisData): Promise<string> => {
  console.log('generateAIReportWithGemini called for', student.name);
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
    if (!apiKey) {
      console.error('Gemini API key is missing! Checked VITE_GEMINI_API_KEY and API_KEY.');
      throw new Error('Gemini API key not found');
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1beta' });

    // ... (rest of the prompt construction) ...
    // To minimize diff, I wont paste the whole prompt logic unless necessary, 
    // but I must ensure the rest of the function is preserved if I use replace_file_content with range.
    // Wait, replace_file_content requires exact match. I should probably just insert logging at the top and catch block.
    // I will rewrite the whole function wrapper to be safe.

    const questionnaireAnswers = analysisData.questionnaireAnswers || {};
    const stressLevel = analysisData.stressLevel;

    // Format pre-analysis Q&A
    let qaText = "";
    Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
      const qIdx = parseInt(index);
      if (qIdx < QUESTIONS.length) {
        qaText += `Q${qIdx + 1}: ${QUESTIONS[qIdx]}\nA: ${answer}\n\n`;
      }
    });

    // Format Live Session Q&A
    let liveSessionText = "";
    if (analysisData.liveSessionAnswers && analysisData.liveSessionAnswers.length > 0) {
      liveSessionText = analysisData.liveSessionAnswers.map(qa =>
        `Student said: "${qa.studentAnswer}" (in response to: "${qa.questionText}")`
      ).join('\n');
    }

    const prompt = `
      You are an expert school counselor writing a CONCISE report for a TEACHER regarding student ${student.name}.
      
      STUDENT DETAILS:
      Name: ${student.name}
      Class: ${student.class}-${student.section}
      
      ASSESSMENT DATA:
      Voice Stress Level: ${stressLevel.toFixed(1)}% (Scale: 0-100, <34 Low, 34-66 Moderate, >=67 High)
      
      LIVE SESSION CONVERSATION (What the student actually said):
      ${liveSessionText || "No live conversation recorded."}

      QUESTIONNAIRE RESPONSES (Context only):
      ${qaText || "No questionnaire responses provided."}
      
      CRITICAL INSTRUCTIONS:
      1. BE BRIEF. The teacher is busy. 
      2. Use SHORT bullet points (max 10-15 words per bullet).
      3. NO flowery language or long paragraphs.
      4. Focus ONLY on actionable insights.
      
      Generate 4 short sections separated by "|||":
      
      SECTION 1: Stress Snapshot
      - 1-2 sentences summarizing their current state.
      
      SECTION 2: Reported Concerns (CRITICAL)
      - List SPECIFIC problems the student mentioned (e.g., "Failing math", "Fighting with friends").
      - If no specific problems were mentioned, state "No specific concerns reported."
      - Use bullet points.
      
      SECTION 3: Key Observations
      - 3 concise bullet points.
      - Combine voice data + their words.
      
      SECTION 4: Teacher Recommendations
      - 3 specific, actionable steps.
      - Keep them short and direct.
      
      OUTPUT FORMAT:
      [Section 1 Content]
      |||
      [Section 2 Content]
      |||
      [Section 3 Content]
      |||
      [Section 4 Content]
    `;

    console.log('Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const fullText = response.text();
    console.log('Gemini response received, length:', fullText.length);

    const parts = fullText.split('|||').map(p => p.trim());

    // Fallback if split fails
    const assessment = parts[0] || "Assessment not available.";
    const reportedConcerns = parts[1] || "No specific concerns reported.";
    const observations = parts[2] || "Observations not available.";
    const recommendations = parts[3] || "Recommendations not available.";

    // --- MANUAL CONSTRUCTION OF REPORT ---

    let report = `## Student Report: ${student.name} \n\n`;
    report += `** Account ID:** ${student.code} \n`;
    report += `** Class:** ${student.class} -${student.section} \n`;
    report += `** Assessment Date:** ${new Date(analysisData.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
      } \n\n`;

    report += `### Stress Snapshot\n\n`;
    report += `${assessment} \n\n`;

    report += `### Reported Concerns\n\n`;
    report += `${reportedConcerns} \n\n`;

    // Inject Old Format Q&A List
    if (Object.keys(questionnaireAnswers).length > 0) {
      report += `### Questionnaire Summary\n\n`;
      const responses: string[] = [];
      let qNum = 1;
      Object.entries(questionnaireAnswers).forEach(([questionId, answer]) => {
        // Try to find question text from preAnalysisQuestions, fall back to QUESTIONS array
        let questionText: string | undefined;
        if (analysisData.preAnalysisQuestions && analysisData.preAnalysisQuestions.length > 0) {
          const question = analysisData.preAnalysisQuestions.find(q => q.id === questionId);
          questionText = question?.text;
        }
        // Fallback: try parsing questionId as index for legacy data
        if (!questionText) {
          const questionIndex = parseInt(questionId);
          if (!isNaN(questionIndex) && questionIndex < QUESTIONS.length) {
            questionText = QUESTIONS[questionIndex];
          }
        }
        if (questionText) {
          responses.push(`** Q${qNum}:** ${questionText} \n > ${answer} \n`);
          qNum++;
        }
      });
      report += responses.join('\n') + '\n\n';
    }

    report += `### Key Observations\n\n`;
    report += `${observations} \n\n`;

    report += `### Teacher Recommendations\n\n`;
    report += `${recommendations} \n\n`;

    report += `\n-- -\n`;
    report += `* This report is generated based on voice stress analysis and questionnaire responses.It is intended to support educational decision - making and should not replace professional medical or psychological evaluation.* `;

    return report;

  } catch (error) {
    console.error("Error generating AI report:", error);
    // Rethrow or return null to trigger fallback in the caller
    throw error;
  }
};

const StudentReportScreen: React.FC<StudentReportScreenProps> = ({ student, analysisData, onBack, onSaveReport }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [loaderComplete, setLoaderComplete] = useState(false);
  const lastAnalysisDateRef = useRef<string | null>(null);

  useEffect(() => {
    // Prevent duplicate generation
    if (analysisData.date === lastAnalysisDateRef.current && report) {
      return;
    }
    lastAnalysisDateRef.current = analysisData.date;

    const loadReport = async () => {
      console.log('loadReport started', { student: student.name, date: analysisData.date });

      // 1. Trust the persisted report from RecordingScreen if available
      if (analysisData.counselorReport && typeof analysisData.counselorReport === 'string') {
        console.log('Using persisted counselorReport');
        setReport(analysisData.counselorReport);
        setLoaderComplete(true);
        setTimeout(() => { setLoading(false); setShowLoader(false); }, 1000);
        return;
      }

      // 2. Only generate IF missing (fallback)
      console.log('No persisted report found. Generating fallback...');
      setLoading(true);

      try {
        const aiReport = await generateAIReportWithGemini(student, analysisData);
        setReport(aiReport);
        // Note: We don't save strictly here anymore to avoid overwriting the "official" report service one.
      } catch (e) {
        console.error('Fallback generation failed:', e);
        setReport(generateFallbackReport(student, analysisData));
      } finally {
        setLoaderComplete(true);
        setTimeout(() => { setLoading(false); setShowLoader(false); }, 1000);
      }
    };

    loadReport();
  }, [student, analysisData, onSaveReport]);

  const formatReportText = (text: string) => {
    // Safety check to prevent crashes if report text is missing or invalid
    if (!text || typeof text !== 'string') return [];

    // Convert markdown-like formatting to JSX
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];
    let currentListItems: string[] = [];
    let key = 0;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ');
        if (paragraphText.trim()) {
          elements.push(
            <p key={key++} className="mb-4 text-text-secondary leading-relaxed">
              {formatInlineText(paragraphText)}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (currentListItems.length > 0) {
        elements.push(
          <ul key={key++} className="mb-4 ml-6 space-y-2 list-disc">
            {currentListItems.map((item, idx) => (
              <li key={idx} className="text-text-secondary">
                {formatInlineText(item)}
              </li>
            ))}
          </ul>
        );
        currentListItems = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed === '---') { // Check for horizontal rule FIRST
        flushParagraph();
        flushList();
        elements.push(
          <hr key={key++} className="my-6 border-t border-surface/50" />
        );
      } else if (trimmed.startsWith('##')) {
        flushParagraph();
        flushList();
        const title = trimmed.replace(/^#+\s*/, '').trim(); // Regex to handle ## or ###
        elements.push(
          <h2 key={key++} className="text-2xl font-bold text-white mt-8 mb-4">
            {title}
          </h2>
        );
      } else if (trimmed.startsWith('###')) {
        flushParagraph();
        flushList();
        const title = trimmed.replace(/^#+\s*/, '').trim();
        elements.push(
          <h3 key={key++} className="text-xl font-semibold text-white mt-6 mb-3">
            {title}
          </h3>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { // Handle both - and * lists
        flushParagraph();
        const item = trimmed.replace(/^[-*]\s*/, '').trim();
        if (item) currentListItems.push(item); // Only add if not empty
      } else if (trimmed === '') {
        flushParagraph();
        flushList();
      } else {
        flushList();
        currentParagraph.push(trimmed);
      }
    });

    flushParagraph();
    flushList();
    return elements;
  };

  const formatInlineText = (text: string): (string | React.ReactNode)[] => {
    const parts: (string | React.ReactNode)[] = [];
    let currentIndex = 0;
    let key = 0;

    // Handle **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={key++} className="text-white font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="min-h-screen w-full bg-background-primary">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-primary" />
          <h1 className="text-lg font-medium text-white">Student Report</h1>
        </div>
        <div className="w-11" /> {/* Spacer for centering */}
      </header>

      {/* Content */}
      <div className="pt-[80px] pb-10 px-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-6 md:p-8">
            {showLoader ? (
              <div className="flex flex-col items-center justify-center py-12">
                <InfinityLoader
                  statusText="Generating personalized report..."
                  isComplete={loaderComplete}
                />
              </div>
            ) : report ? (
              <div className="prose prose-invert max-w-none">
                {formatReportText(report)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Report Unavailable</h3>
                <p className="text-text-muted mb-6 max-w-xs mx-auto">
                  Unable to generate the report at this time. Please try again later.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-purple-primary rounded-lg text-white font-medium hover:bg-purple-primary/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentReportScreen;


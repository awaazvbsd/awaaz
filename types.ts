
export type ScreenState = 'RECORDING' | 'RESULTS';
export type RecordingState = 'IDLE' | 'RECORDING' | 'ANALYZING' | 'COMPLETE' | 'ERROR';

export interface Biomarker {
  name: string;
  value: string;
  status: 'green' | 'orange' | 'red';
  detail: string;
  explanation: string;
  icon: 'SineWave' | 'Range' | 'WavyLine' | 'Amplitude' | 'Curve1' | 'Curve2' | 'Speedometer';
  normalizedValue: number; // Value from 0 to 1 for visualizations
}

export interface AnalysisData {
  stressLevel: number;
  biomarkers: Biomarker[];
  confidence: number;
  snr: number;
  audioUrl: string;
  aiSummary: string;
  date: string;
  questionnaireAnswers?: { [questionId: string]: string | number }; // Optional questionnaire answers
  preAnalysisQuestions?: { id: string; text: string }[]; // Actual question text for report display
  liveSessionAnswers?: { questionText: string; studentAnswer: string }[]; // Live Gemini conversation Q&A
  selfReportScore?: number;
  counselorReport?: string; // Persisted generated report
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface RawBiomarkerData {
  stress_level: number;
  f0_mean: number;
  f0_range: number;
  jitter: number;
  shimmer: number;
  f1: number;
  f2: number;
  speech_rate: number;
  confidence: number;
  snr: number;
  ai_summary: string;
}

export type RiskLevel = 'high' | 'moderate' | 'low';

export interface Student {
  code: string;
  name: string;
  class: number;
  section: string;
  riskLevel: RiskLevel;
  analysisHistory: AnalysisData[];
}

export interface ClassSummary {
  id: string;
  name: string;
  studentCount: number;
  averageStress: number;
  students: Student[];
}

// ===== Personalization Types =====

export interface StudentProfile {
  studentId: string;
  name: string;
  age?: number;
  grade?: number;
  section?: string;
  subjectsOfFocus?: string[];
  createdAt: string;
}

export type PreAnalysisQuestionType = 'scale-1-5' | 'yes-no' | 'multiple-choice' | 'open-ended';
export type PreAnalysisCategory = 'stress' | 'sleep' | 'focus' | 'social' | 'academic' | 'general';

export interface PreAnalysisQuestion {
  id: string;
  text: string;
  type: PreAnalysisQuestionType;
  options?: string[];
  category: PreAnalysisCategory;
}

export interface PreAnalysisSession {
  sessionId: string;
  date: string;
  questions: PreAnalysisQuestion[];
  answers: { [questionId: string]: string | number };
}

export interface LiveSessionQuestion {
  questionId: string;
  questionText: string;
  timestamp: string;
  studentAnswer: string;
}

export interface CounselorReport {
  sessionId: string;
  generatedAt: string;
  preAnalysisSummary: string;
  liveSessionSummary: string;
  keyInsights: string[];
  concernAreas: string[];
  recommendations: string[];
  overallAssessment: string;
}

export interface SessionData {
  sessionId: string;
  date: string;
  preAnalysisSession?: PreAnalysisSession;
  liveSessionQuestions?: LiveSessionQuestion[];
  voiceAnalysis?: {
    stressLevel: number;
    biomarkers: Biomarker[];
    aiSummary: string;
  };
  counselorReport?: CounselorReport;
}

export interface LearningAnalytics {
  topicsStruggledWith: string[];
  averageSessionDuration: number;
  consistencyScore: number;
  totalSessions: number;
  averageStressLevel: number;
}

export interface StudentHistory {
  profile: StudentProfile;
  sessions: SessionData[];
  learningAnalytics?: LearningAnalytics;
}

// ===== Counselor Session Planning Types =====

export type CounselorQuestionType =
  | 'scale-1-5'
  | 'scale-1-10'
  | 'yes-no'
  | 'multiple-choice'
  | 'open-ended';

export type FocusIntensity = 'gentle' | 'moderate' | 'focused';

export interface CounselorQuestion {
  id: string;
  text: string;
  type: CounselorQuestionType;
  options?: string[];
  category: PreAnalysisCategory;
  createdAt: string;
}

export interface SessionPlan {
  planId: string;
  studentId: string;
  studentName?: string;
  counselorId?: string;
  createdAt: string;
  updatedAt: string;

  // Custom pre-session questions
  customQuestions: CounselorQuestion[];
  generatedQuestions?: PreAnalysisQuestion[]; // AI-generated complementary questions

  // AI session focus configuration
  focusTopic: string;
  focusIntensity: FocusIntensity;

  // Teacher-assigned daily tasks
  assignedTasks?: string[];

  // Plan state
  isActive: boolean;
  useForNextSessionOnly: boolean;
}

// ===== Gamification Types =====

export interface TierAccentColor {
  primary: string;
  secondary: string;
  gradient: string;
}

export interface MaterialTier {
  level: number;
  name: string;
  tasksMin: number;
  tasksMax: number | null; // null for Diamond (infinite)
  accentColor: TierAccentColor;
  iconName: string; // Lucide icon name
}

export interface GamificationData {
  completedTasks: number;
  currentTier: number;
  selectedAccentTier: number; // Which tier's color is active
  lastTierShown: number | null; // To track if we showed level-up popup
}
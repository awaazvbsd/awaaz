import React, { useState } from 'react';
import type { Student } from '../types';
import AnalysisResultsScreen from './AnalysisResultsScreen';
import ChatModal from './ChatModal';


// --- Main Student Detail Screen ---
interface StudentDetailScreenProps {
  student: Student;
  onBack: () => void;
  isTeacherView?: boolean;
  onReportClick?: (analysis: any) => void;
}

const StudentDetailScreen: React.FC<StudentDetailScreenProps> = ({ student, onBack, isTeacherView = false, onReportClick }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const hasAnalysis = student.analysisHistory.length > 0;
    const latestAnalysis = hasAnalysis ? student.analysisHistory[student.analysisHistory.length - 1] : null;
    const [selectedAnalysis, setSelectedAnalysis] = useState(latestAnalysis);

    // Update selected analysis when student changes
    React.useEffect(() => {
        if (hasAnalysis) {
            setSelectedAnalysis(latestAnalysis);
        }
    }, [student.code, hasAnalysis, latestAnalysis]);

    // Teacher ID (hardcoded for now, in a real app this would come from authentication)
    const teacherId = '9999'; // Same as admin code

    // If no analysis, show a message instead
    if (!hasAnalysis) {
        return (
            <div className="min-h-screen w-full bg-background-primary p-4 pt-[80px]">
                <div className="max-w-2xl mx-auto">
                    <button 
                        onClick={onBack}
                        className="mb-6 glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="glass-base rounded-2xl p-8 text-center">
                        <div className="w-20 h-20 bg-purple-primary/20 text-purple-primary rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">No Analysis Available</h2>
                        <p className="text-text-muted mb-2">Student: <span className="font-semibold text-white">{student.name}</span></p>
                        <p className="text-text-muted mb-2">Account: <span className="font-semibold text-white">{student.code}</span></p>
                        <p className="text-text-muted mb-6">Class: <span className="font-semibold text-white">{student.class}-{student.section}</span></p>
                        <p className="text-text-muted/70">This student has not completed a voice analysis yet.</p>
                        <p className="text-text-muted/70">Analysis results will appear here once the student completes their first session.</p>
                    </div>
                </div>
                
                {/* Chat Modal */}
                {isTeacherView && (
                    <ChatModal
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        teacherId={teacherId}
                        studentId={student.code}
                        studentName={student.name}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-background-primary">
            <AnalysisResultsScreen
                analysisData={selectedAnalysis || latestAnalysis!}
                onNewRecording={() => {}} // Empty function for teacher view
                onClose={onBack}
                isTeacherView={isTeacherView}
                onChatClick={() => setIsChatOpen(true)}
                studentHistory={student.analysisHistory}
                onReportClick={() => onReportClick?.(selectedAnalysis || latestAnalysis)}
                onDateClick={(analysis) => setSelectedAnalysis(analysis)}
            />

            {/* Chat Modal */}
            {isTeacherView && (
                <ChatModal
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    teacherId={teacherId}
                    studentId={student.code}
                    studentName={student.name}
                />
            )}
        </div>
    );
};

export default StudentDetailScreen;

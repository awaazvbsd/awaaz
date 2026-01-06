import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Student, RiskLevel } from '../types';
import { StorageService } from '../services/storageService';
import { UserCircle, ChevronLeft, MessageCircle, ChatBubble, Pencil, Calendar } from './Icons';
import GlassCard from './GlassCard';
import TeacherChatModal from './TeacherChatModal';
import { Gauge } from './ui/gauge-1';
import { LiquidButton } from './ui/liquid-button';

// HACK: Cast motion components to 'any' to bypass type errors.
const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

// --- Stress Chart Component (Sparkline) ---
const StressChart: React.FC<{ data: number[]; id?: string }> = ({ data, id = 'default' }) => {
    if (data.length < 2) {
        return <div className="w-full h-full bg-white/5 rounded-md" />;
    }
    const width = 100;
    const height = 40;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;

    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d - min) / range) * height;
            return `${x},${y}`;
        })
        .join(' ');

    const latestValue = data[data.length - 1];

    // Determine color based on latest stress level
    const getLineColor = () => {
        if (latestValue < 34) return "#22C55E"; // green
        if (latestValue < 67) return "#F59E0B"; // orange
        return "#EF4444"; // red
    };

    const lineColor = getLineColor();
    const gradientId = `sparkline-gradient-${id}-${lineColor.replace('#', '')}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill={`url(#${gradientId})`}
                points={`0,${height} ${points} ${width},${height}`}
            />
            <polyline
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

// --- Get Border Color Based on Stress Level ---
const getBorderColor = (stressLevel: number): string => {
    if (stressLevel < 34) return 'border-success-green/50'; // green for low stress
    if (stressLevel < 67) return 'border-orange-warning/50'; // orange for moderate stress
    return 'border-error-red/50'; // red for high stress
};

// --- Student Widget Component ---
const StudentWidget: React.FC<{
    student: Student;
    onClick: () => void;
    onChatClick: () => void;
    onEditNickname: (studentId: string) => void;
    onPlanSession?: (studentId: string) => void;
    isHighAlert?: boolean;
}> = React.memo(({ student, onClick, onChatClick, onEditNickname, onPlanSession, isHighAlert = false }) => {
    const hasAnalysis = student.analysisHistory.length > 1; // Only show if more than 1 analysis
    const hasPendingAnalysis = student.analysisHistory.length === 1; // Check for pending first analysis
    const latestAnalysis = hasAnalysis ? student.analysisHistory[student.analysisHistory.length - 1] : null;
    const stressLevel = latestAnalysis?.stressLevel || 0;
    const stressHistory = student.analysisHistory.map(a => a.stressLevel);

    // Nickname management functions
    const getNicknames = useCallback((): Record<string, string> => {
        const stored = StorageService.getItem<Record<string, string>>('studentNicknames');
        return stored || {};
    }, []);

    const getNickname = useCallback((studentId: string): string | null => {
        const nicknames = getNicknames();
        return nicknames[studentId] || null;
    }, [getNicknames]);

    const getDisplayName = useCallback((studentId: string): string => {
        const nickname = getNickname(studentId);
        return nickname ? `${nickname} (${studentId})` : studentId;
    }, [getNickname]);

    // Determine color based on stress level thresholds
    const getPrimaryColor = (): "danger" | "warning" | "success" => {
        if (!hasAnalysis) return "success"; // Default to success for no analysis
        if (stressLevel < 34) return "success";
        if (stressLevel < 67) return "warning";
        return "danger";
    };

    const handleChatClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the widget's onClick
        onChatClick();
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the widget's onClick
        onEditNickname(student.code);
    };

    const handlePlanClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the widget's onClick
        if (onPlanSession) {
            onPlanSession(student.code);
        }
    };

    // Red color scheme for High Alerts
    const alertBorderColor = isHighAlert ? 'border-red-500/80' : '';
    const alertBgGradient = isHighAlert ? 'bg-gradient-to-br from-red-900/20 to-red-800/10' : '';

    return (
        <MotionDiv
            onClick={onClick}
            className="cursor-pointer relative"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            <GlassCard className={`p-6 min-h-[220px] flex flex-col items-center justify-center gap-4 border-2 ${isHighAlert ? alertBorderColor : (hasAnalysis ? getBorderColor(stressLevel) : 'border-white/20')} ${isHighAlert ? alertBgGradient : ''} active:bg-white/5 transition-colors`} variant={isHighAlert ? "base" : "base"}>
                {/* Chat button in top right corner */}
                <button
                    onClick={handleChatClick}
                    className={`absolute top-3 right-3 w-11 h-11 ${isHighAlert ? 'bg-red-500/20 hover:bg-red-500/40' : 'bg-purple-primary/20 hover:bg-purple-primary/40'} rounded-full flex items-center justify-center transition-all z-10 active:scale-90`}
                    title="Chat with student"
                >
                    <ChatBubble className={`w-5 h-5 ${isHighAlert ? 'text-red-400' : 'text-purple-primary'}`} />
                </button>

                {/* Edit button in top left corner */}
                <button
                    onClick={handleEditClick}
                    className={`absolute top-3 left-3 w-11 h-11 ${isHighAlert ? 'bg-red-500/20 hover:bg-red-500/40' : 'bg-purple-primary/20 hover:bg-purple-primary/40'} rounded-full flex items-center justify-center transition-all z-10 active:scale-90`}
                    title="Edit nickname"
                >
                    <Pencil className={`w-5 h-5 ${isHighAlert ? 'text-red-400' : 'text-purple-primary'}`} />
                </button>

                {/* Plan button next to edit button */}
                <button
                    onClick={handlePlanClick}
                    className={`absolute top-3 left-16 w-11 h-11 ${isHighAlert ? 'bg-red-500/20 hover:bg-red-500/40' : 'bg-purple-primary/20 hover:bg-purple-primary/40'} rounded-full flex items-center justify-center transition-all z-10 active:scale-90`}
                    title="Plan Session"
                >
                    <Calendar className={`w-5 h-5 ${isHighAlert ? 'text-red-400' : 'text-purple-primary'}`} />
                </button>

                <p className="text-3xl font-bold text-text-primary text-center px-8 break-words">{getDisplayName(student.code)}</p>
                {hasAnalysis ? (
                    <div className="flex items-center justify-center gap-4 flex-1">
                        <div className="flex items-center justify-center">
                            <Gauge
                                value={stressLevel}
                                size={90}
                                strokeWidth={6}
                                gradient={true}
                                primary={isHighAlert ? "danger" : getPrimaryColor()}
                                showValue={true}
                                showPercentage={true}
                                unit="%"
                                tickMarks={true}
                                glowEffect={true}
                                transition={{ length: 800, delay: 0 }}
                                className={{
                                    svgClassName: "text-white",
                                    textClassName: "fill-white"
                                }}
                            />
                        </div>
                        <div className="w-20 h-12 flex-shrink-0">
                            <StressChart data={stressHistory} id={student.code} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 flex-1">
                        <p className="text-text-muted text-sm text-center">{hasPendingAnalysis ? "Analysis Pending" : "No analysis yet"}</p>
                        <p className="text-text-muted/70 text-xs text-center">
                            {hasPendingAnalysis
                                ? "First analysis completed.\nAwaiting second session."
                                : "Student has not completed\nvoice analysis"}
                        </p>
                    </div>
                )}
            </GlassCard>
        </MotionDiv>
    );
});


// --- High Alerts Section Component (Stress > 80%) ---
const HighAlertsSection: React.FC<{
    students: Student[],
    onSelectStudent: (id: string) => void,
    onChatClick: (studentId: string) => void,
    onEditNickname: (studentId: string) => void,
    onPlanSession?: (studentId: string) => void
}> = ({ students, onSelectStudent, onChatClick, onEditNickname, onPlanSession }) => {
    const highAlertStudents = students.filter(s => {
        // Only include students with > 1 analysis history and stress >= 67%
        if (s.analysisHistory.length <= 1) return false;
        const latestStress = s.analysisHistory[s.analysisHistory.length - 1].stressLevel;
        return latestStress >= 67; // Only show high alerts (stress >= 67%)
    })
        .sort((a, b) => b.analysisHistory[b.analysisHistory.length - 1].stressLevel - a.analysisHistory[a.analysisHistory.length - 1].stressLevel);

    if (highAlertStudents.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold uppercase text-red-500 tracking-wider mb-4 px-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                HIGH ALERTS
            </h2>
            <div className="overflow-x-auto scrollbar-hide pb-4">
                <div className="flex gap-4 min-w-max">
                    {highAlertStudents.map(student => (
                        <div key={student.code} className="flex-shrink-0 w-[280px]">
                            <StudentWidget
                                student={student}
                                onClick={() => onSelectStudent(student.code)}
                                onChatClick={() => onChatClick(student.code)}
                                onEditNickname={onEditNickname}
                                onPlanSession={onPlanSession}
                                isHighAlert={true}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

// --- High Risk Students Widget for Main Dashboard (All Classes) ---
const HighRiskStudentsWidget: React.FC<{
    students: Student[],
    onSelectStudent: (id: string) => void,
    onChatClick: (studentId: string) => void,
    onEditNickname: (studentId: string) => void,
    onPlanSession?: (studentId: string) => void
}> = ({ students, onSelectStudent, onChatClick, onEditNickname, onPlanSession }) => {
    const highRiskStudents = students.filter(s => {
        // Only include students with > 1 analysis history and stress >= 67%
        if (s.analysisHistory.length <= 1) return false;
        const latestStress = s.analysisHistory[s.analysisHistory.length - 1].stressLevel;
        return latestStress >= 67; // Show all high-risk students (stress >= 67%)
    })
        .sort((a, b) => b.analysisHistory[b.analysisHistory.length - 1].stressLevel - a.analysisHistory[a.analysisHistory.length - 1].stressLevel);

    if (highRiskStudents.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold uppercase text-red-500 tracking-wider mb-4 px-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                HIGH-RISK STUDENTS ALERT
            </h2>
            <div className="overflow-x-auto scrollbar-hide pb-4">
                <div className="flex gap-4 min-w-max">
                    {highRiskStudents.map(student => (
                        <div key={student.code} className="flex-shrink-0 w-[280px]">
                            <StudentWidget
                                student={student}
                                onClick={() => onSelectStudent(student.code)}
                                onChatClick={() => onChatClick(student.code)}
                                onEditNickname={onEditNickname}
                                onPlanSession={onPlanSession}
                                isHighAlert={true}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};


interface ClassSummary {
    id: string;
    name: string;
    studentCount: number;
    averageStress: number;
    students: Student[];
}

// --- Main Teacher Dashboard Component ---
interface TeacherDashboardProps {
    students: Student[];
    onSelectStudent: (studentId: string) => void;
    onSignOut: () => void;
    onRefresh: () => void;
    onPlanSession?: (studentId: string) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ students, onSelectStudent, onSignOut, onRefresh, onPlanSession }) => {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedStudentForChat, setSelectedStudentForChat] = useState<string | null>(null);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [nicknameInput, setNicknameInput] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        onRefresh();
        // Simulate loading state for animation
        setTimeout(() => setIsRefreshing(false), 1500);
    }, [onRefresh]);

    // Teacher ID (hardcoded - same as admin code)
    const teacherId = '9999';

    // Nickname management functions
    const getNicknames = useCallback((): Record<string, string> => {
        const stored = localStorage.getItem('studentNicknames');
        return stored ? JSON.parse(stored) : {};
    }, []);

    const setNickname = useCallback((studentId: string, nickname: string) => {
        const nicknames = getNicknames();
        if (nickname.trim()) {
            nicknames[studentId] = nickname.trim();
        } else {
            delete nicknames[studentId];
        }
        StorageService.setItem('studentNicknames', nicknames, teacherId, 'state');
    }, [getNicknames, teacherId]);

    const handleEditNickname = useCallback((studentId: string) => {
        const nicknames = getNicknames();
        setNicknameInput(nicknames[studentId] || '');
        setEditingStudentId(studentId);
    }, [getNicknames]);

    const handleSaveNickname = useCallback(() => {
        if (editingStudentId) {
            setNickname(editingStudentId, nicknameInput);
            setEditingStudentId(null);
            setNicknameInput('');
        }
    }, [editingStudentId, nicknameInput, setNickname]);

    const handleCancelEdit = useCallback(() => {
        setEditingStudentId(null);
        setNicknameInput('');
    }, []);

    const classSummaries = useMemo<ClassSummary[]>(() => {
        const classes = new Map<string, { totalStress: number; studentList: Student[]; analyzedCount: number }>();

        students.forEach(student => {
            const classId = `${student.class}-${student.section}`;
            if (!classes.has(classId)) {
                classes.set(classId, { totalStress: 0, studentList: [], analyzedCount: 0 });
            }
            const classData = classes.get(classId)!;
            classData.studentList.push(student);

            // Only add to stress calculation if student has > 1 analysis history
            if (student.analysisHistory.length > 1) {
                classData.totalStress += student.analysisHistory[student.analysisHistory.length - 1].stressLevel;
                classData.analyzedCount += 1;
            }
        });

        return Array.from(classes.entries()).map(([id, data]) => ({
            id,
            name: `Class ${id.replace('-', ' ')}`,
            studentCount: data.studentList.length,
            averageStress: data.analyzedCount > 0 ? Math.round(data.totalStress / data.analyzedCount) : 0,
            students: data.studentList
        })).sort((a, b) => a.id.localeCompare(b.id));

    }, [students]);

    const selectedClass = useMemo(() => {
        return classSummaries.find(c => c.id === selectedClassId) || null;
    }, [selectedClassId, classSummaries]);

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.07 } }
    };

    const pageTransition = {
        type: "tween",
        ease: "anticipate",
        duration: 0.5
    };

    const pageVariants = {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 }
    };

    return (
        <div className="min-h-screen w-full p-4 max-w-4xl mx-auto">
            <header className="flex items-center justify-between pt-4 pb-6">
                <div className="flex items-center gap-2">
                    {selectedClassId && (
                        <MotionButton
                            onClick={() => setSelectedClassId(null)}
                            className="w-11 h-11 bg-surface rounded-full flex items-center justify-center hover:bg-surface/80 transition-all active:scale-90"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                        >
                            <ChevronLeft className="w-6 h-6 text-text-secondary" />
                        </MotionButton>
                    )}
                    <div>
                        <h1 className="text-4xl font-bold text-text-primary">
                            {selectedClass ? selectedClass.name : 'Dashboard'}
                        </h1>
                        <p className="text-xl font-normal text-text-muted mt-1">
                            {selectedClass ? `${selectedClass.studentCount} Students` : 'Student Stress Overview'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="w-11 h-11 bg-surface rounded-full flex items-center justify-center hover:bg-purple-primary/20 transition-all cursor-pointer relative active:scale-90"
                        onClick={() => setIsChatOpen(true)}
                        title="Messages"
                    >
                        <MessageCircle className="w-6 h-6 text-text-secondary" />
                        <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background-primary z-20"></span>
                    </button>
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <LiquidButton
                            onClick={handleRefresh}
                            title="Refresh Data"
                            className={`w-11 h-11 rounded-full flex items-center justify-center p-0 relative transition-all duration-300 active:scale-90 ${isRefreshing ? 'shadow-[0_0_20px_rgba(168,85,247,0.6)] border-purple-500/50' : ''}`}
                        >
                            <motion.svg
                                className={`w-5 h-5 ${isRefreshing ? 'text-purple-200' : 'text-white'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                animate={{
                                    rotate: isRefreshing ? 360 : 0
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: isRefreshing ? Infinity : 0,
                                    ease: "linear"
                                }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </motion.svg>
                        </LiquidButton>
                    </motion.div>
                    <LiquidButton
                        onClick={() => {
                            if (window.confirm('Are you sure you want to sign out?')) {
                                onSignOut();
                            }
                        }}
                        title="Sign Out"
                        className="w-12 h-12 rounded-full flex items-center justify-center p-0 active:scale-90"
                    >
                        <UserCircle className="w-7 h-7" />
                    </LiquidButton>
                </div>
            </header>

            <main>
                <AnimatePresence mode="wait">
                    {!selectedClass ? (
                        <MotionDiv
                            key="class-grid"
                            variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
                        >
                            {/* High Risk Students Widget - All Classes */}
                            <HighRiskStudentsWidget
                                students={students}
                                onSelectStudent={onSelectStudent}
                                onChatClick={(studentId) => {
                                    setSelectedStudentForChat(studentId);
                                    setIsChatOpen(true);
                                }}
                                onEditNickname={handleEditNickname}
                                onPlanSession={onPlanSession}
                            />

                            <h2 className="text-xl font-bold uppercase text-text-muted tracking-wider mb-4 px-2">All Classes</h2>
                            {classSummaries.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UserCircle className="w-8 h-8 text-text-muted" />
                                    </div>
                                    <h3 className="text-3xl font-semibold text-text-primary mb-2">No Students Yet</h3>
                                    <p className="text-xl font-normal text-text-muted mb-4">Students will appear here once they complete their first voice analysis session.</p>
                                    <button
                                        onClick={onRefresh}
                                        className="px-4 py-2 bg-purple-primary text-white rounded-lg hover:bg-purple-dark transition-colors text-sm font-medium"
                                    >
                                        Refresh Data
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {classSummaries.map(summary => (
                                        <MotionDiv
                                            key={summary.id}
                                            onClick={() => setSelectedClassId(summary.id)}
                                            className="cursor-pointer"
                                            whileHover={{ scale: 1.03, y: -5 }}
                                            whileTap={{ scale: 0.98 }}
                                            transition={{ type: 'spring', stiffness: 300 }}
                                        >
                                            <GlassCard className="p-5 flex flex-col justify-between h-36 active:bg-white/5 transition-colors" variant="purple">
                                                <h3 className="text-2xl font-bold text-purple-light">{summary.name}</h3>
                                                <div className="text-right">
                                                    <p className="text-xl font-medium text-text-secondary">{summary.studentCount} Students</p>
                                                    <p className="text-xl font-normal text-text-muted">Avg {summary.averageStress}% Stress</p>
                                                </div>
                                            </GlassCard>
                                        </MotionDiv>
                                    ))}
                                </div>
                            )}
                        </MotionDiv>
                    ) : (
                        <MotionDiv
                            key="student-list"
                            variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
                            className="space-y-8"
                        >
                            {/* High Alerts Section - Prominently displayed at top */}
                            <HighAlertsSection
                                students={selectedClass.students}
                                onSelectStudent={onSelectStudent}
                                onChatClick={(studentId) => {
                                    setSelectedStudentForChat(studentId);
                                    setIsChatOpen(true);
                                }}
                                onEditNickname={handleEditNickname}
                                onPlanSession={onPlanSession}
                            />



                            <div>
                                <h2 className="text-xl font-bold uppercase text-text-muted tracking-wider mb-4 px-2">ALL STUDENTS IN CLASS</h2>
                                <MotionDiv
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                >
                                    {selectedClass.students.map(student => (
                                        <StudentWidget
                                            key={student.code}
                                            student={student}
                                            onClick={() => onSelectStudent(student.code)}
                                            onChatClick={() => {
                                                setSelectedStudentForChat(student.code);
                                                setIsChatOpen(true);
                                            }}
                                            onEditNickname={handleEditNickname}
                                            onPlanSession={onPlanSession}
                                        />
                                    ))}
                                </MotionDiv>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </main>

            {/* Teacher Chat Modal */}
            <TeacherChatModal
                isOpen={isChatOpen}
                onClose={() => {
                    setIsChatOpen(false);
                    setSelectedStudentForChat(null);
                }}
                teacherId={teacherId}
                students={students.map(s => ({ code: s.code, name: s.name }))}
                selectedStudentId={selectedStudentForChat}
            />

            {/* Nickname Edit Modal */}
            {editingStudentId && (
                <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    onClick={handleCancelEdit}
                >
                    <MotionDiv
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e: any) => e.stopPropagation()}
                        className="bg-background-primary rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
                    >
                        <h3 className="text-lg font-semibold text-white mb-2">Edit Nickname</h3>
                        <p className="text-sm text-text-muted mb-4">Student Code: {editingStudentId}</p>

                        <input
                            type="text"
                            value={nicknameInput}
                            onChange={(e) => setNicknameInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveNickname();
                                } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                }
                            }}
                            placeholder="Enter nickname (leave empty to remove)"
                            className="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-purple-primary mb-4"
                            autoFocus
                        />

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNickname}
                                className="px-4 py-2 bg-purple-primary hover:bg-purple-primary/90 rounded-lg text-white text-sm font-medium transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </MotionDiv>
                </MotionDiv>
            )}
        </div>
    );
};

export default TeacherDashboard;

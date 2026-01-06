/**
 * Session Planning Page
 * Allows counselors to customize pre-session questions and set AI focus topics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, X, HelpCircle, Target, MessageSquare, Settings } from 'lucide-react';
import { BeamsBackground } from './ui/beams-background';
import GlassCard from './GlassCard';
import type {
    SessionPlan,
    CounselorQuestion,
    CounselorQuestionType,
    PreAnalysisCategory,
    FocusIntensity
} from '../types';
import {
    getSessionPlan,
    saveSessionPlan,
    generateAndSavePlan,
    deleteSessionPlan,
    createEmptyPlan,
    createEmptyQuestion,
    generateQuestionsByTopic,
    QUESTION_TYPE_LABELS,
    CATEGORY_LABELS,
    MCQ_TEMPLATES,
} from '../services/planningService';

// Animation variants
const MotionDiv = motion.div as any;

interface SessionPlanningPageProps {
    studentId: string;
    studentName?: string;
    onBack: () => void;
    onSave: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
}

const SessionPlanningPage: React.FC<SessionPlanningPageProps> = ({
    studentId,
    studentName,
    onBack,
    onSave,
    onDirtyChange,
}) => {
    const [plan, setPlan] = useState<SessionPlan | null>(null);
    const [showTypeSelector, setShowTypeSelector] = useState<string | null>(null);
    const [showCategorySelector, setShowCategorySelector] = useState<string | null>(null);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // AI Generation State
    const [aiTopic, setAiTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Notify parent whenever hasChanges updates
    useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    // Load existing plan or create new one
    useEffect(() => {
        const existingPlan = getSessionPlan(studentId);
        if (existingPlan) {
            setPlan(existingPlan);
        } else {
            setPlan(createEmptyPlan(studentId, studentName));
        }
    }, [studentId, studentName]);

    const handleAddQuestion = () => {
        if (!plan) return;
        const newQuestion = createEmptyQuestion('general');
        setPlan({
            ...plan,
            customQuestions: [...plan.customQuestions, newQuestion],
        });
        setHasChanges(true);
    };

    const handleAddTemplate = (template: typeof MCQ_TEMPLATES[0]) => {
        if (!plan) return;
        const newQuestion = createEmptyQuestion('general');
        newQuestion.text = template.text;
        newQuestion.type = 'multiple-choice';
        newQuestion.options = [...template.options];

        setPlan({
            ...plan,
            customQuestions: [...plan.customQuestions, newQuestion],
        });
        setShowTemplateSelector(false);
        setHasChanges(true);
    };

    const handleRemoveQuestion = (questionId: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.filter(q => q.id !== questionId),
        });
        setHasChanges(true);
    };

    const handleQuestionTextChange = (questionId: string, text: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q =>
                q.id === questionId ? { ...q, text } : q
            ),
        });
        setHasChanges(true);
    };

    const handleQuestionTypeChange = (questionId: string, type: CounselorQuestionType) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q =>
                q.id === questionId ? { ...q, type, options: type === 'multiple-choice' ? ['', ''] : undefined } : q
            ),
        });
        setShowTypeSelector(null);
        setHasChanges(true);
    };

    const handleQuestionCategoryChange = (questionId: string, category: PreAnalysisCategory) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q =>
                q.id === questionId ? { ...q, category } : q
            ),
        });
        setShowCategorySelector(null);
        setHasChanges(true);
    };

    const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q => {
                if (q.id !== questionId || !q.options) return q;
                const newOptions = [...q.options];
                newOptions[optionIndex] = value;
                return { ...q, options: newOptions };
            }),
        });
        setHasChanges(true);
    };

    const handleAddOption = (questionId: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q => {
                if (q.id !== questionId || !q.options || q.options.length >= 6) return q;
                return { ...q, options: [...q.options, ''] };
            }),
        });
        setHasChanges(true);
    };

    const handleRemoveOption = (questionId: string, optionIndex: number) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q => {
                if (q.id !== questionId || !q.options || q.options.length <= 2) return q;
                return { ...q, options: q.options.filter((_, i) => i !== optionIndex) };
            }),
        });
        setHasChanges(true);
    };

    const handleFocusTopicChange = (focusTopic: string) => {
        if (!plan) return;
        setPlan({ ...plan, focusTopic });
        setHasChanges(true);
    };

    const handleFocusIntensityChange = (focusIntensity: FocusIntensity) => {
        if (!plan) return;
        setPlan({ ...plan, focusIntensity });
        setHasChanges(true);
    };

    const handleTogglePersistence = () => {
        if (!plan) return;
        setPlan({ ...plan, useForNextSessionOnly: !plan.useForNextSessionOnly });
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!plan) return;
        setIsSaving(true);
        try {
            await generateAndSavePlan({ ...plan, isActive: true });
            setHasChanges(false);
            onSave();
        } catch (e) {
            console.error("Failed to save", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!aiTopic.trim()) return;
        setIsGenerating(true);
        try {
            const questions = await generateQuestionsByTopic(aiTopic, 3);
            if (plan) {
                // Map to CounselorQuestion type
                const counselorQuestions: CounselorQuestion[] = questions.map(q => ({
                    id: q.id,
                    text: q.text,
                    type: q.type === 'multiple-choice' ? 'multiple-choice' :
                        q.type === 'yes-no' ? 'yes-no' : 'scale-1-5',
                    category: q.category,
                    options: q.options,
                    createdAt: new Date().toISOString()
                }));

                setPlan({
                    ...plan,
                    customQuestions: [...plan.customQuestions, ...counselorQuestions]
                });
                setHasChanges(true);
                setShowTemplateSelector(false);
                setAiTopic('');
            }
        } catch (e) {
            console.error("Failed to generate questions", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearPlan = () => {
        deleteSessionPlan(studentId);
        setPlan(createEmptyPlan(studentId, studentName));
        setHasChanges(true);
    };

    if (!plan) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-primary">
                <div className="text-text-muted">Loading...</div>
            </div>
        );
    }

    const validQuestionCount = plan.customQuestions.filter(q => q.text.trim() !== '').length;
    const remainingAIQuestions = Math.max(0, 4 - validQuestionCount);

    return (
        <div className="min-h-screen w-full bg-background-primary text-text-primary flex flex-col relative">
            {/* Background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <BeamsBackground intensity="medium" className="!z-0" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-[40] backdrop-blur-xl bg-black/60 border-b border-white/10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button
                                onClick={onBack}
                                className="p-3 min-w-[44px] min-h-[44px] rounded-lg hover:bg-surface active:bg-surface/80 active:scale-95 transition-all text-text-secondary hover:text-text-primary"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex-1 md:flex-none">
                                <h1 className="text-xl font-semibold">Plan Session</h1>
                                <div className="text-sm flex flex-wrap items-center gap-2">
                                    <span className="text-text-muted">for</span>
                                    <span className="text-white font-medium truncate max-w-[150px]">{studentName || 'Student'}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-text-muted font-mono">{studentId}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end w-full md:w-auto pl-[60px] md:pl-0">
                            {hasChanges && (
                                <span className="text-xs text-orange-400 whitespace-nowrap">Unsaved changes</span>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border ${hasChanges && !isSaving
                                    ? 'bg-gradient-to-r from-purple-primary to-purple-light text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] border-purple-400/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:border-purple-400/50 hover:scale-105'
                                    : 'bg-surface/50 text-text-muted cursor-not-allowed border-white/5'
                                    }`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Save Plan</span>
                                    </>
                                )}
                            </button>

                            {/* Settings Button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={`p-2 rounded-full transition-all duration-200 border ${showSettings
                                        ? 'bg-purple-primary/20 text-purple-primary border-purple-primary/30'
                                        : 'bg-surface/50 text-text-muted hover:text-white border-white/5 hover:bg-surface'}`}
                                >
                                    <Settings className="w-4 h-4" />
                                </button>

                                {/* Settings Dropdown */}
                                {showSettings && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] z-[100] overflow-hidden ring-1 ring-white/10">
                                        <div className="p-1">
                                            <div className="px-4 py-3 border-b border-white/5">
                                                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Plan Settings</h3>
                                            </div>

                                            <div className="p-2 space-y-1">
                                                <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                                    <div className="relative inline-flex items-center mt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={plan.useForNextSessionOnly}
                                                            onChange={handleTogglePersistence}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-9 h-5 bg-surface/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-primary transition-colors"></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-white font-medium group-hover:text-purple-200 transition-colors">One-time Plan</div>
                                                        <div className="text-[10px] text-text-muted leading-tight mt-1">
                                                            Auto-delete this plan after the session completes
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="p-2 border-t border-white/5">
                                                <button
                                                    onClick={() => {
                                                        handleClearPlan();
                                                        setShowSettings(false);
                                                    }}
                                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-xl transition-all duration-200"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Clear All & Start Fresh
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto relative z-10">
                <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                    {/* Main Section: Custom Questions */}
                    <GlassCard
                        className={`p-4 md:p-6 transition-all duration-200 ${(showTypeSelector || showCategorySelector) ? 'relative z-20' : 'relative z-10'} bg-black/40 backdrop-blur-xl border-white/10 shadow-xl`}
                        variant="base"
                    >
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/5 shadow-inner">
                                <MessageSquare className="w-6 h-6 text-purple-300" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white tracking-tight">Custom Pre-Session Questions</h2>
                                <p className="text-sm text-text-muted mt-1">
                                    Define up to 4 specific questions for the student to answer before their session.
                                </p>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-4">
                            <AnimatePresence>
                                {plan.customQuestions.map((question, index) => (
                                    <MotionDiv
                                        key={question.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        className={`bg-surface/30 rounded-xl p-4 border border-white/10 relative transition-all duration-200 ${(showTypeSelector === question.id || showCategorySelector === question.id)
                                            ? 'z-20 border-purple-primary/30 shadow-lg'
                                            : 'z-0'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-primary/30 text-purple-primary flex items-center justify-center text-sm font-medium">
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 space-y-3">
                                                {/* Question Text */}
                                                <textarea
                                                    value={question.text}
                                                    onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                                                    placeholder="Enter your question..."
                                                    className="w-full bg-surface/50 border border-white/10 rounded-lg p-3 text-white placeholder-text-muted resize-none focus:border-purple-primary/50 focus:outline-none transition-colors"
                                                    rows={2}
                                                />

                                                {/* Question Settings */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Type Selector */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowTypeSelector(showTypeSelector === question.id ? null : question.id)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-surface/50 border border-white/10 rounded-lg text-sm text-text-secondary hover:border-purple-primary/30 transition-colors"
                                                        >
                                                            <span>{QUESTION_TYPE_LABELS[question.type]?.icon}</span>
                                                            <span>{QUESTION_TYPE_LABELS[question.type]?.label}</span>
                                                        </button>

                                                        {showTypeSelector === question.id && (
                                                            <div className="absolute top-full left-0 mt-2 w-56 bg-background-secondary border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                                                {Object.entries(QUESTION_TYPE_LABELS).map(([type, info]) => (
                                                                    <button
                                                                        key={type}
                                                                        onClick={() => handleQuestionTypeChange(question.id, type as CounselorQuestionType)}
                                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-purple-primary/10 transition-colors ${question.type === type ? 'bg-purple-primary/20 text-purple-primary' : 'text-text-secondary'
                                                                            }`}
                                                                    >
                                                                        <span className="text-lg">{info.icon}</span>
                                                                        <div>
                                                                            <div className="font-medium">{info.label}</div>
                                                                            <div className="text-xs text-text-muted">{info.description}</div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Category Selector */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowCategorySelector(showCategorySelector === question.id ? null : question.id)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 bg-surface/50 border border-white/10 rounded-lg text-sm hover:border-purple-primary/30 transition-colors ${CATEGORY_LABELS[question.category]?.color || 'text-text-secondary'}`}
                                                        >
                                                            {CATEGORY_LABELS[question.category]?.label || 'Category'}
                                                        </button>

                                                        {showCategorySelector === question.id && (
                                                            <div className="absolute top-full left-0 mt-2 w-40 bg-background-secondary border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden">
                                                                {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={() => handleQuestionCategoryChange(question.id, cat as PreAnalysisCategory)}
                                                                        className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-purple-primary/10 transition-colors ${info.color}`}
                                                                    >
                                                                        {info.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Multiple Choice Options */}
                                                {question.type === 'multiple-choice' && question.options && (
                                                    <div className="space-y-2 mt-3 pl-4 border-l-2 border-purple-primary/30">
                                                        <p className="text-xs text-text-muted">Response Options:</p>
                                                        {question.options.map((option, optIndex) => (
                                                            <div key={optIndex} className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={option}
                                                                    onChange={(e) => handleOptionChange(question.id, optIndex, e.target.value)}
                                                                    className="flex-1 bg-surface/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-text-muted focus:border-purple-primary/50 focus:outline-none transition-colors"
                                                                    placeholder={`Option ${optIndex + 1}`}
                                                                />
                                                                {question.options!.length > 2 && (
                                                                    <button
                                                                        onClick={() => handleRemoveOption(question.id, optIndex)}
                                                                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {question.options.length < 6 && (
                                                            <button
                                                                onClick={() => handleAddOption(question.id)}
                                                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                                            >
                                                                + Add Option
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleRemoveQuestion(question.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="Remove question"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </MotionDiv>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Add Buttons */}
                        <div className="mt-4 space-y-3">
                            <button
                                onClick={handleAddQuestion}
                                className="w-full py-3 min-h-[44px] border-2 border-dashed border-purple-primary/30 rounded-xl text-purple-primary hover:bg-purple-primary/10 active:bg-purple-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 px-4"
                            >
                                <Plus className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">Add Custom Question</span>
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowTemplateSelector(!showTemplateSelector); setShowAIGenerator(false); }}
                                        className="w-full h-full min-h-[44px] px-6 border-2 border-dashed border-blue-400/30 rounded-xl text-blue-400 hover:bg-blue-400/10 active:bg-blue-400/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                        Use Template
                                    </button>

                                    {showTemplateSelector && (
                                        <div className="absolute top-full right-0 mt-2 w-full md:w-80 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/10">
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                <div className="p-3">
                                                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Select a Template</h4>
                                                    <div className="space-y-1">
                                                        {MCQ_TEMPLATES.map((template, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleAddTemplate(template)}
                                                                className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group"
                                                            >
                                                                <div className="text-sm text-white mb-1 group-hover:text-purple-300 transition-colors">{template.text}</div>
                                                                <div className="text-xs text-text-muted truncate">{template.options.join(', ')}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* AI Generate Button */}
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowAIGenerator(!showAIGenerator); setShowTemplateSelector(false); }}
                                        className="w-full h-full min-h-[44px] px-6 border-2 border-dashed border-purple-primary/30 rounded-xl text-purple-300 hover:bg-purple-primary/10 active:bg-purple-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <div className="w-3 h-3 rounded-full bg-purple-primary/50 animate-pulse" />
                                        AI Generate
                                    </button>

                                    {showAIGenerator && (
                                        <div className="absolute top-full right-0 mt-2 w-full md:w-80 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/10">
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
                                                        What topic to focus on?
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={aiTopic}
                                                        onChange={(e) => setAiTopic(e.target.value)}
                                                        placeholder="e.g. Exam Stress, Friendships"
                                                        className="w-full bg-surface/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:border-purple-primary/50 focus:outline-none transition-colors"
                                                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateQuestions()}
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleGenerateQuestions}
                                                    disabled={!aiTopic.trim() || isGenerating}
                                                    className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${!aiTopic.trim() || isGenerating
                                                        ? 'bg-surface/50 text-text-muted cursor-not-allowed'
                                                        : 'bg-purple-primary hover:bg-purple-600 text-white shadow-lg shadow-purple-primary/20'
                                                        }`}
                                                >
                                                    {isGenerating ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
                                                            Generate Questions
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* AI Questions Info */}
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-300">
                                    {validQuestionCount === 0 ? (
                                        "No questions added yet. AI will generate all 4 personalized questions."
                                    ) : validQuestionCount >= 4 ? (
                                        "You've added 4+ questions. Only your custom questions will be used."
                                    ) : (
                                        <>You've added {validQuestionCount} question{validQuestionCount !== 1 ? 's' : ''}. AI will generate {remainingAIQuestions} complementary question{remainingAIQuestions !== 1 ? 's' : ''} on the same topics.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* New Section: Daily Wellness Tasks */}
                    <GlassCard
                        className="p-4 md:p-6 bg-black/40 backdrop-blur-xl border-white/10 shadow-xl"
                        variant="base"
                    >
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-white/5 shadow-inner">
                                <Plus className="w-6 h-6 text-emerald-300" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white tracking-tight">Daily Wellness Tasks</h2>
                                <p className="text-sm text-text-muted mt-1">
                                    Set specific tasks for the student to complete in their daily dashboard.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {(plan.assignedTasks || []).map((task, index) => (
                                    <MotionDiv
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={task}
                                            onChange={(e) => {
                                                const newTasks = [...(plan.assignedTasks || [])];
                                                newTasks[index] = e.target.value;
                                                setPlan({ ...plan, assignedTasks: newTasks });
                                                setHasChanges(true);
                                            }}
                                            placeholder="Enter task description..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-text-muted text-sm"
                                        />
                                        <button
                                            onClick={() => {
                                                const newTasks = (plan.assignedTasks || []).filter((_, i) => i !== index);
                                                setPlan({ ...plan, assignedTasks: newTasks });
                                                setHasChanges(true);
                                            }}
                                            className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </MotionDiv>
                                ))}
                            </AnimatePresence>

                            <button
                                onClick={() => {
                                    const newTasks = [...(plan.assignedTasks || []), ""];
                                    setPlan({ ...plan, assignedTasks: newTasks });
                                    setHasChanges(true);
                                }}
                                className="w-full py-3 min-h-[44px] border-2 border-dashed border-emerald-500/20 rounded-xl text-emerald-400 hover:bg-emerald-500/10 active:bg-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Targeted Task
                            </button>
                        </div>
                    </GlassCard>

                    <div className="w-full">
                        {/* Focus Topic Section */}
                        <GlassCard className="p-4 md:p-5 flex flex-col justify-between bg-black/40 backdrop-blur-md border-white/10" variant="base">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Target className="w-5 h-5 text-orange-primary" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white md:hidden">Session Focus Topic</h2>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold text-white hidden md:block">Session Focus Topic</h2>
                                    <p className="text-sm text-text-muted">
                                        Guide the AI to explore a specific topic during the conversation
                                    </p>
                                </div>
                            </div>

                            {/* Focus Topic Input */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-text-secondary mb-2">
                                        What topic should the AI focus on? (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={plan.focusTopic}
                                        onChange={(e) => handleFocusTopicChange(e.target.value)}
                                        placeholder="e.g., exam anxiety, peer relationships, sleep issues..."
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-text-muted focus:border-orange-primary/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                {/* Focus Intensity */}
                                {plan.focusTopic && (
                                    <MotionDiv
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-3"
                                    >
                                        <label className="block text-sm text-text-secondary">
                                            How strongly should the AI focus on this topic?
                                        </label>
                                        <div className="flex flex-col md:flex-row gap-2">
                                            {(['gentle', 'moderate', 'focused'] as FocusIntensity[]).map((intensity) => (
                                                <button
                                                    key={intensity}
                                                    onClick={() => handleFocusIntensityChange(intensity)}
                                                    className={`w-full md:flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all text-left md:text-center ${plan.focusIntensity === intensity
                                                        ? 'bg-orange-primary text-white shadow-lg shadow-orange-primary/30'
                                                        : 'bg-surface/50 text-text-secondary hover:bg-surface hover:text-white border border-white/10'
                                                        }`}
                                                >
                                                    <div className="capitalize">{intensity}</div>
                                                    <div className="text-xs mt-1 opacity-70">
                                                        {intensity === 'gentle' && 'Light suggestion'}
                                                        {intensity === 'moderate' && 'Regular guidance'}
                                                        {intensity === 'focused' && 'Primary focus'}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </MotionDiv>
                                )}

                                {/* Example Topics */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs text-text-muted w-full md:w-auto mb-1 md:mb-0">Suggestions:</span>
                                    {['academic pressure', 'friendships', 'sleep problems', 'family dynamics', 'self-esteem'].map((topic) => (
                                        <button
                                            key={topic}
                                            onClick={() => handleFocusTopicChange(topic)}
                                            className="px-3 py-1.5 text-xs bg-surface/30 text-text-secondary rounded-lg hover:bg-surface hover:text-white transition-colors border border-white/5 active:scale-95"
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionPlanningPage;

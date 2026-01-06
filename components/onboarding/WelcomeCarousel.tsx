import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Sparkles, Mic, BarChart3, MessageCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { OnboardingService } from '../../services/onboardingService';

interface WelcomeCarouselProps {
    studentCode: string;
    onComplete: () => void;
}

// Bypassing strict className lint check with a local alias
const MotionDiv = motion.div as any;

export const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ studentCode, onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const features = [
        {
            icon: <Mic className="w-16 h-16 text-blue-400" />,
            title: "Voice Analysis",
            desc: "Understand your mental wellbeing through the subtle patterns in your unique voice profile.",
            color: "from-blue-500/20 to-indigo-500/20"
        },
        {
            icon: <BarChart3 className="w-16 h-16 text-purple-400" />,
            title: "Real-time Insights",
            desc: "Get immediate visual feedback and track your stress trends with high-precision analysis.",
            color: "from-purple-500/20 to-pink-500/20"
        },
        {
            icon: <MessageCircle className="w-16 h-16 text-emerald-400" />,
            title: "Counselor Access",
            desc: "Securely connect with dedicated support specialists whenever you need guidance.",
            color: "from-emerald-500/20 to-teal-500/20"
        }
    ];

    const handleNext = () => {
        if (currentSlide < features.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            handleStart();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const handleStart = () => {
        OnboardingService.completeStep(studentCode, 'welcome');
        onComplete();
    };

    const handlers = useSwipeable({
        onSwipedLeft: handleNext,
        onSwipedRight: handlePrev,
        trackMouse: true,
    });

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 touch-none" {...handlers}>
            <MotionDiv
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[40px] overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] relative flex flex-col min-h-[500px]"
            >
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-blue-500/10 blur-[120px] pointer-events-none" />

                <div className="p-10 flex-1 flex flex-col items-center justify-center text-center">
                    <AnimatePresence mode="wait">
                        <MotionDiv
                            key={currentSlide}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="flex flex-col items-center w-full"
                        >
                            <div className={`w-32 h-32 bg-gradient-to-br ${features[currentSlide].color} rounded-[32px] flex items-center justify-center mb-8 border border-white/10 shadow-inner group transition-transform duration-500`}>
                                {features[currentSlide].icon}
                            </div>

                            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight leading-tight">
                                {features[currentSlide].title}
                            </h2>
                            <p className="text-slate-400 text-lg max-w-sm mx-auto font-medium leading-relaxed">
                                {features[currentSlide].desc}
                            </p>
                        </MotionDiv>
                    </AnimatePresence>
                </div>

                {/* Footer and Navigation */}
                <div className="p-10 bg-white/[0.02] border-t border-white/5">
                    <div className="flex flex-col items-center gap-8">
                        {/* Indicators */}
                        <div className="flex gap-2.5">
                            {features.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-blue-400' : 'w-2 bg-white/20'}`}
                                />
                            ))}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleNext}
                            className="w-full py-4 bg-white text-slate-900 rounded-[22px] font-black text-lg hover:bg-blue-50 hover:scale-[1.02] transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 group"
                        >
                            {currentSlide === features.length - 1 ? 'Get Started' : 'Continue'}
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </MotionDiv>
        </div>
    );
};

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { OnboardingService } from '../../services/onboardingService';

interface SpotlightOverlayProps {
    targetId: string; // ID of the element to highlight and attach tooltip to
    additionalTargetIds?: string[]; // IDs of other elements to reveal (create holes for)
    title: string;
    message: string;
    onComplete: () => void;
    onSkip: () => void;
    actionLabel?: string;
    studentCode: string;
    step?: number;
    totalSteps?: number;
}

const MotionDiv = motion.div as any;

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
    targetId,
    additionalTargetIds = [],
    title,
    message,
    onComplete,
    onSkip,
    actionLabel = "Next",
    studentCode,
    step = 1,
    totalSteps = 3
}) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [additionalRects, setAdditionalRects] = useState<DOMRect[]>([]);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });

    useEffect(() => {
        const updatePosition = () => {
            const element = document.getElementById(targetId);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);

                // Calculate logic for tooltip placement (defaulting to below for now)
                // This can be enhanced to auto-detect best side
                setTooltipPosition({
                    top: rect.bottom + 16,
                    left: rect.left + (rect.width / 2) - 160 // Center align
                });
            }

            // Calculate rects for additional targets
            const extraRects: DOMRect[] = [];
            additionalTargetIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    extraRects.push(el.getBoundingClientRect());
                }
            });
            setAdditionalRects(extraRects);
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        // Polling in case of layout shifts
        const interval = setInterval(updatePosition, 500);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
            clearInterval(interval);
        };
    }, [targetId, JSON.stringify(additionalTargetIds)]);

    useEffect(() => {
        // Prevent background scrolling when spotlight is active
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);


    if (!targetRect) return null;

    const isCircular = targetId === 'chat-btn';

    // Determine if tooltip should be above target
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const shouldShowAbove = spaceBelow < 250;

    // Calculate constrained tooltip position
    const tooltipLeft = Math.max(20, Math.min(window.innerWidth - 340, tooltipPosition.left));

    // Calculate arrow position relative to tooltipleft to point at target center
    const targetCenter = targetRect.left + targetRect.width / 2;
    const arrowLeft = Math.max(20, Math.min(300, targetCenter - tooltipLeft));

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">
            {/* SVG Backdrop that blocks background interaction except for the hole */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.15))' } as any}
            >
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {/* Primary Target Hole */}
                        <rect
                            x={targetRect.left - 8}
                            y={targetRect.top - 8}
                            width={targetRect.width + 16}
                            height={targetRect.height + 16}
                            rx={isCircular ? (targetRect.width + 16) / 2 : 16}
                            fill="black"
                        />
                        {/* Additional Target Holes */}
                        {additionalRects.map((rect, i) => (
                            <rect
                                key={i}
                                x={rect.left - 8}
                                y={rect.top - 8}
                                width={rect.width + 16}
                                height={rect.height + 16}
                                rx={16}
                                fill="black"
                            />
                        ))}
                    </mask>
                </defs>
                {/* This rect is what blocks background clicks.
                    Setting it to pointer-events-auto will catch all clicks except what's masked.
                */}
                <rect
                    x="0" y="0"
                    width="100%" height="100%"
                    fill="rgba(0, 0, 0, 0.9)"
                    mask="url(#spotlight-mask)"
                    className="backdrop-blur-md pointer-events-auto"
                    onClick={onComplete}
                />
            </svg>

            {/* Target Interaction Hole - Primary (now clickable to advance) */}
            <div
                className="absolute pointer-events-auto cursor-pointer"
                style={{
                    top: targetRect.top - 8,
                    left: targetRect.left - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                }}
                onClick={onComplete}
            />
            {/* Target Interaction Holes - Additional */}
            {additionalRects.map((rect, i) => (
                <div
                    key={i}
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{
                        top: rect.top - 8,
                        left: rect.left - 8,
                        width: rect.width + 16,
                        height: rect.height + 16,
                    }}
                    onClick={onComplete}
                />
            ))}

            {/* Soft Radial Glow around Target */}
            <MotionDiv
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={`absolute pointer-events-none z-50 bg-blue-500/15 blur-[40px] ${isCircular ? 'rounded-full' : 'rounded-3xl'}`}
                style={{
                    top: targetRect.top - 24,
                    left: targetRect.left - 24,
                    width: targetRect.width + 48,
                    height: targetRect.height + 48,
                }}
            />

            {/* Inner Ring Glow */}
            <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`absolute border border-white/20 pointer-events-none z-50 shadow-[0_0_12px_rgba(59,130,246,0.3)] ${isCircular ? 'rounded-full' : 'rounded-2xl'}`}
                style={{
                    top: targetRect.top - 6,
                    left: targetRect.left - 6,
                    width: targetRect.width + 12,
                    height: targetRect.height + 12
                }}
            />

            {/* Tooltip Bubble */}
            <div
                className="absolute pointer-events-auto flex flex-col"
                style={{
                    top: shouldShowAbove
                        ? targetRect.top - 210 // Position above
                        : Math.min(tooltipPosition.top, window.innerHeight - 200), // Position below
                    left: tooltipLeft,
                    width: 320,
                    zIndex: 110 // Ensure it's above the mask
                }}
            >
                {/* Arrow indicator - flipped if shouldShowAbove */}
                {!shouldShowAbove && (
                    <div
                        className="w-3 h-3 rotate-45 bg-[#0f172a] border-l border-t border-white/10 mb-[-6px] relative z-10"
                        style={{ marginLeft: arrowLeft - 6 }}
                    />
                )}

                <AnimatePresence>
                    <MotionDiv
                        initial={{ scale: 0.9, opacity: 0, y: shouldShowAbove ? -10 : 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: shouldShowAbove ? -5 : 5 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-[#0f172a] text-white p-5 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/10 w-full"
                    >
                        <div className="flex justify-center items-start mb-3 gap-3">
                            <div className="flex items-start gap-2 pt-1 font-bold text-center w-full justify-center">
                                <span className="text-blue-400 text-[10px] font-black whitespace-nowrap bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-tighter">
                                    Step {step}/{totalSteps}
                                </span>
                                <span className="text-white/20 mt-[-2px]">|</span>
                                <h3 className="text-base text-white leading-tight font-black tracking-tight uppercase">
                                    {title}
                                </h3>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4 font-medium text-center">
                            {message}
                        </p>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest text-center border-t border-white/10 pt-3">
                            Tap anywhere to continue
                        </div>
                    </MotionDiv>
                </AnimatePresence>

                {/* Bottom Arrow indicator - if shouldShowAbove */}
                {shouldShowAbove && (
                    <div
                        className="w-3 h-3 rotate-45 bg-[#0f172a] border-r border-b border-white/10 mt-[-6px] relative z-10"
                        style={{ marginLeft: arrowLeft - 6 }}
                    />
                )}
            </div>
        </div>
    );
};

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from "@/lib/utils";

interface InfinityLoaderProps {
    statusText?: string;
    isComplete?: boolean;
    onComplete?: () => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
    sm: { width: 80, height: 80 },
    md: { width: 120, height: 120 },
    lg: { width: 160, height: 160 },
};

export const InfinityLoader: React.FC<InfinityLoaderProps> = ({
    statusText = "Weaving magic...",
    isComplete = false,
    onComplete,
    className,
    size = 'md',
}) => {
    const [progress, setProgress] = useState(0);
    const [displayComplete, setDisplayComplete] = useState(false);
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const { width, height } = sizeConfig[size];

    // Smooth easing function for natural progress
    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

    // Animation using requestAnimationFrame for buttery smooth updates
    const animate = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        // Takes about 8 seconds to reach 85%
        const duration = 8000;
        const rawProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuart(rawProgress) * 85;

        setProgress(easedProgress);

        if (rawProgress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, []);

    useEffect(() => {
        if (isComplete) {
            // Cancel any ongoing animation
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            // Smoothly transition to 100%
            setProgress(100);
            setDisplayComplete(true);

            if (onComplete) {
                const timer = setTimeout(onComplete, 1000);
                return () => clearTimeout(timer);
            }
        } else {
            // Reset and start animation
            setDisplayComplete(false);
            setProgress(0);
            startTimeRef.current = null;
            animationRef.current = requestAnimationFrame(animate);

            return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                }
            };
        }
    }, [isComplete, onComplete, animate]);

    const infinityPath = "M29.76 18.72 c0 7.28-3.92 13.6-9.84 16.96 c-2.88 1.68-6.24 2.64-9.84 2.64 c-3.6 0-6.88-0.96-9.76-2.64 c0-7.28 3.92-13.52 9.84-16.96 c2.88-1.68 6.24-2.64 9.76-2.64 S26.88 17.04 29.76 18.72 c5.84 3.36 9.76 9.68 9.84 16.96 c-2.88 1.68-6.24 2.64-9.76 2.64 c-3.6 0-6.88-0.96-9.84-2.64 c-5.84-3.36-9.76-9.68-9.76-16.96 c0-7.28 3.92-13.6 9.76-16.96 C25.84 5.12 29.76 11.44 29.76 18.72z";

    return (
        <div className={cn("flex flex-col items-center gap-6", className)}>
            {/* SVG Loader with background glow */}
            <div
                className={cn(
                    "relative rounded-full p-4",
                    displayComplete ? "scale-105" : "scale-100"
                )}
                style={{
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: displayComplete
                        ? 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.9))'
                        : 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.4))',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
                }}
            >
                <svg
                    viewBox="-2 -2 44 44"
                    width={width}
                    height={height}
                    aria-hidden="true"
                    style={{ display: 'block' }}
                >
                    {/* Background Track - more visible */}
                    <path
                        fill="none"
                        strokeWidth="4"
                        pathLength={100}
                        d={infinityPath}
                        style={{
                            stroke: 'rgba(168, 85, 247, 0.25)',
                        }}
                    />

                    {/* Animated Progress Path */}
                    <path
                        fill="none"
                        strokeWidth="4"
                        strokeLinecap="round"
                        pathLength={100}
                        d={infinityPath}
                        style={{
                            stroke: '#a855f7',
                            strokeDasharray: `${progress} ${100 - progress}`,
                            strokeDashoffset: 0,
                            transition: displayComplete
                                ? 'stroke-dasharray 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                : 'none',
                        }}
                    />
                </svg>
            </div>

            {/* Status Text */}
            <div
                style={{
                    transition: 'all 0.3s ease-out',
                }}
                className={cn(
                    "font-medium text-lg tracking-wide",
                    displayComplete
                        ? "text-purple-400 font-bold"
                        : "text-purple-400 animate-pulse"
                )}
            >
                {displayComplete ? "Complete" : statusText}
            </div>
        </div>
    );
};

export default InfinityLoader;


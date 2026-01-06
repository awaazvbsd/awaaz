import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { X, CheckCircle, ArrowRight } from 'lucide-react';
import { ModalProps } from '../types';

// --- INTERNAL COMPONENT: WATER ORB ---
// Moved inside CompletionModal to keep everything in one file as requested.

interface WaterOrbProps {
    percentage: number;
    size?: number;
}

const SPRING_COUNT = 100;
const SPRING_TENSION = 0.025;
const SPRING_DAMPING = 0.02;
const SPREAD = 0.25;

const WaterOrb: React.FC<WaterOrbProps> = ({ percentage, size = 200 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);

    // Physics State
    const currentFillRef = useRef(0);
    const springsRef = useRef<Array<{ p: number; v: number }>>([]);
    const prevPercentageRef = useRef(percentage);
    const tickRef = useRef(0); // Used for the continuous sine wave motion

    // Bubble particles
    const bubblesRef = useRef<Array<{ x: number, y: number, r: number, s: number, a: number }>>([]);

    // Initialize Springs
    useEffect(() => {
        if (springsRef.current.length === 0) {
            for (let i = 0; i < SPRING_COUNT; i++) {
                springsRef.current.push({ p: 0, v: 0 });
            }
        }
    }, []);

    // Trigger splash on change
    useEffect(() => {
        if (Math.abs(percentage - prevPercentageRef.current) > 5) {
            const center = Math.floor(SPRING_COUNT / 2);
            const spread = 12;
            for (let i = center - spread; i < center + spread; i++) {
                if (i >= 0 && i < SPRING_COUNT) {
                    springsRef.current[i].v += (Math.random() * 30 - 15);
                }
            }
        }
        prevPercentageRef.current = percentage;
    }, [percentage]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;

        const radius = size / 2;
        const centerX = size / 2;
        const centerY = size / 2;

        // Init bubbles if empty
        if (bubblesRef.current.length === 0) {
            for (let i = 0; i < 25; i++) {
                bubblesRef.current.push({
                    x: Math.random() * size,
                    y: size + Math.random() * 50,
                    r: Math.random() * 3 + 1,
                    s: Math.random() * 2 + 1,
                    a: Math.random()
                });
            }
        }

        const animate = () => {
            tickRef.current += 0.04; // Increment time for sine waves

            // 1. Smooth Fill Logic
            const targetFill = Math.min(Math.max(percentage, 0), 100);
            const diff = targetFill - currentFillRef.current;
            const step = Math.max(Math.abs(diff) * 0.05, 0.15);

            let isFilling = Math.abs(diff) > 0.5;

            if (isFilling) {
                if (currentFillRef.current < targetFill) {
                    currentFillRef.current += step;
                } else {
                    currentFillRef.current -= step;
                }
            } else {
                currentFillRef.current = targetFill;
            }

            const fillRatio = currentFillRef.current / 100;
            const targetHeight = size - (size * fillRatio);

            // Add random turbulence while filling
            if (isFilling) {
                for (let k = 0; k < 2; k++) {
                    const splashIndex = Math.floor(Math.random() * SPRING_COUNT);
                    springsRef.current[splashIndex].v += Math.random() * 10 - 5;
                }
            }

            // 2. Physics Calculation
            for (let i = 0; i < SPRING_COUNT; i++) {
                const spring = springsRef.current[i];
                const x = spring.p;
                const acceleration = -SPRING_TENSION * x - SPRING_DAMPING * spring.v;
                spring.v += acceleration;
                spring.p += spring.v;
            }

            // Wave Propagation
            const leftDeltas = new Array(SPRING_COUNT).fill(0);
            const rightDeltas = new Array(SPRING_COUNT).fill(0);

            for (let j = 0; j < 8; j++) {
                for (let i = 0; i < SPRING_COUNT; i++) {
                    if (i > 0) {
                        leftDeltas[i] = SPREAD * (springsRef.current[i].p - springsRef.current[i - 1].p);
                        springsRef.current[i - 1].v += leftDeltas[i];
                    }
                    if (i < SPRING_COUNT - 1) {
                        rightDeltas[i] = SPREAD * (springsRef.current[i].p - springsRef.current[i + 1].p);
                        springsRef.current[i + 1].v += rightDeltas[i];
                    }
                }
                for (let i = 0; i < SPRING_COUNT; i++) {
                    if (i > 0) springsRef.current[i - 1].p += leftDeltas[i];
                    if (i < SPRING_COUNT - 1) springsRef.current[i + 1].p += rightDeltas[i];
                }
            }

            // 3. Draw
            ctx.clearRect(0, 0, size, size);

            // Clip Circle
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
            ctx.clip();

            // Background (Light Purple Tint)
            const bgGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
            bgGradient.addColorStop(0, 'rgba(250, 245, 255, 0.2)');
            bgGradient.addColorStop(1, 'rgba(243, 232, 255, 0.3)');
            ctx.fillStyle = bgGradient;
            ctx.fill();

            // Helper to draw fluid layers
            const drawWave = (color: string, heightOffset: number, phaseScale: number, waveFrequency: number, waveSpeed: number) => {
                ctx.beginPath();
                ctx.moveTo(0, size);

                for (let i = 0; i < SPRING_COUNT; i++) {
                    const x = (i / (SPRING_COUNT - 1)) * size;

                    // Combine Spring Physics + Continuous Sine Wave for "Fluid" feel
                    const continuousWave = Math.sin(i * waveFrequency + tickRef.current * waveSpeed) * 4;

                    let y = targetHeight + (springsRef.current[i].p * phaseScale) + heightOffset + continuousWave;
                    ctx.lineTo(x, y);
                }

                ctx.lineTo(size, size);
                ctx.lineTo(0, size);
                ctx.fillStyle = color;
                ctx.fill();
            };

            // Layer 1: Back (Darkest Purple)
            drawWave('rgba(126, 34, 206, 0.4)', -6, -0.5, 0.04, 1.2);

            // Layer 2: Middle (Medium Purple)
            drawWave('rgba(168, 85, 247, 0.6)', -3, 0.8, 0.03, 1.5);

            // Layer 3: Front (Lightest/Brightest Purple)
            drawWave('rgba(192, 132, 252, 0.9)', 0, 1.0, 0.06, 1.0);

            // Surface Highlight Line
            ctx.beginPath();
            for (let i = 0; i < SPRING_COUNT; i++) {
                const x = (i / (SPRING_COUNT - 1)) * size;
                const continuousWave = Math.sin(i * 0.06 + tickRef.current * 1.0) * 4;
                let y = targetHeight + springsRef.current[i].p + continuousWave;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.stroke();

            // Bubbles
            bubblesRef.current.forEach(b => {
                b.y -= b.s;

                const bubbleSpringIndex = Math.floor((b.x / size) * (SPRING_COUNT - 1));
                const continuousWave = Math.sin(bubbleSpringIndex * 0.06 + tickRef.current * 1.0) * 4;
                const surfaceY = targetHeight + (springsRef.current[bubbleSpringIndex]?.p || 0) + continuousWave;

                if (b.y < surfaceY) {
                    b.y = size + Math.random() * 20;
                    b.x = Math.random() * size;
                }

                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${b.a * 0.5})`;
                ctx.fill();
            });

            ctx.restore(); // End Clip

            // Glassy Overlay (Reflection/Gloss)
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            const borderGrad = ctx.createLinearGradient(0, 0, size, size);
            borderGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
            borderGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
            borderGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
            ctx.strokeStyle = borderGrad;
            ctx.stroke();

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.4, radius * 0.2, -Math.PI / 4, 0, Math.PI * 2);
            const highlightGrad = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX, centerY);
            highlightGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
            highlightGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
            ctx.fillStyle = highlightGrad;
            ctx.fill();
            ctx.restore();

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [size, percentage]);

    return <canvas ref={canvasRef} className="block mx-auto" />;
};

// --- MAIN COMPONENT: COMPLETION MODAL ---

const CompletionModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
    const [showContent, setShowContent] = useState(false);
    const [fillLevel, setFillLevel] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Animation Sequence
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        let fillTimer: ReturnType<typeof setTimeout>;

        if (isOpen) {
            setShowContent(true);

            // Slight delay before filling water
            fillTimer = setTimeout(() => {
                setFillLevel(100);
            }, 300);

            // Trigger confetti when full
            timer = setTimeout(() => {
                fireConfetti();
            }, 1800);
        } else {
            setShowContent(false);
            setFillLevel(0);
        }

        return () => {
            clearTimeout(timer);
            clearTimeout(fillTimer);
        };
    }, [isOpen]);

    const fireConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        // Purple/Magenta Confetti Palette
        const colors = ['#9333ea', '#c084fc', '#e879f9', '#a855f7', '#7e22ce'];

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Dark Blurred Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal Card */}
            <div
                className={`
          relative w-full max-w-md p-8 
          bg-white dark:bg-slate-900 rounded-3xl shadow-2xl 
          transform transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)
          flex flex-col items-center text-center overflow-hidden
          ${showContent ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}
        `}
            >
                {/* Top Decoration Gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-50 to-transparent dark:from-purple-900/20 -z-10" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:text-slate-500 dark:hover:text-purple-400 dark:hover:bg-purple-900/30 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Animation Container */}
                <div className="mb-6 relative">
                    {/* Integrated Water Orb */}
                    <WaterOrb percentage={fillLevel} size={160} />

                    {/* Success Icon Overlay */}
                    <div
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 delay-1000 ${fillLevel === 100 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg">
                            <CheckCircle className="text-purple-600 dark:text-purple-400 w-10 h-10" strokeWidth={3} />
                        </div>
                    </div>
                </div>

                {/* Text */}
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
                    Fantastic Job!
                </h2>

                <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-lg">
                    You've completed all your tasks. That's another meaningful step toward better <span className="text-purple-600 dark:text-purple-400 font-semibold">mental wellbeing</span>.
                </p>

                {/* Primary Action Button */}
                <button
                    onClick={onClose}
                    className="
            group relative inline-flex items-center justify-center px-8 py-3 
            font-semibold text-white transition-all duration-200 
            bg-purple-600 rounded-full hover:bg-purple-700 
            hover:shadow-lg hover:shadow-purple-500/30 active:scale-95
          "
                >
                    <span>Continue Dashboard</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </button>

            </div>
        </div>,
        document.body
    );
};

export default CompletionModal;

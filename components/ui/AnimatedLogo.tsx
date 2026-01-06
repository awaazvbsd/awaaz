'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

interface AnimatedLogoProps {
    size?: number;
    className?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
    size = 300,
    className = ''
}) => {
    const centerSize = size * 0.45;

    // "Harmonic Resonance" Layers - THICKER & WARBLED
    const harmonics = React.useMemo(() => {
        return [
            // Outer Heavy Waves
            { id: 0, r: 90, freq: 3, amp: 10, speed: 25, color: '#A78BFA', opacity: 0.6, width: 2.5 },
            { id: 1, r: 88, freq: 3, amp: 10, speed: -25, color: '#22D3D1', opacity: 0.6, width: 2.5 },

            // Middle Kinetic Waves ("Flower" pattern)
            { id: 2, r: 82, freq: 5, amp: 14, speed: 18, color: '#C084FC', opacity: 0.8, width: 3 },
            { id: 3, r: 80, freq: 5, amp: 14, speed: -18, color: '#60A5FA', opacity: 0.8, width: 3 },

            // Inner Detail Waves
            { id: 4, r: 75, freq: 7, amp: 8, speed: 12, color: '#F472B6', opacity: 0.5, width: 2 },
        ];
    }, []);

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            style={{
                width: size,
                height: size,
                perspective: '1000px',
            }}
        >
            {/* Ambient Background Glow */}
            <div
                className="absolute inset-0 rounded-full blur-[60px] opacity-30 bg-gradient-to-tr from-violet-600 to-cyan-400"
                style={{ transform: 'scale(0.7)' }}
            />

            {/* Harmonic Wave Container */}
            <div className="absolute inset-0 flex items-center justify-center">
                {harmonics.map((layer) => (
                    <motion.svg
                        key={layer.id}
                        viewBox="0 0 200 200"
                        className="absolute w-full h-full overflow-visible"
                        style={{
                            mixBlendMode: 'screen',
                            filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.2))'
                        }}
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: Math.abs(layer.speed),
                            repeat: Infinity,
                            ease: "linear",
                            repeatType: "loop",
                            from: 0,
                            to: layer.speed > 0 ? 360 : -360
                        }}
                    >
                        <motion.path
                            d={generateHarmonicPath(100, 100, layer.r, layer.freq, layer.amp, 0, 0)}
                            fill="none"
                            stroke={layer.color}
                            strokeWidth={layer.width}
                            strokeLinecap="round"
                            opacity={layer.opacity}
                            animate={{
                                d: [
                                    generateHarmonicPath(100, 100, layer.r, layer.freq, layer.amp, 0, 0),
                                    generateHarmonicPath(100, 100, layer.r, layer.freq, layer.amp * 1.1, 1, 15), // Warble phase shift
                                    generateHarmonicPath(100, 100, layer.r, layer.freq, layer.amp, 2, 30),
                                    generateHarmonicPath(100, 100, layer.r, layer.freq, layer.amp * 0.9, 3, 45),
                                    generateHarmonicPath(100, 100, layer.r, layer.freq, layer.amp, 0, 60)
                                ]
                            }}
                            transition={{
                                duration: 4 + Math.random() * 2, // Faster, organic warble
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </motion.svg>
                ))}
            </div>

            {/* Text Container - Stable & Clear */}
            <div
                className="relative z-20 flex items-center justify-center"
                style={{ width: centerSize, height: centerSize }}
            >
                <svg
                    viewBox="0 0 160 40"
                    className="w-[90%] h-auto"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="textGradientPro" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#C084FC" />
                            <stop offset="50%" stopColor="#818CF8" />
                            <stop offset="100%" stopColor="#22D3D1" />
                        </linearGradient>
                        <filter id="glowPro">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <text
                        x="80"
                        y="28"
                        textAnchor="middle"
                        fontFamily="'Playfair Display', serif"
                        fontWeight="800"
                        fontSize="38"
                        letterSpacing="3"
                        fill="url(#textGradientPro)"
                        filter="url(#glowPro)"
                        style={{ textShadow: '0 2px 15px rgba(139, 92, 246, 0.4)' }}
                    >
                        AWAAZ
                    </text>
                </svg>
            </div>
        </div>
    );
};

// Generates a structured "Harmonic" path with optional WARBLE
function generateHarmonicPath(
    cx: number,
    cy: number,
    radius: number,
    lobes: number,
    amp: number,
    phase: number,
    warblePhase: number
): string {
    const points: string[] = [];
    const steps = 200; // More steps for smooth warble

    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;

        // Primary Structure
        let offset = Math.sin(theta * lobes + phase) * amp;

        // Secondary "Warble" Interference
        // Adds a higher frequency ripple that moves
        offset += Math.sin(theta * (lobes * 3) + warblePhase) * (amp * 0.15);

        const r = radius + offset;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;

        const cmd = i === 0 ? 'M' : 'L';
        points.push(`${cmd} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    points.push('Z');
    return points.join(' ');
}

export default AnimatedLogo;

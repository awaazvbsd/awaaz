import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisData, Biomarker } from '../types';
import GlassCard from './GlassCard';
import { BeamsBackground } from './ui/beams-background';
import { ChevronLeft, Info, Play, Pause, Bookmark, Microphone, MessageCircle, FileText, getBiomarkerIcon } from './Icons';
import { motion, animate, AnimatePresence, type Variants } from 'framer-motion';
import { Gauge } from './ui/gauge-1';
import SelfReportSlider from './SelfReportSlider';

interface AnalysisResultsScreenProps {
  analysisData: AnalysisData;
  onNewRecording: () => void;
  onClose: () => void;
  onNext?: () => void;
  isTeacherView?: boolean;
  onChatClick?: () => void;
  studentHistory?: AnalysisData[]; // For teacher view trends chart
  onReportClick?: () => void; // Callback for report icon click (will pass selected analysis)
  onDateClick?: (analysis: AnalysisData) => void; // Callback when clicking a date on the chart
  onSelfReportSubmit?: (score: number) => void;
}

const StressIndicator: React.FC<{ stressLevel: number }> = ({ stressLevel }) => {
  // Determine color based on stress level thresholds
  const getPrimaryColor = (): "danger" | "warning" | "success" => {
    if (stressLevel < 34) return "success";
    if (stressLevel < 67) return "warning";
    return "danger";
  };

  const getBadge = () => {
    if (stressLevel < 34) return { text: 'Low Stress', bg: 'bg-success-green/20', text_color: 'text-success-green' };
    if (stressLevel < 67) return { text: 'Moderate Stress', bg: 'bg-orange-warning/20', text_color: 'text-orange-warning' };
    return { text: 'High Stress', bg: 'bg-error-red/20', text_color: 'text-error-red' };
  };
  const badge = getBadge();

  return (
    <motion.div 
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="text-white [&_text]:fill-white">
        <Gauge
          value={stressLevel}
          size={240}
          strokeWidth={8}
          gradient={true}
          primary={getPrimaryColor()}
          showValue={true}
          showPercentage={true}
          unit="%"
          label="Stress Level"
          tickMarks={true}
          glowEffect={true}
          transition={{ length: 1200, delay: 200 }}
          className={{
            svgClassName: "text-white",
            textClassName: "fill-white",
            labelClassName: "fill-text-muted"
          }}
        />
      </div>
      <motion.div 
        className={`mt-4 px-5 py-2 rounded-full backdrop-blur-sm ${badge.bg}`}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
      >
        <p className={`font-medium ${badge.text_color}`}>{badge.text}</p>
      </motion.div>
    </motion.div>
  );
};


const SpectrogramCard: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!audioUrl || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        let audioContext: AudioContext;
        let source: AudioBufferSourceNode;
        let animationFrameId: number;

        const generateSpectrogram = async () => {
            try {
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.5;

                source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(analyser);

                const frequencyData = new Uint8Array(analyser.frequencyBinCount);
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);

                const maxFreq = 8000;
                const sampleRate = audioBuffer.sampleRate;
                const binsToShow = Math.floor((maxFreq / (sampleRate / 2)) * analyser.frequencyBinCount);

                const getColor = (value: number) => {
                    const percent = value / 255;
                    let r, g, b;
                    if (percent < 0.25) { const factor = percent / 0.25; r = 0; g = 0; b = 100 * factor; } 
                    else if (percent < 0.5) { const factor = (percent - 0.25) / 0.25; r = 255 * factor; g = 0; b = 100 - (100 * factor); } 
                    else if (percent < 0.75) { const factor = (percent - 0.5) / 0.25; r = 255; g = 255 * factor; b = 0; } 
                    else { const factor = (percent - 0.75) / 0.25; r = 255; g = 255; b = 255 * factor; }
                    return `rgb(${r},${g},${b})`;
                };
                
                source.start();
                const startTime = audioContext.currentTime;
                let lastX = -1;

                function draw() {
                    animationFrameId = requestAnimationFrame(draw);
                    const elapsedTime = audioContext.currentTime - startTime;
                    if (elapsedTime >= audioBuffer.duration) {
                        cancelAnimationFrame(animationFrameId); return;
                    }
                    const currentX = Math.floor((elapsedTime / audioBuffer.duration) * canvasWidth);
                    if (currentX > lastX) {
                        analyser.getByteFrequencyData(frequencyData);
                        const sliceWidth = currentX - lastX;
                        for (let i = 0; i < binsToShow; i++) {
                            const y = canvasHeight - (i / binsToShow) * canvasHeight;
                            const barHeight = canvasHeight / binsToShow;
                            ctx.fillStyle = getColor(frequencyData[i]);
                            ctx.fillRect(lastX, y - barHeight, sliceWidth, barHeight);
                        }
                        lastX = currentX;
                    }
                }
                draw();
            } catch (error) { console.error("Error generating spectrogram:", error); }
        };

        generateSpectrogram();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (source) source.disconnect();
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
        };
    }, [audioUrl]);


    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) { audioRef.current.pause(); } 
        else { audioRef.current.currentTime = 0; setProgress(0); audioRef.current.play(); }
        setIsPlaying(!isPlaying);
      }
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleTimeUpdate = () => { if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100); };
        const handleLoadedMetadata = () => { setDuration(audio.duration); };
        const handleEnded = () => { setIsPlaying(false); setProgress(0); };
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    return (
        <GlassCard className="p-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">Voice Spectrogram</h2>
                <Info className="w-5 h-5 text-purple-primary" />
            </div>
            <div className="relative">
                <canvas ref={canvasRef} width="400" height="200" className="w-full h-auto rounded-lg bg-black"></canvas>
            </div>
            <div className="flex items-center gap-4 mt-2">
                <audio ref={audioRef} src={audioUrl}></audio>
                <button onClick={togglePlay} className="glass-base w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center hover:bg-purple-primary/20">
                    {isPlaying ? <Pause className="w-5 h-5 text-white"/> : <Play className="w-5 h-5 text-white"/>}
                </button>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-dark to-purple-light" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs text-text-muted">{duration.toFixed(1)}s</span>
            </div>
        </GlassCard>
    );
};


const AISummaryCard: React.FC<{ summary: string }> = ({ summary }) => (
    <GlassCard className="p-5" variant="purple">
        <h3 className="text-lg font-bold text-white mb-2">AI Generated Summary</h3>
        <p className="text-sm text-text-secondary">{summary}</p>
    </GlassCard>
);

// --- Trends Chart Component ---
const TrendsChart: React.FC<{ history: AnalysisData[]; onDateClick?: (analysis: AnalysisData) => void; currentDate?: string }> = ({ history, onDateClick, currentDate }) => {
    const chartId = React.useMemo(() => `chart-${Math.random().toString(36).substr(2, 9)}`, []);

    if (history.length < 2) {
        return (
            <GlassCard className="p-5">
                <h3 className="text-lg font-bold text-white mb-4">Stress Trends</h3>
                <div className="flex items-center justify-center h-48 text-text-muted">
                    <p className="text-sm">Not enough data to display trends. Need at least 2 analyses.</p>
                </div>
            </GlassCard>
        );
    }

    const chartWidth = 400;
    const chartHeight = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    // Sort by date (oldest first)
    const sortedHistory = [...history].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const stressLevels = sortedHistory.map(a => a.stressLevel);
    const dates = sortedHistory.map(a => {
        const date = new Date(a.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const minStress = Math.max(0, Math.min(...stressLevels) - 5); // Add some padding
    const maxStress = Math.min(100, Math.max(...stressLevels) + 5); // Add some padding
    const stressRange = maxStress - minStress || 1; // Avoid division by zero

    // Calculate points for the line
    const points = stressLevels.map((stress, index) => {
        const x = padding.left + (index / (stressLevels.length - 1)) * graphWidth;
        const y = padding.top + graphHeight - ((stress - minStress) / stressRange) * graphHeight;
        return { x, y, stress, date: dates[index] };
    });

    // Create area path for gradient fill
    const areaPath = points.reduce((path, point, index) => {
        if (index === 0) {
            return `M ${point.x} ${padding.top + graphHeight} L ${point.x} ${point.y}`;
        }
        return `${path} L ${point.x} ${point.y}`;
    }, '') + ` L ${points[points.length - 1].x} ${padding.top + graphHeight} Z`;

    // Create line path
    const linePath = points.map((point, index) => 
        index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(' ');

    // Determine color based on latest stress level
    const latestStress = stressLevels[stressLevels.length - 1];
    const getLineColor = () => {
        if (latestStress < 34) return "#22C55E"; // green
        if (latestStress < 67) return "#F59E0B"; // orange
        return "#EF4444"; // red
    };

    const lineColor = getLineColor();

    return (
        <GlassCard className="p-5">
            <h3 className="text-lg font-bold text-white mb-4">Stress Trends</h3>
            <style>{`
                .chart-point {
                    transition: all 0.2s ease;
                }
                .chart-point:hover {
                    filter: drop-shadow(0 0 8px currentColor);
                }
            `}</style>
            <div className="relative">
                <svg 
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                    className="w-full h-auto"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <linearGradient id={`trends-gradient-${chartId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid lines - show 4-5 evenly spaced lines */}
                    {(() => {
                        const gridLines = [];
                        const numLines = 5;
                        for (let i = 0; i <= numLines; i++) {
                            const value = minStress + (maxStress - minStress) * (i / numLines);
                            const y = padding.top + graphHeight - ((value - minStress) / stressRange) * graphHeight;
                            if (y >= padding.top && y <= padding.top + graphHeight) {
                                gridLines.push({ value, y });
                            }
                        }
                        return gridLines.map(({ value, y }) => (
                            <g key={value}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={padding.left + graphWidth}
                                    y2={y}
                                    stroke="rgba(255, 255, 255, 0.1)"
                                    strokeWidth="1"
                                />
                                <text
                                    x={padding.left - 10}
                                    y={y + 4}
                                    fill="#9CA3AF"
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {Math.round(value)}%
                                </text>
                            </g>
                        ));
                    })()}

                    {/* Area fill */}
                    <path
                        d={areaPath}
                        fill={`url(#trends-gradient-${chartId})`}
                    />

                    {/* Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {points.map((point, index) => {
                        const analysis = sortedHistory[index];
                        const isCurrentDate = currentDate && analysis.date === currentDate;
                        const isClickable = onDateClick !== undefined;
                        
                        return (
                            <g key={index} style={{ cursor: isClickable ? 'pointer' : 'default' }}>
                                {/* Pulsing halo for current date */}
                                {isCurrentDate && (
                                    <>
                                        <motion.circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="14"
                                            fill="none"
                                            stroke={lineColor}
                                            strokeWidth="2"
                                            animate={{ 
                                                opacity: [0.3, 0.6, 0.3],
                                                scale: [0.95, 1.05, 0.95]
                                            }}
                                            transition={{ 
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: 'easeInOut'
                                            }}
                                        />
                                        <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="10"
                                            fill={lineColor}
                                            opacity="0.2"
                                        />
                                    </>
                                )}
                                
                                {/* Invisible larger clickable area */}
                                {isClickable && (
                                    <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r="12"
                                        fill="transparent"
                                        onClick={() => onDateClick(analysis)}
                                    />
                                )}
                                
                                {/* Main data point */}
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={isCurrentDate ? "6" : "5"}
                                    fill={isCurrentDate ? lineColor : "#ffffff"}
                                    stroke={lineColor}
                                    strokeWidth={isCurrentDate ? "2" : "2.5"}
                                    onClick={() => isClickable && onDateClick(analysis)}
                                    className={isClickable ? "chart-point" : ""}
                                    style={{ color: lineColor }}
                                >
                                    {isClickable && !isCurrentDate && (
                                        <>
                                            <animate
                                                attributeName="r"
                                                values="5;7;5"
                                                dur="0.3s"
                                                begin="mouseover"
                                                fill="freeze"
                                            />
                                            <animate
                                                attributeName="fill"
                                                values={`#ffffff;${lineColor};#ffffff`}
                                                dur="0.3s"
                                                begin="mouseover"
                                                fill="freeze"
                                            />
                                            <animate
                                                attributeName="r"
                                                values="5"
                                                dur="0.2s"
                                                begin="mouseout"
                                                fill="freeze"
                                            />
                                            <animate
                                                attributeName="fill"
                                                values="#ffffff"
                                                dur="0.2s"
                                                begin="mouseout"
                                                fill="freeze"
                                            />
                                        </>
                                    )}
                                </circle>
                                
                                {/* Tooltip */}
                                <title>{`${point.date}: ${point.stress.toFixed(1)}%${isClickable ? ' (Click to view)' : ''}`}</title>
                            </g>
                        );
                    })}

                    {/* X-axis labels */}
                    {points.map((point, index) => {
                        // Show first, last, and middle labels
                        const shouldShow = index === 0 || index === points.length - 1 || 
                                          (points.length > 2 && index === Math.floor(points.length / 2));
                        if (!shouldShow) return null;
                        return (
                            <text
                                key={index}
                                x={point.x}
                                y={chartHeight - padding.bottom + 20}
                                fill="#9CA3AF"
                                fontSize="10"
                                textAnchor="middle"
                            >
                                {point.date}
                            </text>
                        );
                    })}
                </svg>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                <span>First Analysis</span>
                <span>Latest Analysis</span>
            </div>
        </GlassCard>
    );
};

const ProgressArc: React.FC<{ progress: number, status: 'green' | 'orange' | 'red' }> = ({ progress, status }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const statusColors = {
    green: '#22C55E',
    orange: '#FF8E53',
    red: '#EF4444'
  };

  useEffect(() => {
    const controls = animate(0, progress, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (value) => setAnimatedProgress(value),
    });
    return () => controls.stop();
  }, [progress]);

  return (
    <svg className="absolute top-4 right-4 w-10 h-10" viewBox="0 0 36 36">
      <path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.1"
        strokeWidth="3"
      />
      <motion.path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke={statusColors[status]}
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ strokeDasharray: '0, 100' }}
        animate={{ strokeDasharray: `${animatedProgress * 100}, 100` }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
    </svg>
  );
};


const BiomarkerWidget: React.FC<{ biomarker: Biomarker, isExpanded?: boolean, onClick?: () => void }> = ({ biomarker, isExpanded = false, onClick }) => {
    const Icon = getBiomarkerIcon(biomarker.icon);
    const statusClasses = {
        red: 'border-error-red/30 shadow-error-red/20',
        orange: 'border-orange-primary/30 shadow-orange-primary/20',
        green: 'border-white/10'
    };
    
    const explanationVariants = {
        hidden: { opacity: 0, height: 0, marginTop: 0 },
        visible: { 
            opacity: 1, 
            height: 'auto', 
            marginTop: '1rem',
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const, delay: 0.25 }
        }
    };

    return (
        <motion.div
            layoutId={biomarker.name}
            onClick={onClick}
            className={`relative flex flex-col bg-surface/60 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl shadow-black/30 border ${statusClasses[biomarker.status]} ${!isExpanded ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-purple-primary/30 cursor-pointer' : ''} ${isExpanded ? 'w-[90vw] max-w-md mx-auto' : 'w-full'}`}
        >
            <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-start">
                    <Icon className="w-8 h-8" />
                    {!isExpanded && <ProgressArc progress={biomarker.normalizedValue} status={biomarker.status} />}
                </div>
                
                <div className="flex-grow" />

                <div>
                    <p className="text-sm font-medium text-white/90 uppercase tracking-widest">{biomarker.name}</p>
                    <div className="flex items-baseline mt-1">
                        <p className="text-4xl font-light text-white tracking-[-1px]">{biomarker.value.split(' ')[0]}</p>
                        <p className="text-lg font-light text-text-muted ml-1">{biomarker.value.split(' ')[1] || '%'}</p>
                    </div>
                </div>
            </div>

            <motion.div
                className="overflow-hidden"
                variants={explanationVariants}
                animate={isExpanded ? 'visible' : 'hidden'}
                initial={false}
            >
                <div className="my-4 border-t border-white/10"></div>
                <h3 className="text-base font-bold text-purple-light uppercase tracking-wider">What this means</h3>
                <p className="text-sm text-text-secondary mt-2">{biomarker.explanation}</p>
            </motion.div>
        </motion.div>
    );
};


const AnalysisResultsScreen: React.FC<AnalysisResultsScreenProps> = ({ analysisData, onNewRecording, onClose, onNext, isTeacherView = false, onChatClick, studentHistory, onReportClick, onDateClick, onSelfReportSubmit }) => {
  const [selectedBiomarker, setSelectedBiomarker] = useState<Biomarker | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.05,
        duration: 0.3
      } 
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 200,
        damping: 20,
        duration: 0.4
      } 
    }
  };

  // Filter out Speech Rate biomarker (handled separately in the UI)
  const filteredBiomarkers = analysisData.biomarkers.filter(
    bm => bm.name !== 'Speech Rate'
  );
  
  // Split biomarkers: Acoustic measures are first 4 (F0 Mean, F0 Range, Jitter, Shimmer)
  // Articulation measures are the rest (F1, F2)
  const acousticBiomarkers = filteredBiomarkers.slice(0, 4);
  const articulationBiomarkers = filteredBiomarkers.slice(4);

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 max-w-2xl mx-auto">
        <button onClick={onClose} className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
            <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        {!isTeacherView && <h1 className="text-lg font-medium text-white">Analysis Results</h1>}
        {isTeacherView && (
            <div className="text-center">
                <h1 className="text-lg font-medium text-white">Analysis Results</h1>
            </div>
        )}
        <div className="flex gap-2">
            {isTeacherView && onReportClick && (
                <button
                    onClick={onReportClick}
                    className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
                    title="View Student Report"
                    style={{ pointerEvents: 'auto', zIndex: 30 }}
                >
                    <FileText className="w-5 h-5 text-white" />
                </button>
            )}
            {isTeacherView && onChatClick && (
                <button
                    onClick={onChatClick}
                    className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
                    title="Chat with Student"
                    style={{ pointerEvents: 'auto', zIndex: 30 }}
                >
                    <MessageCircle className="w-5 h-5 text-white" />
                </button>
            )}
        </div>
    </header>
  );

  return (
    <div className="min-h-screen w-full bg-background-primary relative overflow-hidden">
        {/* Beams Background */}
        <BeamsBackground intensity="medium" />
        
        <div className="relative z-10 p-4 pt-[80px] pb-10 max-w-2xl mx-auto">
            <Header />
        <motion.div
          key={analysisData.date}
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
            <motion.div variants={itemVariants}>
              <StressIndicator stressLevel={analysisData.stressLevel} />
            </motion.div>

            {isTeacherView && studentHistory && studentHistory.length > 1 && (
              <motion.div variants={itemVariants}>
                <div className="text-center mb-4">
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-purple-300 font-medium">
                      {new Date(analysisData.date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-2">Click on chart points to view different dates</p>
                </div>
              </motion.div>
            )}

            {isTeacherView && studentHistory && (
              <motion.div variants={itemVariants}>
                <TrendsChart 
                  history={studentHistory} 
                  onDateClick={onDateClick}
                  currentDate={analysisData.date}
                />
              </motion.div>
            )}

            {!isTeacherView && (
              <motion.div variants={itemVariants}>
                <SpectrogramCard audioUrl={analysisData.audioUrl} />
              </motion.div>
            )}
            
            <motion.div variants={itemVariants}>
              <AISummaryCard summary={analysisData.aiSummary} />
            </motion.div>

            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-bold text-white mb-4">Acoustic Measures</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {acousticBiomarkers.map(bm => (
                        <BiomarkerWidget key={bm.name} biomarker={bm} onClick={() => setSelectedBiomarker(bm)} />
                    ))}
                </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-bold text-white mb-4">Articulation Measures</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {articulationBiomarkers.map(bm => (
                         <BiomarkerWidget key={bm.name} biomarker={bm} onClick={() => setSelectedBiomarker(bm)} />
                    ))}
                </div>
            </motion.div>
            
            {!isTeacherView && (
              <motion.div variants={itemVariants}>
                <SelfReportSlider
                  initialScore={analysisData.selfReportScore}
                  onSubmit={onSelfReportSubmit}
                />
              </motion.div>
            )}

            {!isTeacherView && (
                <motion.div className="space-y-4 pt-4" variants={itemVariants}>
                     <button className="w-full h-14 rounded-2xl flex items-center justify-center font-bold text-white bg-gradient-to-r from-purple-dark to-purple-primary shadow-lg shadow-purple-dark/30 hover:scale-[1.02] transition-transform">
                        <Bookmark className="w-5 h-5 mr-2"/> Save to History
                    </button>
                     {onNext && (
                       <button onClick={onNext} className="w-full h-14 rounded-2xl flex items-center justify-center font-medium text-white glass-base border-purple-primary border hover:bg-purple-primary/20 transition-colors">
                          Next: Get Suggestions
                       </button>
                     )}
                     <button onClick={onNewRecording} className="w-full h-14 rounded-2xl flex items-center justify-center font-medium text-white glass-base border-purple-primary border hover:bg-purple-primary/20 transition-colors">
                        <Microphone className="w-5 h-5 mr-2 text-purple-primary"/> Record Another Sample
                    </button>
                </motion.div>
            )}
        </motion.div>
        
        <AnimatePresence>
          {selectedBiomarker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              onClick={() => setSelectedBiomarker(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div onClick={(e) => e.stopPropagation()}>
                <BiomarkerWidget biomarker={selectedBiomarker} isExpanded={true} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
    </div>
  );
};

export default AnalysisResultsScreen;








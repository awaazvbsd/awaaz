import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MeasureValues } from '../utils/stressAnalysis';
import { webmBlobToWavMono16k } from '../utils/audio';
import { extractFeaturesWithPraat, type PraatFeatures } from '../services/praat';
import { BACKEND_URL } from '../config';
import { useGeminiLive } from '../hooks/useGeminiLive';
import type { AnalysisData, RecordingState, RawBiomarkerData, SessionData, PreAnalysisSession, CounselorReport, LiveSessionQuestion } from '../types';
import { formatBiomarkers, repeatStatements } from '../constants';
import { applyAdaptiveAdjustment, computeAdaptiveDeltas } from '../utils/adaptiveStress';
import { getCurrentSensitivityMultiplier, updateSensitivityFromSession } from '../utils/sensitivityAdaptation';
import GlassCard from './GlassCard';
import { ChevronLeft, QuestionMarkCircle, Microphone, MicrophoneWithWaves, MicrophoneFilled, X } from './Icons';
import { MicOff, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoicePoweredOrb } from './ui/voice-powered-orb';
import { speakText, stopSpeech, isSpeaking } from '../services/textToSpeech';
import SmartOptions from './SmartOptions';
import { generateCounselorReport, formatReportForDisplay } from '../services/reportService';
import { saveSessionData, getStudentHistory, getCurrentStudentId, generateId } from '../services/personalizationService';
import { getAffirmationsForSession } from '../services/affirmationService';
import { getSessionPlan } from '../services/planningService';
import type { SessionPlan } from '../types';

interface RecordingScreenProps {
  onAnalysisComplete: (data: AnalysisData) => void;
  baselineData: string | null;
  audioBlob?: Blob | null;
  onClose?: () => void;
  preAnalysisSession?: PreAnalysisSession; // Pre-analysis session data for personalization
}

const clampScore = (value: number) => Math.min(100, Math.max(0, value));
const blendGeminiScore = (baseScore: number, suggested?: number) => {
  if (typeof suggested !== 'number' || Number.isNaN(suggested)) {
    return clampScore(baseScore);
  }
  const boundedSuggestion = Math.min(baseScore + 10, Math.max(baseScore - 10, suggested));
  return clampScore(baseScore * 0.7 + clampScore(boundedSuggestion) * 0.3);
};

const MIN_WAV_BYTES = 12000;
const MIN_RMS = 0.0008;

const ensureRecordingQuality = (features: PraatFeatures, wavSize: number) => {
  const rms = typeof features.rms === 'number' ? features.rms : 0;
  if (rms < MIN_RMS) {
    throw new Error('We detected very low volume. Please record again closer to the microphone in a quieter room.');
  }
  if (wavSize < MIN_WAV_BYTES) {
    throw new Error('Recording too short. Please speak naturally for at least 5 seconds before stopping.');
  }
};

const RecordingScreen: React.FC<RecordingScreenProps> = ({
  onAnalysisComplete,
  baselineData,
  audioBlob,
  onClose,
  preAnalysisSession
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Mode toggle state ('ai' | 'repeat')
  const [mode, setMode] = useState<'ai' | 'repeat'>('ai');

  // Multi-clip recording state
  const [audioClips, setAudioClips] = useState<Blob[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Repeat mode state
  const [currentStatementIndex, setCurrentStatementIndex] = useState(0);
  const [isPlayingStatement, setIsPlayingStatement] = useState(false);

  // Retrieve active session plan (if any)
  const [activeSessionPlan, setActiveSessionPlan] = useState<SessionPlan | null>(null);

  useEffect(() => {
    const loadPlan = () => {
      const studentId = getCurrentStudentId();
      const plan = getSessionPlan(studentId);
      setActiveSessionPlan(plan);
    };

    loadPlan();

    const handleStorageUpdate = (e: CustomEvent<{ key: string, data: any }>) => {
      if (e.detail.key === 'awaaz_session_plans') {
        console.log('[RecordingScreen] Received session plan update, refreshing active plan...');
        loadPlan();
      }
    };

    window.addEventListener('storage_key_updated', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage_key_updated', handleStorageUpdate as EventListener);
  }, []);

  // Gemini Live integration - only active in 'ai' mode
  const shouldUseGemini = mode === 'ai';
  const [isMicMuted, setIsMicMuted] = useState(true); // Push-to-talk: muted by default
  const { isConnected: geminiConnected, transcript: geminiTranscript, error: geminiError, isMuted: geminiMuted, disconnect: disconnectGemini, lastAgentResponse, sendText, liveSessionQA, clearLiveSessionQA } = useGeminiLive(shouldUseGemini ? stream : null, isMicMuted, activeSessionPlan);

  const [smartOptions, setSmartOptions] = useState<string[]>([]);
  const lastVoiceActivityTimeRef = useRef<number>(Date.now());
  const optionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Affirmations for repeat mode (fallback to static list)
  const [sessionAffirmations, setSessionAffirmations] = useState<string[]>(repeatStatements);

  // Fetch personalized affirmations if available
  useEffect(() => {
    const fetchAffirmations = async () => {
      // Only fetch if we haven't already and we have pre-analysis data
      if (preAnalysisSession && sessionAffirmations === repeatStatements) {
        console.log('[RecordingScreen] Fetching personalized affirmations...');
        const { affirmations, isPersonalized } = await getAffirmationsForSession(preAnalysisSession);
        if (isPersonalized && affirmations.length > 0) {
          console.log('[RecordingScreen] Using personalized affirmations');
          setSessionAffirmations(affirmations);
          // Reset index to 0 to ensure valid start
          setCurrentStatementIndex(0);
        }
      }
    };
    fetchAffirmations();
  }, [preAnalysisSession]);

  const [hasConversationStarted, setHasConversationStarted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStateRef = useRef<RecordingState>(recordingState);
  const allClipsRef = useRef<Blob[]>([]); // Keep ref to always have latest clips
  const MotionDiv = motion.div as any;
  const MotionButton = motion.button as any;
  const MotionCanvas = motion.canvas as any;
  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);


  const getMicrophonePermission = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // Match VoiceCalibrationScreen behavior
        }
      });
      setStream(mediaStream);
      streamRef.current = mediaStream;
      setPermissionError(null);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionError("Microphone access denied. Please enable it in your browser settings.");
        } else {
          setPermissionError("Could not access microphone. Please check your device.");
        }
      }
    }
  }, []);

  useEffect(() => {
    getMicrophonePermission();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current as any);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopSpeech(); // Clean up TTS on unmount
    };
  }, [getMicrophonePermission]);



  // Clean up TTS and disconnect Gemini when switching modes
  useEffect(() => {
    if (mode === 'ai') {
      stopSpeech();
      setIsPlayingStatement(false);
    } else {
      disconnectGemini();
    }
  }, [mode, disconnectGemini]);

  // Play current statement when in repeat mode and session is active
  const playCurrentStatement = useCallback(async () => {
    if (mode !== 'repeat' || isPlayingStatement || isSpeaking()) return;

    // Stop any ongoing speech first
    stopSpeech();

    const statement = sessionAffirmations[currentStatementIndex];
    if (!statement) return;

    setIsPlayingStatement(true);
    try {
      await speakText(statement, { rate: 0.9, pitch: 1.0, volume: 1.0 });
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlayingStatement(false);
    }
  }, [mode, currentStatementIndex, isPlayingStatement, sessionAffirmations]);

  // Auto-play first statement only when session starts
  const sessionStartedRef = useRef(false);
  useEffect(() => {
    if (mode === 'repeat' && isSessionActive && !sessionStartedRef.current && currentStatementIndex === 0) {
      sessionStartedRef.current = true;
      const timer = setTimeout(() => {
        if (!isPlayingStatement && !isSpeaking() && recordingState === 'IDLE') {
          playCurrentStatement();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!isSessionActive) {
      sessionStartedRef.current = false;
    }
  }, [mode, isSessionActive, currentStatementIndex, isPlayingStatement, recordingState, playCurrentStatement]);

  // Track previous recording state to detect when recording stops
  const prevRecordingStateRef = useRef<RecordingState>(recordingState);

  const statementTimerRef = useRef<{ advance: ReturnType<typeof setTimeout> | null; play: ReturnType<typeof setTimeout> | null }>({ advance: null, play: null });

  // Move to next statement and auto-play after user finishes recording (with delay)
  useEffect(() => {
    // Only advance statement when recording transitions from RECORDING to IDLE
    const justFinishedRecording = prevRecordingStateRef.current === 'RECORDING' && recordingState === 'IDLE';

    if (mode === 'repeat' && justFinishedRecording && isSessionActive && audioClips.length > 0) {
      // Stop any current speech first
      stopSpeech();
      setIsPlayingStatement(false);

      // Clear any existing timers
      if (statementTimerRef.current.advance) clearTimeout(statementTimerRef.current.advance);
      if (statementTimerRef.current.play) clearTimeout(statementTimerRef.current.play);

      // Advance to next statement after a delay (gives user time to prepare)
      statementTimerRef.current.advance = setTimeout(() => {
        const nextIndex = (currentStatementIndex + 1) % repeatStatements.length;
        setCurrentStatementIndex(nextIndex);

        // Auto-play the next statement after another delay (gives user time to get ready)
        statementTimerRef.current.play = setTimeout(() => {
          // Check state again to ensure we're still in the right mode and state
          if (recordingState === 'IDLE' && !isPlayingStatement && !isSpeaking() && mode === 'repeat') {
            const statement = repeatStatements[nextIndex];
            if (statement) {
              setIsPlayingStatement(true);
              speakText(statement, { rate: 0.9, pitch: 1.0, volume: 1.0 })
                .then(() => setIsPlayingStatement(false))
                .catch(() => setIsPlayingStatement(false));
            }
          }
          statementTimerRef.current.play = null;
        }, 2000); // 2 second delay before playing next statement (3 seconds total from recording end)

        statementTimerRef.current.advance = null;
      }, 1000); // 1 second delay before advancing

      // Update previous state
      prevRecordingStateRef.current = recordingState;

      return () => {
        if (statementTimerRef.current.advance) {
          clearTimeout(statementTimerRef.current.advance);
          statementTimerRef.current.advance = null;
        }
        if (statementTimerRef.current.play) {
          clearTimeout(statementTimerRef.current.play);
          statementTimerRef.current.play = null;
        }
      };
    } else {
      // Update previous state
      prevRecordingStateRef.current = recordingState;
    }
  }, [recordingState, isSessionActive, audioClips.length, mode, currentStatementIndex]);

  // Handle pre-recorded audio (if routed from elsewhere)
  useEffect(() => {
    if (audioBlob) {
      setRecordingState('ANALYZING');
      analyzeAudioWithPraatAndGemini(audioBlob);
    }
  }, [audioBlob]);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  // Keep ref for muted state to access in animation loop
  const isMicMutedRef = useRef(isMicMuted);
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const drawWaveform = useCallback(() => {
    // Determine if we should be processing audio
    // In AI mode, we process if connected/streaming. In normal mode, only if recording.
    const isActive = recordingStateRef.current === 'RECORDING' || (shouldUseGemini && geminiConnected);

    if (!isActive || !analyserRef.current || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
    ctx.fillRect(0, 0, width, height);

    const numBars = 32;
    const barWidth = width / numBars - 2;

    const barHeights = new Array(numBars).fill(0);
    const sliceWidth = Math.floor(dataArray.length / numBars);

    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let j = 0; j < sliceWidth; j++) {
        const index = i * sliceWidth + j;
        sum += Math.abs(dataArray[index] - 128);
      }
      barHeights[i] = (sum / sliceWidth) / 128.0;
    }

    // Check for voice activity (simple volume threshold)
    // Only if mic is NOT muted
    if (!isMicMutedRef.current) {
      const averageVolume = barHeights.reduce((a, b) => a + b, 0) / barHeights.length;
      if (averageVolume > 0.005) { // Lowered threshold for better sensitivity
        lastVoiceActivityTimeRef.current = Date.now();

        // If user starts speaking, clear options immediately
        // Also clear the pending generated options so they don't pop up later
        if (generatedSmartOptionsRef.current.length > 0 || optionsTimeoutRef.current) {
          console.log('[SmartOptions] User speaking detected - clearing options');
          setSmartOptions([]);
          generatedSmartOptionsRef.current = [];

          if (optionsTimeoutRef.current) {
            clearTimeout(optionsTimeoutRef.current);
            optionsTimeoutRef.current = null;
          }
        }
      }
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#A855F7');
    gradient.addColorStop(0.5, '#8B5CF6');
    gradient.addColorStop(1, '#7C3AED');
    ctx.fillStyle = gradient;

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + 2);
      const barHeight = Math.max(4, barHeights[i] * (height - 8));
      const centerY = height / 2;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
    }

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  // Ref to store generated options to avoid closure staleness
  const generatedSmartOptionsRef = useRef<string[]>([]);

  // Effect to generate smart options after agent response
  useEffect(() => {
    if (!lastAgentResponse || !shouldUseGemini) return;

    // console.log('[SmartOptions] Agent response received:', lastAgentResponse);

    // Mark conversation as started
    setHasConversationStarted(true);

    // Clear previous options and any pending timeout
    setSmartOptions([]);
    generatedSmartOptionsRef.current = [];

    if (optionsTimeoutRef.current) {
      clearTimeout(optionsTimeoutRef.current);
      optionsTimeoutRef.current = null;
    }

    // Pre-generate options immediately (but don't show yet)
    const generateOptions = async () => {
      // console.log('[SmartOptions] Pre-generating options...');

      try {
        const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '');

        // Helper to generate content with fallback
        const generateWithFallback = async (promptText: string) => {
          const request = { contents: [{ role: 'user', parts: [{ text: promptText }] }] };
          try {
            // Try Gemini 2.5 Flash first (Verified available)
            const modelFlash = ai.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1beta' });
            return await modelFlash.generateContent(request);
          } catch (flashError) {
            console.warn('[SmartOptions] Gemini 2.5 Flash failed, falling back to 2.0 Flash:', flashError);
            // Fallback to Gemini 2.0 Flash (Verified available)
            const modelFallback = ai.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1beta' });
            return await modelFallback.generateContent(request);
          }
        };

        const prompt = `Based on this question/statement from a supportive companion for students: "${lastAgentResponse}"
        
        Generate 3 simple, short, natural 1-sentence options (maximum 5 words each) that a student (10-18 years old) might say to reply.
        Return ONLY a JSON array of strings. Do not include markdown code blocks.`;

        const result = await generateWithFallback(prompt);
        const text = result.response.text();
        // console.log('[SmartOptions] Raw API response:', text);
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const options = JSON.parse(cleaned);
        // console.log('[SmartOptions] Parsed options:', options);

        if (Array.isArray(options)) {
          // Store in ref immediately
          generatedSmartOptionsRef.current = options.slice(0, 3);
        }
      } catch (e) {
        console.error("[SmartOptions] Failed to generate smart options", e);
      }
    };

    // Generate options immediately
    generateOptions();

    // Wait 7 seconds of silence before showing options
    optionsTimeoutRef.current = setTimeout(() => {
      // Check if user has been speaking in the last 2 seconds
      // AND verify we have options to show
      const timeSinceVoice = Date.now() - lastVoiceActivityTimeRef.current;

      // Strict check: Must be silence > 2s and options must exist
      if (timeSinceVoice > 2000 && generatedSmartOptionsRef.current.length > 0) {
        console.log('[SmartOptions] 10s silence - showing options:', generatedSmartOptionsRef.current);
        setSmartOptions(generatedSmartOptionsRef.current);
      } else {
        console.log('[SmartOptions] Not showing - user recently spoke or no options');
      }
    }, 10000); // 10 seconds delay

    return () => {
      if (optionsTimeoutRef.current) {
        clearTimeout(optionsTimeoutRef.current);
        optionsTimeoutRef.current = null;
      }
    };
  }, [lastAgentResponse, shouldUseGemini]);

  // Ensure options are cleared when recording stops
  useEffect(() => {
    if (recordingState !== 'RECORDING') {
      setSmartOptions([]);
      if (optionsTimeoutRef.current) {
        clearTimeout(optionsTimeoutRef.current);
        optionsTimeoutRef.current = null;
      }
    }
  }, [recordingState]);

  const handleOptionSelect = (option: string) => {
    setSmartOptions([]);
    if (sendText) {
      sendText(option);
    }
  };

  const startRecording = () => {
    if (!stream || recordingState !== 'IDLE') return;

    setPermissionError(null);
    setRecordingState('RECORDING');
    recordingStateRef.current = 'RECORDING';
    setRecordingDuration(0);
    audioChunksRef.current = [];

    // Start session if not already active
    if (!isSessionActive) {
      setIsSessionActive(true);
      // Reset clips for new session
      allClipsRef.current = [];
      setAudioClips([]);
      // Reset statement index in repeat mode (auto-play handled by useEffect)
      if (mode === 'repeat') {
        setCurrentStatementIndex(0);
      }
    }

    // Create new MediaRecorder for this clip
    // Create new MediaRecorder for this clip - matching VoiceCalibrationScreen implementation
    const mimeType = 'audio/webm';
    console.log('[Recorder] Selected mimeType:', mimeType);

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
    } catch (e) {
      console.error('[Recorder] Failed to create MediaRecorder:', e);
      setRecordingState('ERROR');
      setPermissionError("Your browser doesn't support the required audio recording format.");
      return;
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log('Data available, size:', event.data.size);
        audioChunksRef.current.push(event.data);
      }
    };

    // Start with a timeslice to ensure data is captured regularly
    mediaRecorderRef.current.start(100); // Collect data every 100ms

    // Audio context/analyser is initialized in useEffect now

    // Start duration counter
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const analyzeAudioWithPraatAndGemini = async (audioBlob: Blob) => {
    const debugStart = performance.now();

    try {
      const wavBlob = await webmBlobToWavMono16k(audioBlob);
      const featuresForAnalysis = await extractFeaturesWithPraat(wavBlob, BACKEND_URL);
      ensureRecordingQuality(featuresForAnalysis, wavBlob.size);

      // Print extracted Praat features to console
      console.log('=== Praat Extracted Features ===');
      console.log('Basic Features:');
      console.log('  RMS (energy/loudness):', featuresForAnalysis.rms);
      console.log('  ZCR (noise/sibilance):', featuresForAnalysis.zcr);
      console.log('  Spectral Centroid (brightness):', featuresForAnalysis.spectralCentroid);
      console.log('  Spectral Flatness (tonality):', featuresForAnalysis.spectralFlatness);
      console.log('  MFCCs (spectral shape):', featuresForAnalysis.mfcc);
      console.log('\nPraat Advanced Features (Real Extractions):');
      console.log('  F0 Mean (pitch):', featuresForAnalysis.f0_mean, 'Hz');
      console.log('  F0 Range:', featuresForAnalysis.f0_range, 'Hz');
      console.log('  Jitter:', featuresForAnalysis.jitter, '%');
      console.log('  Shimmer:', featuresForAnalysis.shimmer, '%');
      // HNR removed from logs
      console.log('  F1 (First Formant):', featuresForAnalysis.f1, 'Hz');
      console.log('  F2 (Second Formant):', featuresForAnalysis.f2, 'Hz');
      console.log('  Speech Rate:', featuresForAnalysis.speech_rate, 'WPM');
      console.log('Full Features Object:', JSON.stringify(featuresForAnalysis, null, 2));
      console.log('================================');

      // Check if Praat extracted the advanced features
      const hasPraatFeatures = featuresForAnalysis.f0_mean !== undefined &&
        featuresForAnalysis.f0_mean > 0 &&
        featuresForAnalysis.jitter !== undefined;

      if (!hasPraatFeatures) {
        throw new Error('Praat did not extract required biomarkers. Please ensure the audio contains clear speech.');
      }

      // Use real Praat features directly - no estimation needed!
      const biomarkers: RawBiomarkerData = {
        stress_level: 0, // Will be calculated by stress analysis algorithm
        f0_mean: featuresForAnalysis.f0_mean || 0,
        f0_range: featuresForAnalysis.f0_range || 0,
        jitter: featuresForAnalysis.jitter || 0,
        shimmer: featuresForAnalysis.shimmer || 0,
        f1: featuresForAnalysis.f1 || 0,
        f2: featuresForAnalysis.f2 || 0,
        speech_rate: featuresForAnalysis.speech_rate || 0,
        confidence: 95, // High confidence since these are real measurements
        snr: 0, // Will be estimated if needed
        ai_summary: '', // Will be generated by Gemini
      };

      // Calculate stress level using the stress analysis algorithm
      const { calculateStressLevel } = await import('../utils/stressAnalysis');
      const baselineDataObj = baselineData ? JSON.parse(baselineData) : null;

      // Convert to MeasureValues format
      const measureValues = {
        f0Mean: biomarkers.f0_mean,
        f0Range: biomarkers.f0_range,
        jitter: biomarkers.jitter,
        shimmer: biomarkers.shimmer,
        f1: biomarkers.f1,
        f2: biomarkers.f2,
        speechRate: biomarkers.speech_rate,
      };

      // Calculate stress level
      // Validate baseline data before using it - only use if all critical values are present and valid
      let baselineMeasureValues: MeasureValues | null = null;
      if (baselineDataObj) {
        const hasValidBaseline = (
          baselineDataObj.f0_mean > 0 &&
          baselineDataObj.jitter > 0 &&
          baselineDataObj.shimmer > 0 &&
          baselineDataObj.speech_rate > 0 &&
          baselineDataObj.f0_range > 0 &&
          isFinite(baselineDataObj.f0_mean) &&
          isFinite(baselineDataObj.jitter) &&
          isFinite(baselineDataObj.shimmer) &&
          isFinite(baselineDataObj.speech_rate) &&
          isFinite(baselineDataObj.f0_range)
        );

        if (hasValidBaseline) {
          baselineMeasureValues = {
            f0Mean: baselineDataObj.f0_mean,
            f0Range: baselineDataObj.f0_range,
            jitter: baselineDataObj.jitter,
            shimmer: baselineDataObj.shimmer,
            f1: baselineDataObj.f1 || 0,
            f2: baselineDataObj.f2 || 0,
            speechRate: baselineDataObj.speech_rate,
          };
        } else {
          console.warn('Baseline data is incomplete or invalid. Falling back to population-based analysis.');
        }
      }

      const stressResult = calculateStressLevel(
        measureValues,
        'mixed', // profile type
        baselineMeasureValues
      );

      const { adjustedScore } = applyAdaptiveAdjustment({
        baseScore: stressResult.score,
        deltas: computeAdaptiveDeltas(measureValues, baselineMeasureValues),
      });

      biomarkers.stress_level = adjustedScore;

      // Get AI summary from Gemini (just for explanation, not for feature extraction)
      const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY);
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1beta' });

      const baselineString = baselineData ?
        `The user's personal CALM BASELINE voice biomarkers are: ${JSON.stringify(baselineDataObj, null, 2)}` :
        "No personal baseline is available. Analysis is based on general population norms.";

      const prompt = `You are a world-class expert in Voice Stress Analysis (VSA). I have real, measured vocal biomarkers from a voice sample (extracted using Praat phonetics software) and a stress level calculation.

      ${baselineString}

      The CURRENT voice sample's REAL biomarkers (extracted using Praat):
      - F0 Mean (pitch): ${biomarkers.f0_mean.toFixed(2)} Hz
      - F0 Range: ${biomarkers.f0_range.toFixed(2)} Hz
      - Jitter: ${biomarkers.jitter.toFixed(2)}%
      - Shimmer: ${biomarkers.shimmer.toFixed(2)}%
      - F1 (First Formant): ${biomarkers.f1.toFixed(2)} Hz
      - F2 (Second Formant): ${biomarkers.f2.toFixed(2)} Hz
      - Speech Rate: ${biomarkers.speech_rate.toFixed(1)} WPM

      Calculated Stress Level: ${stressResult.score.toFixed(1)}/100 (${stressResult.level})
      ${stressResult.stressType ? `Stress Type: ${stressResult.stressType}` : ''}

      Your task:
      1. Provide a confidence score (0-100%) for the analysis based on the quality of the biomarkers.
      2. Suggest an adjusted stress score (0-100) that stays within ±10 points of the provided score.
      3. Estimate Signal-to-Noise Ratio (SNR in dB) based on the provided biomarkers and perceived audio quality.
      4. Write a concise, helpful summary (2-3 sentences) explaining what these biomarkers indicate about the speaker's vocal stress, referencing the baseline comparison if available.

      Your output MUST be a single, valid JSON object with these exact keys:
      {
        "adjusted_score": <number 0-100>,
        "confidence": <number 0-100>,
        "snr": <number in dB>,
        "ai_summary": "<2-3 sentence explanation>"
      }`;

      const response = await model.generateContent(prompt);
      const responseText = response.response.text();

      // Clean to valid JSON
      let cleanedText = (responseText || '').trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      if (cleanedText) {
        try {
          const geminiResponse = JSON.parse(cleanedText);
          biomarkers.confidence = geminiResponse.confidence || 95;
          biomarkers.snr = geminiResponse.snr || 0;
          biomarkers.ai_summary = geminiResponse.ai_summary || stressResult.explanation;
          biomarkers.stress_level = blendGeminiScore(
            biomarkers.stress_level,
            geminiResponse.adjusted_score
          );
        } catch (e) {
          // Fallback if Gemini response parsing fails
          biomarkers.confidence = 95;
          biomarkers.snr = 0;
          biomarkers.ai_summary = stressResult.explanation;
        }
      } else {
        // Fallback values
        biomarkers.confidence = 95;
        biomarkers.snr = 0;
        biomarkers.ai_summary = stressResult.explanation;
      }

      // Update adaptive sensitivity state based on final stress score
      // This will adjust sensitivity for future sessions if patterns persist
      updateSensitivityFromSession(biomarkers.stress_level);

      const analysisResult: AnalysisData = {
        stressLevel: biomarkers.stress_level,
        biomarkers: formatBiomarkers(biomarkers),
        confidence: biomarkers.confidence,
        snr: biomarkers.snr,
        audioUrl: URL.createObjectURL(audioBlob),
        aiSummary: biomarkers.ai_summary,
        date: new Date().toISOString(),
      };

      const debugDuration = performance.now() - debugStart;


      // Save session data and generate counselor report
      const saveSessionAndReport = async (): Promise<string | undefined> => {
        try {
          const studentId = getCurrentStudentId();
          const history = getStudentHistory(studentId);

          // Create session data with voice analysis
          const sessionData: SessionData = {
            sessionId: generateId(),
            date: new Date().toISOString(),
            preAnalysisSession: preAnalysisSession || undefined,
            liveSessionQuestions: liveSessionQA,
            voiceAnalysis: {
              stressLevel: analysisResult.stressLevel,
              biomarkers: analysisResult.biomarkers,
              aiSummary: analysisResult.aiSummary
            }
          };

          // Generate counselor report
          console.log('[Session] Generating counselor report...');
          const report = await generateCounselorReport(sessionData, history);
          sessionData.counselorReport = report;

          // Save complete session data
          saveSessionData(sessionData, studentId);
          console.log('[Session] Session data saved with report:', sessionData.sessionId);

          // Clear live session Q&A for next session
          if (clearLiveSessionQA) {
            clearLiveSessionQA();
          }

          return formatReportForDisplay(report);
        } catch (err) {
          console.error('[Session] Failed to save session data:', err);
          return undefined;
        }
      };

      // Wait for report generation to complete so we can pass it to the results screen
      const reportText = await saveSessionAndReport();

      if (reportText) {
        analysisResult.counselorReport = reportText;
      }

      setRecordingState('COMPLETE');
      onAnalysisComplete(analysisResult);
    } catch (error) {
      console.error('[RecordingScreen] Analysis Error:', error);
      const debugDuration = performance.now() - debugStart;

      setRecordingState('ERROR');
      if (error instanceof Error) {
        if (error.message.includes('Not enough clear speech') || error.message.includes('did not extract')) {
          setPermissionError("We couldn't detect clear speech. Please try speaking a bit louder and closer to your device.");
        } else if (error.message.includes('Backend') || error.message.includes('Praat')) {
          setPermissionError("Our analysis service is temporarily unavailable. Please try again in a moment.");
        } else {
          setPermissionError("Something went wrong during analysis. Please try recording again.");
        }
      } else {
        setPermissionError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = () => {
        console.log('Stop event fired, chunks collected:', audioChunksRef.current.length);

        if (audioChunksRef.current.length === 0) {
          console.error('No audio chunks captured!');
          setRecordingState('IDLE');
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Recording stopped, blob size:', blob.size);

        // Update both state and ref
        allClipsRef.current = [...allClipsRef.current, blob];
        console.log('Total clips in ref:', allClipsRef.current.length);
        console.log('All clip sizes:', allClipsRef.current.map(c => c.size));

        setAudioClips(prev => {
          const updated = [...prev, blob];
          console.log('Total clips in state:', updated.length);
          return updated;
        });
        setRecordingState('IDLE');
        recordingStateRef.current = 'IDLE';
      };

      mediaRecorderRef.current.stop();
    }
  };

  const combineAudioClips = async (clips: Blob[]): Promise<Blob> => {
    // Create audio context for combining
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Decode all clips to AudioBuffers
    const audioBuffers: AudioBuffer[] = [];
    for (const clip of clips) {
      const arrayBuffer = await clip.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.push(audioBuffer);
    }

    // Calculate total length
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const sampleRate = audioBuffers[0].sampleRate;
    const numberOfChannels = audioBuffers[0].numberOfChannels;

    // Create combined buffer
    const combinedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

    // Copy all clips into combined buffer
    let offset = 0;
    for (const buffer of audioBuffers) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        combinedBuffer.getChannelData(channel).set(channelData, offset);
      }
      offset += buffer.length;
    }

    // Convert combined buffer to WAV blob
    const wavBlob = audioBufferToWavBlob(combinedBuffer);
    audioContext.close();

    return wavBlob;
  };

  const audioBufferToWavBlob = (audioBuffer: AudioBuffer): Blob => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = audioBuffer.getChannelData(0);
    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const volume = 1;
    let index = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      index += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const endSession = async () => {
    const debugStart = performance.now();
    // Disconnect Gemini Live immediately when ending the session
    // Capture final Q&A including any pending user input
    let finalLiveSessionQA = liveSessionQA; // Default to current state
    try {
      const disconnectedQA = disconnectGemini();
      if (disconnectedQA && Array.isArray(disconnectedQA)) {
        console.log('[RecordingScreen] Received updated Q&A from disconnect:', disconnectedQA.length);
        finalLiveSessionQA = disconnectedQA;
      }
    } catch (e) {
      console.warn('Error disconnecting gemini:', e);
    }

    // Use ref to get the most up-to-date clips
    const clipsToAnalyze = allClipsRef.current;
    if (clipsToAnalyze.length === 0) return;

    const totalClipSize = clipsToAnalyze.reduce((sum, clip) => sum + clip.size, 0);


    setRecordingState('ANALYZING');

    try {
      console.log('Ending session with', clipsToAnalyze.length, 'clips from ref');
      console.log('State has', audioClips.length, 'clips');

      // Properly combine audio clips
      const combinedWavBlob = await combineAudioClips(clipsToAnalyze);
      console.log('Combined WAV blob size:', combinedWavBlob.size);

      // Convert to mono 16kHz for analysis
      const wavBlob = await webmBlobToWavMono16k(combinedWavBlob);
      const featuresForAnalysis = await extractFeaturesWithPraat(wavBlob, BACKEND_URL);

      // Print extracted Praat features to console
      console.log('=== Praat Extracted Features (Multi-Clip Session) ===');
      console.log('Basic Features:');
      console.log('  RMS (energy/loudness):', featuresForAnalysis.rms);
      console.log('  ZCR (noise/sibilance):', featuresForAnalysis.zcr);
      console.log('  Spectral Centroid (brightness):', featuresForAnalysis.spectralCentroid);
      console.log('  Spectral Flatness (tonality):', featuresForAnalysis.spectralFlatness);
      console.log('  MFCCs (spectral shape):', featuresForAnalysis.mfcc);
      console.log('\nPraat Advanced Features (Real Extractions):');
      console.log('  F0 Mean (pitch):', featuresForAnalysis.f0_mean, 'Hz');
      console.log('  F0 Range:', featuresForAnalysis.f0_range, 'Hz');
      console.log('  Jitter:', featuresForAnalysis.jitter, '%');
      console.log('  Shimmer:', featuresForAnalysis.shimmer, '%');
      console.log('  Shimmer:', featuresForAnalysis.shimmer, '%');
      // HNR removed from logs
      console.log('  F1 (First Formant):', featuresForAnalysis.f1, 'Hz');
      console.log('  F1 (First Formant):', featuresForAnalysis.f1, 'Hz');
      console.log('  F2 (Second Formant):', featuresForAnalysis.f2, 'Hz');
      console.log('  Speech Rate:', featuresForAnalysis.speech_rate, 'WPM');
      console.log('====================================================');

      // Check if Praat extracted the advanced features
      const hasPraatFeatures = featuresForAnalysis.f0_mean !== undefined &&
        featuresForAnalysis.f0_mean > 0 &&
        featuresForAnalysis.jitter !== undefined;

      if (!hasPraatFeatures) {
        throw new Error('Praat did not extract required biomarkers. Please ensure the audio contains clear speech.');
      }

      // Use real Praat features directly - no estimation needed!
      const biomarkers: RawBiomarkerData = {
        stress_level: 0, // Will be calculated by stress analysis algorithm
        f0_mean: featuresForAnalysis.f0_mean || 0,
        f0_range: featuresForAnalysis.f0_range || 0,
        jitter: featuresForAnalysis.jitter || 0,
        shimmer: featuresForAnalysis.shimmer || 0,
        f1: featuresForAnalysis.f1 || 0,
        f2: featuresForAnalysis.f2 || 0,
        speech_rate: featuresForAnalysis.speech_rate || 0,
        confidence: 95, // High confidence since these are real measurements
        snr: 0, // Will be estimated if needed
        ai_summary: '', // Will be generated by Gemini
      };

      // Calculate stress level using the stress analysis algorithm
      const { calculateStressLevel } = await import('../utils/stressAnalysis');
      const baselineDataObj = typeof baselineData === 'string' ? JSON.parse(baselineData) : baselineData;

      // Convert to MeasureValues format
      const measureValues = {
        f0Mean: biomarkers.f0_mean,
        f0Range: biomarkers.f0_range,
        jitter: biomarkers.jitter,
        shimmer: biomarkers.shimmer,
        f1: biomarkers.f1,
        f2: biomarkers.f2,
        speechRate: biomarkers.speech_rate,
      };

      // Calculate stress level
      // Validate baseline data before using it - only use if all critical values are present and valid
      let baselineMeasureValues: MeasureValues | null = null;
      if (baselineDataObj) {
        const hasValidBaseline = (
          baselineDataObj.f0_mean > 0 &&
          baselineDataObj.jitter > 0 &&
          baselineDataObj.shimmer > 0 &&
          baselineDataObj.speech_rate > 0 &&
          baselineDataObj.f0_range > 0 &&
          isFinite(baselineDataObj.f0_mean) &&
          isFinite(baselineDataObj.jitter) &&
          isFinite(baselineDataObj.shimmer) &&
          isFinite(baselineDataObj.speech_rate) &&
          isFinite(baselineDataObj.f0_range)
        );

        if (hasValidBaseline) {
          baselineMeasureValues = {
            f0Mean: baselineDataObj.f0_mean,
            f0Range: baselineDataObj.f0_range,
            jitter: baselineDataObj.jitter,
            shimmer: baselineDataObj.shimmer,
            f1: baselineDataObj.f1 || 0,
            f2: baselineDataObj.f2 || 0,
            speechRate: baselineDataObj.speech_rate,
          };
        } else {
          console.warn('Baseline data is incomplete or invalid. Falling back to population-based analysis.');
        }
      }

      const stressResult = calculateStressLevel(
        measureValues,
        'mixed', // profile type
        baselineMeasureValues
      );

      const { adjustedScore } = applyAdaptiveAdjustment({
        baseScore: stressResult.score,
        deltas: computeAdaptiveDeltas(measureValues, baselineMeasureValues),
      });

      biomarkers.stress_level = adjustedScore;

      const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY);

      const baselineString = baselineData ?
        `The user's personal CALM BASELINE voice biomarkers are: ${JSON.stringify(baselineDataObj, null, 2)}` :
        "No personal baseline is available. Analysis is based on general population norms.";

      const prompt = `You are a world-class expert in Voice Stress Analysis (VSA). I have real, measured vocal biomarkers from a voice sample (extracted using Praat phonetics software) and a stress level calculation.

      ${baselineString}

      The CURRENT voice sample's REAL biomarkers (extracted using Praat):
      - F0 Mean (pitch): ${biomarkers.f0_mean.toFixed(2)} Hz
      - F0 Range: ${biomarkers.f0_range.toFixed(2)} Hz
      - Jitter: ${biomarkers.jitter.toFixed(2)}%
      - Shimmer: ${biomarkers.shimmer.toFixed(2)}%
      - F1 (First Formant): ${biomarkers.f1.toFixed(2)} Hz
      - F2 (Second Formant): ${biomarkers.f2.toFixed(2)} Hz
      - Speech Rate: ${biomarkers.speech_rate.toFixed(1)} WPM

      Calculated Stress Level: ${stressResult.score.toFixed(1)}/100 (${stressResult.level})
      ${stressResult.stressType ? `Stress Type: ${stressResult.stressType}` : ''}

      Your task:
      1. Provide a confidence score (0-100%) for the analysis based on the quality of the biomarkers.
      2. Suggest an adjusted stress score (0-100) that stays within ±10 points of the provided score.
      3. Estimate Signal-to-Noise Ratio (SNR in dB) based on the provided biomarkers and perceived audio quality.
      4. Write a concise, helpful summary (2-3 sentences) explaining what these biomarkers indicate about the speaker's vocal stress, referencing the baseline comparison if available.

      Your output MUST be a single, valid JSON object with these exact keys:
      {
        "adjusted_score": <number 0-100>,
        "confidence": <number 0-100>,
        "snr": <number in dB>,
        "ai_summary": "<2-3 sentence explanation>"
      }`;

      // Helper to generate content with fallback
      const generateWithFallback = async (promptText: string) => {
        const request = { contents: [{ role: 'user', parts: [{ text: promptText }] }] };
        try {
          // Try Gemini 2.5 Flash first (Verified available)
          const modelFlash = ai.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1beta' });
          return await modelFlash.generateContent(request);
        } catch (flashError) {
          console.warn('[RecordingScreen] Gemini 2.5 Flash failed, falling back to 2.0 Flash:', flashError);
          // Fallback to Gemini 2.0 Flash (Verified available)
          const modelFallback = ai.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1beta' });
          return await modelFallback.generateContent(request);
        }
      };

      const response = await generateWithFallback(prompt);
      const responseText = response.response.text();

      // Clean to valid JSON
      let cleanedText = (responseText || '').trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      if (cleanedText) {
        try {
          const geminiResponse = JSON.parse(cleanedText);
          biomarkers.confidence = geminiResponse.confidence || 95;
          biomarkers.snr = geminiResponse.snr || 0;
          biomarkers.ai_summary = geminiResponse.ai_summary || stressResult.explanation;
          biomarkers.stress_level = blendGeminiScore(
            biomarkers.stress_level,
            geminiResponse.adjusted_score
          );
        } catch (e) {
          // Fallback if Gemini response parsing fails
          biomarkers.confidence = 95;
          biomarkers.snr = 0;
          biomarkers.ai_summary = stressResult.explanation;
        }
      } else {
        // Fallback values
        biomarkers.confidence = 95;
        biomarkers.snr = 0;
        biomarkers.ai_summary = stressResult.explanation;
      }

      // Update adaptive sensitivity state based on final stress score
      // This will adjust sensitivity for future sessions if patterns persist
      updateSensitivityFromSession(biomarkers.stress_level);

      const analysisResult: AnalysisData = {
        stressLevel: biomarkers.stress_level,
        biomarkers: formatBiomarkers(biomarkers),
        confidence: biomarkers.confidence,
        snr: biomarkers.snr,
        audioUrl: URL.createObjectURL(combinedWavBlob),
        aiSummary: biomarkers.ai_summary,
        date: new Date().toISOString(),
        questionnaireAnswers: preAnalysisSession?.answers || {},
        preAnalysisQuestions: preAnalysisSession?.questions?.map(q => ({ id: q.id, text: q.text })) || [],
        liveSessionAnswers: finalLiveSessionQA.map(qa => ({
          questionText: qa.questionText,
          studentAnswer: qa.studentAnswer
        })),
      };

      const debugDuration = performance.now() - debugStart;


      // Save session data and generate counselor report (Fix for missing data persistence)
      try {
        const studentId = getCurrentStudentId();
        const history = getStudentHistory(studentId);

        // Create session data with voice analysis
        const sessionData: SessionData = {
          sessionId: generateId(),
          date: new Date().toISOString(),
          preAnalysisSession: preAnalysisSession || undefined,
          liveSessionQuestions: finalLiveSessionQA,
          voiceAnalysis: {
            stressLevel: analysisResult.stressLevel,
            biomarkers: analysisResult.biomarkers,
            aiSummary: analysisResult.aiSummary
          }
        };

        // Generate counselor report
        console.log('[Session] Generating counselor report...');
        const report = await generateCounselorReport(sessionData, history);
        sessionData.counselorReport = report;

        // Add report to result so it can be shown in UI immediately
        // Note: Casting report to any if needed to match AnalysisData type, assuming compatibility
        (analysisResult as any).counselorReport = report;

        // Save complete session data
        saveSessionData(sessionData, studentId);
        console.log('[Session] Session data saved with report:', sessionData.sessionId);

        // Clear live session Q&A for next session
        if (clearLiveSessionQA) {
          clearLiveSessionQA();
        }
      } catch (err) {
        console.error('[Session] Failed to save session data:', err);
      }

      // Reset session state
      setIsSessionActive(false);
      allClipsRef.current = [];
      setAudioClips([]);

      setRecordingState('COMPLETE');
      onAnalysisComplete(analysisResult);
    } catch (error) {
      console.error('[RecordingScreen] Analysis Error:', error);
      const debugDuration = performance.now() - debugStart;

      setRecordingState('ERROR');
      if (error instanceof Error) {
        if (error.message.includes('Not enough clear speech')) {
          setPermissionError("We couldn't detect clear speech. Please try speaking a bit louder and closer to your device.");
        } else if (error.message.includes('Backend')) {
          setPermissionError("Our analysis service is temporarily unavailable. Please try again in a moment.");
        } else {
          setPermissionError("Something went wrong during analysis. Please try recording again.");
        }
      } else {
        setPermissionError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const statusText = {
    IDLE: audioBlob ? "Processing recorded conversation..." : isSessionActive ? (mode === 'repeat' ? "Hold to repeat after me" : "Hold to record another clip") : (mode === 'repeat' ? "Hold to start repeat session" : "Hold to record your voice"),
    RECORDING: mode === 'repeat' ? "Recording... Repeat after me" : "Recording... Speak naturally",
    ANALYZING: "Analyzing voice patterns...",
    COMPLETE: "Analysis complete",
    ERROR: "Analysis failed. Tap to retry.",
  };

  const statusColor = { IDLE: "text-text-muted", RECORDING: "text-purple-light", ANALYZING: "text-orange-light", COMPLETE: "text-success-green", ERROR: "text-error-red" } as const;
  const headerText = "Voice Stress Analysis";

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[90px] flex items-center justify-between px-4 z-50 max-w-2xl mx-auto">
      <div className="w-11 h-11" />
      <div className="text-center flex-1">
        <h1 className="text-lg font-medium text-white">{headerText}</h1>
        <div className="h-0.5 w-1/2 mx-auto bg-purple-primary" />
        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            onClick={() => setMode('ai')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'ai'
              ? 'bg-purple-primary text-white'
              : 'bg-neutral-800/50 text-gray-400 hover:bg-neutral-700/50'
              }`}
          >
            AI
          </button>
          <button
            onClick={() => setMode('repeat')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'repeat'
              ? 'bg-purple-primary text-white'
              : 'bg-neutral-800/50 text-gray-400 hover:bg-neutral-700/50'
              }`}
          >
            Repeat
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowHelp(true)}
          className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
          title="Help"
        >
          <QuestionMarkCircle className="w-5 h-5 text-white" />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
            title="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-4 pt-[100px] pb-[60px] relative overflow-y-auto">
      <Header />

      <GlassCard className="w-full max-w-sm mx-auto p-4 z-10 mt-4 select-none" variant="purple">
        <div className="text-center">
          {recordingState === 'RECORDING' && (
            <p className="text-2xl font-mono text-white tabular-nums">
              {`00:${recordingDuration.toString().padStart(2, '0')}`}
            </p>
          )}
          <p className={`text-sm mt-1 transition-colors duration-300 ${statusColor[recordingState]}`}>
            {statusText[recordingState]}
          </p>
          {recordingState === 'RECORDING' && (
            <p className="text-xs text-text-muted mt-2">
              Release when finished speaking
            </p>
          )}
        </div>
      </GlassCard>

      <div className="relative flex items-center justify-center my-10 h-[280px] w-[280px]">
        {/* Voice Powered Orb - replaces the purple ring */}
        <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden z-0">
          <VoicePoweredOrb
            enableVoiceControl={recordingState === 'RECORDING' || (isSessionActive && mode === 'ai' && !isMicMuted)}
            externalAudioStream={stream}
            hue={0}
            voiceSensitivity={2.5}
            maxRotationSpeed={1.5}
            maxHoverIntensity={1.0}
            className="w-full h-full"
            onVoiceDetected={(isDetected) => {
              if (isDetected && smartOptions.length > 0) {
                // Clear smart options when user starts speaking
                setSmartOptions([]);
                lastVoiceActivityTimeRef.current = Date.now();
              }
            }}
          />
        </div>

        <MotionButton
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={recordingState === 'ANALYZING' || !!permissionError && recordingState !== 'ERROR' || (audioBlob && recordingState === 'IDLE')}
          className={`w-[180px] h-[180px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${recordingState === 'ANALYZING' ? 'bg-orange-primary/15' : recordingState === 'ERROR' ? 'bg-error-red/15' : recordingState === 'RECORDING' ? 'bg-purple-primary/30' : 'bg-purple-primary/15'} backdrop-blur-xl z-10 select-none touch-none`}
          whileHover={(recordingState === 'IDLE' || recordingState === 'ERROR') && !audioBlob ? { scale: 1.05, boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' } : {}}
          whileTap={(recordingState === 'IDLE' || recordingState === 'ERROR') && !audioBlob ? { scale: 0.95 } : {}}
          animate={{
            boxShadow: recordingState === 'IDLE' ? '0 0 30px rgba(139, 92, 246, 0.4)' :
              recordingState === 'ERROR' ? '0 0 30px rgba(239, 68, 68, 0.4)' :
                recordingState === 'RECORDING' ? '0 0 50px rgba(139, 92, 246, 0.8)' :
                  '0 12px 40px rgba(139, 92, 246, 0.3)',
            scale: recordingState === 'RECORDING' ? 1 : 1
          }}
        >
          <motion.div animate={{ scale: recordingState === 'RECORDING' ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.8, repeat: recordingState === 'RECORDING' ? Infinity : 0 }}>
            <MicrophoneFilled className="w-16 h-16 text-white" />
          </motion.div>
        </MotionButton>
      </div>



      {/* AI Mode - Gemini Live Overlay */}
      {mode === 'ai' && (
        <div className="w-full max-w-sm mx-auto mt-6">
          <GlassCard className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white">AI Assistant</h3>
              <div className="flex items-center space-x-3">
                {/* Mute/Unmute Button */}
                <button
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isMicMuted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                    }`}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isMicMuted ? 'Muted' : 'Unmuted'}
                </button>
                <div className="flex items-center space-x-2">
                  <MicrophoneFilled className={`w-4 h-4 ${isMicMuted ? 'text-red-400' : 'text-green-400'}`} />
                  <span className="text-xs text-gray-300">
                    {isMicMuted ? 'Tap to speak' : 'Listening'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MotionDiv
                  animate={{ scale: geminiConnected ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-2 h-2 rounded-full ${geminiConnected ? 'bg-green-400' : 'bg-yellow-400'}`}
                />
                <p className="text-xs text-gray-300">
                  {geminiConnected ? (isMicMuted ? "Connected (Muted)" : "Listening...") : "Connecting..."}
                </p>
              </div>

              {geminiConnected && !hasConversationStarted && !geminiTranscript && !isMicMuted && !geminiError && (
                <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-400/30">
                  <p className="text-sm text-white text-center">
                    Say hello to begin the conversation
                  </p>
                </div>
              )}

              {geminiConnected && isMicMuted && !geminiError && (
                <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-400/30">
                  <p className="text-sm text-orange-300 text-center">
                    Tap "Unmuted" above to let the AI hear you
                  </p>
                </div>
              )}

              {geminiConnected && geminiTranscript && !isMicMuted && (
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/20 max-h-[200px] overflow-y-auto">
                  <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                    {geminiTranscript}
                  </p>
                </div>
              )}

              {geminiError && (
                <div className="bg-red-500/20 rounded-lg p-2">
                  <p className="text-xs text-red-400">{geminiError}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Repeat Mode - Statement Overlay */}
      {mode === 'repeat' && (
        <div className="w-full max-w-sm mx-auto mt-6">
          <GlassCard className="p-4">
            <div className="text-center space-y-3">
              <h3 className="text-sm font-medium text-white mb-3">Repeat After Me</h3>

              {isPlayingStatement && (
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 mb-2"
                >
                  <MotionDiv
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <span className="text-xs text-purple-300">Speaking...</span>
                </MotionDiv>
              )}

              <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-400/30 min-h-[80px] flex items-center justify-center">
                <p className="text-base text-white leading-relaxed">
                  {sessionAffirmations[currentStatementIndex]}
                </p>
              </div>

              {!isPlayingStatement && isSessionActive && recordingState === 'IDLE' && (
                <button
                  onClick={playCurrentStatement}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm mt-2"
                >
                  Play Statement Again
                </button>
              )}

              <p className="text-xs text-gray-400 mt-2">
                Statement {currentStatementIndex + 1} of {sessionAffirmations.length}
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* End Session Button */}
      <AnimatePresence>
        {isSessionActive && audioClips.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-sm mx-auto mt-4"
          >
            <GlassCard className="p-3">
              <div className="text-center">
                <p className="text-sm text-white mb-3">
                  {audioClips.length} clip{audioClips.length !== 1 ? 's' : ''} recorded
                </p>
                <button
                  onClick={endSession}
                  disabled={recordingState === 'ANALYZING'}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg shadow-purple-500/20"
                >
                  {recordingState === 'ANALYZING' ? 'Analyzing...' : 'End Session & Analyze'}
                </button>
              </div>
            </GlassCard>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHelp(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4" >
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e: any) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <GlassCard className="p-6 relative overflow-hidden" variant="purple">
                {/* Decorative background glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                    <MicrophoneWithWaves className="w-8 h-8 text-purple-primary" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">How it Works</h3>
                  <p className="text-sm text-text-muted mb-6 leading-relaxed">
                    We analyze your voice patterns to help you track your stress levels over time.
                  </p>

                  <div className="space-y-4 mb-8 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-surface/50 flex items-center justify-center text-xs font-mono text-purple-300 border border-white/5 mt-0.5">1</div>
                      <p className="text-sm text-gray-300 flex-1">Find a quiet, relaxed environment.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-surface/50 flex items-center justify-center text-xs font-mono text-purple-300 border border-white/5 mt-0.5">2</div>
                      <p className="text-sm text-gray-300 flex-1">Tap the button to start recording.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-surface/50 flex items-center justify-center text-xs font-mono text-purple-300 border border-white/5 mt-0.5">3</div>
                      <p className="text-sm text-gray-300 flex-1">Speak calmly and naturally for 10s.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-surface/50 flex items-center justify-center text-xs font-mono text-purple-300 border border-white/5 mt-0.5">4</div>
                      <p className="text-sm text-gray-300 flex-1">Your results will be compared to your baseline.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHelp(false)}
                    className="w-full py-3 bg-purple-primary hover:bg-purple-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25"
                  >
                    Got it
                  </button>
                </div>
              </GlassCard>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {permissionError && <div className="fixed bottom-0 left-0 right-0 p-4 bg-error-red/80 text-center text-white text-sm z-50">{permissionError}</div>}

      {/* Smart Options Overlay */}
      <SmartOptions
        options={smartOptions}
        onSelect={handleOptionSelect}
        isVisible={smartOptions.length > 0 && mode === 'ai' && isSessionActive}
      />
    </div>
  );
};

export default RecordingScreen;



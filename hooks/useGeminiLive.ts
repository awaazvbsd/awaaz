import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";
import { decode, encode, decodeAudioData } from '../utils/audio';
import { THERAPIST_SYSTEM_PROMPT, THERAPIST_INITIAL_USER_PROMPT, buildTherapistPrompt } from '../constants';
import type { LiveSessionQuestion, SessionPlan } from '../types';
import { generateId } from '../services/personalizationService';

const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 5000;
const CONNECTION_STABLE_DELAY_MS = 5000; // Connection must be open for 5s to be considered "stable" and reset retries

export const useGeminiLive = (
    stream: MediaStream | null,
    muted: boolean = true,
    sessionPlan?: SessionPlan | null  // Optional session plan for focus topic
) => {
    const [isConnected, setIsConnected] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(muted);
    const transcriptRef = useRef('');
    const isConnectedRef = useRef(false);

    // Use ref for muted state so the audio processor can access the latest value
    const mutedRef = useRef(muted);
    const [lastAgentResponse, setLastAgentResponse] = useState<string>('');

    const sessionRef = useRef<any | null>(null);
    const prevMutedRef = useRef<boolean>(muted);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const silentGainRef = useRef<GainNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);

    // Reconnection state tracking
    const shouldReconnectRef = useRef<boolean>(true);
    const reconnectAttemptsRef = useRef<number>(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const connectionStableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Live session Q&A tracking
    const [liveSessionQA, setLiveSessionQA] = useState<LiveSessionQuestion[]>([]);
    const lastAIQuestionRef = useRef<string | null>(null);
    const userResponseAccumulatorRef = useRef<string>('');

    const cleanup = useCallback(() => {
        // Clear any pending timers
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (connectionStableTimeoutRef.current) {
            clearTimeout(connectionStableTimeoutRef.current);
            connectionStableTimeoutRef.current = null;
        }

        if (sessionRef.current) {
            try {
                sessionRef.current.close();
            } catch (e) {
                console.warn("Error closing session:", e);
            }
            sessionRef.current = null;
        }
        if (scriptProcessorRef.current) {
            try {
                scriptProcessorRef.current.disconnect();
            } catch (e) { }
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            try {
                mediaStreamSourceRef.current.disconnect();
            } catch (e) { }
            mediaStreamSourceRef.current = null;
        }
        if (silentGainRef.current) {
            try { silentGainRef.current.disconnect(); } catch { }
            silentGainRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
        }
        setIsConnected(false);
        isConnectedRef.current = false;
    }, []);

    // Update isMuted state and ref when muted prop changes
    useEffect(() => {
        mutedRef.current = muted;
        setIsMuted(muted);
        // Attempt to resume contexts on unmute (user interaction just happened)
        if (!muted) {
            if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'running') {
                inputAudioContextRef.current.resume().catch(() => { });
            }
            if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'running') {
                outputAudioContextRef.current.resume().catch(() => { });
            }
        }

        // Detect transitions and inform the live session
        try {
            const wasMuted = prevMutedRef.current;
            if (sessionRef.current) {
                if (wasMuted && !muted) {
                    // Unmuted: resume
                } else if (!wasMuted && muted) {
                    // Muted: pause
                }
            }
        } finally {
            prevMutedRef.current = muted;
        }
    }, [muted]);

    useEffect(() => {
        if (!stream) {
            cleanup();
            return;
        }

        let isCancelled = false;
        // Allow reconnects when we have a valid stream unless explicitly disabled via disconnect
        shouldReconnectRef.current = true;
        reconnectAttemptsRef.current = 0; // Reset attempts on fresh start

        const connect = async () => {
            try {
                // Do not proceed if the component has unmounted.
                if (isCancelled) return;

                // Create a fresh instance each time to ensure the latest API key is used.
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY as string;
                if (!apiKey) {
                    throw new Error("API key not found");
                }
                const ai = new GoogleGenAI({ apiKey });

                if (sessionRef.current) return;

                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000, latencyHint: 'interactive' as any });
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'interactive' as any });

                // DEBUG Watchdog: Monitor AudioContext and Stream health independently of processing
                let watchdogCount = 0;
                const watchdogInterval = setInterval(() => {
                    if (isCancelled) { clearInterval(watchdogInterval); return; }
                    watchdogCount++;

                    const ctx = inputAudioContextRef.current;
                    const track = stream?.getAudioTracks()[0];
                    const isConnected = isConnectedRef.current;

                    // Only log health if there's a problem or every 10 seconds to reduce noise
                    if (ctx?.state === 'suspended' || !track || track.readyState === 'ended' || watchdogCount % 5 === 0) {
                        const trackInfo = track ? `ID:${track.id.substring(0, 4)} En:${track.enabled} Muted:${track.muted} St:${track.readyState}` : 'No Track';
                        console.log(`[GeminiWatchdog] Ctx:${ctx?.state} | Track:${trackInfo} | AppMuted:${mutedRef.current} | Proc:${!!scriptProcessorRef.current} | Connected:${isConnected}`);
                    }

                    if (ctx?.state === 'suspended' && isConnected) {
                        console.warn('[GeminiWatchdog] Context suspended! Forcing resume...');
                        ctx.resume();
                    }
                }, 2000);

                const sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',

                    callbacks: {
                        onopen: () => {
                            if (isCancelled) return;
                            setIsConnected(true);
                            isConnectedRef.current = true;
                            setError(null);

                            // Only reset reconnection attempts after connection has been stable for a while
                            // This prevents infinite loops if connection opens and immediately closes
                            if (connectionStableTimeoutRef.current) {
                                clearTimeout(connectionStableTimeoutRef.current);
                            }
                            connectionStableTimeoutRef.current = setTimeout(() => {
                                console.log('Gemini Live connection became stable - resetting retry counter');
                                reconnectAttemptsRef.current = 0;
                            }, CONNECTION_STABLE_DELAY_MS);

                            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                            mediaStreamSourceRef.current = source;
                            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(1024, 1, 1);
                            scriptProcessorRef.current = scriptProcessor;

                            let frameCount = 0;
                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                // Diagnostic checks every ~2 seconds
                                frameCount++;
                                if (frameCount % 100 === 0) {
                                    const ctxState = inputAudioContextRef.current?.state;
                                    const track = stream?.getAudioTracks()[0];
                                    const trackInfo = track ? `En:${track.enabled} Muted:${track.muted} Ready:${track.readyState}` : 'No Track';

                                    if (ctxState === 'suspended') {
                                        console.warn(`[GeminiLive] Context suspended! Attempting resume. Track: ${trackInfo}`);
                                        inputAudioContextRef.current?.resume();
                                    }
                                }

                                // Only send audio data if not muted (use ref to get current value)
                                if (!mutedRef.current) {
                                    try {
                                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

                                        // Downsample to 16000Hz (Gemini Requirement)
                                        // Browser typically gives 44100 or 48000. Gemini expects 16000 via our mimeType header.
                                        const inputSampleRate = inputAudioContextRef.current?.sampleRate || 48000;
                                        let dataToSend = inputData;

                                        if (inputSampleRate > 16000) {
                                            const ratio = inputSampleRate / 16000;
                                            const newLength = Math.floor(inputData.length / ratio);
                                            const downsampled = new Float32Array(newLength);

                                            for (let i = 0; i < newLength; i++) {
                                                const originalIndex = i * ratio;
                                                const idx1 = Math.floor(originalIndex);
                                                const idx2 = Math.min(idx1 + 1, inputData.length - 1);
                                                const frac = originalIndex - idx1;
                                                downsampled[i] = inputData[idx1] * (1 - frac) + inputData[idx2] * frac;
                                            }
                                            dataToSend = downsampled;
                                        }

                                        // Debug: check volume levels occasionally (every ~5 seconds)
                                        if (frameCount % 250 === 0) {
                                            let maxAmp = 0;
                                            for (let i = 0; i < dataToSend.length; i++) maxAmp = Math.max(maxAmp, Math.abs(dataToSend[i]));

                                            // Only warn if truly silent and we are unmuted
                                            if (maxAmp < 0.0001 && !mutedRef.current) {
                                                console.warn('[GeminiLive] Mic Input SILENT. MaxAmp:', maxAmp.toFixed(6));
                                            }
                                        }

                                        const pcmBlob = createPcmBlob(dataToSend);
                                        sessionPromise.then((session) => {
                                            // rigorous check: active session, matching the promise, and not in cleanup
                                            if (sessionRef.current === session && isConnectedRef.current) {
                                                try {
                                                    session.sendRealtimeInput({ media: pcmBlob });
                                                    if (frameCount % 50 === 0) {
                                                        console.log(`[GeminiLive] Sending audio chunk ${frameCount}. Size: ${pcmBlob.data.length}`);
                                                    }
                                                } catch (e) {
                                                    // transport errors can occur if session is transitioning
                                                    console.warn('Error sending audio data:', e);
                                                }
                                            }
                                        });
                                    } catch { }
                                } else if (frameCount % 100 === 0) {
                                    console.log('[GeminiLive] Skipping audio frame (App Muted)');
                                }
                            };
                            // Connect through a silent gain node to keep the graph active without audible loopback
                            const silentGain = inputAudioContextRef.current!.createGain();
                            silentGain.gain.value = 0;
                            silentGainRef.current = silentGain;

                            source.connect(scriptProcessor);
                            scriptProcessor.connect(silentGain);
                            silentGain.connect(inputAudioContextRef.current!.destination);

                            // Connection established - waiting for user input
                            console.log('Gemini Live connected - waiting for user voice');
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (message.serverContent?.outputTranscription) {
                                transcriptRef.current += message.serverContent.outputTranscription.text;
                                setTranscript(transcriptRef.current);
                            }
                            if (message.serverContent?.turnComplete) {
                                const completedResponse = transcriptRef.current;
                                setLastAgentResponse(completedResponse);

                                // Check if AI asked a question (store for Q&A tracking)
                                if (completedResponse.includes('?')) {
                                    lastAIQuestionRef.current = completedResponse;
                                    userResponseAccumulatorRef.current = ''; // Reset user response
                                }

                                // If we have a pending question and user has responded, store the Q&A
                                if (userResponseAccumulatorRef.current.trim()) {
                                    const qa: LiveSessionQuestion = {
                                        questionId: generateId(),
                                        questionText: lastAIQuestionRef.current || "User Statement", // Capture even if no question was asked
                                        timestamp: new Date().toISOString(),
                                        studentAnswer: userResponseAccumulatorRef.current.trim()
                                    };
                                    setLiveSessionQA(prev => [...prev, qa]);
                                    console.log('[LiveQA] Captured Interaction:', qa);

                                    // Reset after capturing
                                    lastAIQuestionRef.current = null;
                                    userResponseAccumulatorRef.current = '';
                                }

                                transcriptRef.current = '';
                                setTranscript('');
                            }

                            // Track user input transcriptions (if available from speech-to-text)
                            if (message.serverContent?.inputTranscription) {
                                userResponseAccumulatorRef.current += message.serverContent.inputTranscription.text || '';
                            }

                            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData && outputAudioContextRef.current) {
                                const audioContext = outputAudioContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                                const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContext.destination);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                            console.error('Gemini Live Error:', e);
                            const errorMessage = e.message || '';

                            // Check for Rate Limiting / Quota errors
                            if (errorMessage.includes("429") ||
                                errorMessage.toLowerCase().includes("quota") ||
                                errorMessage.toLowerCase().includes("too many requests")) {
                                setError("Usage limit exceeded. Please try again later.");
                                shouldReconnectRef.current = false; // Stop retrying immediately
                                return;
                            }

                            if (errorMessage.includes("API key") || errorMessage.includes("entity was not found")) {
                                setError("Connection failed. Please verify your API key and try again.");
                                shouldReconnectRef.current = false; // Don't retry on auth errors
                            } else {
                                setError('A connection error occurred with the AI assistant.');
                            }
                            // Cleanup will be called by onclose, or manually if needed
                        },
                        onclose: (event: CloseEvent) => {
                            if (isCancelled) return;
                            console.log(`Gemini Live connection closed: ${event.code} - ${event.reason}`);
                            setIsConnected(false);

                            // Cancel stable check if it was pending
                            if (connectionStableTimeoutRef.current) {
                                clearTimeout(connectionStableTimeoutRef.current);
                                connectionStableTimeoutRef.current = null;
                            }

                            cleanup();

                            // Reconnection Check (only if not cancelled by rate limit logic in onerror)
                            if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                                const delay = Math.min(
                                    INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
                                    MAX_RECONNECT_DELAY_MS
                                );

                                console.log(`Attempting reconnect ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

                                reconnectTimeoutRef.current = setTimeout(() => {
                                    if (!isCancelled && stream && !sessionRef.current && shouldReconnectRef.current) {
                                        // Best-effort resume contexts before reconnect
                                        try { inputAudioContextRef.current?.resume().catch(() => { }); } catch { }
                                        try { outputAudioContextRef.current?.resume().catch(() => { }); } catch { }

                                        reconnectAttemptsRef.current++;
                                        connect().catch(console.error);
                                    }
                                }, delay);
                            } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                                console.warn('Max reconnection attempts reached');
                                setError("Unable to maintain a stable connection. Please check your internet.");
                            }
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        outputAudioTranscription: {},
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
                        },
                        // Use dynamic prompt if session plan has focus topic
                        systemInstruction: sessionPlan?.focusTopic
                            ? buildTherapistPrompt(sessionPlan.focusTopic, sessionPlan.focusIntensity)
                            : THERAPIST_SYSTEM_PROMPT,
                        inputAudioTranscription: {},
                    },
                });

                sessionRef.current = await sessionPromise;
            } catch (err) {
                console.error("Failed to start Gemini Live session:", err);
                const errorMessage = err instanceof Error ? err.message : String(err);

                if (errorMessage.includes("API key") || errorMessage.includes("entity was not found")) {
                    setError("Could not start AI assistant. Your API key might be invalid.");
                    shouldReconnectRef.current = false;
                } else if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
                    setError("Usage limit exceeded. Please try again later.");
                    shouldReconnectRef.current = false;
                } else {
                    setError("Could not start AI assistant. Please check microphone permissions.");
                }
            }
        };

        connect();

        return () => {
            isCancelled = true;
            shouldReconnectRef.current = false;
            cleanup();
        };
    }, [stream, cleanup]);

    const createPcmBlob = (data: Float32Array): GenaiBlob => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const disconnect = useCallback(() => {
        console.log('Disconnecting Gemini Live session manually');

        // Clone current state to avoid mutation
        const finalQA = [...liveSessionQA];

        // Capture any pending user input that hasn't been saved yet (e.g. at end of session)
        if (userResponseAccumulatorRef.current && userResponseAccumulatorRef.current.trim()) {
            const qa: LiveSessionQuestion = {
                questionId: generateId(),
                questionText: lastAIQuestionRef.current || "Final User Statement",
                timestamp: new Date().toISOString(),
                studentAnswer: userResponseAccumulatorRef.current.trim()
            };
            setLiveSessionQA(prev => [...prev, qa]);
            finalQA.push(qa);
            console.log('[LiveQA] Captured Final Interaction on Disconnect:', qa);
        }

        // Prevent auto-reconnect and tear down resources
        shouldReconnectRef.current = false;
        cleanup();

        return finalQA;
    }, [cleanup, liveSessionQA]);

    const sendText = useCallback((text: string) => {
        if (sessionRef.current && isConnected) {
            try {
                console.log('[sendText] Sending to Gemini:', text);
                // Use sendClientContent for text messages
                sessionRef.current.sendClientContent({
                    turns: text,
                    turnComplete: true
                });
            } catch (e) {
                console.error("[sendText] Failed to send text:", e);
            }
        } else {
            console.warn('[sendText] No active session');
        }
    }, [isConnected]);

    // Clear live session Q&A (useful for new sessions)
    const clearLiveSessionQA = useCallback(() => {
        setLiveSessionQA([]);
        lastAIQuestionRef.current = null;
        userResponseAccumulatorRef.current = '';
    }, []);

    return { isConnected, transcript, error, isMuted, disconnect, lastAgentResponse, sendText, liveSessionQA, clearLiveSessionQA };
};

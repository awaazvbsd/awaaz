import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calibrationQuotes } from '../constants';
import { webmBlobToWavMono16k } from '../utils/audio';
import { extractFeaturesWithPraat } from '../services/praat';
import { BACKEND_URL } from '../config';
import { Microphone, MicrophoneFilled, RefreshIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { BeamsBackground } from './ui/beams-background';

interface CalibrationScreenProps {
  onComplete: (baselineJson: string) => void;
  onClose: () => void;
}

type CalibrationStatus = 'IDLE' | 'RECORDING' | 'SAVED' | 'PROCESSING' | 'ERROR';
const SAMPLES_NEEDED = 5;

const CalibrationScreen: React.FC<CalibrationScreenProps> = ({ onComplete, onClose }) => {
  const [status, setStatus] = useState<CalibrationStatus>('IDLE');
  const [currentQuote, setCurrentQuote] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [samples, setSamples] = useState(0);
  const [currentSample, setCurrentSample] = useState(0);
  const [canProceed, setCanProceed] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const allRecordedBlobs = useRef<Blob[]>([]);
  const usedQuoteIndices = useRef<Set<number>>(new Set());

  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const getNewQuote = useCallback(() => {
    if (usedQuoteIndices.current.size >= calibrationQuotes.length) {
      usedQuoteIndices.current.clear();
    }
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * calibrationQuotes.length);
    } while (usedQuoteIndices.current.has(newIndex) && calibrationQuotes.length > usedQuoteIndices.current.size);

    usedQuoteIndices.current.add(newIndex);
    setCurrentQuote(calibrationQuotes[newIndex]);
  }, []);

  useEffect(() => {
    getNewQuote();
  }, []);

  const getMicrophonePermission = useCallback(async () => {
    if (stream) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      setPermissionError(null);
    } catch (err) {
      setPermissionError("Microphone access is required for calibration. Please enable it in your browser settings.");
    }
  }, [stream]);

  useEffect(() => {
    getMicrophonePermission();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [getMicrophonePermission, stream]);

  const drawWaveform = useCallback(() => {
    if (status !== 'RECORDING' || !analyserRef.current || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const numBars = 32;
    const barWidth = width / numBars - 2;
    const barHeights = new Array(numBars).fill(0);
    const sliceWidth = Math.floor(dataArray.length / numBars);

    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let j = 0; j < sliceWidth; j++) sum += Math.abs(dataArray[i * sliceWidth + j] - 128);
      barHeights[i] = (sum / sliceWidth) / 128.0;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0.2, '#A855F7');
    gradient.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = gradient;

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + 2);
      const barHeight = Math.max(4, barHeights[i] * height);
      ctx.fillRect(x, (height - barHeight) / 2, barWidth, barHeight);
    }
    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [status]);


  const handleStartRecording = () => {
    if (!stream || status === 'RECORDING' || samples >= SAMPLES_NEEDED) return;
    setStatus('RECORDING');
    setPermissionError(null);
    audioChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
    mediaRecorderRef.current.start();

    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  const handleStopRecording = () => {
    if (status !== 'RECORDING') return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (waveformCanvasRef.current) {
      const ctx = waveformCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, waveformCanvasRef.current.width, waveformCanvasRef.current.height);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 2000) { // Basic check for valid recording
          allRecordedBlobs.current.push(audioBlob);
          setSamples(prev => prev + 1);
          setCurrentSample(prev => prev + 1);
          setCanProceed(true);
        }
      };
      mediaRecorderRef.current.stop();
    }
    setStatus('IDLE');
  };

  const handleNext = () => {
    if (currentSample < SAMPLES_NEEDED) {
      getNewQuote();
      setCanProceed(false);
    }
  };

  const processAndSaveBaseline = async () => {
    if (allRecordedBlobs.current.length < SAMPLES_NEEDED) {
      setPermissionError(`Please record ${SAMPLES_NEEDED} samples.`);
      return;
    }
    setStatus('PROCESSING');
    try {
      const feats: { rms: number; zcr: number; spectralCentroid: number; spectralFlatness: number; mfcc: number[] }[] = [];
      for (const blob of allRecordedBlobs.current) {
        const wav = await webmBlobToWavMono16k(blob);
        const f = await extractFeaturesWithPraat(wav, BACKEND_URL);
        feats.push(f);
      }
      if (feats.length < SAMPLES_NEEDED) {
        throw new Error("Could not extract enough clear speech. Please record in a quieter environment.");
      }

      const avgFeatures = {
        rms: feats.reduce((sum, f) => sum + f.rms, 0) / feats.length,
        zcr: feats.reduce((sum, f) => sum + f.zcr, 0) / feats.length,
        spectralCentroid: feats.reduce((sum, f) => sum + f.spectralCentroid, 0) / feats.length,
        spectralFlatness: feats.reduce((sum, f) => sum + f.spectralFlatness, 0) / feats.length,
      };

      const numMfccs = feats[0].mfcc.length;
      const avgMfcc = new Array(numMfccs).fill(0);
      for (const f of feats) {
        for (let i = 0; i < numMfccs; i++) {
          avgMfcc[i] += f.mfcc[i];
        }
      }
      for (let i = 0; i < numMfccs; i++) avgMfcc[i] /= feats.length;

      const baselineData = { ...avgFeatures, mfcc: avgMfcc };
      setStatus('SAVED');

      // Show celebration animation
      setTimeout(() => {
        onComplete(JSON.stringify(baselineData));
      }, 2000);
    } catch (error) {
      console.error("Calibration Error:", error);
      setStatus('ERROR');
      setPermissionError(error instanceof Error ? error.message : "An unknown error occurred during calibration.");
    }
  };

  const getButtonText = () => {
    if (status === 'PROCESSING') return 'Processing...';
    if (status === 'SAVED') return 'Baseline Saved!';
    return 'Finish & Save Baseline';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-between p-4 pt-12 pb-8"
      style={{
        backgroundColor: 'transparent'
      }}
    >
      <BeamsBackground intensity="medium" className="!z-30" />
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-2xl hover:bg-white/20">&times;</button>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Voice Calibration</h1>
          <p className="text-text-muted mt-2 max-w-sm mx-auto">To establish your vocal baseline, please read the following phrases in a calm, neutral voice while holding the record button.</p>
        </div>

        <div className="relative w-full max-w-md p-6 bg-surface rounded-2xl border border-purple-primary/30 shadow-2xl shadow-black/40">
          <AnimatePresence mode="wait">
            <motion.p key={currentQuote} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="text-lg text-center text-white min-h-[60px] flex items-center justify-center">
              "{currentQuote}"
            </motion.p>
          </AnimatePresence>
          <button onClick={getNewQuote} disabled={status === 'RECORDING'} className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 bg-purple-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50">
            <RefreshIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="w-full flex flex-col items-center">
          <p className="text-lg font-medium text-white mb-4 tabular-nums">{samples} / {SAMPLES_NEEDED} Samples Recorded</p>
          <div className="w-full max-w-xs h-1 bg-surface rounded-full mb-6">
            <motion.div className="h-1 bg-gradient-to-r from-purple-dark to-purple-light rounded-full" initial={{ width: 0 }} animate={{ width: `${(samples / SAMPLES_NEEDED) * 100}%` }} />
          </div>

          <canvas ref={waveformCanvasRef} width="280" height="60" className="h-[60px] w-[280px] mb-6"></canvas>

          <div className="flex items-center gap-4 mb-4">
            <motion.button
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onMouseLeave={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              disabled={!stream || samples >= SAMPLES_NEEDED}
              className="w-24 h-24 rounded-full flex items-center justify-center bg-purple-primary/20 border-2 border-purple-primary shadow-lg disabled:opacity-50"
              whileTap={{ scale: status === 'RECORDING' ? 1 : 0.9 }}
              animate={{ scale: status === 'RECORDING' ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <MicrophoneFilled className="w-10 h-10 text-white" />
            </motion.button>

            {canProceed && currentSample < SAMPLES_NEEDED && (
              <motion.button
                onClick={handleNext}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-primary shadow-lg hover:bg-purple-primary/80 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            )}
          </div>

          <p className="text-sm text-text-muted text-center">
            {samples >= SAMPLES_NEEDED ? "Calibration samples complete!" :
              status === 'RECORDING' ? "Hold to record, release when done" :
                "Press and hold to record"}
          </p>
        </div>

        <div className="w-full max-w-md">
          {status === 'SAVED' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-14 rounded-2xl flex items-center justify-center font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
            >
              <span className="mr-2">🎉</span>
              Baseline Saved Successfully!
            </motion.div>
          ) : (
            <button onClick={processAndSaveBaseline} disabled={samples < SAMPLES_NEEDED || status === 'PROCESSING' || status === 'SAVED'} className="w-full h-14 rounded-2xl flex items-center justify-center font-bold text-white bg-gradient-to-r from-purple-dark to-purple-primary shadow-lg shadow-purple-dark/30 hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:hover:scale-100">
              {getButtonText()}
            </button>
          )}
        </div>

        {permissionError && <div className="fixed bottom-0 left-0 right-0 p-3 bg-error-red/90 text-center text-white text-sm z-50">{permissionError}</div>}
      </div>
    </motion.div>
  );
};

export default CalibrationScreen;

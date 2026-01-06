import React, { useState, useEffect, useRef, useCallback } from 'react';
import { webmBlobToWavMono16k } from '../utils/audio';
import { extractFeaturesWithPraat } from '../services/praat';
import { BACKEND_URL } from '../config';
import { StorageService } from '../services/storageService';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceCalibrationProps {
  onComplete?: (baselineJson: string) => void;
  onError?: (error: string) => void;
}

type CalibrationStatus = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

const VoiceCalibration: React.FC<VoiceCalibrationProps> = ({ onComplete, onError }) => {
  const [status, setStatus] = useState<CalibrationStatus>('IDLE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [hasBaseline, setHasBaseline] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check if baseline exists on mount
  useEffect(() => {
    const storedBaseline = StorageService.getItem<string>('voiceBaseline');
    setHasBaseline(!!storedBaseline);
  }, []);

  const getMicrophonePermission = useCallback(async () => {
    if (stream) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 44100, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      setStream(mediaStream);
      setPermissionError(null);
    } catch (err) {
      const errorMsg = "Microphone access is required for calibration. Please enable it in your browser settings.";
      setPermissionError(errorMsg);
      if (onError) onError(errorMsg);
    }
  }, [stream, onError]);

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
      for (let j = 0; j < sliceWidth; j++) {
        sum += Math.abs(dataArray[i * sliceWidth + j] - 128);
      }
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
    if (!stream || status === 'RECORDING') return;
    setStatus('RECORDING');
    setPermissionError(null);
    audioChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
    mediaRecorderRef.current.start();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  const handleStopRecording = async () => {
    if (status !== 'RECORDING') return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (waveformCanvasRef.current) {
      const ctx = waveformCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, waveformCanvasRef.current.width, waveformCanvasRef.current.height);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 2000) {
          await processAndSaveBaseline(audioBlob);
        } else {
          setStatus('ERROR');
          const errorMsg = "Recording too short. Please record a longer sample.";
          setPermissionError(errorMsg);
          if (onError) onError(errorMsg);
        }
      };
      mediaRecorderRef.current.stop();
    }
    setStatus('PROCESSING');
  };

  const processAndSaveBaseline = async (audioBlob: Blob) => {
    try {
      setStatus('PROCESSING');
      // Convert to WAV format
      const wav = await webmBlobToWavMono16k(audioBlob);
      // Extract features using Praat
      const features = await extractFeaturesWithPraat(wav, BACKEND_URL);

      // Save baseline features (no stress levels)
      const baselineData = {
        rms: features.rms,
        zcr: features.zcr,
        spectralCentroid: features.spectralCentroid,
        spectralFlatness: features.spectralFlatness,
        mfcc: features.mfcc,
        timestamp: new Date().toISOString()
      };

      const baselineJson = JSON.stringify(baselineData);
      StorageService.setItem('voiceBaseline', baselineJson, 'default', 'state');
      setHasBaseline(true);
      setStatus('SUCCESS');

      // Show success message briefly, then reset
      setTimeout(() => {
        setStatus('IDLE');
      }, 2000);

      if (onComplete) {
        onComplete(baselineJson);
      }
    } catch (error) {
      console.error("Calibration Error:", error);
      setStatus('ERROR');
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred during calibration.";
      setPermissionError(errorMsg);
      if (onError) onError(errorMsg);
    }
  };

  const handleReCalibrate = () => {
    setStatus('IDLE');
    setPermissionError(null);
  };

  return (
    <div className="voice-calibration-widget">
      <style>{`
        .voice-calibration-widget {
          width: 100%;
          max-width: 400px;
          padding: 20px;
          background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
          border-radius: 20px;
          border: 1px solid #333333;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .calibration-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          text-align: center;
          margin: 0;
        }

        .calibration-description {
          font-size: 14px;
          color: #a0a0a0;
          text-align: center;
          margin: 0;
          line-height: 1.5;
        }

        .calibration-status {
          font-size: 12px;
          color: #a855f7;
          text-align: center;
          margin: 0;
          min-height: 16px;
        }

        .calibration-canvas {
          width: 100%;
          max-width: 280px;
          height: 60px;
          background: #0d0d0d;
          border-radius: 8px;
        }

        .calibration-button {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid #a855f7;
          background: ${status === 'RECORDING' ? 'rgba(168, 85, 247, 0.2)' : 'transparent'};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .calibration-button:hover:not(:disabled) {
          background: rgba(168, 85, 247, 0.1);
          transform: scale(1.05);
        }

        .calibration-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .calibration-button.recording {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(168, 85, 247, 0);
          }
        }

        .calibration-error {
          color: #ef4444;
          font-size: 12px;
          text-align: center;
          margin: 0;
          min-height: 16px;
        }

        .calibration-success {
          color: #10b981;
          font-size: 14px;
          text-align: center;
          margin: 0;
          font-weight: 600;
        }

        .baseline-indicator {
          font-size: 12px;
          color: #10b981;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .baseline-indicator::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
        }
      `}</style>

      <h3 className="calibration-title">Voice Calibration</h3>
      <p className="calibration-description">
        Record a baseline voice sample to establish your voice profile. You can re-calibrate anytime.
      </p>

      {hasBaseline && status === 'IDLE' && (
        <div className="baseline-indicator">
          Baseline saved
        </div>
      )}

      <canvas
        ref={waveformCanvasRef}
        width="280"
        height="60"
        className="calibration-canvas"
      />

      <AnimatePresence mode="wait">
        {status === 'SUCCESS' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="calibration-success"
          >
            ✓ Baseline saved successfully!
          </motion.div>
        ) : (
          <motion.div
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onMouseLeave={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              disabled={!stream || status === 'PROCESSING' || status === 'SUCCESS'}
              className={`calibration-button ${status === 'RECORDING' ? 'recording' : ''}`}
            >
              {status === 'PROCESSING' ? (
                <div style={{ width: '24px', height: '24px', border: '3px solid #a855f7', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <svg style={{ width: '24px', height: '24px', fill: '#a855f7' }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-12 0v1.5a6 6 0 006 6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75V18.75m0 0A3 3 0 0112 21.75a3 3 0 01-3-3h6zM12 5.25A3.75 3.75 0 008.25 9v.75a3.75 3.75 0 007.5 0V9A3.75 3.75 0 0012 5.25z" />
                </svg>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="calibration-status">
        {status === 'RECORDING' && 'Hold to record...'}
        {status === 'PROCESSING' && 'Processing...'}
        {status === 'IDLE' && !hasBaseline && 'Press and hold to record'}
        {status === 'IDLE' && hasBaseline && 'Press and hold to re-calibrate'}
      </div>

      {permissionError && (
        <div className="calibration-error">
          {permissionError}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VoiceCalibration;


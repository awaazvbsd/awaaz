
import React, { useCallback } from 'react';
import RecordingScreen from './RecordingScreen';
import type { AnalysisData, PreAnalysisSession } from '../types';
import { motion } from 'framer-motion';

interface VoiceAnalysisModalProps {
  onClose: () => void;
  onAnalysisReady: (data: AnalysisData) => void;
  baselineData: string | null;
  audioBlob?: Blob | null;
  preAnalysisSession?: PreAnalysisSession;
}

const VoiceAnalysisModal: React.FC<VoiceAnalysisModalProps> = ({
  onClose,
  onAnalysisReady,
  baselineData,
  audioBlob,
  preAnalysisSession,
}) => {

  const handleAnalysisComplete = useCallback((data: AnalysisData) => {
    onAnalysisReady(data);
  }, [onAnalysisReady]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-lg z-40 flex flex-col"
    >
      <RecordingScreen
        onAnalysisComplete={handleAnalysisComplete}
        baselineData={baselineData}
        audioBlob={audioBlob}
        onClose={onClose}
        preAnalysisSession={preAnalysisSession}
      />

    </motion.div>
  );
};

export default VoiceAnalysisModal;


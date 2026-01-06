import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalibrationSuccessPopupProps {
  isOpen: boolean;
  onContinue: () => void;
}

const CalibrationSuccessPopup: React.FC<CalibrationSuccessPopupProps> = ({ isOpen, onContinue }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={onContinue}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-indigo-900/30 rounded-3xl p-8 border border-purple-500/30 shadow-2xl overflow-hidden"
          >
            {/* Animated Gradient Orbs in Background */}
            <motion.div
              className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/30 to-indigo-500/30 rounded-full blur-3xl"
              animate={{
                x: [0, 20, 0],
                y: [0, -20, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 rounded-full blur-3xl"
              animate={{
                x: [0, -20, 0],
                y: [0, 20, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Content */}
            <div className="relative z-10 text-center">
              {/* Animated Success Icon with Pulsing Halo */}
              <motion.div
                className="relative inline-block mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
              >
                {/* Pulsing Halo */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 blur-xl"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />

                {/* Success Circle */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/50">
                  {/* Animated Checkmark */}
                  <motion.svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: 0.3, ease: 'easeInOut' }}
                    />
                  </motion.svg>
                </div>
              </motion.div>

              {/* Staggered Text Animation */}
              <motion.h2
                className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Calibration Complete!
              </motion.h2>

              <motion.p
                className="text-gray-300 text-base mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                Your voice baseline has been successfully saved. We'll use this to provide personalized stress analysis.
              </motion.p>

              {/* Enhanced Button */}
              <motion.button
                onClick={onContinue}
                className="relative group w-full py-4 px-8 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 rounded-2xl text-white font-semibold text-lg overflow-hidden shadow-xl shadow-purple-500/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Shimmer Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: 'linear',
                  }}
                />

                {/* Button Content */}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Continue
                  {/* Animated Arrow */}
                  <motion.svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    animate={{
                      x: [0, 4, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <path
                      d="M5 12h14m-7-7l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CalibrationSuccessPopup;


import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartOptionsProps {
    options: string[];
    onSelect: (option: string) => void;
    isVisible: boolean;
}

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

const SmartOptions: React.FC<SmartOptionsProps> = ({ options, onSelect, isVisible }) => {
    return (
        <AnimatePresence>
            {isVisible && options.length > 0 && (
                <MotionDiv
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute bottom-32 sm:bottom-28 left-0 right-0 z-50 flex flex-col items-center justify-end px-4 pointer-events-none"
                >
                    <div className="flex flex-wrap gap-3 justify-center max-w-2xl pointer-events-auto">
                        {options.map((option, index) => (
                            <MotionButton
                                key={index}
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: index * 0.08, duration: 0.2 }}
                                onClick={() => onSelect(option)}
                                className="px-5 py-2.5 rounded-full text-white font-medium text-sm hover:scale-105 active:scale-95 transition-transform"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(109, 40, 217, 0.9) 100%)',
                                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                }}
                            >
                                {option}
                            </MotionButton>
                        ))}
                    </div>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

export default SmartOptions;


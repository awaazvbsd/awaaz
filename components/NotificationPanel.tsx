import React, { useState, useEffect, useRef } from 'react';
import { GlassCalendar } from './ui/glass-calendar';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { X } from './Icons';

interface NotificationPanelProps {
  sessionDates?: Set<string>;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ sessionDates = new Set() }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dates, setDates] = useState<Set<string>>(sessionDates);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Load session dates from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        const studentCode = parsedUserData.accountNumber;

        // Get all students data
        const allStudentsData = localStorage.getItem('allStudentsData');
        if (allStudentsData) {
          const studentsData = JSON.parse(allStudentsData);
          const student = studentsData.find((s: any) => s.code === studentCode);

          if (student && student.analysisHistory) {
            // Extract dates from analysis history
            const dateSet = new Set<string>();
            student.analysisHistory.forEach((analysis: any) => {
              if (analysis.date) {
                const date = new Date(analysis.date);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                dateSet.add(dateStr);
              }
            });
            setDates(dateSet);
          }
        }
      } catch (error) {
        console.error('Error loading session dates:', error);
      }
    }
  }, []);

  const today = new Date();
  const todayDateStr = format(today, 'd');

  // Calendar Icon Component
  const CalendarIcon: React.FC<{ date: string }> = ({ date }) => (
    <svg
      width="28"
      height="32"
      viewBox="0 0 28 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white"
    >
      {/* Main calendar body - large vertical rectangle with rounded corners */}
      <rect
        x="2"
        y="6"
        width="24"
        height="24"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Top header bar - horizontal bar */}
      <rect x="2" y="6" width="24" height="6" rx="2.5" fill="currentColor" />
      {/* Dividing line between header and body */}
      <line x1="2" y1="12" x2="26" y2="12" stroke="currentColor" strokeWidth="1.5" />
      {/* Left binding tab - rounded vertical tab extending upward */}
      <rect x="6" y="0" width="4" height="7" rx="2" fill="currentColor" />
      {/* Right binding tab - rounded vertical tab extending upward */}
      <rect x="18" y="0" width="4" height="7" rx="2" fill="currentColor" />
      {/* Date text inside the empty space */}
      <text
        x="14"
        y="27"
        textAnchor="middle"
        fill="currentColor"
        fontSize="12"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {date}
      </text>
    </svg>
  );

  return (
    <>
      {/* Calendar Button */}
      <button
        ref={calendarButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-primary/50 ${isOpen ? 'bg-purple-500/20 border border-purple-500/50 z-[60]' : ''
          }`}
        style={{ zIndex: isOpen ? 60 : 'auto' }}
        aria-label={isOpen ? "Close session history calendar" : "View session history calendar"}
        title="View Session History - See dates when you completed sessions"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <CalendarIcon date={todayDateStr} />
          )}
        </motion.div>
      </button>

      {/* Panel Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.85,
                y: 40,
                x: 20
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                x: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.85,
                y: 40,
                x: 20
              }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 200,
                duration: 0.3
              }}
              className="fixed right-4 bottom-28 w-full max-w-[400px] max-h-[calc(80vh-140px)] z-50 p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {/* Calendar Component */}
                <GlassCalendar
                  selectedDate={new Date()}
                  onDateSelect={(date) => {
                    console.log('Date selected:', date);
                  }}
                  sessionDates={dates}
                  className="mx-auto"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationPanel;


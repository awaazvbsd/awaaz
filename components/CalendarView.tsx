import React, { useState, useEffect } from 'react';

// --- Icon Components ---
const CalendarButtonIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// --- Button Component ---
const CalendarButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F0E7D5]/50"
            aria-label="Open calendar"
        >
            <CalendarButtonIcon />
            <span className="font-semibold">View History</span>
        </button>
    );
};

// --- Modal Component ---
const CalendarModal: React.FC<{ isOpen: boolean; onClose: () => void; sessionDates: Set<string> }> = ({ isOpen, onClose, sessionDates }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const calendarDays = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(<div key={`blank-${i}`} className="w-full aspect-square"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const hasSession = sessionDates.has(dateStr);

            calendarDays.push(
                <div 
                    key={`day-${i}`} 
                    className={`w-full aspect-square rounded-[3px] flex items-center justify-center text-xs font-medium ${
                        hasSession 
                            ? 'bg-purple-primary text-white' 
                            : 'bg-[#212842] text-[#F0E7D5]/50'
                    }`}
                >
                    {i}
                </div>
            );
        }

        return calendarDays;
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-modal-title"
        >
            <div 
                className="bg-[#2c3454] rounded-3xl shadow-2xl w-full max-w-sm flex flex-col p-6 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`
                  @keyframes fade-in-scale {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                  }
                  .animate-fade-in-scale {
                    animation: fade-in-scale 0.2s ease-out forwards;
                  }
                `}</style>
                <button 
                    onClick={onClose} 
                    aria-label="Close calendar" 
                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <header className="flex items-center justify-between mb-4">
                     <button onClick={handlePrevMonth} aria-label="Previous month" className="p-2 rounded-full hover:bg-white/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 id="calendar-modal-title" className="text-lg font-semibold">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextMonth} aria-label="Next month" className="p-2 rounded-full hover:bg-white/20 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </header>
                <section>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#F0E7D5]/70 font-medium mb-2">
                        {daysOfWeek.map((day) => (
                            <div key={day}>{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>
                </section>
            </div>
        </div>
    );
};

// --- Main Exported Component ---
const CalendarView: React.FC = () => {
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [sessionDates, setSessionDates] = useState<Set<string>>(new Set());

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
            const dates = new Set<string>();
            student.analysisHistory.forEach((analysis: any) => {
              if (analysis.date) {
                const date = new Date(analysis.date);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                dates.add(dateStr);
              }
            });
            setSessionDates(dates);
          }
        }
      } catch (error) {
        console.error('Error loading session dates:', error);
      }
    }
  }, []);

  return (
    <>
      <CalendarButton onClick={() => setCalendarOpen(true)} />
      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setCalendarOpen(false)}
        sessionDates={sessionDates}
      />
    </>
  );
}

export default CalendarView;


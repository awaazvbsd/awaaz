import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isToday, getDate, getDaysInMonth, startOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Day {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
}

interface GlassCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
  sessionDates?: Set<string>;
}

const ScrollbarHide = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

export const GlassCalendar = React.forwardRef<HTMLDivElement, GlassCalendarProps>(
  ({ className, selectedDate: propSelectedDate, onDateSelect, sessionDates = new Set(), ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(propSelectedDate || new Date());
    const [selectedDate, setSelectedDate] = React.useState(propSelectedDate || new Date());
    const [viewMode, setViewMode] = React.useState<'weekly' | 'monthly'>('weekly');

    const days = React.useMemo(() => {
      if (viewMode === 'weekly') {
        const start = startOfMonth(currentMonth);
        const totalDays = getDaysInMonth(currentMonth);
        const days: Day[] = [];
        for (let i = 0; i < totalDays; i++) {
          const date = new Date(start.getFullYear(), start.getMonth(), i + 1);
          days.push({
            date,
            isToday: isToday(date),
            isSelected: isSameDay(date, selectedDate),
          });
        }
        return days;
      } else {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);
        const daysInRange = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        
        return daysInRange.map(date => ({
          date,
          isToday: isToday(date),
          isSelected: isSameDay(date, selectedDate),
        }));
      }
    }, [currentMonth, selectedDate, viewMode]);

    const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      onDateSelect?.(date);
    };

    const handlePrevMonth = () => {
      setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
      setCurrentMonth(addMonths(currentMonth, 1));
    };

    const hasSession = (date: Date): boolean => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return sessionDates.has(dateStr);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-[360px] rounded-3xl p-5 shadow-2xl overflow-hidden",
          "bg-black/20 backdrop-blur-xl border border-white/10",
          "text-white font-sans",
          className
        )}
        {...props}
      >
        <ScrollbarHide />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 rounded-lg bg-black/20 p-1">
            <button 
              onClick={() => setViewMode('weekly')}
              className={cn(
                "rounded-md px-4 py-1 text-xs font-semibold transition-colors",
                viewMode === 'weekly' 
                  ? "bg-white text-black shadow-md font-bold" 
                  : "text-white/60 hover:text-white"
              )}
            >
              Weekly
            </button>
            <button 
              onClick={() => setViewMode('monthly')}
              className={cn(
                "rounded-md px-4 py-1 text-xs font-semibold transition-colors",
                viewMode === 'monthly' 
                  ? "bg-white text-black shadow-md font-bold" 
                  : "text-white/60 hover:text-white"
              )}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="my-6 flex items-center justify-between">
          <motion.p
            key={format(currentMonth, "MMMM")}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-4xl font-bold tracking-tight"
          >
            {format(currentMonth, "MMMM")}
          </motion.p>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {viewMode === 'weekly' && (
          <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
            <div className="flex space-x-4">
              {days.map((day) => (
                <div key={format(day.date, "yyyy-MM-dd")} className="flex flex-col items-center space-y-2 flex-shrink-0">
                  <span className="text-xs font-bold text-white/50">
                    {format(day.date, "E").charAt(0)}
                  </span>
                  <button
                    onClick={() => handleDateClick(day.date)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 relative",
                      {
                        "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg": day.isSelected,
                        "hover:bg-white/20": !day.isSelected,
                        "text-white": !day.isSelected,
                        "ring-2 ring-pink-400/50": hasSession(day.date) && !day.isSelected,
                      }
                    )}
                  >
                    {day.isToday && !day.isSelected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400"></span>
                    )}
                    {hasSession(day.date) && !day.isSelected && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-purple-primary"></span>
                    )}
                    {getDate(day.date)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-white/50 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day.date, currentMonth);
                return (
                  <button
                    key={format(day.date, "yyyy-MM-dd")}
                    onClick={() => handleDateClick(day.date)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 relative mx-auto",
                      {
                        "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg": day.isSelected,
                        "hover:bg-white/20": !day.isSelected && isCurrentMonth,
                        "text-white/30": !isCurrentMonth,
                        "text-white": isCurrentMonth && !day.isSelected,
                        "ring-2 ring-pink-400/50": hasSession(day.date) && !day.isSelected && isCurrentMonth,
                      }
                    )}
                  >
                    {day.isToday && !day.isSelected && isCurrentMonth && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400"></span>
                    )}
                    {hasSession(day.date) && !day.isSelected && isCurrentMonth && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-purple-primary"></span>
                    )}
                    {getDate(day.date)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

GlassCalendar.displayName = "GlassCalendar";


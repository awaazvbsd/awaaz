import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---PROPS---
interface SlideToUnlockProps {
  children: React.ReactNode;
  onUnlock: () => void;
  sliderText?: string;
  unlockedContent: React.ReactNode;
  className?: string;
  shimmer?: boolean;
}

// ---COMPONENT---
export const SlideToUnlock = ({
  children,
  onUnlock,
  sliderText = 'Swipe to open the gift',
  unlockedContent,
  className,
  shimmer = true,
}: SlideToUnlockProps) => {
  const [unlocked, setUnlocked] = useState(false);
  const [dragConstraint, setDragConstraint] = useState(0);
  const x = useMotionValue(0);

  const sliderRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // Effect to calculate the correct drag constraint after the component mounts
  useEffect(() => {
    const sliderWidth = sliderRef.current?.offsetWidth || 0;
    const handleWidth = handleRef.current?.offsetWidth || 0;
    setDragConstraint(sliderWidth - handleWidth);
  }, []);

  // When the drag ends, check if it's past the threshold
  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > dragConstraint * 0.8) { // Unlock if dragged over 80%
      setUnlocked(true);
      onUnlock();
    } else {
      // Snap back to the start
      x.set(0);
    }
  };

  const textOpacity = useTransform(x, [0, 50], [1, 0]);

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      {children}
      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="slider"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div
              ref={sliderRef}
              className="relative h-16 w-full rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-[0.2em] text-white/70 pl-8 transition-opacity duration-300",
                    shimmer && "animate-shimmer bg-[linear-gradient(110deg,rgba(255,255,255,0.2),45%,rgba(255,255,255,0.5),55%,rgba(255,255,255,0.2))] bg-[length:200%_100%] bg-clip-text text-transparent"
                  )}
                >
                  <motion.span style={{ opacity: textOpacity }}>
                    {sliderText}
                  </motion.span>
                </span>
              </div>

              <motion.div
                ref={handleRef}
                drag="x"
                dragConstraints={{ left: 2, right: dragConstraint - 2 }}
                dragElastic={0.05}
                style={{ x }}
                onDragEnd={onDragEnd}
                className="absolute left-[2px] top-[2px] bottom-[2px] z-10 flex aspect-square cursor-grab items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-xl shadow-purple-500/20 active:cursor-grabbing hover:scale-[1.02] transition-transform"
              >
                <ChevronRightIcon className="h-6 w-6 text-white" />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {unlockedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---ICON---
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);


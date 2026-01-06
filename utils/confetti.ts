import confetti from 'canvas-confetti';

/**
 * Triggers side cannons confetti effect
 * Fires confetti from both left and right sides of the screen
 */
export const triggerSideCannonsConfetti = () => {
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
  const duration = 3000; // 3 seconds
  const endTime = Date.now() + duration;
  
  let animationFrameId: number | null = null;
  
  const frame = () => {
    const now = Date.now();
    if (now >= endTime) {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      return;
    }
    
    // Left side confetti cannon
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors: colors,
      zIndex: 9999,
    });
    
    // Right side confetti cannon
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors: colors,
      zIndex: 9999,
    });
    
    animationFrameId = requestAnimationFrame(frame);
  };
  
  // Start the animation
  frame();
  
  // Return cleanup function
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
};


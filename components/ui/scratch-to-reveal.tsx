import { cn } from "../../lib/utils";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";

interface ScratchToRevealProps {
  children: React.ReactNode;
  width: number;
  height: number;
  minScratchPercentage?: number;
  className?: string;
  onComplete?: () => void;
  onScratchComplete?: () => void; // Called when scratching is done, but before proceeding
  gradientColors?: [string, string, string];
}

const ScratchToReveal: React.FC<ScratchToRevealProps> = ({
  width,
  height,
  minScratchPercentage = 50,
  onComplete,
  onScratchComplete,
  children,
  className,
  gradientColors = ["#8B5CF6", "#A855F7", "#C084FC"],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const controls = useAnimation();
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const brushRadius = 50; // Increased from 30 to 50

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      ctx.fillStyle = "#ccc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      gradient.addColorStop(0, gradientColors[0]);
      gradient.addColorStop(0.5, gradientColors[1]);
      gradient.addColorStop(1, gradientColors[2]);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [gradientColors]);

  const scratch = useCallback((clientX: number, clientY: number, isInitial = false) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushRadius * 2;

      if (isInitial || !lastPositionRef.current) {
        // Draw initial circle
        ctx.beginPath();
        ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
        ctx.fill();
        lastPositionRef.current = { x, y };
      } else {
        // Draw smooth filled path from last position to current position
        const lastPos = lastPositionRef.current;
        const dx = x - lastPos.x;
        const dy = y - lastPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          // Create a smooth path using quadratic curves and filled circles
          // Draw circles along the path for seamless coverage
          const steps = Math.max(1, Math.floor(distance / (brushRadius * 0.5)));
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = lastPos.x + dx * t;
            const py = lastPos.y + dy * t;
            ctx.beginPath();
            ctx.arc(px, py, brushRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // If position hasn't changed, just draw a circle
          ctx.beginPath();
          ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        lastPositionRef.current = { x, y };
      }
    }
  }, [brushRadius]);

  const startAnimation = useCallback(async () => {
    await controls.start({
      scale: [1, 1.05, 1],
      rotate: [0, 5, -5, 5, -5, 0],
      transition: { duration: 0.6 },
    });

    // Call onScratchComplete to notify parent that scratching is done
    // but don't auto-proceed - let user click button
    if (onScratchComplete) {
      onScratchComplete();
    }
  }, [controls, onScratchComplete]);

  const checkCompletion = useCallback(() => {
    if (isComplete) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const totalPixels = pixels.length / 4;
      let clearPixels = 0;

      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) clearPixels++;
      }

      const percentage = (clearPixels / totalPixels) * 100;

      if (percentage >= minScratchPercentage && !isComplete) {
        setIsComplete(true);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        startAnimation();
      }
    }
  }, [isComplete, minScratchPercentage, startAnimation]);

  useEffect(() => {
    const handleDocumentMouseMove = (event: MouseEvent) => {
      if (!isScratching) return;
      scratch(event.clientX, event.clientY, false);
    };

    const handleDocumentTouchMove = (event: TouchEvent) => {
      if (!isScratching) return;
      event.preventDefault(); // Prevent scrolling while scratching
      const touch = event.touches[0];
      if (touch) {
        scratch(touch.clientX, touch.clientY, false);
      }
    };

    const handleDocumentMouseUp = () => {
      setIsScratching(false);
      lastPositionRef.current = null; // Reset position for next scratch
      checkCompletion();
    };

    const handleDocumentTouchEnd = () => {
      setIsScratching(false);
      lastPositionRef.current = null; // Reset position for next scratch
      checkCompletion();
    };

    if (isScratching) {
      document.addEventListener("mousemove", handleDocumentMouseMove);
      document.addEventListener("touchmove", handleDocumentTouchMove);
      document.addEventListener("mouseup", handleDocumentMouseUp);
      document.addEventListener("touchend", handleDocumentTouchEnd);
      document.addEventListener("touchcancel", handleDocumentTouchEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("touchmove", handleDocumentTouchMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
      document.removeEventListener("touchend", handleDocumentTouchEnd);
      document.removeEventListener("touchcancel", handleDocumentTouchEnd);
    };
  }, [isScratching, scratch, checkCompletion]);

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    lastPositionRef.current = null; // Reset to start fresh
    scratch(event.clientX, event.clientY, true);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    lastPositionRef.current = null; // Reset to start fresh
    const touch = event.touches[0];
    if (touch) {
      scratch(touch.clientX, touch.clientY, true);
    }
  };

  return (
    <motion.div
      className={cn("relative select-none", className)}
      style={{
        width,
        height,
        cursor: isComplete 
          ? "default"
          : "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgc3R5bGU9ImZpbGw6I2ZmZjtzdHJva2U6IzAwMDtzdHJva2Utd2lkdGg6MnB4OyIgLz4KPC9zdmc+'), auto",
      }}
      animate={controls}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute left-0 top-0"
        onMouseDown={isComplete ? undefined : handleMouseDown}
        onTouchStart={isComplete ? undefined : handleTouchStart}
        style={{ pointerEvents: isComplete ? 'none' : 'auto' }}
      ></canvas>
      {children}
    </motion.div>
  );
};

export { ScratchToReveal };

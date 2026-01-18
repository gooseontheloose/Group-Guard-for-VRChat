import React, { useState, useCallback, useRef } from 'react';

interface TiltStyle {
  transform: string;
  transition: string;
}

interface UseTiltOptions {
  /** Maximum tilt angle in degrees */
  maxTilt?: number;
  /** Perspective value */
  perspective?: number;
  /** Scale on hover */
  scale?: number;
  /** Transition speed in ms */
  speed?: number;
  /** Whether effect is disabled */
  disabled?: boolean;
}

interface UseTiltReturn {
  /** Style object to apply to the element */
  style: TiltStyle;
  /** onMouseMove handler */
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  /** onMouseEnter handler */
  onMouseEnter: () => void;
  /** onMouseLeave handler */
  onMouseLeave: () => void;
  /** Whether currently hovering */
  isHovered: boolean;
}

/**
 * Hook for 3D parallax tilt effect on hover
 * 
 * Usage:
 * ```tsx
 * const tilt = useTilt({ maxTilt: 15 });
 * 
 * <div 
 *   style={tilt.style}
 *   onMouseMove={tilt.onMouseMove}
 *   onMouseEnter={tilt.onMouseEnter}
 *   onMouseLeave={tilt.onMouseLeave}
 * >
 *   Content
 * </div>
 * ```
 */
export const useTilt = (options: UseTiltOptions = {}): UseTiltReturn => {
  const {
    maxTilt = 10,
    perspective = 1000,
    scale = 1.02,
    speed = 400,
    disabled = false,
  } = options;

  const [isHovered, setIsHovered] = useState(false);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const element = e.currentTarget;
        const rect = element.getBoundingClientRect();
        
        // Calculate mouse position relative to element center (0 to 1)
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        // Convert to tilt angles (-maxTilt to +maxTilt)
        const newTiltY = (x - 0.5) * maxTilt * 2;
        const newTiltX = (0.5 - y) * maxTilt * 2;
        
        setTiltX(newTiltX);
        setTiltY(newTiltY);
      });
    },
    [maxTilt, disabled]
  );

  const onMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
    }
  }, [disabled]);

  const onMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTiltX(0);
    setTiltY(0);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  const style: TiltStyle = {
    transform: isHovered
      ? `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`
      : `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
    transition: `transform ${speed}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
  };

  return {
    style,
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    isHovered,
  };
};

/**
 * Simpler parallax hook for subtle depth effect
 */
export const useParallax = (intensity = 10) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | undefined>(undefined);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const element = e.currentTarget;
        const rect = element.getBoundingClientRect();

        const x = ((e.clientX - rect.left) / rect.width - 0.5) * intensity;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * intensity;

        setOffset({ x, y });
      });
    },
    [intensity]
  );

  const onMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  return { offset, onMouseMove, onMouseLeave };
};

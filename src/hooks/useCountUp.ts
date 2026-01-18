import { useState, useEffect, useRef, useCallback } from 'react';
import { easeOutExpo } from '../utils/animations';

interface UseCountUpOptions {
  /** Duration of animation in ms */
  duration?: number;
  /** Easing function */
  easing?: (t: number) => number;
  /** Number of decimal places */
  decimals?: number;
  /** Whether to animate on mount */
  animateOnMount?: boolean;
  /** Prefix (e.g., "$") */
  prefix?: string;
  /** Suffix (e.g., "%") */
  suffix?: string;
  /** Separator for thousands */
  separator?: string;
}

interface UseCountUpReturn {
  /** Current displayed value */
  value: number;
  /** Formatted string value */
  formattedValue: string;
  /** Whether animation is in progress */
  isAnimating: boolean;
  /** Trigger count-up to new value */
  countTo: (newValue: number) => void;
  /** Reset to initial value without animation */
  reset: (value?: number) => void;
}

/**
 * Hook for animated number counting
 * 
 * Usage:
 * ```tsx
 * const { formattedValue, isAnimating } = useCountUp(1234, { duration: 1000 });
 * return <span>{formattedValue}</span>;
 * ```
 */
export const useCountUp = (
  targetValue: number,
  options: UseCountUpOptions = {}
): UseCountUpReturn => {
  const {
    duration = 800,
    easing = easeOutExpo,
    decimals = 0,
    animateOnMount = true,
    prefix = '',
    suffix = '',
    separator = ',',
  } = options;

  const [value, setValue] = useState(animateOnMount ? 0 : targetValue);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const startValue = useRef(0);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const previousTarget = useRef(targetValue);

  // Format number with separators and decimals
  const formatNumber = useCallback(
    (num: number): string => {
      const fixed = num.toFixed(decimals);
      const parts = fixed.split('.');
      
      // Add thousand separators
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
      
      const formatted = parts.join('.');
      return `${prefix}${formatted}${suffix}`;
    },
    [decimals, prefix, suffix, separator]
  );

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (startTime.current === null) {
        startTime.current = timestamp;
      }

      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      const currentValue =
        startValue.current + (targetValue - startValue.current) * easedProgress;

      setValue(currentValue);

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        setValue(targetValue);
        setIsAnimating(false);
        startTime.current = null;
      }
    },
    [targetValue, duration, easing]
  );

  // Start animation when target changes
  useEffect(() => {
    if (targetValue === previousTarget.current && !animateOnMount) {
      return;
    }

    // Cancel any ongoing animation
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    startValue.current = value;
    startTime.current = null;
    setIsAnimating(true);
    animationFrame.current = requestAnimationFrame(animate);
    previousTarget.current = targetValue;

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [targetValue, animate, animateOnMount, value]);

  // Manual trigger
  const countTo = useCallback(
    (newValue: number) => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      startValue.current = value;
      startTime.current = null;
      setIsAnimating(true);
      previousTarget.current = newValue;
      animationFrame.current = requestAnimationFrame((timestamp) => {
        const animateToNew = (ts: number) => {
          if (startTime.current === null) {
            startTime.current = ts;
          }

          const elapsed = ts - startTime.current;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easing(progress);

          const currentValue =
            startValue.current + (newValue - startValue.current) * easedProgress;

          setValue(currentValue);

          if (progress < 1) {
            animationFrame.current = requestAnimationFrame(animateToNew);
          } else {
            setValue(newValue);
            setIsAnimating(false);
            startTime.current = null;
          }
        };
        animateToNew(timestamp);
      });
    },
    [value, duration, easing]
  );

  // Reset without animation
  const reset = useCallback((resetValue = 0) => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    setValue(resetValue);
    setIsAnimating(false);
    previousTarget.current = resetValue;
  }, []);

  return {
    value,
    formattedValue: formatNumber(value),
    isAnimating,
    countTo,
    reset,
  };
};

/**
 * Simplified hook that just returns the animated value
 */
export const useAnimatedNumber = (
  target: number,
  duration = 800
): number => {
  const { value } = useCountUp(target, { duration });
  return Math.round(value);
};

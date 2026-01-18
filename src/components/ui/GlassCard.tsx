import React, { forwardRef, useEffect, type ReactNode } from 'react';
import styles from './GlassCard.module.css';
import { useMouseGlow } from '../../hooks/useMouseGlow';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Disable the cursor-tracking glow effect */
  disableGlow?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className = '', style, disableGlow = false, onMouseMove, onMouseLeave, ...props }, forwardedRef) => {
    const glow = useMouseGlow();

    // Merge refs - when glow is enabled, we need to sync the forwarded ref
    useEffect(() => {
      if (!disableGlow && forwardedRef && glow.ref.current) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(glow.ref.current);
        } else {
          forwardedRef.current = glow.ref.current;
        }
      }
    }, [disableGlow, forwardedRef, glow.ref]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!disableGlow) glow.onMouseMove(e);
      onMouseMove?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!disableGlow) glow.onMouseLeave();
      onMouseLeave?.(e);
    };

    // Use glow ref when enabled, forwarded ref when disabled
    const elementRef = disableGlow ? forwardedRef : glow.ref;

    return (
      <div
        ref={elementRef}
        className={`${styles.glassCard} ${className}`}
        style={{ ...glow.style, ...style }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";



import { useRef, useCallback, type RefObject, type CSSProperties } from 'react';

interface MouseGlowResult {
  ref: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

// Initial CSS custom properties for the glow effect
const INITIAL_GLOW_STYLE: CSSProperties = {
  '--glow-x': '50%',
  '--glow-y': '50%',
  '--glow-opacity': '0',
} as CSSProperties;

/**
 * Hook that tracks mouse position relative to an element and provides
 * CSS custom properties for creating cursor-following glow effects.
 * 
 * The glow effect is applied via inline style CSS custom properties
 * that are updated directly on the DOM element for performance.
 * 
 * @returns Object with ref, style, and event handlers to spread on target element
 */
export function useMouseGlow(): MouseGlowResult {
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      ref.current.style.setProperty('--glow-x', `${x}%`);
      ref.current.style.setProperty('--glow-y', `${y}%`);
      ref.current.style.setProperty('--glow-opacity', '1');
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (ref.current) {
      ref.current.style.setProperty('--glow-opacity', '0');
    }
  }, []);

  return {
    ref,
    style: INITIAL_GLOW_STYLE,
    onMouseMove,
    onMouseLeave,
  };
}

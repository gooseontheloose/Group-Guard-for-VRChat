import React, { type ReactNode } from 'react';
import styles from './GlassCard.module.css';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', style, ...props }) => {
  return (
    <div className={`${styles.glassCard} ${className}`} style={style} {...props}>
      {children}
    </div>
  );
};

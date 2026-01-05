import React from 'react';
import styles from './StatTile.module.css';

interface StatTileProps {
  label: string;
  value: string | number;
  loading?: boolean;
  color?: string; // CSS color string or var
  onClick?: () => void;
  headerRight?: React.ReactNode;
  headerLeftExtra?: React.ReactNode;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  loading = false,
  color = 'var(--color-text-dim)',
  onClick,
  headerRight,
  headerLeftExtra
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.tile}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.header}>
        <div className={styles.labelContainer}>
          <small className={styles.label} style={{ color }}>{label}</small>
          {headerLeftExtra}
        </div>
        {headerRight}
      </div>
      <div className={styles.value}>
        {loading ? '...' : value}
      </div>
    </div>
  );
};

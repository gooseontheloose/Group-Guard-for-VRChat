import React, { memo } from 'react';
import styles from './NeonDock.module.css';
import { motion, AnimatePresence } from 'framer-motion';

export type DockView = 'main' | 'moderation' | 'audit' | 'database' | 'settings' | 'live';

interface NeonDockProps {
  currentView: DockView;
  onViewChange: (view: DockView) => void;
  selectedGroup?: { name: string } | null;
  onGroupClick?: () => void;
  isLiveMode?: boolean;
}

// Memoized dock item to prevent re-renders
const DockItem = memo<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color?: string;
}>(({ label, isActive, onClick, icon, color = 'var(--color-primary)' }) => {
  return (
    <button
      onClick={onClick}
      className={`${styles.dockItem} ${isActive ? styles.dockItemActive : ''}`}
      aria-label={label}
      style={{ '--item-color': color } as React.CSSProperties}
    >
      {/* Glow Effect behind active item */}
      {isActive && (
        <motion.div 
            layoutId="activeGlow"
            className={styles.glowEffect} 
            transition={{ duration: 0.2 }}
        />
      )}

      <div className={`${styles.iconWrapper} ${isActive ? styles.iconWrapperActive : ''}`}>
        {icon}
      </div>
      
      <span className={`${styles.label} ${isActive ? styles.labelActive : ''}`}>
        {label}
      </span>
      
      {/* Active Indicator Dot */}
      {isActive && (
        <motion.div 
            layoutId="activeDot"
            className={styles.activeDot} 
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
});

DockItem.displayName = 'DockItem';

export const NeonDock: React.FC<NeonDockProps> = memo(({ 
  currentView, 
  onViewChange, 
  selectedGroup,
  onGroupClick,
  isLiveMode = false
}) => {
  return (
    <div className={styles.dockContainer}>
      <motion.div className={styles.dock} layout>
        <DockItem 
          label={selectedGroup ? "Group" : "Home"}
          isActive={!selectedGroup}
          onClick={onGroupClick || (() => {})}
          color="var(--color-primary)"
          icon={
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
               <polyline points="9 22 9 12 15 12 15 22"></polyline>
             </svg>
          }
        />

        {/* Group-specific items */}
        <AnimatePresence>
            {selectedGroup && (
                <motion.div 
                    className={styles.groupSection}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', paddingRight: '0.25rem' }}>
                    <div className={styles.separator} />

                    <DockItem 
                      label="Dashboard"
                      isActive={currentView === 'main' && !!selectedGroup}
                      onClick={() => onViewChange('main')}
                      color="var(--color-accent)"
                      icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                      }
                    />

                    {/* LIVE OPS TAB - Only visible when Active */}
                    <AnimatePresence>
                        {isLiveMode && (
                            <motion.div 
                                className={styles.liveOpsSection}
                                initial={{ width: 0, opacity: 0, scale: 0.8 }}
                                animate={{ width: "auto", opacity: 1, scale: 1 }}
                                exit={{ width: 0, opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <DockItem 
                                  label="LIVE OPS"
                                  isActive={currentView === 'live'}
                                  onClick={() => onViewChange('live')}
                                  color="#ef4444" // Red for alert/action
                                  icon={
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <line x1="12" y1="8" x2="12" y2="12"></line>
                                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                  }
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <DockItem 
                      label="Auto-Mod"
                      isActive={currentView === 'moderation'}
                      onClick={() => onViewChange('moderation')}
                      color="var(--color-primary)"
                      icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                      }
                    />

                    <DockItem 
                      label="Audit Logs"
                      isActive={currentView === 'audit'}
                      onClick={() => onViewChange('audit')}
                      color="var(--color-accent)"
                      icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      }
                    />

                    <DockItem 
                      label="Database"
                      isActive={currentView === 'database'}
                      onClick={() => onViewChange('database')}
                      color="var(--color-primary)"
                      icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                      }
                    />
                  </div>
                </motion.div>
            )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
});

NeonDock.displayName = 'NeonDock';

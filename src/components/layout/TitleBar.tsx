import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfileWidget } from '../../features/auth/UserProfileWidget';
import { useAuthStore } from '../../stores/authStore';
import styles from './TitleBar.module.css';

interface TitleBarProps {
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onSettingsClick, onLogoutClick }) => {
  const { user } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Window Management
  const handleMinimize = () => {
    try { window.electron.minimize(); } catch(e) { console.error('Minimize error:', e); }
  };
  
  const handleMaximize = () => {
    try { window.electron.maximize(); } catch(e) { console.error('Maximize error:', e); }
  };

  const handleClose = () => {
    try { window.electron.close(); } catch(e) { console.error('Close error:', e); }
  };

  return (
    <header className={styles.titleBar}>
      {/* User Profile & Logout (Left Side) */}
      <div className={styles.leftSection}>
          {/* Profile Dropdown Trigger */}
          <div style={{ position: 'relative' }}>
              <motion.button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={styles.profileButton}
              >
                  <img 
                    src={user?.userIcon || user?.currentAvatarThumbnailImageUrl} 
                    alt="Avatar"
                    className={styles.avatar}
                  />
                  <span className={styles.displayName}>{user?.displayName}</span>
              </motion.button>

              {/* Dropdown Profile Widget */}
              <AnimatePresence>
                  {isProfileOpen && (
                      <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ type: "spring" as const, stiffness: 300, damping: 24 }}
                          className={styles.dropdown}
                      >
                           <div style={{ marginBottom: '0.8rem' }}>
                              <UserProfileWidget />
                           </div>

                           {/* Settings Button */}
                           <motion.button
                             whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                             whileTap={{ scale: 0.98 }}
                             onClick={() => {
                               onSettingsClick();
                               setIsProfileOpen(false);
                             }}
                             className={styles.settingsButton}
                           >
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                             </svg>
                             App Settings
                           </motion.button>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

          {/* Logout Button */}
          <motion.button
              onClick={onLogoutClick}
              whileHover={{ scale: 1.1, color: '#ef4444' }}
              whileTap={{ scale: 0.95 }}
              title="Logout"
              className={styles.logoutButton}
          >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
          </motion.button>
      </div>

      {/* Window Controls */}
      <div className={styles.windowControls}>
           <button
              onClick={handleMinimize}
              className={styles.controlButton}
           >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
           </button>
           <button
              onClick={handleMaximize}
              className={styles.controlButton}
           >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
           </button>
           <button
              onClick={handleClose}
              className={`${styles.controlButton} ${styles.closeButton}`}
           >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
      </div>
    </header>
  );
};

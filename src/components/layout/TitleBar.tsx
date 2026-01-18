import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfileWidget } from '../../features/auth/UserProfileWidget';
// AccountSwitcher removed
import { useAuthStore } from '../../stores/authStore';
import styles from './TitleBar.module.css';
import { WindowControls } from './WindowControls';
import { Settings, LogOut } from 'lucide-react';

interface TitleBarProps {
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onSettingsClick, onLogoutClick }) => {
  const { user } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dropdownRef.current) return;

      const rect = dropdownRef.current.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      // Calculate distance to the rectangle
      let dx = 0;
      let dy = 0;

      if (x < rect.left) dx = rect.left - x;
      else if (x > rect.right) dx = x - rect.right;

      if (y < rect.top) dy = rect.top - y;
      else if (y > rect.bottom) dy = y - rect.bottom;

      const distance = Math.sqrt(dx * dx + dy * dy);

      // Close if cursor is more than 150px away
      if (distance > 150) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isProfileOpen]);

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
                          ref={dropdownRef}
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
                             <Settings size={18} style={{ opacity: 0.8 }} />
                             App Settings
                           </motion.button>

                           {/* Logout Button (Moved to Dropdown) */}
                           <motion.button
                             whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                             whileTap={{ scale: 0.98 }}
                             onClick={() => {
                               onLogoutClick();
                               setIsProfileOpen(false);
                             }}
                             className={styles.settingsButton} // reusing style for consistency
                             style={{ color: '#ef4444', marginTop: '4px' }}
                           >
                              <LogOut size={18} style={{ marginRight: '8px' }} />
                             Log Out
                           </motion.button>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

      </div>

      {/* Window Controls - Extracted Component */}
      <WindowControls />
    </header>
  );
};

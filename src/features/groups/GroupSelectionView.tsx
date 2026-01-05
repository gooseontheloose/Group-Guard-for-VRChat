import React, { useEffect, memo } from 'react';
import { useGroupStore } from '../../stores/groupStore';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { NeonButton } from '../../components/ui/NeonButton';
import { motion } from 'framer-motion';
import styles from './GroupSelectionView.module.css';

// Memoized animation variants (stable references)
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08 // Faster stagger
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export const GroupSelectionView: React.FC = memo(() => {
  const { myGroups, fetchMyGroups, selectGroup, isLoading, error } = useGroupStore();
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null);

  useEffect(() => {
    fetchMyGroups();
  }, [fetchMyGroups]);

  // Subscribe to live instance presence
  useEffect(() => {
      const fetchCurrent = async () => {
          const current = await window.electron.instance.getCurrentGroup();
          setActiveGroupId(current);
      };
      fetchCurrent();

      // Listen for updates
      const cleanup = window.electron.instance.onGroupChanged((groupId) => {
          setActiveGroupId(groupId);
      });
      return cleanup;
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <motion.h2 
            className="text-gradient"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
            Scanning Group Frequencies...
        </motion.h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 style={{ color: '#ef4444' }}>Connection Error</h2>
        <div style={{ 
            textAlign: 'left', 
            background: 'rgba(225, 29, 72, 0.1)', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '1px solid rgba(225, 29, 72, 0.2)',
            margin: '1rem auto',
            maxWidth: '600px',
            overflow: 'auto',
            maxHeight: '300px'
        }}>
            <pre style={{ margin: 0, overflow: 'visible', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {error}
            </pre>
        </div>
        <NeonButton onClick={() => fetchMyGroups()} style={{ marginTop: '1rem' }}>Retry</NeonButton>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={`${styles.title} text-gradient`}>SELECT GROUP</h1>
        <p className={styles.subtitle}>Identify target for moderation protocols.</p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={styles.grid}
      >
        {myGroups.map((group) => {
          // Check if user is currently in this group's instance
          const isLive = group.id === activeGroupId;
          
          return (
            <motion.div key={group.id} variants={itemVariants}>
            <motion.div 
               whileHover={{ 
                 y: -8, 
                 boxShadow: isLive 
                    ? '0 15px 30px rgba(0, 255, 100, 0.3), 0 0 20px rgba(0, 255, 100, 0.2) inset' // Green glow for live
                    : '0 15px 30px rgba(var(--primary-hue), 0.3), 0 0 20px rgba(var(--primary-hue), 0.2) inset' 
               }}
               transition={{ type: 'spring', stiffness: 300, damping: 20 }}
               onClick={() => selectGroup(group)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectGroup(group);
                 }
               }}
               role="button"
               tabIndex={0}
               style={{ cursor: 'pointer', height: '100%', outline: 'none' }}
            >
               <GlassPanel className={`${styles.cardPanel} ${isLive ? styles.cardLive : styles.cardDefault}`}>
                 {/* Live Badge */}
                 {isLive && (
                     <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={styles.liveBadge}
                     >
                        LIVE
                     </motion.div>
                 )}

                 {/* Background Banner */}
                 {group.bannerUrl ? (
                   <div className={styles.banner} style={{ backgroundImage: `url(${group.bannerUrl})` }} />
                 ) : (
                    <div className={styles.bannerFallback} />
                 )}

                 {/* Content Overlay */}
                 <div className={styles.contentOverlay}>
                   {group.iconUrl && (
                     <img src={group.iconUrl} className={styles.groupIcon} alt="" />
                   )}
                   <h3 className={styles.groupName}>{group.name}</h3>
                   <div className={styles.metaRow}>
                     <span className={styles.shortCode}>{group.shortCode}</span>
                     <span className={styles.memberCount}>
                       {group.memberCount} Members
                     </span>
                   </div>
                 </div>
               </GlassPanel>
            </motion.div>
          </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
});

GroupSelectionView.displayName = 'GroupSelectionView';

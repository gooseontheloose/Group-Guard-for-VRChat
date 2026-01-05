import React, { useEffect, useState, memo } from 'react';
import { useGroupStore } from '../../stores/groupStore';
import { useAuditStore } from '../../stores/auditStore';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { usePipelineStatus } from '../../hooks/usePipelineInit';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { NeonButton } from '../../components/ui/NeonButton';
import { RefreshTimer } from '../../components/ui/RefreshTimer';
import { PipelineIndicator } from '../../components/ui/PipelineStatus';
import { MembersListDialog } from '../dashboard/dialogs/MembersListDialog';
import { RequestsListDialog } from '../dashboard/dialogs/RequestsListDialog';
import { BansListDialog } from '../dashboard/dialogs/BansListDialog';
import { InstancesListDialog } from '../dashboard/dialogs/InstancesListDialog';
import { InstanceMonitorWidget } from './widgets/InstanceMonitorWidget';
import { StatTile } from './components/StatTile';
import styles from './DashboardView.module.css';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};


// Audit event types that affect member count
const MEMBER_AFFECTING_EVENTS = [
  'group.user.join',
  'group.user.leave', 
  'group.user.ban',
  'group.user.unban',
  'group.user.kick',
  'group.invite.accept',
];

export const DashboardView: React.FC = memo(() => {
  const { 
      selectedGroup, 
      requests, 
      bans,
      instances,
      isRequestsLoading,
      isBansLoading,
      isInstancesLoading,
      fetchGroupMembers,
      isMembersLoading,
  } = useGroupStore();
  const { logs, fetchLogs, isLoading: isLogsLoading } = useAuditStore();
  
  // Pipeline WebSocket connection status
  const pipelineStatus = usePipelineStatus();
  
  // Auto-refresh hooks with visual timers
  const instancesRefresh = useDataRefresh({ type: 'instances' });
  const requestsRefresh = useDataRefresh({ type: 'requests' });
  const bansRefresh = useDataRefresh({ type: 'bans' });
  
  const [showMembers, setShowMembers] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showBans, setShowBans] = useState(false);
  const [showInstances, setShowInstances] = useState(false);
  
  // Member refresh state with 30s cooldown
  const [memberRefreshCooldown, setMemberRefreshCooldown] = useState(0);
  const lastLogCountRef = React.useRef(0);
  const hasFetchedMembersRef = React.useRef(false);
  const lastGroupIdRef = React.useRef<string | null>(null);

  // Initial member fetch (once per app open) and reset on group change
  useEffect(() => {
    if (!selectedGroup) return;
    
    // Reset if group changed
    if (lastGroupIdRef.current !== selectedGroup.id) {
      hasFetchedMembersRef.current = false;
      lastLogCountRef.current = 0;
      lastGroupIdRef.current = selectedGroup.id;
    }
    
    // Initial fetch
    if (!hasFetchedMembersRef.current) {
      fetchGroupMembers(selectedGroup.id, 0);
      hasFetchedMembersRef.current = true;
    }
  }, [selectedGroup, fetchGroupMembers]);

  // Watch audit logs for member-affecting events
  useEffect(() => {
    if (!selectedGroup || logs.length === 0) return;
    
    const lastCount = lastLogCountRef.current;
    
    // Check if we have new logs since last check
    if (logs.length > lastCount && lastCount > 0) {
      // Check if any new log is a member-affecting event
      const newLogs = logs.slice(0, logs.length - lastCount);
      const hasMemberEvent = newLogs.some(log => 
        MEMBER_AFFECTING_EVENTS.some(event => 
          log.eventType?.includes(event) || log.type?.includes(event)
        )
      );
      
      if (hasMemberEvent) {
        // Refresh member count
        fetchGroupMembers(selectedGroup.id, 0);
      }
    }
    
    lastLogCountRef.current = logs.length;
  }, [logs, selectedGroup, fetchGroupMembers]);

  // Cooldown timer
  useEffect(() => {
    if (memberRefreshCooldown > 0) {
      const timer = setTimeout(() => {
        setMemberRefreshCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [memberRefreshCooldown]);

  const handleMemberRefresh = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (memberRefreshCooldown > 0 || !selectedGroup) return;
    
    fetchGroupMembers(selectedGroup.id, 0);
    setMemberRefreshCooldown(30); // 30 second cooldown
  };

  useEffect(() => {
    if (selectedGroup) {
      fetchLogs(selectedGroup.id);
    }
  }, [selectedGroup, fetchLogs]);

  return (
    <>
    <motion.div 
        className={styles.container}
        variants={containerVariants}
        initial="hidden"
        animate="show"
    >
      
        {/* Top Header & Stats Row */}
        <GlassPanel className={styles.headerPanel}>

            <div className={styles.titleSection}>
                <motion.h1 
                    className={`${styles.title} text-gradient`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {selectedGroup?.name || 'Dashboard'}
                </motion.h1>
                <motion.div 
                    className={styles.subtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    COMMAND CENTER
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                
                {/* Member Count Tile */}
                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                    <StatTile 
                        label="MEMBERS"
                        value={selectedGroup?.memberCount || 0}
                        color="var(--color-primary)"
                        onClick={() => setShowMembers(true)}
                        headerLeftExtra={pipelineStatus.connected && <PipelineIndicator />}
                        headerRight={
                            <RefreshTimer 
                                secondsUntilRefresh={memberRefreshCooldown} 
                                isRefreshing={isMembersLoading} 
                                onRefreshClick={handleMemberRefresh} 
                            />
                        }
                    />
                </motion.div>

                {/* Active Instances Tile */}
                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                    <StatTile
                        label="INSTANCES"
                        value={isInstancesLoading ? '...' : instances.length}
                        color="var(--color-info)"
                        onClick={() => setShowInstances(true)}
                        headerRight={
                            <RefreshTimer 
                                secondsUntilRefresh={instancesRefresh.secondsUntilRefresh} 
                                isRefreshing={instancesRefresh.isRefreshing} 
                                onRefreshClick={(e) => { e?.stopPropagation(); instancesRefresh.refreshNow(); }} 
                            />
                        }
                    />
                </motion.div>

                {/* Requests Tile */}
                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                    <StatTile
                        label="REQUESTS"
                        value={isRequestsLoading ? '...' : requests.length}
                        color="var(--color-accent)"
                        onClick={() => setShowRequests(true)}
                        headerRight={
                            <RefreshTimer 
                                secondsUntilRefresh={requestsRefresh.secondsUntilRefresh} 
                                isRefreshing={requestsRefresh.isRefreshing} 
                                onRefreshClick={(e) => { e?.stopPropagation(); requestsRefresh.refreshNow(); }} 
                            />
                        }
                    />
                </motion.div>

                {/* Bans Tile */}
                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                    <StatTile
                        label="BANS"
                        value={isBansLoading ? '...' : bans.length}
                        color="var(--color-danger)"
                        onClick={() => setShowBans(true)}
                        headerRight={
                            <RefreshTimer 
                                secondsUntilRefresh={bansRefresh.secondsUntilRefresh} 
                                isRefreshing={bansRefresh.isRefreshing} 
                                onRefreshClick={(e) => { e?.stopPropagation(); bansRefresh.refreshNow(); }} 
                            />
                        }
                    />
                </motion.div>
            </div>
        </GlassPanel>

        {/* Main Content Area: 2 Columns */}
        <div className={styles.contentGrid}>
            
            {/* Left: Audit Log Feed */}
            <GlassPanel className={styles.auditPanel}>
                <div className={styles.auditHeader}>
                    <div className={styles.auditTitle}>
                        <h3>Live Audit Feed</h3>
                        <div className={styles.liveIndicator} />
                    </div>
                    <NeonButton size="sm" variant="ghost" onClick={() => selectedGroup && fetchLogs(selectedGroup.id)} disabled={isLogsLoading}>
                        {isLogsLoading ? 'SYNCING...' : 'REFRESH'}
                    </NeonButton>
                </div>
                
                <div className={styles.logList}>
                    {logs.length === 0 && !isLogsLoading ? (
                        <div className={styles.emptyState}>
                            -- No visible spectrum events --
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className={styles.logItem}>
                                <div 
                                    className={styles.logDot} 
                                    style={{
                                        background: log.eventType?.includes('ban') ? 'var(--color-danger)' : (log.eventType?.includes('join') ? 'var(--color-success)' : 'var(--color-accent)'),
                                        boxShadow: log.eventType?.includes('ban') ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none'
                                    }} 
                                />
                                <div className={styles.logContent}>
                                    <div className={styles.logMeta}>
                                        <span className={styles.actorName}>
                                            {log.actorDisplayName}
                                        </span>
                                        <span className={styles.timestamp}>
                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className={styles.logDescription}>
                                        {log.description || log.eventType}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </GlassPanel>

            {/* Right: Instance Monitor */}
            <div className={styles.monitorColumn}>
                <InstanceMonitorWidget />
            </div>
        </div>

        {/* Dialogs */}
        <MembersListDialog 
        isOpen={showMembers} 
        onClose={() => setShowMembers(false)} 
      />
      
      <RequestsListDialog
          isOpen={showRequests}
          onClose={() => setShowRequests(false)}
      />

      <BansListDialog
          isOpen={showBans}
          onClose={() => setShowBans(false)}
      />

      <InstancesListDialog
          isOpen={showInstances}
          onClose={() => setShowInstances(false)}
      />
    </motion.div>
    </>
  );
});

DashboardView.displayName = 'DashboardView';


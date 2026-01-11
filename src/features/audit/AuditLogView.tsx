import React, { useEffect, useState, useMemo } from 'react';
import { useAuditStore, type AuditLogEntry } from '../../stores/auditStore';
import { useGroupStore } from '../../stores/groupStore';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { NeonButton } from '../../components/ui/NeonButton';

export const AuditLogView: React.FC = () => {
  const { selectedGroup } = useGroupStore();
  const { logs, isLoading, error, fetchLogs } = useAuditStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    if (selectedGroup) {
      fetchLogs(selectedGroup.id);
    }
  }, [selectedGroup, fetchLogs]);

  const handleRefresh = async () => {
    if (selectedGroup) {
        setIsRefreshing(true);
        await fetchLogs(selectedGroup.id);
        setIsRefreshing(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Type Filter
      const type = log.type || '';
      if (filterType !== 'all') {
          if (filterType === 'ban' && !type.includes('ban')) return false;
          if (filterType === 'kick' && !type.includes('kick')) return false;
          if (filterType === 'invite' && !type.includes('invite')) return false;
          if (filterType === 'automod' && !type.includes('automod')) return false;
          if (filterType === 'role' && !type.includes('role')) return false;
      }
      
      // Search
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        log.actorDisplayName.toLowerCase().includes(query) ||
        (log.targetDisplayName || '').toLowerCase().includes(query) ||
        log.description.toLowerCase().includes(query) ||
        (log.type || '').toLowerCase().includes(query)
      );
    });
  }, [logs, searchQuery, filterType]);

  const handleUndo = async (log: AuditLogEntry) => {
      if (!selectedGroup) return;
      
      // Only support undoing bans for now
      if (log.type === 'group.user.ban' && log.targetId) {
          const confirm = window.confirm(`Are you sure you want to UNBAN ${log.targetDisplayName}?`);
          if (!confirm) return;
          
          try {
              const result = await window.electron.unbanUser(selectedGroup.id, log.targetId);
              if (result.success) {
                  alert(`Successfully unbanned ${log.targetDisplayName}`);
                  handleRefresh();
              } else {
                  alert(`Failed to unban: ${result.error}`);
              }
          } catch (e) {
              console.error(e);
              alert('Failed to execute undo action');
          }
      }
  };

  if (!selectedGroup) return null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {/* Header Controls */}
      <GlassPanel style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
             <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white'
                }}
             />
        </div>
        
        <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white'
            }}
        >
            <option value="all">All Events</option>
            <option value="ban">Bans</option>
            <option value="kick">Kicks</option>
            <option value="automod">AutoMod</option>
            <option value="role">Roles</option>
            <option value="invite">Invites</option>
        </select>
        
        <NeonButton onClick={handleRefresh} disabled={isRefreshing || isLoading} variant="secondary" size="sm">
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </NeonButton>
      </GlassPanel>

      {/* Log List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
        {isLoading && logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>Loading logs...</div>
        ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-danger)' }}>{error}</div>
        ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>No logs found matching your criteria.</div>
        ) : (
            filteredLogs.map((log) => (
                <AuditLogCard key={`${log.id}-${log.created_at}`} log={log} onUndo={() => handleUndo(log)} />
            ))
        )}
      </div>
    </div>
  );
};

// Simple time ago helper
const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const AuditLogCard: React.FC<{ log: AuditLogEntry; onUndo: () => void }> = ({ log, onUndo }) => {
    // Determine icon and color based on type
    const type = log.type || 'unknown';
    let icon = '📝';
    let color = 'var(--color-text-dim)';
    let canUndo = false;

    if (type.includes('ban')) {
        icon = '🚫';
        color = 'var(--color-danger)';
        canUndo = true; // Only Bans are undoable right now
    } else if (type.includes('kick')) {
        icon = '🥾';
        color = 'var(--color-warning)';
    } else if (type.includes('invite')) {
        icon = '📩';
        color = 'var(--color-success)';
    } else if (type.includes('automod')) {
        icon = '🤖';
        color = '#a855f7'; // Purple
    } else if (type.includes('role')) {
        icon = '🔑';
        color = 'var(--color-info)';
    }

    // Logic repeated from DashboardView for consistency
    const formatLogEntry = (logItem: AuditLogEntry) => {
      // Custom handling for AutoMod to preserve reasoning
      if (logItem.type === 'group.automod') {
          return { actor: logItem.actorDisplayName || 'AutoMod', description: logItem.description || 'Action performed (No reason provided)' };
      }

      let actor = logItem.actorDisplayName;
      let desc = logItem.description;

      if (desc.endsWith(' by .')) {
          desc = desc.substring(0, desc.length - 5);
      }

      if (actor === 'UNKNOWN' && desc.match(/^\S+ User /)) {
           const parts = desc.split(' ');
           if (parts.length > 0) {
               actor = parts[0];
           }
      }

      let cleanDesc = desc;
      if (actor !== 'UNKNOWN' && actor) {
         cleanDesc = cleanDesc.replace(actor, '');
      }
      
      cleanDesc = cleanDesc.replace(/by \s*$/, '').trim();
      cleanDesc = cleanDesc.replace(/\s+/g, ' ');

      return { actor, description: cleanDesc };
    };

    const { actor, description } = formatLogEntry(log);

    return (
        <GlassPanel style={{ padding: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ 
                fontSize: '1.5rem', 
                width: '40px', 
                height: '40px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '50%',
                color: color
            }}>
                {icon}
            </div>
            
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {type.split('.').pop()?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        {timeAgo(log.created_at)}
                    </span>
                </div>
                
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    <span 
                        style={{ color: 'var(--color-primary)', cursor: log.actorId ? 'pointer' : 'default', textDecoration: log.actorId ? 'underline' : 'none' }}
                        onClick={() => log.actorId && window.open(`https://vrchat.com/home/user/${log.actorId}`, '_blank')}
                        title={log.actorId ? "View VRChat Profile" : undefined}
                    >
                        {actor}
                    </span>
                    {' '}
                     {/* Safe description rendering */}
                    {description}
                </div>
                
                {log.data && (log.data as { details?: string }).details && (
                   <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                       Details: {JSON.stringify((log.data as { details?: unknown }).details)}
                   </div>
                )}
            </div>
            
            {canUndo && (
                <NeonButton size="sm" variant="danger" onClick={onUndo} style={{ padding: '0.25rem 0.75rem' }}>
                    Unban
                </NeonButton>
            )}
        </GlassPanel>
    );
};

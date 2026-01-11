import React from 'react';

export const LiveBadge: React.FC = () => {
  return (
    <div 
      title="Synced with your local VRChat logs."
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'color-mix(in srgb, var(--color-success), transparent 90%)',
        padding: '4px 8px',
        borderRadius: '12px',
        border: '1px solid color-mix(in srgb, var(--color-success), transparent 80%)',
        cursor: 'help',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--color-success), transparent 80%)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-success), transparent 60%)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'color-mix(in srgb, var(--color-success), transparent 90%)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-success), transparent 80%)';
      }}
    >
      <div style={{ position: 'relative', width: '6px', height: '6px' }}>
        <div style={{
          width: '6px',
          height: '6px',
          backgroundColor: 'var(--color-success)',
          borderRadius: '50%',
          position: 'absolute',
          top: 0,
          left: 0
        }} />
        <div 
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--color-success)',
                borderRadius: '50%',
                zIndex: -1,
                animation: 'pulse 2s infinite ease-in-out'
            }}
        />
        <style>
         {`
           @keyframes pulse {
             0% { transform: scale(1); opacity: 1; }
             50% { transform: scale(3); opacity: 0; }
             100% { transform: scale(1); opacity: 0; }
           }
         `}
        </style>
      </div>
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        color: 'var(--color-success)',
        letterSpacing: '0.5px'
      }}>LIVE</span>
    </div>
  );
};

import React from 'react';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { NeonButton } from '../../components/ui/NeonButton';
import { useAuthStore } from '../../stores/authStore';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { OscSettings } from './OscSettings';
import { DiscordRpcSettings } from './DiscordRpcSettings';
import { DiscordWebhookSettings } from './DiscordWebhookSettings';

const HueSpectrumPicker: React.FC<{ 
    label: string; 
    hue: number; 
    onChange: (hue: number) => void 
}> = ({ label, hue, onChange }) => {
    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ color: 'var(--color-text-dim)' }}>{label}</label>
                <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    background: `hsl(${hue}, 100%, 50%)`,
                    boxShadow: `0 0 10px hsl(${hue}, 100%, 50%)`
                }} />
            </div>
            <div style={{ position: 'relative', height: '30px', borderRadius: '15px', overflow: 'hidden' }}>
                 {/* Rainbow Background */}
                 <div style={{
                     position: 'absolute',
                     inset: 0,
                     background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                 }} />
                 
                 {/* Slider Input Overlay */}
                 <input 
                    type="range" 
                    min="0" 
                    max="360" 
                    value={hue} 
                    onChange={(e) => onChange(Number(e.target.value))}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0, // Hide default track
                        cursor: 'pointer',
                        margin: 0
                    }}
                 />

                 {/* Custom Thumb Indicator (Visual only, follows logic) */}
                 <div style={{
                     position: 'absolute',
                     left: `${(hue / 360) * 100}%`,
                     top: '0',
                     bottom: '0',
                     width: '4px',
                     background: 'white',
                     transform: 'translateX(-2px)',
                     pointerEvents: 'none',
                     boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                 }} />
            </div>
        </div>
    );
};

export const SettingsView: React.FC = () => {
  const { rememberMe, setRememberMe } = useAuthStore();
  const { primaryHue, setPrimaryHue, accentHue, setAccentHue, uiScale, setUiScale, resetTheme } = useTheme();

  const handleClearCredentials = async () => {
    if (confirm('Are you sure you want to clear saved login data?')) {
      await window.electron.clearCredentials();
      alert('Credentials cleared.');
    }
  };

  const handleResetLayout = async () => {
      if (confirm('Are you sure you want to reset the dashboard layout to default?')) {
          if (window.electron?.uiLayout?.delete) {
            await window.electron.uiLayout.delete('dashboardState');
          }
          window.location.reload();
      }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '2rem', paddingBottom: 'var(--dock-height)', maxWidth: '800px', margin: '0 auto', height: '100%', overflowY: 'auto' }}
    >
      <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>SETTINGS</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Appearance Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
             <h2 style={{ color: 'white', margin: 0 }}>Appearance</h2>
             <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <NeonButton variant="ghost" onClick={handleResetLayout} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Reset Layout</NeonButton>
                 <NeonButton variant="ghost" onClick={resetTheme} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Reset Theme</NeonButton>
             </div>
          </div>
          
          <GlassPanel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <HueSpectrumPicker 
                    label="Primary Neon" 
                    hue={primaryHue} 
                    onChange={setPrimaryHue} 
                />
                <HueSpectrumPicker 
                    label="Accent Neon" 
                    hue={accentHue} 
                    onChange={setAccentHue} 
                />
            </div>
            
            {/* UI Scale Slider */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>UI Scale</span>
                <span style={{ 
                  color: 'var(--color-primary)', 
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  background: 'rgba(var(--primary-hue), 100%, 50%, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {Math.round(uiScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.2"
                step="0.1"
                value={uiScale}
                onChange={(e) => setUiScale(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: 'var(--color-primary)'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                <span>Compact (70%)</span>
                <span>Default (100%)</span>
                <span>Large (120%)</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                Adjusts dashboard widget minimum sizes and row heights. Smaller values allow more compact layouts.
              </p>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>
              Theme settings are automatically saved.
            </p>
          </GlassPanel>
        </section>

        {/* Security Section */}
        <section>
          <h2 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Security & Data</h2>
          <GlassPanel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: 'white', fontWeight: 600 }}>Auto-Login</div>
                <div style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>Automatically sign in when application starts</div>
              </div>
              <div 
                onClick={() => setRememberMe(!rememberMe)}
                style={{
                  width: '50px',
                  height: '26px',
                  background: rememberMe ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '13px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  background: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: rememberMe ? '26px' : '2px',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
               <NeonButton variant="secondary" onClick={handleClearCredentials} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                 Forget This Device
               </NeonButton>
               <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                 Completely removes your saved login data from this device. You will need to enter credentials and 2FA again.
               </p>
            </div>
          </GlassPanel>
        </section>

        {/* OSC Integration */}
        <OscSettings />

        {/* Discord Webhook */}
        <DiscordWebhookSettings />

        {/* Discord RPC */}
        <DiscordRpcSettings />

        {/* About Section */}
        <section>
           <h2 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>About System</h2>
           <GlassPanel>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px var(--color-primary))' }}>🛡️</div>
               <div>
                 <h3 style={{ margin: 0, fontSize: '1.2rem' }}>VRChat Group Guard</h3>
                 <p style={{ color: 'var(--color-text-dim)', margin: '0.2rem 0' }}>Version 1.0.3 (Beta)</p>
                 <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', opacity: 0.6 }}>
                   Developed by <a href="https://vrchat.com/home/user/usr_ef7c23be-3c3c-40b4-a01c-82f59b2a8229" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'underline', cursor: 'pointer' }}>AppleExpl01t</a> • Electron • React • Vite
                 </div>
               </div>
             </div>
           </GlassPanel>
        </section>

      </div>
    </motion.div>
  );
};

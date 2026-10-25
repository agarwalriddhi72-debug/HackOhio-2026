import React, { useEffect } from 'react';
import { Bell, AlertTriangle, Truck, UserCheck, ShieldAlert, X, Volume2, CheckCircle2, VolumeX, Smartphone } from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'hazard_alert' | 'driver_assigned' | 'new_rider' | 'bus_full' | 'shelter_full' | 'general';
  title: string;
  message: string;
  tagalog?: string;
  recipient: 'all' | 'rider' | 'driver' | 'shelter';
  timestamp: string;
  read: boolean;
}

interface Props {
  notifications: AppNotification[];
  isOpen: boolean;
  onToggle: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  currentRole: 'rider' | 'driver' | 'shelter';
  activeToast?: AppNotification | null;
  onDismissToast?: () => void;
  soundEnabled?: boolean;
  onEnableSound?: () => void;
}

// Play pleasant web audio chime with automatic resume for mobile Safari / Chrome
export function playChime(type: 'alert' | 'info' | 'success' = 'info') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'alert') {
      // Clear 2-tone emergency siren
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

// Mobile device vibration
export function triggerVibration(pattern: number[] = [300, 150, 300, 150, 400]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

// System / Web Push Notification
export function triggerSystemNotification(title: string, body: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/shield.svg',
        tag: 'ark-emergency-alert',
      });
    }
  } catch {}
}

// Bilingual voice readout for disaster alerts
export function speakDisasterAlert(english: string, tagalog?: string) {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = tagalog ? `${tagalog}. ${english}` : english;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    }
  } catch {}
}

export const NotificationCenter: React.FC<Props> = ({
  notifications,
  isOpen,
  onToggle,
  onDismiss,
  onClearAll,
  currentRole,
  activeToast,
  onDismissToast,
  soundEnabled,
  onEnableSound,
}) => {
  // Request system notification permission on user engagement
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'hazard_alert':
        return <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />;
      case 'driver_assigned':
        return <Truck className="w-5 h-5 text-blue-400 shrink-0" />;
      case 'new_rider':
        return <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'bus_full':
      case 'shelter_full':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-slate-300 shrink-0" />;
    }
  };

  return (
    <div className="relative">
      {/* Floating Active Toast Notification Banner (Auto-displays on mobile & desktop when triggered) */}
      {activeToast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed top-20 right-4 left-4 sm:left-auto sm:w-[420px] z-50 rounded-3xl p-4 shadow-2xl border-2 transition-all space-y-2 ${
            activeToast.type === 'hazard_alert'
              ? 'bg-slate-900 border-red-500 ring-4 ring-red-500/30 text-white'
              : 'bg-slate-900 border-amber-400 text-slate-100'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {getIcon(activeToast.type)}
              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    activeToast.type === 'hazard_alert'
                      ? 'bg-red-500/20 text-red-300 border-red-500/50'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {activeToast.type === 'hazard_alert' ? '🚨 LIVE HAZARD WARNING' : `Target: ${activeToast.recipient.toUpperCase()}`}
                </span>
                <h4 className="text-sm font-black text-white mt-1 leading-tight">{activeToast.title}</h4>
              </div>
            </div>
            {onDismissToast && (
              <button
                onClick={onDismissToast}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-200 leading-relaxed pl-7 font-medium">
            {activeToast.message}
          </p>

          {activeToast.tagalog && (
            <p className="text-[11px] text-amber-200/90 leading-relaxed italic pl-7 font-medium">
              🇵🇭 {activeToast.tagalog}
            </p>
          )}

          {/* Action buttons inside toast */}
          <div className="flex items-center justify-between pl-7 pt-1">
            <button
              onClick={() => speakDisasterAlert(activeToast.message, activeToast.tagalog)}
              className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Read Aloud</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">{activeToast.timestamp}</span>
          </div>
        </div>
      )}

      {/* Bell Button */}
      <button
        onClick={onToggle}
        className="relative p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
        title="View Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white font-black text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl z-50 p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h4 className="font-extrabold text-sm text-white">Notifications ({notifications.length})</h4>
            </div>

            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onToggle}
                className="text-slate-400 hover:text-white p-1 leading-none font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Sound / Audio permission helper for mobile */}
          {onEnableSound && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Volume2 className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-bold">Audio & Vibration Alerts</span>
              </div>
              <button
                onClick={onEnableSound}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase cursor-pointer"
              >
                {soundEnabled ? '✓ Enabled' : 'Enable Sound'}
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No active notifications.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                    n.type === 'hazard_alert'
                      ? 'bg-red-950/40 border-red-500/40 text-red-100'
                      : n.type === 'bus_full'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getIcon(n.type)}
                      <span className="font-black text-sm text-white leading-tight">{n.title}</span>
                    </div>
                    <button
                      onClick={() => onDismiss(n.id)}
                      className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300 font-medium pl-7">
                    {n.message}
                  </p>

                  {n.tagalog && (
                    <p className="text-[11px] leading-relaxed text-amber-200/90 italic pl-7">
                      🇵🇭 {n.tagalog}
                    </p>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pl-7 pt-1">
                    <span className="font-mono">{n.timestamp}</span>
                    <button
                      onClick={() => speakDisasterAlert(n.message, n.tagalog)}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                    >
                      <Volume2 className="w-3 h-3" /> Read
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

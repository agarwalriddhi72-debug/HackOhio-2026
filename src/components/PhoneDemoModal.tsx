import React, { useState } from 'react';
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Users,
  Truck,
  Home,
  Map as MapIcon,
  Download,
  Globe,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'rider' | 'driver' | 'shelter' | 'map' | 'simulator') => void;
  currentRole: string;
}

// Active development Cloud Run instance URL
const CLOUD_RUN_DEV_URL = 'https://ais-dev-y3vouvzsuqsvc457oj5iu6-319531906020.us-east1.run.app';

export const PhoneDemoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectRole,
  currentRole,
}) => {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [selectedPhoneTab, setSelectedPhoneTab] = useState<'rider' | 'driver' | 'shelter' | 'map'>('rider');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [showSafariHelp, setShowSafariHelp] = useState(true);

  if (!isOpen) return null;

  // Determine active accessible URL
  const getBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin && (origin.includes('run.app') || origin.includes('ais-dev'))) {
        return origin;
      }
    }
    return CLOUD_RUN_DEV_URL;
  };

  const baseUrl = getBaseUrl();

  const phoneConfigs = [
    {
      id: 'rider' as const,
      phoneLabel: 'Phone 1',
      title: 'Rider View',
      roleQuery: '?role=rider',
      roleHash: '#role=rider',
      description: 'Lola Remedios (Senior 60+ / Wheelchair evacuee interface with Tagalog audio assist)',
      icon: <Users className="w-5 h-5 text-amber-400" />,
      color: 'amber',
    },
    {
      id: 'driver' as const,
      phoneLabel: 'Phone 2',
      title: 'Driver Console',
      roleQuery: '?role=driver',
      roleHash: '#role=driver',
      description: 'BUS-01 Console (Kuya Ramon) with shortest path route, stop checklist & Bus Full trigger',
      icon: <Truck className="w-5 h-5 text-blue-400" />,
      color: 'blue',
    },
    {
      id: 'shelter' as const,
      phoneLabel: 'Phone 3',
      title: 'Shelter Station',
      roleQuery: '?role=shelter',
      roleHash: '#role=shelter',
      description: 'Burgos Covered Court station capacity manager with live occupancy & Shelter Full trigger',
      icon: <Home className="w-5 h-5 text-emerald-400" />,
      color: 'emerald',
    },
    {
      id: 'map' as const,
      phoneLabel: 'Map View',
      title: 'Daraga Map',
      roleQuery: '?role=map',
      roleHash: '#role=map',
      description: 'Municipality-wide road graph with real-time moving buses, routes, and shelter statuses',
      icon: <MapIcon className="w-5 h-5 text-purple-400" />,
      color: 'purple',
    },
  ];

  const activeConfig = phoneConfigs.find(c => c.id === selectedPhoneTab) || phoneConfigs[0];
  const activeRoleUrl = `${baseUrl}${activeConfig.roleQuery}`;
  const activeHashUrl = `${baseUrl}${activeConfig.roleHash}`;

  const copyToClipboard = (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLabel(label);
      setFeedbackNotice(`Copied link for ${label}!`);
      setTimeout(() => {
        setCopiedLabel(null);
        setFeedbackNotice(null);
      }, 3000);
    } catch {
      setFeedbackNotice(`Could not auto-copy. Please select and copy the URL text.`);
    }
  };

  const handleOpenLink = (url: string) => {
    try {
      const opened = window.open(url, '_blank');
      if (!opened || opened.closed || typeof opened.closed === 'undefined') {
        copyToClipboard(url, 'Link');
        setFeedbackNotice('Popup was blocked by your browser. Link copied to clipboard so you can paste it into a new tab!');
      }
    } catch {
      copyToClipboard(url, 'Link');
      setFeedbackNotice('Link copied to clipboard! Paste it into a new tab.');
    }
  };

  // High-contrast, black-on-white standard QR code: iOS Camera & Safari recognize this instantly!
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(activeRoleUrl)}&bgcolor=ffffff&color=000000&margin=3`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-2xl w-full shadow-2xl p-5 sm:p-7 space-y-5 my-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <Smartphone className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  A.R.K &bull; Mobile Phone Setup
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-300/90 font-medium">
                Accessible, Rescue, and Kinship &bull; 3-Phone Live Synchronized Demo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* INSTANT 3-PHONE SIMULATOR SHORTCUT */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-blue-500/10 to-emerald-500/20 border-2 border-amber-400/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black text-white">Need to Demo Right Now On One Screen?</span>
            </div>
            <p className="text-xs text-slate-300">
              Launch the <strong>3-Phone Live Synchronized Simulator</strong> to see Phone 1 (Rider), Phone 2 (Driver), and Phone 3 (Shelter) side-by-side!
            </p>
          </div>
          <button
            onClick={() => {
              onSelectRole('simulator');
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center gap-2 shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer"
          >
            <span>Launch 3-Phone View</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* SAFARI IPHONE CONNECTIVITY GUIDE */}
        <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Safari iPhone Scanning Guide:
            </span>
            <button
              onClick={() => setShowSafariHelp(!showSafariHelp)}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              {showSafariHelp ? 'Hide Tips' : 'Show Tips'}
            </button>
          </div>

          {showSafariHelp && (
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <p>
                <strong className="text-white">Why did Safari not open immediately?</strong> AI Studio Cloud Run development servers run an automatic security cookie check.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-bold text-amber-300 block mb-0.5">Step 1: Authenticate in Safari</span>
                  <span className="text-[11px] text-slate-300">
                    If Safari displays <em>&ldquo;Action required to load your app&rdquo;</em>, tap the blue button <strong>&ldquo;Authenticate in new window&rdquo;</strong> to approve the session.
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-bold text-amber-300 block mb-0.5">Step 2: Cross-Site Tracking Tip</span>
                  <span className="text-[11px] text-slate-300">
                    On iPhone: In <strong>Settings &gt; Safari</strong>, turn OFF <em>&ldquo;Prevent Cross-Site Tracking&rdquo;</em>, or open the link in <strong>Google Chrome</strong> on your phone.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ROLE TABS FOR THE 3 PHONES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4" /> Select Phone to Generate Direct QR Code:
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Point camera to open that specific role
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {phoneConfigs.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedPhoneTab(c.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                  selectedPhoneTab === c.id
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                      selectedPhoneTab === c.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-300'
                    }`}
                  >
                    {c.phoneLabel}
                  </span>
                  {c.icon}
                </div>
                <div className="text-xs font-black mt-1 leading-tight">{c.title}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVE PHONE QR CODE & DIRECT LINK DISPLAY */}
        <div className="bg-slate-950 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
          {/* PURE WHITE CONTAINER FOR FLAWLESS SCANNING ON IPHONE CAMERA */}
          <div className="bg-white p-3 rounded-2xl shadow-2xl border-4 border-amber-400 shrink-0 flex flex-col items-center">
            <img
              src={qrSvgUrl}
              alt={`QR Code for ${activeConfig.phoneLabel}: ${activeConfig.title}`}
              className="w-40 h-40 rounded-lg block"
            />
            <span className="text-[11px] font-black text-slate-950 mt-1.5 flex items-center gap-1 font-mono">
              <QrCode className="w-3.5 h-3.5 text-amber-600" /> Scan for {activeConfig.phoneLabel}
            </span>
          </div>

          <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase">
                  {activeConfig.phoneLabel} URL
                </span>
                <span className="text-xs font-bold text-white">
                  {activeConfig.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeConfig.description}
              </p>
            </div>

            {/* Direct URL text box */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300 break-all select-all">
              {activeRoleUrl}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              {/* Copy URL */}
              <button
                onClick={() => copyToClipboard(activeRoleUrl, `${activeConfig.phoneLabel} (${activeConfig.title})`)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                {copiedLabel === `${activeConfig.phoneLabel} (${activeConfig.title})` ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedLabel === `${activeConfig.phoneLabel} (${activeConfig.title})` ? 'Copied Link!' : 'Copy Link'}
                </span>
              </button>

              {/* Copy Hash Fallback Link */}
              <button
                onClick={() => copyToClipboard(activeHashUrl, `${activeConfig.phoneLabel} Hash Link`)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                title="Use if Safari redirects strip URL parameters"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy #Hash Link</span>
              </button>

              {/* Open in New Window/Tab */}
              <button
                onClick={() => handleOpenLink(activeRoleUrl)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </button>

              {/* Switch This Screen to Active Role */}
              <button
                onClick={() => {
                  onSelectRole(activeConfig.id);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
              >
                <span>Switch to this Role &rarr;</span>
              </button>
            </div>
          </div>
        </div>

        {/* STEP-BY-STEP: HOW TO MAKE IT AN APP ON YOUR PHONE (PWA) */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            <h4 className="font-extrabold text-sm sm:text-base text-white">
              How to Save A.R.K as a Real Phone App (No App Store Needed)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* iOS Safari */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="font-black text-amber-300 block text-sm">
                🍏 Apple iPhone (Safari):
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed font-medium">
                <li>Scan the QR code or open the link above in <strong>Safari</strong> on your iPhone.</li>
                <li>Tap the <strong>Share icon</strong> (box with arrow pointing up at the bottom).</li>
                <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
                <li>Tap <strong>&ldquo;Add&rdquo;</strong> at the top right.</li>
              </ol>
              <p className="text-[11px] text-emerald-400 pt-1 font-semibold">
                &check; The A.R.K icon will launch as a full-screen app!
              </p>
            </div>

            {/* Android Chrome */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="font-black text-amber-300 block text-sm">
                🤖 Android (Chrome):
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed font-medium">
                <li>Scan the QR code or open the link above in <strong>Google Chrome</strong>.</li>
                <li>Tap the <strong>three dots (&vellip;)</strong> in the upper right.</li>
                <li>Tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.</li>
                <li>Tap <strong>&ldquo;Install&rdquo;</strong> to confirm.</li>
              </ol>
              <p className="text-[11px] text-emerald-400 pt-1 font-semibold">
                &check; A.R.K runs in standalone mode like a native app.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Cloud Host: <strong className="text-slate-200">ais-dev-...run.app</strong></span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase transition-all cursor-pointer shadow-lg"
          >
            Done &bull; Close
          </button>
        </div>
      </div>
    </div>
  );
};

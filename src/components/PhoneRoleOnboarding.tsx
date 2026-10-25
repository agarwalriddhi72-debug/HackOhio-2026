import React, { useState } from 'react';
import { UserRoleType } from './PhoneRoleDemoSection';
import {
  Users,
  Truck,
  Home,
  CheckCircle2,
  ArrowRight,
  Shield,
  HeartHandshake,
  Sparkles,
  UserCheck,
  ChevronRight,
  MapPin,
  X,
} from 'lucide-react';
import { playChime, triggerVibration } from './NotificationCenter';

interface Props {
  onSelectAndSignUp: (role: UserRoleType, profileName: string, phone: string) => void;
  currentRole?: UserRoleType | null;
  onClose?: () => void;
  canDismiss?: boolean;
}

const ROLE_PRESETS: Record<
  UserRoleType,
  {
    name: string;
    phone: string;
    title: string;
    tagalogTitle: string;
    description: string;
    badge: string;
    location: string;
    benefits: string[];
    accentColor: string;
    icon: React.ReactNode;
  }
> = {
  rider: {
    name: 'Lola Remedios Alcantara',
    phone: '0917-555-8921',
    title: 'Evacuee / Rider',
    tagalogTitle: 'Kailangan ng Libreng Sundo',
    description: 'For older adults (60+), Persons with Disabilities (PWD), wheelchair users, or family members needing accessible evacuation.',
    badge: 'Senior & PWD Priority',
    location: 'Barangay Bañag / Tagas, Daraga',
    benefits: [
      '1-tap Libreng Sundo request for accessible bus',
      'Hydraulic wheelchair ramp reservation',
      'Real-time bus arrival ETA with Tagalog audio alerts',
    ],
    accentColor: 'border-amber-500/60 bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 text-amber-200',
    icon: <Users className="w-6 h-6 text-amber-400" />,
  },
  driver: {
    name: 'Kuya Ramon Santos',
    phone: '0928-555-7744',
    title: 'Rescue Driver',
    tagalogTitle: 'Drayber ng Evacuation Bus (BUS-01)',
    description: 'For LGU shuttle drivers, volunteer operators, or rescue transit marshals navigating evacuation routes.',
    badge: 'Accessible Fleet Operator',
    location: 'Vehicle: BUS-01 (Hydraulic Lift Equipped)',
    benefits: [
      'Turn-by-turn flood & lahar-safe GPS corridor navigation',
      'Live passenger manifest with special medical needs',
      '1-tap "Bus Full" trigger for automatic backup dispatch',
    ],
    accentColor: 'border-blue-500/60 bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-950 text-blue-200',
    icon: <Truck className="w-6 h-6 text-blue-400" />,
  },
  shelter: {
    name: 'Kagawad Elena Cruz',
    phone: '0949-555-3311',
    title: 'Shelter Station',
    tagalogTitle: 'Tagapamahala ng Evacuation Center',
    description: 'For Barangay reception staff, CSWD intake marshals, and evacuation center managers.',
    badge: 'Station Reception & Logistics',
    location: 'Burgos Covered Court (Cap: 350)',
    benefits: [
      'Fast evacuee registration & ground-floor PWD bed allocation',
      'Live bed occupancy count synced with municipal EOC',
      '1-tap "Shelter Full" network diversion to secondary facilities',
    ],
    accentColor: 'border-emerald-500/60 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 text-emerald-200',
    icon: <Home className="w-6 h-6 text-emerald-400" />,
  },
};

export const PhoneRoleOnboarding: React.FC<Props> = ({
  onSelectAndSignUp,
  currentRole,
  onClose,
  canDismiss = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRoleType>(currentRole || 'rider');
  const [customName, setCustomName] = useState<string>(ROLE_PRESETS[currentRole || 'rider'].name);
  const [customPhone, setCustomPhone] = useState<string>(ROLE_PRESETS[currentRole || 'rider'].phone);
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');

  const handleSelectCard = (role: UserRoleType) => {
    setSelectedRole(role);
    setCustomName(ROLE_PRESETS[role].name);
    setCustomPhone(ROLE_PRESETS[role].phone);
    triggerVibration([30]);
    playChime('info');
  };

  const handleProceedToConfirm = (role?: UserRoleType) => {
    const targetRole = role || selectedRole;
    setSelectedRole(targetRole);
    setCustomName(ROLE_PRESETS[targetRole].name);
    setCustomPhone(ROLE_PRESETS[targetRole].phone);
    setStep('confirm');
    triggerVibration([50]);
  };

  const handleFinalSignUp = () => {
    triggerVibration([100, 50, 100]);
    playChime('success');
    onSelectAndSignUp(selectedRole, customName.trim() || ROLE_PRESETS[selectedRole].name, customPhone.trim());
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100 p-4 space-y-4 max-w-md mx-auto w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-white tracking-tight">A.R.K &bull; Mobile</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Daraga
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Accessible Evacuation System</p>
          </div>
        </div>

        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {step === 'pick' ? (
        <div className="space-y-4">
          {/* WELCOME CALLOUT */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Select Your Role to Get Started
            </span>
            <h2 className="text-lg font-black text-white">Choose How You'll Use A.R.K</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Select one of the 3 roles below. You will be signed up for this role with tailored controls and a dedicated interactive demo.
            </p>
          </div>

          {/* 3 ROLE CARDS */}
          <div className="space-y-3">
            {(['rider', 'driver', 'shelter'] as UserRoleType[]).map(roleKey => {
              const preset = ROLE_PRESETS[roleKey];
              const isSelected = selectedRole === roleKey;

              return (
                <div
                  key={roleKey}
                  onClick={() => handleSelectCard(roleKey)}
                  className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative shadow-lg ${
                    preset.accentColor
                  } ${
                    isSelected
                      ? 'ring-2 ring-amber-400 shadow-amber-500/10 scale-[1.01]'
                      : 'opacity-90 hover:opacity-100 hover:border-slate-600'
                  }`}
                >
                  {/* Active Radio Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-white/10 shrink-0">
                        {preset.icon}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90">
                          {preset.badge}
                        </span>
                        <h3 className="text-base font-black text-white leading-tight">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-amber-200/90 italic font-medium">
                          🇵🇭 {preset.tagalogTitle}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {preset.description}
                  </p>

                  {/* Highlights */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1">
                    {preset.benefits.map((b, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Instant Select & Sign Up Button */}
                  <div className="mt-3 pt-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleProceedToConfirm(roleKey);
                      }}
                      className={`w-full py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                        isSelected
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <span>Sign Up as {preset.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* STEP 2: CONFIRMATION & PROFILE DETAILS */
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Step 2 &bull; Sign-Up Profile
                </span>
                <h2 className="text-lg font-black text-white">
                  Confirm Your {ROLE_PRESETS[selectedRole].title} Account
                </h2>
              </div>
              <button
                onClick={() => setStep('pick')}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Change Role
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                {ROLE_PRESETS[selectedRole].icon}
              </div>
              <div>
                <div className="text-xs font-black text-white">
                  {ROLE_PRESETS[selectedRole].title}
                </div>
                <div className="text-[11px] text-slate-400">
                  {ROLE_PRESETS[selectedRole].location}
                </div>
              </div>
            </div>

            {/* Editable Name & Phone */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Full Name / Identifier:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Emergency Phone Number:
                </label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={e => setCustomPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  placeholder="e.g. 0917-555-8921"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
              ⭐ Once signed up, you will immediately enter the <strong>{ROLE_PRESETS[selectedRole].title}</strong> mobile interface with a tailored <strong>Interactive Demo Section</strong> to test all features.
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleFinalSignUp}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Complete Sign Up &amp; Open Phone View</span>
              </button>

              <button
                onClick={() => setStep('pick')}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Back to Role Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

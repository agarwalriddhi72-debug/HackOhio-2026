import React, { useState } from 'react';
import { Resident, Vehicle, Shelter, WeatherState } from '../types';
import { Accessibility, Volume2, CheckCircle2, Clock, MapPin, HeartHandshake, ShieldAlert, AlertCircle, RefreshCw, Phone, User, ArrowRight } from 'lucide-react';

interface Props {
  residents: Resident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  onSubmitRequest: (data: {
    name: string;
    phone: string;
    age: number;
    need: Resident['need'];
    notes: string;
    barangay: string;
    lon: number;
    lat: number;
  }) => Promise<void>;
  highContrast: boolean;
  activeRiderId?: string | null;
  onSelectActiveRider?: (id: string | null) => void;
  weather?: WeatherState | null;
  soundUnlocked?: boolean;
  onUnlockSound?: () => void;
}

const QUICK_BARANGAYS = [
  { name: 'Barangay Bañag', lon: 123.7142, lat: 13.1530, desc: 'Riverbank zone (Tabing-ilog)' },
  { name: 'Barangay Tagas', lon: 123.6925, lat: 13.1382, desc: 'Lowland area near school' },
  { name: 'Barangay Kimantong', lon: 123.7051, lat: 13.1495, desc: 'Town center corridor' },
  { name: 'Barangay Malabog', lon: 123.6738, lat: 13.1250, desc: 'Lower volcano slope' },
  { name: 'Barangay Busay', lon: 123.6890, lat: 13.1620, desc: 'Cagsawa perimeter' },
  { name: 'Barangay Ilawod', lon: 123.7020, lat: 13.1410, desc: 'Public market sector' },
];

const PRESET_RESIDENTS = [
  { name: 'Lola Remedios Alcantara', age: 81, phone: '0917-555-8921', need: 'cane_help' as const, barangay: 'Barangay Tagas', notes: 'Needs cane support stepping up' },
  { name: 'Tatay Rolando Santos', age: 72, phone: '0928-555-4312', need: 'wheelchair' as const, barangay: 'Barangay Kimantong', notes: 'Wheelchair user, ramp required' },
  { name: 'Nanay Beatriz Magallanes', age: 86, phone: '0919-888-2341', need: 'wheelchair' as const, barangay: 'Barangay Bañag', notes: 'Low-lying river area' },
];

export const RiderInterface: React.FC<Props> = ({
  residents,
  vehicles,
  shelters,
  onSubmitRequest,
  highContrast,
  activeRiderId,
  onSelectActiveRider,
  weather,
  soundUnlocked,
  onUnlockSound,
}) => {
  // Choice state: null = not answered yet, true = needs pickup, false = safe / no help needed
  const [needsAssistance, setNeedsAssistance] = useState<boolean | null>(() => {
    // If there is already an active resident id, default to true
    return activeRiderId ? true : null;
  });

  const [localRiderId, setLocalRiderId] = useState<string | null>(
    activeRiderId || (residents.length > 0 ? residents[0].id : null)
  );
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<number>(76);
  const [need, setNeed] = useState<Resident['need']>('wheelchair');
  const [barangay, setBarangay] = useState('Barangay Bañag');
  const [submitting, setSubmitting] = useState(false);

  const currentRider = residents.find(r => r.id === (activeRiderId || localRiderId));
  const assignedVehicle = vehicles.find(v => v.id === currentRider?.assignedVehicleId);
  const assignedShelter = shelters.find(s => s.id === currentRider?.assignedShelterId);

  const handleSelectPreset = (preset: typeof PRESET_RESIDENTS[0]) => {
    setNeedsAssistance(true);
    const existing = residents.find(r => r.name.toLowerCase().includes(preset.name.split(' ')[1]?.toLowerCase() || ''));
    if (existing) {
      setLocalRiderId(existing.id);
      if (onSelectActiveRider) onSelectActiveRider(existing.id);
      setShowRequestForm(false);
    } else {
      setName(preset.name);
      setPhone(preset.phone);
      setAge(preset.age);
      setNeed(preset.need);
      setBarangay(preset.barangay);
      setShowRequestForm(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const bgyObj = QUICK_BARANGAYS.find(b => b.name === barangay) || QUICK_BARANGAYS[0];

    try {
      await onSubmitRequest({
        name,
        phone: phone || '0917-000-0000',
        age: Number(age) || 75,
        need,
        notes: `Age: ${age}yo · Priority accessible evacuation`,
        barangay,
        lon: bgyObj.lon,
        lat: bgyObj.lat,
      });
      setShowRequestForm(false);
      setNeedsAssistance(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadStatusAloud = (englishText: string, tagalogText: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = `${tagalogText}. ${englishText}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.85; // Slower, clearer pace for elderly listeners
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getStepProgress = () => {
    if (!currentRider) return 0;
    switch (currentRider.status) {
      case 'waiting': return 1;
      case 'assigned': return 2;
      case 'picked_up': return 3;
      case 'delivered': return 4;
      default: return 1;
    }
  };

  const currentStep = getStepProgress();

  // =========================================================================
  // SCREEN 1: FIRST CHOICE - DO YOU NEED HELP / EVACUATION PICKUP?
  // =========================================================================
  if (needsAssistance === null) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-2">
        {/* Elder Friendly Assistance Prompt Header */}
        <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 text-center space-y-3 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400">
            <HeartHandshake className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Lokal na Pamahalaan ng Daraga · MDRRMO
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Kailangan Mo Ba ng Libreng Sundo?
            </h2>
            <p className="text-sm font-semibold text-slate-300">
              Do you need free evacuation pickup assistance?
            </p>
          </div>

          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Libreng serbisyo ng gobyerno para sa mga <strong>senior citizens (60+)</strong>, mga gumagamit ng <strong>wheelchair</strong>, <strong>baston</strong>, at may kapansanan sa Daraga.
          </p>

          {/* Audio read button */}
          <button
            type="button"
            onClick={() => {
              handleReadStatusAloud(
                'Do you need free evacuation pickup assistance? Press the green button if yes, or the gray button if you are safe.',
                'Kailangan mo ba ng libreng sundo para sa paglikas? Pindutin ang berdeng buton kung oo, o ang abong buton kung ligtas ka.'
              );
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer active:scale-95 transition-all"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>Pakinggan ang Tanong (Listen)</span>
          </button>
        </div>

        {/* Binary Choice Buttons - Extra Large Touch Targets (min 64px height) */}
        <div className="grid grid-cols-1 gap-3.5">
          {/* YES BUTTON: Need help */}
          <button
            type="button"
            onClick={() => {
              setNeedsAssistance(true);
              // Read welcome instructions aloud
              handleReadStatusAloud(
                'You selected yes. We will dispatch an accessible rescue shuttle to your barangay.',
                'Salamat po. Tutulungan po kayo ng Daraga Rescue Shuttle. Piliin ang inyong pangangailangan.'
              );
            }}
            className="w-full min-h-[72px] p-5 rounded-3xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-left shadow-lg border-2 border-emerald-400 transition-all cursor-pointer flex items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                ✅
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black tracking-tight">
                  OO, KAILANGAN KO NG SUNDO
                </div>
                <div className="text-xs text-emerald-100 font-medium">
                  Yes, I need free evacuation pickup (Senior / PWD / Wheelchair)
                </div>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-white shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* NO BUTTON: Safe / Self-Evacuating */}
          <button
            type="button"
            onClick={() => {
              setNeedsAssistance(false);
              handleReadStatusAloud(
                'You are marked safe. If you need help later, you can request anytime.',
                'Nakatala na ligtas kayo. Kung magbago ang sitwasyon, maaari kayong humingi ng sundo anumang oras.'
              );
            }}
            className="w-full min-h-[64px] p-4 rounded-3xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-bold text-left shadow border border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-xl shrink-0">
                🏠
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-slate-100">
                  Ligtas Ako / May Sariling Sasakyan
                </div>
                <div className="text-xs text-slate-400 font-normal">
                  No, I am safe or self-evacuating with my family
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-bold group-hover:text-white transition-colors">
              I-save
            </span>
          </button>
        </div>

        {/* Quick Hotline Pill */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Phone className="w-4 h-4 text-amber-400" /> Daraga MDRRMO Hotline:
          </span>
          <a
            href="tel:0527425555"
            className="font-mono text-amber-400 font-bold hover:underline"
          >
            (052) 742-5555
          </a>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: MARKED AS SAFE / NO EVACUATION NEEDED
  // =========================================================================
  if (needsAssistance === false) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-2">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Status: Ligtas at Walang Panganib
            </span>
            <h2 className="text-2xl font-black text-white">
              Nakatala: Ligtas ang Inyong Tahanan
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Salamat sa pagtugon. Nakabawas ito sa karga ng rescue teams para sa mga higit na nangangailangan.
            </p>
          </div>

          {/* Safety Checklist for Elders */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2.5 text-xs text-slate-300">
            <div className="font-bold text-white text-xs uppercase tracking-wide">
              Mga Paalala Habang Ligtas:
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Ihanda ang inyong Emergency Go-Bag at mga maintenance na gamot.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>I-charge nang buo ang cellphone at power bank.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Makinig sa lokal na balita o babala ng PAGASA / MDRRMO Daraga.</span>
            </div>
          </div>

          {/* Change Decision Button */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                setNeedsAssistance(true);
                setShowRequestForm(true);
              }}
              className="w-full min-h-[56px] px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <HeartHandshake className="w-5 h-5" />
              <span>Nagbago ang Sitwasyon? Humingi ng Sundo Ngayon</span>
            </button>
            <p className="text-[11px] text-slate-500">
              Maaari kang humingi ng libreng sundo anumang oras kapag tumaas ang baha o lumakas ang hangin.
            </p>
          </div>
        </div>

        {/* Emergency Call Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="tel:0527425555"
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4 text-amber-400" />
            <span>MDRRMO: (052) 742-5555</span>
          </a>
          <a
            href="tel:911"
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs font-bold text-red-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Emergency: Dial 911</span>
          </a>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: NEEDS ASSISTANCE = TRUE (Active Tracking or Request Form)
  // =========================================================================


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Sound unlock tip on mobile if needed */}
      {!soundUnlocked && onUnlockSound && (
        <button
          type="button"
          onClick={onUnlockSound}
          className="w-full p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center justify-between gap-3 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Enable sound siren and spoken audio for updates</span>
          </div>
          <span className="text-amber-400 font-bold underline">Turn On Audio</span>
        </button>
      )}

      {/* Top Header & Evacuee Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Libreng Sundo (Accessible Evacuation)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Priority free transport for seniors (60+) and persons with disabilities
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setNeedsAssistance(null)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Bumalik sa tanong kung kailangan ng sundo"
          >
            ← Baguhin ang Sagot
          </button>

          {/* Demo Fast-Switch Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {PRESET_RESIDENTS.map(p => (
              <button
                key={p.name}
                onClick={() => handleSelectPreset(p)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                title={`Switch to ${p.name}`}
              >
                {p.name.split(' ')[1]} ({p.need === 'wheelchair' ? '♿' : '🦯'})
              </button>
            ))}
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                showRequestForm
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {showRequestForm ? 'Tingnan ang Status' : '+ Bagong Saklolo'}
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Request Form OR Ride Status */}
      {showRequestForm ? (
        /* Form View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">Request an Evacuation Shuttle</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your details or those of the person needing assistance. We will dispatch the closest equipped bus.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name (Pangalan)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Remedios Alcantara"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0917-000-0000"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* Need Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Accessibility Requirement (Pangangailangan)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'wheelchair',
                    label: 'Wheelchair User',
                    sub: 'Requires ramp or lift vehicle',
                    icon: '♿',
                  },
                  {
                    id: 'cane_help',
                    label: 'Walking Assistance',
                    sub: 'Cane or physical support needed',
                    icon: '🦯',
                  },
                  {
                    id: 'elderly_general',
                    label: 'Senior Citizen (60+)',
                    sub: 'Low-floor step or general seat',
                    icon: '👵',
                  },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNeed(opt.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      need === opt.id
                        ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-xs font-bold text-white">{opt.label}</div>
                    <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Pickup Location (Barangay sa Daraga)
              </label>
              <select
                value={barangay}
                onChange={e => setBarangay(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
              >
                {QUICK_BARANGAYS.map(b => (
                  <option key={b.name} value={b.name}>
                    {b.name} — {b.desc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Submit Evacuation Request'}
              </button>
            </div>
          </form>
        </div>
      ) : currentRider ? (
        /* Status Tracking View */
        <div className="space-y-5">
          {/* Main Status Progress Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="text-xs text-amber-400 font-semibold block mb-0.5">
                  Evacuation Request #{currentRider.id.slice(-4)}
                </span>
                <h3 className="text-2xl font-bold text-white">{currentRider.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pickup: <strong className="text-slate-200">{currentRider.barangay}</strong> · Need:{' '}
                  {currentRider.need === 'wheelchair'
                    ? 'Wheelchair Access'
                    : currentRider.need === 'cane_help'
                    ? 'Walking Support'
                    : 'Senior Citizen'}
                </p>
              </div>

              {/* Spoken Audio Helper */}
              <button
                type="button"
                onClick={() => {
                  const en = `Status for ${currentRider.name}: ${
                    currentStep === 2
                      ? `${assignedVehicle?.name || 'Bus 01'} is en route to ${currentRider.barangay}. Estimated arrival in 6 to 8 minutes.`
                      : currentStep === 3
                      ? 'You are safely on board the evacuation bus.'
                      : currentStep === 4
                      ? 'You have safely arrived at the evacuation center.'
                      : 'Request logged, locating nearest bus.'
                  }`;
                  const tl = `Paparating na po ang sundo ninyo. Ihanda na po ang inyong gamot at mahahalagang gamit.`;
                  handleReadStatusAloud(en, tl);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors shrink-0"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Read Status Aloud</span>
              </button>
            </div>

            {/* Visual Step Indicator */}
            <div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { step: 1, label: 'Logged', desc: 'Received' },
                  { step: 2, label: 'Dispatched', desc: '~6-8 min' },
                  { step: 3, label: 'On Board', desc: 'En Route' },
                  { step: 4, label: 'At Shelter', desc: 'Safe' },
                ].map(s => {
                  const isDone = currentStep >= s.step;
                  const isCurrent = currentStep === s.step;
                  return (
                    <div key={s.step} className="space-y-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          isDone ? 'bg-amber-400' : 'bg-slate-800'
                        }`}
                      />
                      <div
                        className={`font-semibold ${
                          isCurrent ? 'text-amber-400' : isDone ? 'text-white' : 'text-slate-500'
                        }`}
                      >
                        {s.label}
                      </div>
                      <div className="text-[10px] text-slate-500 hidden sm:block">{s.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Cards: Assigned Vehicle & Shelter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold block">
                  Assigned Rescue Shuttle
                </span>
                <span className="text-base font-bold text-white block">
                  {assignedVehicle?.name || 'Bus 01 (Kuya Ramon)'}
                </span>
                <span className="text-xs text-slate-400 block">
                  Accessible Lift Van · Driver: {assignedVehicle?.driverName || 'Kuya Ramon'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold block">
                  Destination Center
                </span>
                <span className="text-base font-bold text-white block">
                  {assignedShelter?.name || 'Burgos Covered Court'}
                </span>
                <span className="text-xs text-slate-400 block">
                  Designated High Ground · Medical & Ramp Equipped
                </span>
              </div>
            </div>

            {/* Custom bus full advisory if triggered */}
            {currentRider.customMessage && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{currentRider.customMessage}</span>
              </div>
            )}
          </div>

          {/* Quick Help Hotlines */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              Daraga MDRRMO Emergency Hotline:
            </span>
            <div className="flex items-center gap-4 text-slate-300 font-mono">
              <span>(052) 742-5555</span>
              <span>·</span>
              <span>0917-502-3456</span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <p className="text-slate-400 text-sm">No evacuation request selected.</p>
          <button
            onClick={() => setShowRequestForm(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase cursor-pointer"
          >
            Create Request
          </button>
        </div>
      )}
    </div>
  );
};

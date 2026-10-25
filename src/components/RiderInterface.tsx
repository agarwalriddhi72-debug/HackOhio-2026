import React, { useState } from 'react';
import { Resident, Vehicle, Shelter, WeatherState } from '../types';
import { Accessibility, Volume2, CheckCircle2, AlertCircle, Phone, MapPin, Sparkles, User, RefreshCw, Clock, ShieldCheck, HeartHandshake, ShieldAlert, Radio } from 'lucide-react';

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
  { name: 'Barangay Bañag', lon: 123.7142, lat: 13.1530, desc: 'Low-lying riverbank / Tabing-ilog' },
  { name: 'Barangay Tagas', lon: 123.6925, lat: 13.1382, desc: 'Tagas school & river / Mababang lugar' },
  { name: 'Barangay Kimantong', lon: 123.7051, lat: 13.1495, desc: 'Daraga Town Center / Sentro ng Bayan' },
  { name: 'Barangay Malabog', lon: 123.6738, lat: 13.1250, desc: 'Mayon lower slope / Paanan ng Bulkan' },
  { name: 'Barangay Busay', lon: 123.6890, lat: 13.1620, desc: 'Cagsawa area / Malapit sa Cagsawa' },
  { name: 'Barangay Ilawod', lon: 123.7020, lat: 13.1410, desc: 'Public Market / Pamilihang Bayan' },
];

const RANDOM_PERSONS = [
  { name: 'Lola Remedios Alcantara', age: 81, phone: '0917-555-8921', need: 'cane_help', barangay: 'Barangay Tagas', notes: 'Needs hand support stepping up bus / Kailangan ng akay' },
  { name: 'Tatay Rolando Santos', age: 72, phone: '0928-555-4312', need: 'wheelchair', barangay: 'Barangay Kimantong', notes: 'Wheelchair user, needs ramp / Naka-wheelchair' },
  { name: 'Nanay Beatriz Magallanes', age: 86, phone: '0919-888-2341', need: 'wheelchair', barangay: 'Barangay Bañag', notes: 'Severe flood hazard area / Baha sa ilog' },
  { name: 'Lolo Crisanto Pardo', age: 74, phone: '0949-555-1289', need: 'elderly_general', barangay: 'Barangay Malabog', notes: 'General elderly evacuee (60+) / Nakatatanda' },
  { name: 'Lola Corazon Flores', age: 68, phone: '0905-555-7731', need: 'cane_help', barangay: 'Barangay Bañag', notes: 'Near river overflow / Tabing-ilog' },
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
  // If activeRiderId is set, track that specific rider. If not, default to the user's latest request or null
  const [localRiderId, setLocalRiderId] = useState<string | null>(activeRiderId || (residents.length > 0 ? residents[0].id : null));

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<number>(76);
  const [need, setNeed] = useState<string>('wheelchair');
  const [barangay, setBarangay] = useState('Barangay Bañag');
  const [submitting, setSubmitting] = useState(false);

  // The active rider viewed by this device
  const currentRider = residents.find(r => r.id === (activeRiderId || localRiderId));
  const assignedVehicle = vehicles.find(v => v.id === currentRider?.assignedVehicleId);
  const assignedShelter = shelters.find(s => s.id === currentRider?.assignedShelterId);

  const handleRandomPerson = () => {
    const randomPick = RANDOM_PERSONS[Math.floor(Math.random() * RANDOM_PERSONS.length)];
    setName(randomPick.name);
    setPhone(randomPick.phone);
    setAge(randomPick.age);
    setNeed(randomPick.need);
    setBarangay(randomPick.barangay);
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
        notes: `Age: ${age}yo &bull; Priority evacuation request`,
        barangay,
        lon: bgyObj.lon,
        lat: bgyObj.lat,
      });

      // Target newly created resident (first in list after update)
      if (residents.length > 0) {
        setLocalRiderId(residents[0].id);
        if (onSelectActiveRider) onSelectActiveRider(residents[0].id);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadStatusAloud = (englishText: string, tagalogText: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Speak in clear, comfortable pacing
      const textToSpeak = `${englishText}. ${tagalogText}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Status Presentation tailored for elderly riders with bilingual English + Tagalog
  const getStatusDisplay = () => {
    if (!currentRider) return null;

    if (currentRider.customMessage && currentRider.customMessage.toLowerCase().includes('full')) {
      return {
        badgeEn: 'BUS IS FULL — PLEASE WAIT FOR NEXT BUS',
        badgeTl: 'PUNO NA ANG BUS — MAGHINTAY PO SA KASUNOD',
        bg: 'bg-amber-600 border-amber-400 text-white',
        textEn: 'The assigned bus is currently at maximum capacity. You are placed at the very top of the queue for the next rescue vehicle. Please stay in a safe, elevated location.',
        textTl: 'Puno na po ang unang bus. Naka-priority po kayo sa susunod na darating na sasakyan. Manatili po sa mataas at ligtas na lugar.',
        icon: <AlertCircle className="w-12 h-12 text-amber-200 animate-pulse" />,
      };
    }

    switch (currentRider.status) {
      case 'waiting':
        return {
          badgeEn: 'SEARCHING FOR RESCUE BUS...',
          badgeTl: 'NAGHAHANAP NG SUSUNDONG BUS...',
          bg: 'bg-amber-700 border-amber-400 text-white',
          textEn: 'Your emergency evacuation request is registered. The A.R.K system is routing the nearest accessible bus with ramp to your location.',
          textTl: 'Nakatala na po ang inyong saklolo. Hinahanap po ng A.R.K ang pinakamalapit na sasakyang may rampa para sunduin kayo.',
          icon: <Clock className="w-12 h-12 text-amber-300 animate-spin" />,
        };
      case 'assigned':
        return {
          badgeEn: 'BUS DISPATCHED & EN ROUTE',
          badgeTl: 'PAPARATING NA ANG BUS SA INYO',
          bg: 'bg-blue-600 border-blue-300 text-white',
          textEn: `${assignedVehicle?.name || 'Rescue Bus'} is on its way to ${currentRider.barangay}. Estimated arrival: ~6-10 minutes. Please prepare your essential medicine and belongings.`,
          textTl: `Paparating na po ang ${assignedVehicle?.name || 'Rescue Bus'} sa inyong barangay. Tinatayang 6-10 minuto. Ihanda na po ang inyong gamot at mahahalagang gamit.`,
          icon: <Accessibility className="w-12 h-12 text-blue-200" />,
        };
      case 'picked_up':
        return {
          badgeEn: 'SAFELY ON BOARD',
          badgeTl: 'LIGTAS NA NAKASAKAY SA SASAKYAN',
          bg: 'bg-indigo-700 border-indigo-400 text-white',
          textEn: `You are safely aboard ${assignedVehicle?.name || 'the evacuation bus'}, traveling towards ${assignedShelter?.name || 'the evacuation center'}.`,
          textTl: `Ligtas na po kayong nakasakay sa bus patungo sa ${assignedShelter?.name || 'evacuation center'}. Huwag mag-alala, ligtas ang ating ruta.`,
          icon: <CheckCircle2 className="w-12 h-12 text-indigo-200" />,
        };
      case 'delivered':
        return {
          badgeEn: 'SAFELY ARRIVED AT SHELTER',
          badgeTl: 'LIGTAS NANG NAKARATING SA EVACUATION CENTER',
          bg: 'bg-emerald-600 border-emerald-300 text-white',
          textEn: `You have safely arrived at ${assignedShelter?.name || 'the evacuation center'}. Medical staff, water, and warm relief assistance are prepared for you.`,
          textTl: `Nakarating na po kayo nang ligtas sa evacuation center. Handa na po ang mga nars, pagkain, at tulong para sa inyo.`,
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-200" />,
        };
      default:
        return {
          badgeEn: 'REQUEST LOGGED',
          badgeTl: 'NAITALA NA ANG KAHILINGAN',
          bg: 'bg-slate-800 border-slate-600 text-white',
          textEn: 'Request logged into A.R.K network.',
          textTl: 'Naitala na sa sistema ng A.R.K.',
          icon: <Clock className="w-12 h-12 text-slate-300" />,
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 1. Mobile Audio / Siren Unlock Banner */}
      {!soundUnlocked && onUnlockSound && (
        <button
          type="button"
          onClick={onUnlockSound}
          className="w-full p-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400 text-amber-200 text-xs font-black flex items-center justify-between gap-3 transition-all cursor-pointer shadow-lg animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-left">
              <div>Tap to Enable Sound Siren &amp; Vibration Alerts on this Phone</div>
              <div className="text-[10px] text-amber-300 font-normal">Pindutin para marinig ang sirena at babala sa inyong telepono</div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase shrink-0 shadow">
            Enable Alerts
          </span>
        </button>
      )}

      {/* 2. Active Disaster Hazard Warning Alert Card */}
      {weather && weather.status === 'ALERT_ACTIVE' && (
        <div className="bg-gradient-to-r from-red-950 via-amber-950/90 to-slate-900 border-2 border-red-500 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3 ring-4 ring-red-500/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-red-500/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500/60 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                    EMERGENCY HAZARD WARNING
                  </span>
                  <span className="text-xs text-amber-300 font-mono">
                    {weather.primaryDisaster || 'Severe Weather'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {weather.scenarioName}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const msg = `Disaster warning in effect for Daraga: ${weather.primaryDisaster || 'Severe Weather'}. Priority evacuation shuttles with wheelchair ramps are operating. Please request your rescue bus.`;
                const tl = `Babala sa kalamidad sa Daraga: May banta ng ${weather.primaryDisaster || 'kalamidad'}. Bukas na po ang libreng saklolo para sa mga nakatatanda at may kapansanan. Humiling na po ng inyong sundo.`;
                handleReadStatusAloud(msg, tl);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to Warning &bull; Pakinggan</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            PAGASA &amp; PHIVOLCS emergency models indicate severe conditions in Daraga, Albay. Accessible transport vehicles are mobilized to prioritize seniors (60+) and persons with disabilities.
          </p>
          <p className="text-xs text-amber-200/95 italic font-medium">
            🇵🇭 Babala: May umiiral na banta sa panahon. Pindutin ang form sa ibaba para magpasundo sa inyong tahanan bago tumaas ang baha o lumala ang bagyo.
          </p>
        </div>
      )}

      {/* If rider already submitted a request, show ONLY their own clean status card */}
      {currentRider ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
                <HeartHandshake className="w-6 h-6 text-amber-400" />
                <span>My Evacuation Status &bull; Aking Saklolo</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Live updates for <strong className="text-white">{currentRider.name}</strong> &bull; {currentRider.barangay}
              </p>
            </div>
            <button
              onClick={() => {
                setLocalRiderId(null);
                if (onSelectActiveRider) onSelectActiveRider(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Request / Bagong Saklolo</span>
            </button>
          </div>

          {statusInfo && (
            <div className={`rounded-3xl p-6 sm:p-8 border-4 shadow-2xl transition-all space-y-6 ${statusInfo.bg}`}>
              {/* Badge & Big Status Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-4 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/20">
                    {statusInfo.icon}
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1">
                      <span className="text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full bg-black/40 text-amber-300 border border-white/20 inline-block">
                        {statusInfo.badgeEn}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-200 mt-1 block">
                      {statusInfo.badgeTl}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black mt-2 leading-tight">
                      {currentRider.name}
                    </h3>
                    <p className="text-sm font-semibold opacity-90 mt-0.5">
                      {currentRider.barangay} &bull; Need: {currentRider.need === 'elderly_general' ? 'Senior Evacuee (60+ Nakatatanda)' : currentRider.need.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Voice Assist Button: Bilingual text-to-speech */}
                <button
                  type="button"
                  onClick={() => handleReadStatusAloud(statusInfo.textEn, statusInfo.textTl)}
                  className="px-5 py-3.5 rounded-2xl bg-black/40 hover:bg-black/60 text-white border-2 border-white/40 flex items-center gap-2.5 font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Pindutin para marinig nang malakas ang katayuan"
                >
                  <Volume2 className="w-7 h-7 text-amber-300 shrink-0" />
                  <div className="text-left">
                    <div>Listen Aloud</div>
                    <div className="text-[10px] text-amber-200 font-medium">Pakinggan nang Malakas</div>
                  </div>
                </button>
              </div>

              {/* Status Explanation (English + Tagalog) */}
              <div className="p-5 rounded-2xl bg-black/30 backdrop-blur-sm border-2 border-white/20 space-y-3">
                <p className="text-base sm:text-lg font-bold leading-relaxed text-white">
                  {statusInfo.textEn}
                </p>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-sm sm:text-base font-semibold text-amber-200 leading-relaxed">
                    🇵🇭 {statusInfo.textTl}
                  </p>
                </div>
              </div>

              {/* Vehicle & Shelter Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-semibold">
                <div className="p-4 rounded-2xl bg-black/25 border border-white/20 space-y-1">
                  <span className="text-white/80 text-xs block uppercase font-bold">
                    Rescue Bus &bull; Sasakyang Susundo:
                  </span>
                  <span className="text-lg font-black text-white block">
                    {assignedVehicle ? assignedVehicle.name : 'Dispatching Nearest Bus...'}
                  </span>
                  {assignedVehicle && (
                    <span className="text-xs text-amber-200 block">
                      Driver: {assignedVehicle.driverName} &bull; Type: Wheelchair Lift Van
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-black/25 border border-white/20 space-y-1">
                  <span className="text-white/80 text-xs block uppercase font-bold">
                    Evacuation Shelter &bull; Pupuntahang Sentro:
                  </span>
                  <span className="text-lg font-black text-white block">
                    {assignedShelter ? assignedShelter.name : 'Burgos Covered Court'}
                  </span>
                  <span className="text-xs text-emerald-200 block">
                    Safe high-ground facility &bull; May rampa at pasilidad
                  </span>
                </div>
              </div>

              {/* Notice if Bus was Marked Full */}
              {currentRider.customMessage && (
                <div className="p-4 rounded-2xl bg-amber-500/30 border-2 border-amber-300 text-amber-100 text-sm font-bold flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-300 shrink-0" />
                  <div>
                    <div>{currentRider.customMessage}</div>
                    <div className="text-xs text-amber-200 mt-0.5">
                      Puno na po ang naunang sasakyan. Parating na po ang kasunod na bus para sa inyo.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Form view: Extremely simple, high-contrast, giant buttons for elderly users */
        <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider">
                  Senior (60+) &bull; PWD Priority
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase">
                  Libreng Serbisyo (Free)
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
                Request Free Rescue Bus &bull; Humiling ng Paglikas
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Pindutin para magpasundo bago ang sakuna. Para sa mga nakatatanda (60+) at may kapansanan sa Daraga.
              </p>
            </div>

            {/* Quick Random Person Button for Evaluator Testing */}
            <button
              type="button"
              onClick={handleRandomPerson}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Punan agad ng halimbawang impormasyon"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fill Random Person / Punan Halimbawa</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Name */}
            <div>
              <label htmlFor="rider-name-input" className="block text-base sm:text-lg font-extrabold text-white mb-1">
                1. Full Name &bull; Buong Pangalan *
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Ipasok ang pangalan ng nakatatanda o taong may kapansanan.
              </p>
              <input
                id="rider-name-input"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Halimbawa: Lola Remedios Alcantara"
                className="w-full text-lg sm:text-xl px-5 py-4 rounded-2xl bg-slate-950 border-2 border-slate-600 focus:border-amber-400 focus:outline-none text-white font-bold placeholder:text-slate-500"
              />
            </div>

            {/* 2. Age & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rider-age-input" className="block text-base sm:text-lg font-extrabold text-white mb-1">
                  2. Age &bull; Edad (60+ Priority) *
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Inuuna ang mga may edad 60 pataas.
                </p>
                <input
                  id="rider-age-input"
                  type="number"
                  min={1}
                  max={120}
                  required
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  className="w-full text-lg px-5 py-4 rounded-2xl bg-slate-950 border-2 border-slate-600 focus:border-amber-400 focus:outline-none text-white font-bold"
                />
              </div>

              <div>
                <label htmlFor="rider-phone-input" className="block text-base sm:text-lg font-extrabold text-white mb-1">
                  Contact Phone &bull; Numero ng Telepono
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Para matawagan ng drayber pagdating.
                </p>
                <div className="relative">
                  <Phone className="w-6 h-6 absolute left-4 top-4 text-slate-400" />
                  <input
                    id="rider-phone-input"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0917-xxx-xxxx"
                    className="w-full text-lg pl-14 pr-5 py-4 rounded-2xl bg-slate-950 border-2 border-slate-600 focus:border-amber-400 focus:outline-none text-white font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 3. Special Accessibility Need */}
            <div>
              <label className="block text-base sm:text-lg font-extrabold text-white mb-1">
                3. What kind of help do you need? &bull; Anong tulong ang kailangan? *
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Piliin ang naaangkop para makapagpadala ng tamang sasakyan na may rampa o tulong.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'wheelchair',
                    title: 'Wheelchair User',
                    tagalog: 'Naka-wheelchair (Kailangan ng rampa o lift)',
                    icon: '♿',
                  },
                  {
                    id: 'cane_help',
                    title: 'Walking Cane / Step Help',
                    tagalog: 'Gumagamit ng baston (Kailangan ng akay sa hagdan)',
                    icon: '🦯',
                  },
                  {
                    id: 'stretcher',
                    title: 'Bed-Bound / Stretcher',
                    tagalog: 'Nakahiga sa higaan (Kailangan ng stretcher)',
                    icon: '🛏️',
                  },
                  {
                    id: 'elderly_general',
                    title: 'General Evacuee (60+)',
                    tagalog: 'Nakatatanda / Senior Citizen (Kayang lumakad)',
                    icon: '👵',
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNeed(item.id)}
                    className={`p-4 rounded-2xl border-4 text-left transition-all cursor-pointer flex items-center gap-3 ${
                      need === item.id
                        ? 'border-amber-400 bg-amber-500/20 text-white shadow-xl ring-2 ring-amber-400'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-3xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="font-extrabold text-base sm:text-lg leading-tight">{item.title}</div>
                      <div className="text-xs text-amber-300 font-semibold mt-0.5">{item.tagalog}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Barangay Selection (Big Tap Buttons) */}
            <div>
              <label className="block text-base sm:text-lg font-extrabold text-white mb-1">
                4. Where are you in Daraga? &bull; Saang barangay po susunduin? *
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Pindutin ang inyong barangay. Dito pupunta ang sasakyan.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {QUICK_BARANGAYS.map(b => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setBarangay(b.name)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      barangay === b.name
                        ? 'border-amber-400 bg-amber-500/20 text-white font-extrabold shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{b.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{b.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Giant Bilingual Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-5 px-8 rounded-3xl font-black text-xl sm:text-2xl tracking-wide uppercase shadow-2xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : highContrast
                  ? 'bg-amber-400 text-black hover:bg-amber-300 ring-4 ring-amber-500'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-amber-500/30 active:scale-98'
              }`}
            >
              <div className="flex items-center gap-3">
                <Accessibility className="w-8 h-8 shrink-0" />
                <span>{submitting ? 'DISPATCHING BUS...' : 'REQUEST EMERGENCY BUS'}</span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-normal normal-case">
                &bull; Pindutin para humiling ng libreng sundo
              </span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

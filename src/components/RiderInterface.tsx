import React, { useState } from 'react';
import { Resident, Vehicle, Shelter } from '../types';
import { UserCheck, Accessibility, HeartPulse, Baby, Clock, Phone, MapPin, AlertCircle, Volume2, CheckCircle2, ShieldAlert } from 'lucide-react';

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
}

const DARAGA_BARANGAYS = [
  { name: 'Barangay Tagas', lon: 123.6925, lat: 13.1382, note: 'Near Tagas Elementary & riverbank' },
  { name: 'Barangay Kimantong', lon: 123.7051, lat: 13.1495, note: 'Central commercial & residential' },
  { name: 'Barangay Bañag', lon: 123.7142, lat: 13.1530, note: 'Low-lying flood hazard zone' },
  { name: 'Barangay Malabog', lon: 123.6738, lat: 13.1250, note: 'Mayon volcano lahar flow corridor' },
  { name: 'Barangay Busay', lon: 123.6890, lat: 13.1620, note: 'Cagsawa ruins & slope area' },
  { name: 'Barangay Ilawod', lon: 123.7020, lat: 13.1410, note: 'Near Daraga public market' },
  { name: 'Barangay Binitayan', lon: 123.7180, lat: 13.1460, note: 'Near highway link & river' },
  { name: 'Barangay Cullat', lon: 123.6650, lat: 13.1180, note: 'Agricultural lowlands' },
  { name: 'Barangay Inarado', lon: 123.6580, lat: 13.1390, note: 'Mountain foot slope' },
  { name: 'Barangay Sagpon', lon: 123.7080, lat: 13.1450, note: 'Near municipality hall' },
];

export const RiderInterface: React.FC<Props> = ({
  residents,
  vehicles,
  shelters,
  onSubmitRequest,
  highContrast,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<number>(72);
  const [need, setNeed] = useState<Resident['need']>('elderly');
  const [barangay, setBarangay] = useState(DARAGA_BARANGAYS[0].name);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentRiderId, setCurrentRiderId] = useState<string>(residents[0]?.id || '');
  const [message, setMessage] = useState<string | null>(null);

  // Active rider to track
  const activeRider = residents.find(r => r.id === currentRiderId) || residents[0];
  const assignedVehicle = vehicles.find(v => v.id === activeRider?.assignedVehicleId);
  const assignedShelter = shelters.find(s => s.id === activeRider?.assignedShelterId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setMessage(null);

    const bgyObj = DARAGA_BARANGAYS.find(b => b.name === barangay) || DARAGA_BARANGAYS[0];

    try {
      await onSubmitRequest({
        name,
        phone,
        age,
        need,
        notes,
        barangay,
        lon: bgyObj.lon,
        lat: bgyObj.lat,
      });

      setMessage('Evacuation assistance request received! Searching and routing nearest rescue vehicle...');
      setName('');
      setNotes('');
      // focus tracking on newest request
      if (residents.length > 0) {
        setCurrentRiderId(residents[0].id);
      }
    } catch {
      setMessage('Failed to submit request. Please check connection or contact Daraga MDRRMO directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadStatusAloud = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getStatusDisplay = () => {
    if (!activeRider) return null;

    if (activeRider.customMessage && activeRider.customMessage.includes('full')) {
      return {
        badge: 'BUS IS FULL - PLEASE WAIT',
        color: 'bg-amber-600 border-amber-400 text-white',
        text: 'The assigned bus reached maximum safe capacity. Your request has been kept at top priority in the waiting pool for the next available rescue vehicle. Please remain safely in place.',
        icon: <AlertCircle className="w-8 h-8 text-amber-200 animate-pulse" />,
      };
    }

    switch (activeRider.status) {
      case 'waiting':
        return {
          badge: 'WAITING FOR DISPATCH',
          color: 'bg-amber-700/80 border-amber-500 text-amber-100',
          text: 'Request logged. System is optimizing routing to match an accessible vehicle with appropriate ramp or medical space.',
          icon: <Clock className="w-8 h-8 text-amber-300 animate-spin" />,
        };
      case 'assigned':
        return {
          badge: 'VEHICLE EN ROUTE',
          color: 'bg-blue-700 border-blue-400 text-white',
          text: `Rescue vehicle ${assignedVehicle?.name || 'Bus'} has been dispatched to your pickup pin in ${activeRider.barangay}. Estimated arrival: ~6-10 minutes.`,
          icon: <UserCheck className="w-8 h-8 text-blue-200" />,
        };
      case 'picked_up':
        return {
          badge: 'SAFELY ON BOARD',
          color: 'bg-indigo-700 border-indigo-400 text-white',
          text: `You are on board ${assignedVehicle?.name || 'evacuation transport'}. Driver is navigating safe high-ground roads to ${assignedShelter?.name || 'evacuation center'}.`,
          icon: <Accessibility className="w-8 h-8 text-indigo-200" />,
        };
      case 'delivered':
        return {
          badge: 'SAFELY EVACUATED',
          color: 'bg-emerald-700 border-emerald-400 text-white',
          text: `Successfully dropped off at ${assignedShelter?.name || 'Safe Evacuation Center'}. Registered with center management.`,
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-200" />,
        };
      default:
        return {
          badge: 'PENDING',
          color: 'bg-slate-700 border-slate-500 text-slate-100',
          text: 'Monitoring location and road status.',
          icon: <Clock className="w-8 h-8" />,
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* Title & Accessibility Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-800/80 border border-slate-700 p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              ROUTEY &bull; Rider Assistance Portal
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Elderly &amp; PWD Focus
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Humiling ng libreng saklolo at accessible transport para sa mga nakatatanda at may kapansanan sa Daraga.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold text-amber-300">
            <ShieldAlert className="w-4 h-4" /> 24/7 Daraga MDRRMO Hotline: (052) 480-1234
          </span>
        </div>
      </div>

      {/* Grid: Request Form + Live Status Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Form (7 cols) */}
        <div className="lg:col-span-7 bg-slate-800/90 border border-slate-700 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-slate-700 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-amber-400" />
              Request Evacuation Transport (Humingi ng Saklolo)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter rider details. Accessible vehicle (with wheelchair lift/ramp) will be routed to your pickup pin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Rider Full Name */}
            <div>
              <label htmlFor="rider-name" className="block text-sm font-bold text-slate-200 mb-1.5">
                Full Name of Rider / Resident (Pangalan) *
              </label>
              <input
                id="rider-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Lola Remedios Alcantara"
                className="w-full text-base sm:text-lg px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-amber-400 focus:outline-none text-white font-medium placeholder:text-slate-500 transition-colors"
              />
            </div>

            {/* Phone & Age */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rider-phone" className="block text-sm font-bold text-slate-200 mb-1.5">
                  Contact Number (Telepono)
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="rider-phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0917-xxx-xxxx"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-amber-400 focus:outline-none text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rider-age" className="block text-sm font-bold text-slate-200 mb-1.5">
                  Age (Edad): <span className="text-amber-400 font-extrabold">{age} yrs old</span>
                </label>
                <input
                  id="rider-age"
                  type="range"
                  min="1"
                  max="105"
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg cursor-pointer my-3"
                />
                <div className="flex justify-between text-xs text-slate-400 font-semibold">
                  <span>Child (1-15)</span>
                  <span className="text-amber-300 font-bold">Senior Citizen (60+)</span>
                  <span>100+</span>
                </div>
              </div>
            </div>

            {/* Accessibility & Special Needs Selector */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                Special Accessibility Needs (Pangangailangan) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'wheelchair',
                    label: 'Wheelchair User',
                    sub: 'Needs Ramp/Lift',
                    icon: <Accessibility className="w-5 h-5" />,
                  },
                  {
                    id: 'elderly',
                    label: 'Elderly / Walking Cane',
                    sub: 'Physical Step Help',
                    icon: <UserCheck className="w-5 h-5" />,
                  },
                  {
                    id: 'stretcher',
                    label: 'Stretcher / Bed-bound',
                    sub: 'Medical Gurney',
                    icon: <HeartPulse className="w-5 h-5" />,
                  },
                  {
                    id: 'physical_help',
                    label: 'Physical Disability',
                    sub: 'Limited Mobility',
                    icon: <UserCheck className="w-5 h-5" />,
                  },
                  {
                    id: 'infant',
                    label: 'Infant / Mother',
                    sub: 'Baby aboard',
                    icon: <Baby className="w-5 h-5" />,
                  },
                  {
                    id: 'none',
                    label: 'General Evacuee',
                    sub: 'Standard Seating',
                    icon: <CheckCircle2 className="w-5 h-5" />,
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNeed(item.id as any)}
                    className={`p-3 rounded-xl border-2 text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      need === item.id
                        ? 'border-amber-400 bg-amber-500/20 text-white shadow-md ring-1 ring-amber-400'
                        : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-amber-400">
                      {item.icon}
                      <span className="font-bold text-xs sm:text-sm">{item.label}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Barangay Pickup Location */}
            <div>
              <label htmlFor="rider-barangay" className="block text-sm font-bold text-slate-200 mb-1.5">
                Barangay &amp; Pickup Area in Daraga *
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3.5 top-3.5 text-amber-400" />
                <select
                  id="rider-barangay"
                  value={barangay}
                  onChange={e => setBarangay(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-amber-400 focus:outline-none text-white font-medium text-base appearance-none cursor-pointer"
                >
                  {DARAGA_BARANGAYS.map(b => (
                    <option key={b.name} value={b.name}>
                      {b.name} — {b.note}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Landmark & Specific Notes */}
            <div>
              <label htmlFor="rider-notes" className="block text-sm font-bold text-slate-200 mb-1.5">
                Landmark or Specific Conditions (e.g. Near Chapel, 2nd floor, rising water)
              </label>
              <textarea
                id="rider-notes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Hal: Tapat ng barangay hall, may tubig na hanggang binti, kailangan ng tulong sa hagdan..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-amber-400 focus:outline-none text-white text-sm placeholder:text-slate-500"
              />
            </div>

            {/* Big High-Contrast Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 px-6 rounded-2xl font-black text-lg sm:text-xl tracking-wide uppercase transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer ${
                submitting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : highContrast
                  ? 'bg-amber-400 text-black hover:bg-amber-300 ring-4 ring-amber-500/50'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-[0.99]'
              }`}
            >
              <AlertCircle className="w-6 h-6 shrink-0" />
              {submitting ? 'PROCESSING ROUTE...' : 'SUBMIT EVACUATION REQUEST'}
            </button>

            {message && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{message}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Live Rider Status Tracker (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Rider Selector */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex justify-between items-center">
              <label htmlFor="rider-select" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Track Rider Status
              </label>
              <span className="text-xs text-amber-400 font-mono">
                {residents.length} Active Requests
              </span>
            </div>

            <select
              id="rider-select"
              value={currentRiderId}
              onChange={e => setCurrentRiderId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-medium focus:border-amber-400 focus:outline-none"
            >
              {residents.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.age}yo) &bull; {r.barangay} [{r.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {/* Large Accessible Status Card */}
          {activeRider && statusInfo && (
            <div className={`border-2 rounded-2xl p-5 sm:p-6 shadow-2xl transition-all space-y-5 ${statusInfo.color}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/20">
                    {statusInfo.icon}
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/40 text-white border border-white/20">
                      {statusInfo.badge}
                    </span>
                    <h4 className="text-xl sm:text-2xl font-black mt-2 leading-tight">
                      {activeRider.name}
                    </h4>
                    <p className="text-xs text-white/80 font-medium">
                      Age {activeRider.age} &bull; {activeRider.barangay} &bull; Priority Score: {activeRider.priorityScore}
                    </p>
                  </div>
                </div>

                {/* Voice read-out button for visually impaired */}
                <button
                  type="button"
                  onClick={() => handleReadStatusAloud(`${activeRider.name}. Status: ${statusInfo.badge}. ${statusInfo.text}`)}
                  title="Read status aloud (Voice Assist)"
                  className="p-2.5 rounded-xl bg-black/30 hover:bg-black/50 text-white border border-white/20 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-5 h-5 text-amber-300" />
                </button>
              </div>

              {/* Status Explanation Banner */}
              <div className="p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/20">
                <p className="text-sm sm:text-base font-semibold leading-relaxed text-white">
                  {statusInfo.text}
                </p>
              </div>

              {/* Vehicle & Shelter Assignment Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/20 border border-white/10">
                  <span className="text-white/70 block font-medium">Assigned Transport:</span>
                  <span className="font-extrabold text-sm text-white mt-0.5 block">
                    {assignedVehicle ? assignedVehicle.name : 'Searching nearest...'}
                  </span>
                  {assignedVehicle && (
                    <span className="text-[11px] text-amber-200 mt-0.5 block">
                      Driver: {assignedVehicle.driverName}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-black/20 border border-white/10">
                  <span className="text-white/70 block font-medium">Destination Shelter:</span>
                  <span className="font-extrabold text-sm text-white mt-0.5 block">
                    {assignedShelter ? assignedShelter.name : 'Designated Shelter'}
                  </span>
                  {assignedShelter && (
                    <span className="text-[11px] text-emerald-200 mt-0.5 block">
                      {assignedShelter.wheelchairAccessible ? 'Wheelchair Accessible' : 'Standard Evac Center'}
                    </span>
                  )}
                </div>
              </div>

              {/* Special Note If Bus Was Marked Full */}
              {activeRider.customMessage && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>{activeRider.customMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

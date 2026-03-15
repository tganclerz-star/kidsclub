import { useState } from 'react';
import { ChevronLeft, Star, UserPlus, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { createRegistration, createVisit, getRegistrationByPhone, getRegistrationByEmail, getTodayVisitChildIds } from '../../lib/db';
import { Registration, Child } from '../../types';
import StepIndicator from './StepIndicator';
import Step1GuestInfo from './Step1GuestInfo';
import Step2Children from './Step2Children';
import Step3Safety from './Step3Safety';
import Step4Confirm from './Step4Confirm';
import SuccessScreen from './SuccessScreen';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

const initialChild = (): Child => ({
  id: generateId(),
  name: '',
  age: 0,
  gender: 'M',
  birthdate: '',
  allergies: 'N/A',
});

const initialForm = (): Registration => ({
  guestType: 'Hotel',
  roomNumber: '',
  parentName: '',
  phone: '',
  email: '',
  country: '',
  children: [initialChild()],
  securityPin: '',
  pickupMethod: 'with mom',
  parentPreferences: '',
  disclaimerSigned: false,
  signature: '',
  departureDate: '',
  isFirstVisit: true,
});

type Mode = 'welcome' | 'new' | 'returning' | 'returning-found';

export default function ParentForm() {
  const [mode, setMode] = useState<Mode>('welcome');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Registration>(initialForm());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [lastPin, setLastPin] = useState('');
  const [lastCount, setLastCount] = useState(0);
  const [error, setError] = useState('');

  // Returning guest lookup
  const [lookupValue, setLookupValue] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [foundReg, setFoundReg] = useState<Registration | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
  const [alreadyCheckedInIds, setAlreadyCheckedInIds] = useState<Set<string>>(new Set());

  const updateField = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const canProceed = (): boolean => {
    if (step === 1) return !!(form.roomNumber && form.parentName && form.phone);
    if (step === 2) return form.children.every(c => c.name) && form.children.length > 0;
    if (step === 3) return form.securityPin.length === 4;
    if (step === 4) return form.disclaimerSigned;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // Check if email already registered
      if (form.email.trim()) {
        const existing = await getRegistrationByEmail(form.email.trim());
        if (existing) {
          setError('This email is already registered. Please use "Already Registered" to check in.');
          setLoading(false);
          return;
        }
      }
      // Check if phone already registered
      if (form.phone.trim()) {
        const existing = await getRegistrationByPhone(form.phone.trim());
        if (existing) {
          setError('This phone number is already registered. Please use "Already Registered" to check in.');
          setLoading(false);
          return;
        }
      }
      const regId = await createRegistration(form);
      const today = format(new Date(), 'yyyy-MM-dd');
      for (const child of form.children) {
        await createVisit({
          registrationId: regId,
          childId: child.id,
          childName: child.name,
          parentName: form.parentName,
          roomNumber: form.roomNumber,
          guestType: form.guestType,
          session: 'Morning',
          date: today,
          status: 'pending',
          checkInTime: null,
          checkInBy: null,
          checkOutTime: null,
          checkOutBy: null,
          pickupMethod: form.pickupMethod,
          departureDate: form.departureDate,
          staffNotes: '',
          operaChecked: false,
          disclaimerSigned: form.disclaimerSigned,
          securityPin: form.securityPin,
          allergies: child.allergies,
          parentPreferences: form.parentPreferences || '',
        });
      }
      setLastPin(form.securityPin);
      setLastCount(form.children.length);
      setDone(true);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturningSubmit = async () => {
    if (!foundReg) return;
    const childrenToCheckIn = foundReg.children.filter(c => selectedChildIds.has(c.id));
    if (childrenToCheckIn.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      for (const child of childrenToCheckIn) {
        await createVisit({
          registrationId: foundReg.id!,
          childId: child.id,
          childName: child.name,
          parentName: foundReg.parentName,
          roomNumber: foundReg.roomNumber,
          guestType: foundReg.guestType,
          session: 'Morning',
          date: today,
          status: 'pending',
          checkInTime: null,
          checkInBy: null,
          checkOutTime: null,
          checkOutBy: null,
          pickupMethod: foundReg.pickupMethod,
          departureDate: foundReg.departureDate,
          staffNotes: '',
          operaChecked: false,
          disclaimerSigned: foundReg.disclaimerSigned,
          securityPin: foundReg.securityPin,
          allergies: child.allergies,
          parentPreferences: foundReg.parentPreferences || '',
        }, true); // PIN is already hashed in registration
      }
      setLastPin('');
      setLastCount(childrenToCheckIn.length);
      setDone(true);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    const val = lookupValue.trim();
    if (!val) return;
    setLookupLoading(true);
    setLookupError('');
    try {
      let reg = null;
      // Detect if input is email or phone
      if (val.includes('@')) {
        reg = await getRegistrationByEmail(val);
      } else {
        reg = await getRegistrationByPhone(val);
      }
      if (reg) {
        setFoundReg(reg);
        // Check which kids are already checked in today
        const existingIds = await getTodayVisitChildIds(reg.id!);
        setAlreadyCheckedInIds(existingIds);
        // Pre-select only kids NOT already checked in
        const availableIds = reg.children.filter(c => !existingIds.has(c.id)).map(c => c.id);
        setSelectedChildIds(new Set(availableIds));
        if (availableIds.length === 0 && existingIds.size > 0) {
          // All kids already checked in
          setLookupError('All children are already checked in for today.');
          return;
        }
        setMode('returning-found');
      } else {
        setLookupError('No registration found. Please check your details or register as a new guest.');
      }
    } catch (e) {
      setLookupError('Something went wrong. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm());
    setStep(1);
    setDone(false);
    setError('');
    setMode('welcome');
    setFoundReg(null);
    setSelectedChildIds(new Set());
    setAlreadyCheckedInIds(new Set());
    setLookupValue('');
    setLookupError('');
  };

  // ── Success Screen ──
  if (done)
    return <SuccessScreen pin={lastPin} childrenCount={lastCount} onReset={handleReset} />;

  // ── Welcome Screen (landing) ──
  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-slide-up">
          <div className="w-20 h-20 bg-gold rounded-3xl flex items-center justify-center mb-8 shadow-glow">
            <Star className="w-10 h-10 text-ink" strokeWidth={2} />
          </div>
          <h1 className="font-display text-4xl text-white font-bold mb-2 text-center">Kids Club</h1>
          <p className="text-white/40 text-sm mb-12 text-center">Welcome! How can we help you today?</p>

          <div className="w-full space-y-3">
            <button
              onClick={() => { setForm(prev => ({ ...prev, isFirstVisit: true })); setMode('new'); }}
              className="w-full flex items-center justify-center gap-3 bg-gold text-ink font-bold py-4 rounded-2xl text-base hover:bg-yellow-300 transition-all active:scale-95 min-h-[52px]"
            >
              <UserPlus className="w-5 h-5" />
              First Visit — Register
            </button>
            <button
              onClick={() => setMode('returning')}
              className="w-full flex items-center justify-center gap-3 bg-white/10 text-white font-semibold py-4 rounded-2xl hover:bg-white/15 transition-all border border-white/10 min-h-[52px]"
            >
              <UserCheck className="w-5 h-5" />
              Already Registered
            </button>
          </div>
          <p className="text-white/20 text-xs mt-10 text-center">Powered by <a href="https://mesolutions.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/40 transition-colors">mesolutions.io</a></p>
        </div>
      </div>
    );
  }

  // ── Returning Guest — Room Lookup ──
  if (mode === 'returning') {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-slide-up">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
            <UserCheck className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-display text-2xl text-white font-bold mb-2 text-center">Welcome back!</h1>
          <p className="text-white/40 text-sm mb-8 text-center">Enter your phone number or email to find your registration</p>

          <div className="w-full space-y-4">
            <input
              type="text"
              placeholder="Phone number or email address"
              value={lookupValue}
              onChange={e => { setLookupValue(e.target.value); setLookupError(''); }}
              className="w-full px-4 py-4 rounded-2xl bg-white/10 border border-white/10 text-white text-center text-lg font-bold placeholder:text-white/20 focus:outline-none focus:border-gold/50"
            />
            {lookupError && (
              <p className="text-coral text-sm text-center">{lookupError}</p>
            )}
            <button
              onClick={handleLookup}
              disabled={!lookupValue.trim() || lookupLoading}
              className="w-full bg-gold text-ink font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-all active:scale-95 min-h-[52px]"
            >
              {lookupLoading ? 'Looking up...' : 'Find My Registration'}
            </button>
            <button
              onClick={handleReset}
              className="w-full text-white/30 text-sm font-medium py-2 hover:text-white/50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Returning Guest — Found, confirm check-in ──
  if (mode === 'returning-found' && foundReg) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-slide-up">
          <h1 className="font-display text-2xl text-white font-bold mb-2 text-center">
            Welcome back, {foundReg.parentName.split(' ')[0]}!
          </h1>
          <p className="text-white/40 text-sm mb-6 text-center">
            Room {foundReg.roomNumber} · {foundReg.guestType}
          </p>

          {/* Children list */}
          {foundReg.children.length >= 2 && (
            <p className="text-white/50 text-xs mb-2 text-center">Tap to select which kids to check in</p>
          )}
          <div className="w-full space-y-2 mb-6">
            {foundReg.children.map((child, idx) => {
              const isAlreadyIn = alreadyCheckedInIds.has(child.id);
              const isSelected = selectedChildIds.has(child.id);
              const availableCount = foundReg.children.filter(c => !alreadyCheckedInIds.has(c.id)).length;
              const canToggle = availableCount >= 2 && !isAlreadyIn;
              const colors = [
                { active: 'bg-gold/20 border-gold/40', inactive: 'bg-white/5 border-white/10' },
                { active: 'bg-rose/20 border-rose/40', inactive: 'bg-white/5 border-white/10' },
                { active: 'bg-sky/20 border-sky/40', inactive: 'bg-white/5 border-white/10' },
                { active: 'bg-mint/20 border-mint/40', inactive: 'bg-white/5 border-white/10' },
              ];
              const colorSet = colors[idx % colors.length];

              const toggleChild = () => {
                if (!canToggle) return;
                setSelectedChildIds(prev => {
                  const next = new Set(prev);
                  if (next.has(child.id)) {
                    next.delete(child.id);
                  } else {
                    next.add(child.id);
                  }
                  return next;
                });
              };

              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={toggleChild}
                  disabled={isAlreadyIn}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left
                    ${isAlreadyIn ? 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed' : isSelected ? colorSet.active : colorSet.inactive}
                    ${canToggle ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                >
                  {(availableCount >= 2 || isAlreadyIn) && (
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${isAlreadyIn ? 'bg-mint/30 border-mint/50' : isSelected ? 'bg-gold border-gold' : 'border-white/20'}`}>
                      {(isSelected || isAlreadyIn) && (
                        <svg className="w-3 h-3 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all
                    ${isAlreadyIn ? 'bg-white/5 text-white/30' : isSelected ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30'}`}>
                    {child.name[0]}
                  </div>
                  <div className={`flex-1 transition-all ${isAlreadyIn || !isSelected ? 'opacity-40' : ''}`}>
                    <p className="text-white font-semibold text-sm">{child.name}</p>
                    <p className="text-white/40 text-xs">
                      {child.gender === 'M' ? 'Boy' : 'Girl'} · {child.age} yrs
                      {child.allergies && child.allergies !== 'N/A' && (
                        <span className="text-coral ml-1">· {child.allergies}</span>
                      )}
                    </p>
                  </div>
                  {isAlreadyIn && (
                    <span className="text-[10px] font-bold text-mint bg-mint/10 px-2 py-1 rounded-lg flex-shrink-0">
                      Already in
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-full space-y-3">
            {error && <p className="text-coral text-sm text-center">{error}</p>}
            <button
              onClick={handleReturningSubmit}
              disabled={loading || selectedChildIds.size === 0}
              className="w-full bg-gold text-ink font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-all active:scale-95 min-h-[52px]"
            >
              {loading
                ? 'Checking in...'
                : selectedChildIds.size === foundReg.children.length
                  ? 'Check In for Today'
                  : `Check In ${selectedChildIds.size} ${selectedChildIds.size === 1 ? 'Child' : 'Children'} for Today`
              }
            </button>
            <button
              onClick={handleReset}
              className="w-full text-white/30 text-sm font-medium py-2 hover:text-white/50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── New Registration Form (4 steps) ──
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => (step > 1 ? setStep(s => s - 1) : handleReset())}
          className="w-9 h-9 bg-cream-dark rounded-xl flex items-center justify-center min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="w-5 h-5 text-ink" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-ink">Kids Club Registration</h1>
          <p className="text-xs text-ink/40">Step {step} of 4</p>
        </div>
      </div>

      <StepIndicator current={step} />

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {step === 1 && <Step1GuestInfo data={form} onChange={updateField} />}
        {step === 2 && (
          <Step2Children
            children={form.children}
            onChange={c => setForm(p => ({ ...p, children: c }))}
          />
        )}
        {step === 3 && <Step3Safety data={form} onChange={updateField} />}
        {step === 4 && (
          <Step4Confirm
            data={form}
            disclaimerSigned={form.disclaimerSigned}
            onDisclaimerChange={v => setForm(p => ({ ...p, disclaimerSigned: v }))}
            onSignatureChange={sig => setForm(p => ({ ...p, signature: sig }))}
          />
        )}
        {error && <p className="text-coral text-sm mt-3 text-center">{error}</p>}
      </div>

      {/* Bottom CTA */}
      <div className="px-4 pb-8 pt-4 border-t border-cream-dark bg-cream">
        <button
          disabled={!canProceed() || loading}
          onClick={() => (step < 4 ? setStep(s => s + 1) : handleSubmit())}
          className="w-full bg-ink text-cream font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-all active:scale-95 min-h-[52px]"
        >
          {loading ? 'Registering...' : step < 4 ? 'Continue' : 'Complete Registration'}
        </button>
      </div>
    </div>
  );
}

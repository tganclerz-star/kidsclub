import { useState, useRef, useEffect } from 'react';
import { useTodayVisits } from '../../hooks/useTodayVisits';
import { checkInChild, checkOutChild, checkOutChildOverride } from '../../lib/db';
import { Visit, Session } from '../../types';
import { LogIn, LogOut, AlertCircle, DollarSign } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';

interface ActivityInfo {
  id: string;
  name: string;
  price: number;
  color: string;
  assignedKids: { visitId: string; childName: string; time: string; paid?: boolean }[];
}

interface Props {
  activeStaff: string;
}

const SESSIONS: Session[] = ['Morning', 'Afternoon', 'Evening'];

export default function LiveKids({ activeStaff }: Props) {
  const { visits, loading } = useTodayVisits();
  const [activeTab, setActiveTab] = useState<Session | 'All'>('All');
  const [checkInVisit, setCheckInVisit] = useState<Visit | null>(null);
  const [checkOutVisit, setCheckOutVisit] = useState<Visit | null>(null);

  const statusOrder = { 'checked-in': 0, 'pending': 1, 'checked-out': 2 } as const;
  const filtered = (activeTab === 'All' ? visits : visits.filter(v => v.session === activeTab))
    .slice()
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  if (loading)
    return (
      <div className="p-4 lg:p-6 text-ink/40 flex items-center justify-center h-full">Loading...</div>
    );

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">Live Kids</h1>
        <span className="badge bg-mint-light text-mint self-start">
          {visits.filter(v => v.status === 'checked-in').length} in club
        </span>
      </div>

      {/* Session tabs — scrollable on small screens */}
      <div className="flex gap-2 mb-4 lg:mb-6 overflow-x-auto pb-1">
        {(['All', ...SESSIONS] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0
              ${activeTab === tab ? 'bg-ink text-cream' : 'bg-cream-dark text-ink hover:bg-ink/10'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Kids grid — 1 col on small iPad, 2 on iPad landscape, 3 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
        {filtered.map(visit => (
          <KidCard
            key={visit.id}
            visit={visit}
            onCheckIn={() => setCheckInVisit(visit)}
            onCheckOut={() => setCheckOutVisit(visit)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-ink/30">
            No children in this session
          </div>
        )}
      </div>

      {/* Modals */}
      {checkInVisit && (
        <CheckInModal
          visit={checkInVisit}
          staffName={activeStaff}
          onClose={() => setCheckInVisit(null)}
        />
      )}
      {checkOutVisit && (
        <CheckOutModal
          visit={checkOutVisit}
          staffName={activeStaff}
          onClose={() => setCheckOutVisit(null)}
        />
      )}
    </div>
  );
}

function KidCard({
  visit,
  onCheckIn,
  onCheckOut,
}: {
  visit: Visit;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  const isIn = visit.status === 'checked-in';
  const isOut = visit.status === 'checked-out';

  return (
    <div className={`card !p-4 lg:!p-6 transition-all ${isOut ? 'opacity-60' : 'hover:shadow-card-hover'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-ink text-base truncate">{visit.childName}</h3>
          <p className="text-xs text-ink/40">
            Room {visit.roomNumber} · {visit.guestType}
          </p>
        </div>
        <span
          className={`flex-shrink-0 ml-2 ${
            isIn ? 'status-in' : isOut ? 'status-out' : 'status-pending'
          }`}
        >
          {isIn ? 'In Club' : isOut ? 'Checked Out' : 'Pending'}
        </span>
      </div>

      {visit.allergies && visit.allergies !== 'N/A' && (
        <div className="flex items-center gap-1.5 text-xs text-coral font-semibold mb-3 bg-coral-light px-3 py-1.5 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {visit.allergies}
        </div>
      )}

      <div className="text-xs text-ink/40 space-y-1 mb-4">
        {visit.checkInTime && (
          <p>
            ✓ In: {visit.checkInTime} by {visit.checkInBy}
          </p>
        )}
        {visit.checkOutTime && (
          <p>
            ✓ Out: {visit.checkOutTime} by {visit.checkOutBy}
          </p>
        )}
        <p>Pickup: {visit.pickupMethod}</p>
      </div>

      {!isOut && (
        <button
          onClick={isIn ? onCheckOut : onCheckIn}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]
            ${isIn ? 'bg-ink text-cream hover:bg-ink-soft' : 'bg-gold text-ink hover:bg-yellow-300'}`}
        >
          {isIn ? (
            <>
              <LogOut className="w-4 h-4" /> Check Out
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" /> Check In
            </>
          )}
        </button>
      )}
    </div>
  );
}

function CheckInModal({
  visit,
  staffName,
  onClose,
}: {
  visit: Visit;
  staffName: string;
  onClose: () => void;
}) {
  const [session, setSession] = useState<Session>('Morning');
  const [opera, setOpera] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    setLoading(true);
    await checkInChild(visit.id!, staffName, session, opera);
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={`Check In — ${visit.childName}`} onClose={onClose}>
      <p className="text-sm text-ink/60 mb-4">
        Room {visit.roomNumber} · {visit.parentName}
      </p>
      <div className="mb-4">
        <label className="label">Session</label>
        <div className="grid grid-cols-3 gap-2">
          {SESSIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSession(s)}
              className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all min-h-[44px]
                ${session === s ? 'bg-ink border-ink text-cream' : 'border-cream-dark text-ink'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer mb-6 min-h-[44px]">
        <input
          type="checkbox"
          checked={opera}
          onChange={e => setOpera(e.target.checked)}
          className="w-5 h-5 rounded"
        />
        <span className="text-sm font-medium">Opera Checked</span>
      </label>
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full bg-gold text-ink font-bold py-3.5 rounded-2xl disabled:opacity-50 transition-all min-h-[48px]"
      >
        {loading ? 'Checking in...' : 'Confirm Check In'}
      </button>
    </Modal>
  );
}

function CheckOutModal({
  visit,
  staffName,
  onClose,
}: {
  visit: Visit;
  staffName: string;
  onClose: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [unpaidActivities, setUnpaidActivities] = useState<{ name: string; price: number }[]>([]);

  // Fetch today's activities to check for unpaid ones
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(collection(db, 'kc_activities'), where('date', '==', today));
    const unsub = onSnapshot(q, snap => {
      const acts = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityInfo));
      const unpaid = acts
        .filter(a => a.assignedKids.some(k => k.visitId === visit.id && !k.paid))
        .map(a => ({ name: a.name, price: a.price }));
      setUnpaidActivities(unpaid);
    });
    return unsub;
  }, [visit.id]);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleDigit = (idx: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const arr = pin.split('');
    while (arr.length < 4) arr.push('');
    arr[idx] = d;
    setPin(arr.join(''));
    setError('');
    if (d && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) refs[idx - 1].current?.focus();
  };

  const handleCheckOut = async () => {
    if (pin.length < 4) {
      setError('Please enter all 4 digits');
      return;
    }
    setLoading(true);
    const result = await checkOutChild(visit.id!, staffName, pin);
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.message);
      setPin('');
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      setError('Please provide a reason for the override');
      return;
    }
    setLoading(true);
    await checkOutChildOverride(visit.id!, staffName, overrideReason.trim());
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={`Check Out — ${visit.childName}`} onClose={onClose}>
      <p className="text-sm text-ink/60 mb-1">
        Room {visit.roomNumber} · {visit.parentName}
      </p>
      <p className="text-sm text-ink/60 mb-4">
        Pickup: <strong>{visit.pickupMethod}</strong>
      </p>

      {/* Unpaid activities warning */}
      {unpaidActivities.length > 0 && (
        <div className="bg-coral-light border-2 border-coral/20 rounded-2xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-coral" />
            <span className="text-xs font-bold text-coral">Unpaid Activities!</span>
          </div>
          <div className="space-y-1">
            {unpaidActivities.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-ink/60">{a.name}</span>
                <span className="font-bold text-coral">{a.price} AED</span>
              </div>
            ))}
            <div className="border-t border-coral/20 pt-1 mt-1 flex items-center justify-between text-xs">
              <span className="font-bold text-ink/60">Total due</span>
              <span className="font-bold text-coral">{unpaidActivities.reduce((s, a) => s + a.price, 0)} AED</span>
            </div>
          </div>
          <p className="text-[10px] text-coral/70 mt-2">Please collect payment before checking out</p>
        </div>
      )}

      {!overrideMode ? (
        <>
          <div className="mb-2">
            <label className="label">Ask parent for their Security PIN</label>
            <div className="flex gap-3 justify-center my-4">
              {[0, 1, 2, 3].map(idx => (
                <input
                  key={idx}
                  ref={refs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`pin-digit ${error ? 'border-coral' : ''}`}
                  value={pin[idx] || ''}
                  placeholder="·"
                  onChange={e => handleDigit(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                />
              ))}
            </div>
            {error && <p className="text-coral text-sm text-center font-medium">{error}</p>}
          </div>
          <button
            onClick={handleCheckOut}
            disabled={loading || pin.length < 4}
            className="w-full bg-ink text-cream font-bold py-3.5 rounded-2xl mt-4 disabled:opacity-40 transition-all min-h-[48px]"
          >
            {loading ? 'Verifying...' : 'Confirm Check Out'}
          </button>
          <button
            onClick={() => { setOverrideMode(true); setError(''); }}
            className="w-full text-ink/30 text-xs font-medium py-3 hover:text-ink/50 transition-colors"
          >
            Parent not available? Staff override
          </button>
        </>
      ) : (
        <>
          <div className="mb-4">
            <div className="bg-coral-light border-2 border-coral/20 rounded-2xl p-3 mb-4">
              <p className="text-xs text-coral font-semibold mb-1">Staff Override</p>
              <p className="text-[11px] text-ink/50">Checking out without parent PIN. A reason is required and will be logged.</p>
            </div>
            <label className="label">Who is collecting the child?</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="e.g. Nanny Maria, Grandfather Ahmed..."
              value={overrideReason}
              onChange={e => { setOverrideReason(e.target.value); setError(''); }}
            />
            {error && <p className="text-coral text-sm mt-2 font-medium">{error}</p>}
          </div>
          <button
            onClick={handleOverride}
            disabled={loading || !overrideReason.trim()}
            className="w-full bg-coral text-white font-bold py-3.5 rounded-2xl disabled:opacity-40 transition-all min-h-[48px]"
          >
            {loading ? 'Processing...' : 'Override Check Out'}
          </button>
          <button
            onClick={() => { setOverrideMode(false); setError(''); }}
            className="w-full text-ink/30 text-xs font-medium py-3 hover:text-ink/50 transition-colors"
          >
            Back to PIN entry
          </button>
        </>
      )}
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-ink/60 flex items-end sm:items-center justify-center z-50 p-4 animate-fade">
      <div className="bg-white rounded-3xl p-5 lg:p-6 w-full max-w-sm animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display font-bold text-lg text-ink">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-ink/30 hover:text-ink transition-colors">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

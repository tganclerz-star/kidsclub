import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { Clock, Plus, X, ChevronLeft, ChevronRight, Sun, Moon, Sunset, Trash2 } from 'lucide-react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Shift {
  id: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  notes: string;
}

interface Props {
  activeStaff: string;
}

const ROLES = ['Supervisor', 'Activity Leader', 'Caretaker', 'Reception', 'Float'];
const PRESET_SHIFTS = [
  { label: 'Morning', start: '07:00', end: '15:00', icon: Sun },
  { label: 'Afternoon', start: '13:00', end: '21:00', icon: Sunset },
  { label: 'Evening', start: '16:00', end: '00:00', icon: Moon },
];

export default function Shifts({ activeStaff }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kc_shifts'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
      setShifts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const shiftsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.date === dateStr);
  };

  const todayShifts = shifts.filter(s => s.date === format(new Date(), 'yyyy-MM-dd'));
  const onDutyNow = todayShifts.filter(s => {
    const now = format(new Date(), 'HH:mm');
    return now >= s.startTime && (s.endTime === '00:00' || now < s.endTime);
  });

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'kc_shifts', id));
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center h-full">
        <p className="text-ink/30 text-sm">Loading shifts...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">Shifts</h1>
        <button onClick={() => setShowAdd(true)} className="btn-gold flex items-center gap-2 text-sm self-start">
          <Plus className="w-4 h-4" /> Add Shift
        </button>
      </div>

      {/* Currently on duty */}
      <div className="card !p-4 lg:!p-5 mb-4 lg:mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-mint animate-pulse" />
          <h2 className="font-bold text-sm text-ink">On Duty Now</h2>
          <span className="badge bg-mint-light text-mint ml-auto">{onDutyNow.length} staff</span>
        </div>
        {onDutyNow.length === 0 ? (
          <p className="text-sm text-ink/30">No one currently on shift</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {onDutyNow.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-mint-light/50 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 bg-mint rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {s.staffName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{s.staffName}</p>
                  <p className="text-[11px] text-ink/40">{s.role} · {s.startTime}–{s.endTime === '00:00' ? '00:00' : s.endTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center hover:bg-cream-dark transition-colors">
          <ChevronLeft className="w-4 h-4 text-ink" />
        </button>
        <div className="px-3 py-2 bg-gold-light border-2 border-gold/20 text-ink rounded-xl text-xs lg:text-sm font-bold">
          {format(weekStart, 'MMM d')}–{format(addDays(weekStart, 6), 'd, yyyy')}
        </div>
        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center hover:bg-cream-dark transition-colors">
          <ChevronRight className="w-4 h-4 text-ink" />
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
        {weekDays.map(day => {
          const dayShifts = shiftsForDate(day);
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className={`card !p-4 ${today ? '!border-gold/40 !bg-gold-light/30' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${today ? 'text-gold' : 'text-ink/30'}`}>
                    {format(day, 'EEEE')}
                  </p>
                  <p className="text-lg font-bold font-display text-ink">{format(day, 'd MMM')}</p>
                </div>
                {today && (
                  <span className="text-[9px] font-bold text-gold bg-gold/20 px-2 py-0.5 rounded-md uppercase">Today</span>
                )}
                <button
                  onClick={() => { setAddDate(format(day, 'yyyy-MM-dd')); setShowAdd(true); }}
                  className="w-7 h-7 rounded-lg bg-cream-dark flex items-center justify-center text-ink/30 hover:text-ink transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {dayShifts.length === 0 ? (
                <p className="text-xs text-ink/20 text-center py-4">No shifts</p>
              ) : (
                <div className="space-y-2">
                  {dayShifts.map(s => (
                    <div key={s.id} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 shadow-sm group">
                      <div className="w-7 h-7 bg-sky-light rounded-lg flex items-center justify-center text-sky text-[10px] font-bold flex-shrink-0">
                        {s.staffName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{s.staffName}</p>
                        <p className="text-[10px] text-ink/40">
                          {s.startTime}–{s.endTime === '00:00' ? '00:00' : s.endTime} · {s.role}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-ink/10 hover:text-coral hover:bg-coral-light transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add shift modal */}
      {showAdd && (
        <AddShiftModal
          defaultDate={addDate}
          onClose={() => setShowAdd(false)}
          onCreated={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddShiftModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staffName: '',
    date: defaultDate,
    startTime: '07:00',
    endTime: '15:00',
    role: 'Supervisor',
    notes: '',
  });

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const applyPreset = (start: string, end: string) => {
    setForm(f => ({ ...f, startTime: start, endTime: end }));
  };

  const handleSubmit = async () => {
    if (!form.staffName.trim()) return;
    setSaving(true);
    await addDoc(collection(db, 'kc_shifts'), {
      ...form,
      staffName: form.staffName.trim(),
      notes: form.notes.trim(),
      createdAt: Timestamp.now(),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-end sm:items-center justify-center z-50 p-4 animate-fade">
      <div className="bg-white rounded-3xl p-5 lg:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display font-bold text-lg text-ink">Add Shift</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-ink/30 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Staff name */}
          <div>
            <label className="label">Staff Name *</label>
            <input type="text" className="input" placeholder="e.g. Amruta" value={form.staffName} onChange={e => update('staffName', e.target.value)} />
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => update('date', e.target.value)} />
          </div>

          {/* Quick presets */}
          <div>
            <label className="label">Quick Shift</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_SHIFTS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.start, p.end)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all min-h-[44px]
                    ${form.startTime === p.start && form.endTime === p.end
                      ? 'bg-ink border-ink text-cream'
                      : 'border-cream-dark text-ink hover:border-ink/20'
                    }`}
                >
                  <p.icon className="w-4 h-4" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.startTime} onChange={e => update('startTime', e.target.value)} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input" value={form.endTime} onChange={e => update('endTime', e.target.value)} />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => update('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <input type="text" className="input" placeholder="Optional notes..." value={form.notes} onChange={e => update('notes', e.target.value)} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !form.staffName.trim()}
          className="w-full bg-gold text-ink font-bold py-3.5 rounded-2xl mt-6 disabled:opacity-40 transition-all min-h-[48px]"
        >
          {saving ? 'Creating...' : 'Add Shift'}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Plus, X, Trash2, UserPlus, Clock, DollarSign,
  Palette, Users, ChevronDown, Check,
} from 'lucide-react';
import {
  collection, addDoc, onSnapshot, deleteDoc, updateDoc, doc, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTodayVisits } from '../../hooks/useTodayVisits';
import { Visit } from '../../types';

interface Activity {
  id: string;
  name: string;
  price: number;
  color: string;
  date: string;
  createdBy: string;
  assignedKids: { visitId: string; childName: string; time: string; paid?: boolean }[];
}

interface Props {
  activeStaff: string;
}

const ACTIVITY_COLORS = [
  { name: 'Coral',    value: 'coral',    bg: 'bg-coral',    light: 'bg-coral-light',    border: 'border-coral/20',    text: 'text-coral' },
  { name: 'Sky',      value: 'sky',      bg: 'bg-sky',      light: 'bg-sky-light',      border: 'border-sky/20',      text: 'text-sky' },
  { name: 'Gold',     value: 'gold',     bg: 'bg-gold',     light: 'bg-gold-light',     border: 'border-gold/20',     text: 'text-gold' },
  { name: 'Mint',     value: 'mint',     bg: 'bg-mint',     light: 'bg-mint-light',     border: 'border-mint/20',     text: 'text-mint' },
  { name: 'Lavender', value: 'lavender', bg: 'bg-lavender', light: 'bg-lavender-light', border: 'border-lavender/20', text: 'text-lavender' },
  { name: 'Rose',     value: 'rose',     bg: 'bg-rose',     light: 'bg-rose-light',     border: 'border-rose/20',     text: 'text-rose' },
];

function getColorConfig(value: string) {
  return ACTIVITY_COLORS.find(c => c.value === value) || ACTIVITY_COLORS[0];
}

export default function Activities({ activeStaff }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [assignModal, setAssignModal] = useState<Activity | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const { visits } = useTodayVisits();
  const todayKids = visits.filter(v => v.status !== 'checked-out');

  useEffect(() => {
    const q = query(collection(db, 'kc_activities'), where('date', '==', today));
    const unsub = onSnapshot(q, snap => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      setLoading(false);
    });
    return unsub;
  }, [today]);

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'kc_activities', id));
  };

  const handleRemoveKid = async (activity: Activity, visitId: string) => {
    const updated = activity.assignedKids.filter(k => k.visitId !== visitId);
    await updateDoc(doc(db, 'kc_activities', activity.id), { assignedKids: updated });
  };

  const handleTogglePaid = async (activity: Activity, visitId: string) => {
    const updated = activity.assignedKids.map(k =>
      k.visitId === visitId ? { ...k, paid: !k.paid } : k
    );
    await updateDoc(doc(db, 'kc_activities', activity.id), { assignedKids: updated });
  };

  // Timeline hours (9-19)
  const TL_START = 9;
  const TL_END = 19;
  const TL_HOURS = TL_END - TL_START;
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
  const showNowLine = nowHour >= TL_START && nowHour <= TL_END;
  const nowPct = ((nowHour - TL_START) / TL_HOURS) * 100;

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center h-full">
        <p className="text-ink/30 text-sm">Loading activities...</p>
      </div>
    );
  }

  const totalRevenue = activities.reduce((sum, a) => sum + a.price * a.assignedKids.length, 0);

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">Activities</h1>
          <p className="text-xs text-ink/40 mt-0.5">Today — {format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold flex items-center gap-2 text-sm self-start">
          <Plus className="w-4 h-4" /> New Activity
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:mb-6">
        <div className="bg-lavender-light border-2 border-lavender/20 rounded-2xl p-3 lg:p-4">
          <Palette className="w-4 h-4 text-lavender mb-1.5" />
          <p className="text-xl lg:text-2xl font-bold font-display text-ink">{activities.length}</p>
          <p className="text-[10px] text-ink/40 font-medium">Activities Today</p>
        </div>
        <div className="bg-sky-light border-2 border-sky/20 rounded-2xl p-3 lg:p-4">
          <Users className="w-4 h-4 text-sky mb-1.5" />
          <p className="text-xl lg:text-2xl font-bold font-display text-ink">
            {activities.reduce((s, a) => s + a.assignedKids.length, 0)}
          </p>
          <p className="text-[10px] text-ink/40 font-medium">Kids Assigned</p>
        </div>
        <div className="bg-mint-light border-2 border-mint/20 rounded-2xl p-3 lg:p-4">
          <DollarSign className="w-4 h-4 text-mint mb-1.5" />
          <p className="text-xl lg:text-2xl font-bold font-display text-ink">{totalRevenue} AED</p>
          <p className="text-[10px] text-ink/40 font-medium">Revenue Today</p>
        </div>
        <div className="bg-gold-light border-2 border-gold/20 rounded-2xl p-3 lg:p-4">
          <Clock className="w-4 h-4 text-gold mb-1.5" />
          <p className="text-xl lg:text-2xl font-bold font-display text-ink">{todayKids.length}</p>
          <p className="text-[10px] text-ink/40 font-medium">Kids Available</p>
        </div>
      </div>

      {/* Activity timeline */}
      {activities.length > 0 && (
        <div className="card !p-4 lg:!p-5 mb-4 lg:mb-6">
          <h3 className="font-bold text-sm text-ink mb-3">Timeline</h3>
          <div className="relative overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Hour labels */}
              <div className="flex mb-1">
                {Array.from({ length: TL_HOURS }, (_, i) => (
                  <div key={i} className="flex-1 text-[10px] text-ink/30 font-medium">
                    {(TL_START + i).toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {/* Bars */}
              <div className="relative">
                {/* Hour grid */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: TL_HOURS }, (_, i) => (
                    <div key={i} className="flex-1 border-l border-cream-dark/50" />
                  ))}
                </div>
                {/* Now line */}
                {showNowLine && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-coral z-20" style={{ left: `${nowPct}%` }}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-coral rounded-full" />
                  </div>
                )}
                {/* Activity bars */}
                {activities.map(activity => {
                  const color = getColorConfig(activity.color);
                  const kids = activity.assignedKids;
                  if (kids.length === 0) return null;

                  // Parse earliest and latest times to determine bar position
                  const times = kids.map(k => {
                    const [h, m] = k.time.split(':').map(Number);
                    return h + m / 60;
                  });
                  const earliest = Math.min(...times);
                  const latest = Math.max(...times);
                  const barStart = Math.max(earliest - 0.25, TL_START);
                  const barEnd = Math.min(latest + 1, TL_END);
                  const left = ((barStart - TL_START) / TL_HOURS) * 100;
                  const width = ((barEnd - barStart) / TL_HOURS) * 100;

                  return (
                    <div key={activity.id} className="relative h-12 mb-1.5">
                      <div
                        className={`absolute top-1 bottom-1 ${color.light} border ${color.border} rounded-full flex items-center gap-2 px-3 z-10`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <span className={`text-xs font-bold ${color.text} truncate`}>{activity.name}</span>
                        <span className="text-[10px] text-ink/40 font-medium flex-shrink-0">{kids.length} kids</span>
                        <span className="text-[10px] text-ink/30 font-medium flex-shrink-0">{activity.price * kids.length} AED</span>
                      </div>
                    </div>
                  );
                })}
                {activities.every(a => a.assignedKids.length === 0) && (
                  <div className="h-12 flex items-center justify-center text-xs text-ink/20">
                    Assign kids to see timeline
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity cards */}
      {activities.length === 0 ? (
        <div className="card !p-8 lg:!p-12 text-center">
          <Palette className="w-10 h-10 text-ink/10 mx-auto mb-3" />
          <p className="text-sm text-ink/30 mb-1">No activities for today</p>
          <p className="text-xs text-ink/20">Create one to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          {activities.map(activity => {
            const color = getColorConfig(activity.color);
            return (
              <div key={activity.id} className={`${color.light} border-2 ${color.border} rounded-3xl p-4 lg:p-5 group`}>
                {/* Activity header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 ${color.bg} rounded-xl flex items-center justify-center`}>
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-base">{activity.name}</h3>
                      <p className="text-xs text-ink/40 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />{activity.price} AED per kid
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(activity.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/10 hover:text-coral hover:bg-white/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Assigned kids */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-ink/40 uppercase tracking-wider">
                      Assigned ({activity.assignedKids.length})
                    </span>
                    {activity.assignedKids.length > 0 && (
                      <span className={`text-[10px] font-bold ${color.text}`}>
                        {activity.price * activity.assignedKids.length} AED total
                      </span>
                    )}
                  </div>
                  {activity.assignedKids.length === 0 ? (
                    <p className="text-xs text-ink/20 py-2">No kids assigned yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {activity.assignedKids.map(k => (
                        <div key={k.visitId} className="flex items-center gap-2 bg-white/50 rounded-xl px-2.5 py-2 group/kid">
                          <div className={`w-6 h-6 rounded-lg ${color.bg}/20 flex items-center justify-center text-[10px] font-bold ${color.text} flex-shrink-0`}>
                            {k.childName[0]}
                          </div>
                          <span className="text-xs font-semibold text-ink flex-1 truncate">{k.childName}</span>
                          <span className="text-[10px] text-ink/30 font-medium">{k.time}</span>
                          <button
                            onClick={() => handleTogglePaid(activity, k.visitId)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors flex-shrink-0
                              ${k.paid ? 'bg-mint-light text-mint' : 'bg-coral-light text-coral'}`}
                          >
                            {k.paid ? 'Paid' : 'Unpaid'}
                          </button>
                          <button
                            onClick={() => handleRemoveKid(activity, k.visitId)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-ink/10 hover:text-coral transition-colors opacity-0 group-hover/kid:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add kid button */}
                <button
                  onClick={() => setAssignModal(activity)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold ${color.bg} text-white hover:opacity-90 transition-all min-h-[40px]`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Assign Kid
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add activity modal */}
      {showAdd && (
        <AddActivityModal
          staffName={activeStaff}
          onClose={() => setShowAdd(false)}
          onCreated={() => setShowAdd(false)}
        />
      )}

      {/* Assign kid modal */}
      {assignModal && (
        <AssignKidModal
          activity={assignModal}
          todayKids={todayKids}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}

// ── ADD ACTIVITY MODAL ──────────────────────────────────────────────────────

function AddActivityModal({
  staffName,
  onClose,
  onCreated,
}: {
  staffName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('coral');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addDoc(collection(db, 'kc_activities'), {
      name: name.trim(),
      price: parseFloat(price) || 0,
      color,
      date: format(new Date(), 'yyyy-MM-dd'),
      createdBy: staffName,
      assignedKids: [],
      createdAt: Timestamp.now(),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-end sm:items-center justify-center z-50 p-4 animate-fade">
      <div className="bg-white rounded-3xl p-5 lg:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display font-bold text-lg text-ink">New Activity</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-ink/30 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="label">Activity Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Arts & Crafts, Pool Party..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Price */}
          <div>
            <label className="label">Price per Kid (AED)</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              min="0"
              step="0.5"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Color</label>
            <div className="grid grid-cols-6 gap-2">
              {ACTIVITY_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`aspect-square rounded-xl ${c.bg} flex items-center justify-center transition-all
                    ${color === c.value ? 'ring-2 ring-offset-2 ring-ink/30 scale-110' : 'hover:scale-105'}`}
                >
                  {color === c.value && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink/30 mt-1.5">
              {ACTIVITY_COLORS.find(c => c.value === color)?.name}
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="w-full bg-gold text-ink font-bold py-3.5 rounded-2xl mt-6 disabled:opacity-40 transition-all min-h-[48px]"
        >
          {saving ? 'Creating...' : 'Create Activity'}
        </button>
      </div>
    </div>
  );
}

// ── ASSIGN KID MODAL ────────────────────────────────────────────────────────

function AssignKidModal({
  activity,
  todayKids,
  onClose,
}: {
  activity: Activity;
  todayKids: Visit[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const color = getColorConfig(activity.color);

  // Filter out already assigned kids
  const assignedIds = new Set(activity.assignedKids.map(k => k.visitId));
  const available = todayKids.filter(
    v => !assignedIds.has(v.id!) && v.childName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAssign = async (visit: Visit) => {
    const now = format(new Date(), 'HH:mm');
    const updated = [
      ...activity.assignedKids,
      { visitId: visit.id!, childName: visit.childName, time: now },
    ];
    await updateDoc(doc(db, 'kc_activities', activity.id), { assignedKids: updated });
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-end sm:items-center justify-center z-50 p-4 animate-fade">
      <div className="bg-white rounded-3xl p-5 lg:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-display font-bold text-lg text-ink">Assign Kid</h2>
            <p className="text-xs text-ink/40">to {activity.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-ink/30 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          className="input mb-3"
          placeholder="Search kid by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Kid list */}
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-sm text-ink/30 text-center py-6">
              {todayKids.length === 0 ? 'No kids checked in today' : 'All kids already assigned'}
            </p>
          ) : (
            available.map(v => (
              <button
                key={v.id}
                onClick={() => handleAssign(v)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-dark transition-colors text-left"
              >
                <div className={`w-9 h-9 rounded-xl ${color.light} flex items-center justify-center text-sm font-bold ${color.text} flex-shrink-0`}>
                  {v.childName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{v.childName}</p>
                  <p className="text-[10px] text-ink/40">Room {v.roomNumber} · {v.session}</p>
                </div>
                <div className={`w-7 h-7 rounded-lg ${color.light} border ${color.border} flex items-center justify-center`}>
                  <Plus className={`w-3.5 h-3.5 ${color.text}`} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

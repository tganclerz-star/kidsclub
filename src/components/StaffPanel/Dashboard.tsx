import { useState, useEffect } from 'react';
import { Users, AlertCircle, Star, Clock, TrendingUp, TrendingDown, UserPlus, X, Heart } from 'lucide-react';
import { useTodayVisits } from '../../hooks/useTodayVisits';
import { Visit, Registration } from '../../types';
import { getAllRegistrations } from '../../lib/db';
import { format } from 'date-fns';

interface Props {
  activeStaff: string;
}

export default function Dashboard({ activeStaff }: Props) {
  const { visits, checkedIn, checkedOut, pending, loading } = useTodayVisits();
  const [showInClub, setShowInClub] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    getAllRegistrations().then(setRegistrations);
  }, []);

  const withAllergies = visits.filter(v => v.allergies && v.allergies !== 'N/A');
  const bySession = (s: string) => visits.filter(v => v.session === s);

  // Build map of registrationId -> preferences
  const prefsMap = new Map<string, { parentName: string; preferences: string }>();
  registrations.forEach(r => {
    if (r.id && r.parentPreferences && r.parentPreferences.trim()) {
      prefsMap.set(r.id, { parentName: r.parentName, preferences: r.parentPreferences });
    }
  });

  // Today's visits with preferences
  const visitsWithPrefs = visits
    .filter(v => v.registrationId && prefsMap.has(v.registrationId))
    .reduce((acc, v) => {
      // Deduplicate by registrationId (multiple children same parent)
      if (!acc.find(x => x.registrationId === v.registrationId)) {
        acc.push(v);
      }
      return acc;
    }, [] as Visit[]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center h-full">
        <p className="text-ink/30 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 lg:mb-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ink">
            Good {getGreeting()}, {activeStaff}
          </h1>
          <p className="text-ink/40 mt-1 text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button
          onClick={() => window.open('/register', '_blank')}
          className="btn-gold flex items-center gap-2 self-start"
        >
          <UserPlus className="w-4 h-4" /> Walk-in Registration
        </button>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <button onClick={() => setShowInClub(true)} className="text-left">
          <StatCard
            label="In Club Now"
            value={checkedIn.length}
            color="bg-mint-light"
            textColor="text-mint"
            icon={<Users className="w-5 h-5" />}
            trend={checkedIn.length > 0 ? `+${checkedIn.length}` : undefined}
            trendUp={true}
          />
        </button>
        <StatCard
          label="Pending"
          value={pending.length}
          color="bg-gold-light"
          textColor="text-ink"
          icon={<Clock className="w-5 h-5" />}
          trend={pending.length > 0 ? `${pending.length} waiting` : undefined}
          trendUp={false}
        />
        <StatCard
          label="Allergies"
          value={withAllergies.length}
          color="bg-coral-light"
          textColor="text-coral"
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <StatCard
          label="Total Today"
          value={visits.length}
          color="bg-lavender-light"
          textColor="text-lavender"
          icon={<Star className="w-5 h-5" />}
          trend={visits.length > 0 ? `${checkedOut.length} done` : undefined}
          trendUp={true}
        />
      </div>

      {/* Donut + Session cards — stack on iPad portrait, side-by-side on landscape/desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 lg:mb-8">
        {/* Donut chart */}
        <div className="lg:col-span-4 card !p-5 lg:!p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-ink">Session Overview</h3>
            <span className="text-[10px] text-ink/30 font-medium">Today</span>
          </div>
          <div className="flex items-center justify-center my-4">
            <DonutChart
              total={visits.length}
              segments={[
                { value: bySession('Morning').length, color: '#F2C94C' },
                { value: bySession('Afternoon').length, color: '#4A9EFF' },
                { value: bySession('Evening').length, color: '#B794F4' },
              ]}
            />
          </div>
          <div className="space-y-2 mt-4">
            {([
              { session: 'Morning', color: 'bg-gold', count: bySession('Morning').length },
              { session: 'Afternoon', color: 'bg-sky', count: bySession('Afternoon').length },
              { session: 'Evening', color: 'bg-lavender', count: bySession('Evening').length },
            ]).map(item => (
              <div key={item.session} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-ink/60 font-medium">{item.session}</span>
                </div>
                <span className="font-bold text-ink">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Session time cards */}
        <div className="lg:col-span-8 grid grid-cols-3 gap-3 lg:gap-4">
          {(['Morning', 'Afternoon', 'Evening'] as const).map((session, i) => {
            const colors = [
              { bg: 'bg-gold', text: 'text-ink', light: 'bg-gold-light', border: 'border-gold/20' },
              { bg: 'bg-sky', text: 'text-white', light: 'bg-sky-light', border: 'border-sky/20' },
              { bg: 'bg-lavender', text: 'text-white', light: 'bg-lavender-light', border: 'border-lavender/20' },
            ][i];
            const sessionVisits = bySession(session);
            const inClub = sessionVisits.filter(v => v.status === 'checked-in');
            const times = [['9:00', '13:00'], ['14:00', '16:30'], ['16:30', '19:00']][i];
            return (
              <div key={session} className={`${colors.light} border-2 ${colors.border} rounded-3xl p-4 lg:p-5 flex flex-col`}>
                <div className={`inline-flex items-center self-start px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${colors.bg} ${colors.text}`}>
                  {session}
                </div>
                <p className="text-2xl lg:text-3xl font-bold font-display text-ink">{sessionVisits.length}</p>
                <p className="text-[10px] lg:text-xs text-ink/40 mt-1">{times[0]} - {times[1]}</p>

                {/* Mini list of kids */}
                <div className="mt-auto pt-3 lg:pt-4 space-y-1.5 hidden sm:block">
                  {inClub.slice(0, 3).map(v => (
                    <div key={v.id} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-white/70 flex items-center justify-center text-[9px] font-bold text-ink/60">
                        {v.childName[0]}
                      </div>
                      <span className="text-[11px] text-ink/60 font-medium truncate">{v.childName}</span>
                      {v.allergies && v.allergies !== 'N/A' && (
                        <AlertCircle className="w-3 h-3 text-coral flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {inClub.length > 3 && (
                    <p className="text-[10px] text-ink/30">+{inClub.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allergy & Preferences + Recent activity — stack on iPad portrait */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Allergies & Preferences */}
        <div className="card !p-4 lg:!p-5 space-y-4">
          {/* Allergies section */}
          <div className={`rounded-2xl p-3 lg:p-4 ${withAllergies.length > 0 ? 'bg-coral-light border border-coral/20' : 'bg-cream-dark/30'}`}>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertCircle className={`w-4 h-4 ${withAllergies.length > 0 ? 'text-coral' : 'text-ink/20'}`} />
              <span className="font-bold text-ink text-xs">Allergies</span>
              {withAllergies.length > 0 && (
                <span className="text-[10px] font-bold text-coral bg-white/60 px-1.5 py-0.5 rounded-md ml-auto">{withAllergies.length}</span>
              )}
            </div>
            {withAllergies.length > 0 ? (
              <div className="space-y-1.5">
                {withAllergies.map(v => (
                  <div key={v.id} className="flex items-center justify-between bg-white/50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-coral/10 flex items-center justify-center text-[10px] font-bold text-coral flex-shrink-0">
                        {v.childName[0]}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-ink block truncate">{v.childName}</span>
                        <p className="text-[10px] text-ink/40">Room {v.roomNumber}</p>
                      </div>
                    </div>
                    <span className="text-coral font-medium text-[10px] bg-white rounded-lg px-2 py-1 ml-2 flex-shrink-0">{v.allergies}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink/30">No allergies flagged today</p>
            )}
          </div>

          {/* Parent preferences section */}
          <div className={`rounded-2xl p-3 lg:p-4 ${visitsWithPrefs.length > 0 ? 'bg-lavender-light border border-lavender/20' : 'bg-cream-dark/30'}`}>
            <div className="flex items-center gap-2 mb-2.5">
              <Heart className={`w-4 h-4 ${visitsWithPrefs.length > 0 ? 'text-lavender' : 'text-ink/20'}`} />
              <span className="font-bold text-ink text-xs">Parent Preferences</span>
              {visitsWithPrefs.length > 0 && (
                <span className="text-[10px] font-bold text-lavender bg-white/60 px-1.5 py-0.5 rounded-md ml-auto">{visitsWithPrefs.length}</span>
              )}
            </div>
            {visitsWithPrefs.length > 0 ? (
              <div className="space-y-1.5">
                {visitsWithPrefs.map(v => {
                  const pref = prefsMap.get(v.registrationId);
                  if (!pref) return null;
                  return (
                    <div key={v.registrationId} className="bg-white/50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-lavender/10 flex items-center justify-center text-[10px] font-bold text-lavender flex-shrink-0">
                          {pref.parentName[0]}
                        </div>
                        <span className="font-semibold text-xs text-ink truncate">{pref.parentName}</span>
                        <span className="text-[10px] text-ink/30 ml-auto flex-shrink-0">Room {v.roomNumber}</span>
                      </div>
                      <p className="text-[11px] text-ink/60 leading-relaxed pl-8">"{pref.preferences}"</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink/30">No preferences noted today</p>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card !p-4 lg:!p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-ink/20" />
            <span className="font-bold text-ink text-sm">Latest Activity</span>
          </div>
          <div className="space-y-2">
            {visits
              .filter(v => v.checkInTime || v.checkOutTime)
              .sort((a, b) => {
                const tA = a.checkOutTime || a.checkInTime || '';
                const tB = b.checkOutTime || b.checkInTime || '';
                return tB.localeCompare(tA);
              })
              .slice(0, 5)
              .map(v => (
                <div key={v.id} className="flex items-center gap-3 py-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${v.status === 'checked-in' ? 'bg-mint-light text-mint' : 'bg-cream-dark text-ink/40'}`}>
                    {v.childName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{v.childName}</p>
                    <p className="text-[10px] text-ink/40 truncate">
                      {v.status === 'checked-out'
                        ? `Out at ${v.checkOutTime} by ${v.checkOutBy}`
                        : `In at ${v.checkInTime} by ${v.checkInBy}`}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 ${v.status === 'checked-in' ? 'status-in' : 'status-out'}`}>
                    {v.status === 'checked-in' ? 'In' : 'Out'}
                  </span>
                </div>
              ))}
            {visits.filter(v => v.checkInTime).length === 0 && (
              <p className="text-sm text-ink/30">No activity yet today</p>
            )}
          </div>
        </div>
      </div>

      {/* In Club Now modal */}
      {showInClub && (
        <InClubModal kids={checkedIn} onClose={() => setShowInClub(false)} />
      )}
    </div>
  );
}

function InClubModal({ kids, onClose }: { kids: Visit[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-cream rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-card animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mint-light rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-mint" />
            </div>
            <div>
              <h2 className="font-bold text-ink text-base">In Club Now</h2>
              <p className="text-xs text-ink/40">{kids.length} {kids.length === 1 ? 'child' : 'children'} checked in</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-cream-dark flex items-center justify-center hover:bg-ink/10 transition-colors">
            <X className="w-4 h-4 text-ink/50" />
          </button>
        </div>

        {/* List */}
        <div className="px-5 pb-5 overflow-y-auto max-h-[60vh] space-y-2">
          {kids.length === 0 ? (
            <p className="text-sm text-ink/30 text-center py-8">No children currently in the club</p>
          ) : (
            kids.map(v => (
              <div key={v.id} className="flex items-center gap-3 bg-white rounded-2xl p-3">
                <div className="w-10 h-10 rounded-xl bg-mint-light flex items-center justify-center text-sm font-bold text-mint flex-shrink-0">
                  {v.childName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink truncate">{v.childName}</p>
                  <p className="text-[11px] text-ink/40">
                    Room {v.roomNumber} · {v.session} · In at {v.checkInTime}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="status-in !text-[10px]">In</span>
                  {v.allergies && v.allergies !== 'N/A' && (
                    <span className="flex items-center gap-1 text-[10px] text-coral font-semibold">
                      <AlertCircle className="w-3 h-3" /> {v.allergies}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, color, textColor, icon, trend, trendUp,
}: {
  label: string; value: number; color: string; textColor: string;
  icon: React.ReactNode; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className={`${color} rounded-3xl p-4 lg:p-5 relative overflow-hidden`}>
      <div className={`${textColor} mb-2`}>{icon}</div>
      <p className="text-2xl lg:text-3xl font-bold font-display text-ink">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-[11px] lg:text-xs text-ink/50 font-medium">{label}</p>
        {trend && (
          <span className={`text-[10px] font-bold items-center gap-0.5 hidden sm:flex
            ${trendUp ? 'text-mint' : 'text-ink/30'}`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function DonutChart({ total, segments }: { total: number; segments: { value: number; color: string }[] }) {
  const size = 140;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="#EDE8DF" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => {
          const pct = total > 0 ? seg.value / total : 0;
          const dashLength = pct * circumference;
          const dashOffset = -offset * circumference;
          offset += pct;
          if (seg.value === 0) return null;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={radius} fill="none"
              stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold font-display text-ink">{total}</p>
        <p className="text-[10px] text-ink/40 font-medium">kids today</p>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

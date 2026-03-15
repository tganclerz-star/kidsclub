import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, AlertCircle, X, User, MapPin, Clock, Heart, Palette, Check, Phone, Mail } from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths,
  startOfMonth, endOfMonth, isToday, isSameDay, isSameMonth,
  getDay, parseISO,
} from 'date-fns';
import { collection, onSnapshot, query, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getAllVisits, createVisit } from '../../lib/db';
import { Visit, Session, GuestType, PickupMethod } from '../../types';

interface Activity {
  id: string;
  name: string;
  price: number;
  color: string;
  date: string;
  assignedKids: { visitId: string; childName: string; time: string; paid?: boolean }[];
}

interface Props {
  activeStaff: string;
}

type ViewMode = 'Today' | 'Week' | 'Month' | 'Timeline';

const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const h = 9 + i;
  return `${h.toString().padStart(2, '0')}:00`;
});

const SESSION_CONFIG = {
  Morning:   { start: 9,    end: 13,   color: 'schedule-card-gold' },
  Afternoon: { start: 14,   end: 16.5, color: 'schedule-card-sky' },
  Evening:   { start: 16.5, end: 19,   color: 'schedule-card-lavender' },
} as const;

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function Schedule({ activeStaff }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedKid, setSelectedKid] = useState<Visit | null>(null);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);

  const refreshVisits = () => getAllVisits().then(v => setAllVisits(v));

  useEffect(() => {
    getAllVisits().then(v => { setAllVisits(v); setLoading(false); });
  }, []);

  // Load today's activities for kid detail modal
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(collection(db, 'kc_activities'), where('date', '==', today));
    const unsub = onSnapshot(q, snap => {
      setTodayActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });
    return unsub;
  }, []);

  // Navigation helpers
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);

  const prev = () => {
    if (viewMode === 'Today' || viewMode === 'Timeline') setCurrentDate(d => addDays(d, -1));
    else if (viewMode === 'Week') setCurrentDate(d => addWeeks(d, -1));
    else setCurrentDate(d => addMonths(d, -1));
  };
  const next = () => {
    if (viewMode === 'Today' || viewMode === 'Timeline') setCurrentDate(d => addDays(d, 1));
    else if (viewMode === 'Week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  // Get visits for a specific date
  const visitsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allVisits.filter(v => v.date === dateStr);
  };

  // Date label
  const dateLabel = viewMode === 'Today' || viewMode === 'Timeline'
    ? format(currentDate, 'EEEE, MMM d, yyyy')
    : viewMode === 'Week'
      ? `${format(weekStart, 'MMM d')}–${format(addDays(weekStart, 6), 'd, yyyy')}`
      : format(currentDate, 'MMMM yyyy');

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center h-full">
        <p className="text-ink/30 text-sm">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">
          Stay up to date, {activeStaff}
        </h1>
        <button onClick={() => setShowAddEvent(true)} className="btn-gold flex items-center gap-2 text-sm self-start">
          <Plus className="w-4 h-4" /> Add event
        </button>
      </div>

      {showAddEvent && (
        <AddEventModal
          defaultDate={currentDate}
          onClose={() => setShowAddEvent(false)}
          onCreated={() => { setShowAddEvent(false); refreshVisits(); }}
        />
      )}

      {selectedKid && (
        <KidDetailModal
          visit={selectedKid}
          activities={todayActivities}
          onClose={() => setSelectedKid(null)}
        />
      )}

      {/* Navigation + view mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center hover:bg-cream-dark transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4 text-ink" />
          </button>
          <div className="px-3 lg:px-4 py-2 bg-gold-light border-2 border-gold/20 text-ink rounded-xl text-xs lg:text-sm font-bold whitespace-nowrap">
            {dateLabel}
          </div>
          <button onClick={next} className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center hover:bg-cream-dark transition-colors flex-shrink-0">
            <ChevronRight className="w-4 h-4 text-ink" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-card self-start">
          {(['Today', 'Week', 'Month', 'Timeline'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); if (mode === 'Today') goToday(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${viewMode === mode ? 'bg-gold text-ink' : 'text-ink/40 hover:text-ink'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {viewMode === 'Today' && <TodayView date={currentDate} visits={visitsForDate(currentDate)} activities={todayActivities} onKidClick={setSelectedKid} />}
      {viewMode === 'Week' && <WeekView weekDays={weekDays} visitsForDate={visitsForDate} />}
      {viewMode === 'Month' && <MonthView currentDate={currentDate} visitsForDate={visitsForDate} />}
      {viewMode === 'Timeline' && <TimelineView date={currentDate} visits={visitsForDate(currentDate)} />}

      {/* Session legend */}
      <div className="flex items-center justify-center gap-4 lg:gap-6 mt-3 lg:mt-4 flex-wrap">
        {Object.entries(SESSION_CONFIG).map(([session, config]) => (
          <div key={session} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-md ${
              session === 'Morning' ? 'bg-gold' : session === 'Afternoon' ? 'bg-sky' : 'bg-lavender'
            }`} />
            <span className="text-[10px] lg:text-xs text-ink/40 font-medium whitespace-nowrap">
              {session} ({config.start}:00–{config.end === 16.5 ? '16:30' : config.end === 19 ? '19:00' : config.end + ':00'})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TODAY VIEW ──────────────────────────────────────────────────────────────────

function TodayView({ date, visits, activities, onKidClick }: { date: Date; visits: Visit[]; activities: Activity[]; onKidClick: (v: Visit) => void }) {
  const ROW_H = 60;
  const sessionGroups = groupBySession(visits);

  return (
    <div className="flex-1 bg-white rounded-3xl shadow-card overflow-hidden min-h-0">
      <div className="overflow-auto h-full">
        {/* Day header */}
        <div className={`sticky top-0 z-20 border-b border-cream-dark ${isToday(date) ? 'bg-gold-light' : 'bg-white'}`}>
          <div className="p-3 text-center">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isToday(date) ? 'text-gold' : 'text-ink/30'}`}>
              {format(date, 'EEEE')}
            </p>
            <p className="text-2xl font-bold font-display text-ink">
              {format(date, 'd MMMM')}
            </p>
          </div>
        </div>

        {/* Time slots */}
        <div className="grid grid-cols-[60px_1fr] lg:grid-cols-[80px_1fr]">
          <div className="border-r border-cream-dark">
            {TIME_SLOTS.map(time => (
              <div key={time} className="flex items-start justify-end pr-3 pt-1" style={{ height: ROW_H }}>
                <span className="text-[10px] text-ink/30 font-medium">{time}</span>
              </div>
            ))}
          </div>
          <div className="relative">
            {TIME_SLOTS.map(time => (
              <div key={time} className="border-b border-cream-dark/50" style={{ height: ROW_H }} />
            ))}

            {/* Session cards */}
            {Object.entries(sessionGroups).map(([session, sessionVisits]) => {
              if (sessionVisits.length === 0) return null;
              const config = SESSION_CONFIG[session as keyof typeof SESSION_CONFIG];
              const topPx = (config.start - 9) * ROW_H;
              const heightPx = (config.end - config.start) * ROW_H;

              return (
                <div
                  key={session}
                  className={`absolute left-1 right-1 lg:left-2 lg:right-2 ${config.color} rounded-2xl p-3 lg:p-4 overflow-hidden z-10`}
                  style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider opacity-70">{session}</span>
                    <span className="text-xs font-semibold opacity-50">{sessionVisits.length} kids</span>
                  </div>
                  <div className="space-y-2 overflow-y-auto max-h-[calc(100%-28px)] scrollbar-hide">
                    {sessionVisits.map(v => {
                      const kidActivities = activities.filter(a => a.assignedKids.some(k => k.visitId === v.id));
                      return (
                      <div key={v.id} onClick={() => onKidClick(v)} className="bg-white/70 rounded-xl px-3 py-2.5 shadow-sm cursor-pointer hover:bg-white/90 transition-colors active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                            ${v.status === 'checked-in' ? 'bg-mint text-white' : v.status === 'checked-out' ? 'bg-ink/10 text-ink/30' : 'bg-gold/20 text-ink/50'}`}>
                            {v.childName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-ink truncate block">{v.childName}</span>
                            <span className="text-[11px] text-ink/50">Room {v.roomNumber} · {v.guestType} · Pickup: {v.pickupMethod}</span>
                          </div>
                          {v.allergies && v.allergies !== 'N/A' && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-coral bg-coral-light px-2 py-1 rounded-lg flex-shrink-0">
                              <AlertCircle className="w-3 h-3" /> {v.allergies}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0
                            ${v.status === 'checked-in' ? 'bg-mint-light text-mint' : v.status === 'checked-out' ? 'bg-cream-dark text-ink/30' : 'bg-gold-light text-ink/50'}`}>
                            {v.status === 'checked-in' ? 'In' : v.status === 'checked-out' ? 'Out' : 'Pending'}
                          </span>
                        </div>
                        {v.parentPreferences && v.parentPreferences.trim() && (
                          <div className="mt-1.5 ml-11 text-[10px] text-lavender bg-lavender-light/60 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                            <span className="font-semibold">Pref:</span> {v.parentPreferences}
                          </div>
                        )}
                        {kidActivities.length > 0 && (
                          <div className="mt-1.5 ml-11 flex flex-wrap gap-1">
                            {kidActivities.map(a => {
                              const kid = a.assignedKids.find(k => k.visitId === v.id);
                              const isPaid = kid?.paid;
                              const c = ACTIVITY_COLORS[a.color] || ACTIVITY_COLORS.coral;
                              return (
                                <span key={a.id} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${c.light} ${c.text}`}>
                                  <Palette className="w-2.5 h-2.5" />
                                  {a.name} · {a.price} AED
                                  {isPaid
                                    ? <span className="bg-mint-light text-mint px-1 rounded text-[8px]">PAID</span>
                                    : <span className="bg-coral-light text-coral px-1 rounded text-[8px]">UNPAID</span>
                                  }
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {visits.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-ink/20">No visits scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WEEK VIEW ───────────────────────────────────────────────────────────────────

function WeekView({ weekDays, visitsForDate }: { weekDays: Date[]; visitsForDate: (d: Date) => Visit[] }) {
  const ROW_H = 56;

  return (
    <div className="flex-1 bg-white rounded-3xl shadow-card overflow-hidden min-h-0">
      <div className="overflow-auto h-full">
        {/* Day headers */}
        <div className="sticky top-0 z-20 bg-white border-b border-cream-dark">
          <div className="grid schedule-grid min-w-[700px]">
            <div className="p-2 lg:p-3 border-r border-cream-dark" />
            {weekDays.map((day, i) => {
              const today = isToday(day);
              return (
                <div
                  key={i}
                  className={`p-2 lg:p-3 text-center border-r border-cream-dark last:border-r-0 ${today ? 'bg-gold-light' : ''}`}
                >
                  <p className={`text-[9px] lg:text-[10px] font-semibold uppercase tracking-wider ${today ? 'text-gold' : 'text-ink/30'}`}>
                    {DAYS_SHORT[i]}
                  </p>
                  <p className={`text-base lg:text-lg font-bold font-display text-ink`}>
                    {format(day, 'd')}/{format(day, 'MM')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time rows + cards */}
        <div className="relative">
          <div className="grid schedule-grid min-w-[700px]">
            {/* Time labels */}
            <div className="border-r border-cream-dark">
              {TIME_SLOTS.map(time => (
                <div key={time} className="flex items-start justify-end pr-2 lg:pr-3 pt-1" style={{ height: ROW_H }}>
                  <span className="text-[9px] lg:text-[10px] text-ink/30 font-medium">{time}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const dayVisits = visitsForDate(day);
              const sessionGroups = groupBySession(dayVisits);
              const todayCol = isToday(day);

              return (
                <div key={dayIdx} className={`relative border-r border-cream-dark last:border-r-0 ${todayCol ? 'bg-gold-light/30' : ''}`}>
                  {TIME_SLOTS.map(time => (
                    <div key={time} className="border-b border-cream-dark/50" style={{ height: ROW_H }} />
                  ))}

                  {/* Session cards */}
                  {Object.entries(sessionGroups).map(([session, sessionVisits]) => {
                    if (sessionVisits.length === 0) return null;
                    const config = SESSION_CONFIG[session as keyof typeof SESSION_CONFIG];
                    const topPx = (config.start - 9) * ROW_H;
                    const heightPx = (config.end - config.start) * ROW_H;

                    return (
                      <div
                        key={session}
                        className={`absolute left-0.5 right-0.5 lg:left-1 lg:right-1 ${config.color} rounded-xl lg:rounded-2xl p-2 lg:p-3 overflow-hidden z-10`}
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider opacity-70">
                            {session}
                          </span>
                          <span className="text-[9px] lg:text-[10px] font-semibold opacity-50">
                            {sessionVisits.length}
                          </span>
                        </div>
                        <div className="space-y-1 overflow-y-auto max-h-[calc(100%-20px)] scrollbar-hide">
                          {sessionVisits.slice(0, 5).map(v => (
                            <div key={v.id} className="flex items-center gap-1.5 bg-white/40 rounded-lg px-1.5 lg:px-2 py-1">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] lg:text-[9px] font-bold flex-shrink-0
                                ${v.status === 'checked-in' ? 'bg-mint text-white' : v.status === 'checked-out' ? 'bg-white/60 text-ink/40' : 'bg-white/60 text-ink/50'}`}>
                                {v.childName[0]}
                              </div>
                              <span className="text-[10px] lg:text-[11px] font-medium text-ink truncate">{v.childName}</span>
                              {v.parentPreferences && v.parentPreferences.trim() && (
                                <span className="w-2.5 h-2.5 rounded-full bg-lavender/40 flex-shrink-0" title={v.parentPreferences} />
                              )}
                              {v.allergies && v.allergies !== 'N/A' && (
                                <AlertCircle className="w-2.5 h-2.5 text-coral flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          {sessionVisits.length > 5 && (
                            <p className="text-[9px] text-ink/40 text-center">+{sessionVisits.length - 5} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MONTH VIEW ──────────────────────────────────────────────────────────────────

function MonthView({ currentDate, visitsForDate }: { currentDate: Date; visitsForDate: (d: Date) => Visit[] }) {
  const monthStart_ = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Start grid from Monday of the week containing the 1st
  const gridStart = startOfWeek(monthStart_, { weekStartsOn: 1 });
  // Build 6 rows of 7 days
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(gridStart, i));
  }

  return (
    <div className="flex-1 bg-white rounded-3xl shadow-card overflow-hidden min-h-0">
      <div className="overflow-auto h-full p-3 lg:p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center py-2">
              <span className="text-[10px] lg:text-xs font-semibold text-ink/30 uppercase tracking-wider">{d}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const dayVisits = visitsForDate(day);
            const sessionGroups = groupBySession(dayVisits);
            const totalKids = dayVisits.length;

            return (
              <div
                key={i}
                className={`rounded-xl lg:rounded-2xl p-1.5 lg:p-2 min-h-[80px] lg:min-h-[100px] border-2 transition-colors
                  ${today ? 'bg-gold-light border-gold/40' : inMonth ? 'bg-white border-cream-dark hover:border-ink/10' : 'bg-cream-dark/20 border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs lg:text-sm font-bold
                    ${today ? 'text-ink' : inMonth ? 'text-ink' : 'text-ink/20'}`}>
                    {format(day, 'd')}
                  </span>
                  {today && (
                    <span className="text-[8px] lg:text-[9px] font-bold text-gold bg-gold/20 px-1.5 py-0.5 rounded-md uppercase">Today</span>
                  )}
                  {!today && totalKids > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-cream-dark text-ink/40">
                      {totalKids}
                    </span>
                  )}
                </div>

                {/* Session badges */}
                <div className="space-y-1">
                  {sessionGroups.Morning.length > 0 && (
                    <div className="rounded-lg px-2 py-1 text-[9px] lg:text-[10px] font-semibold truncate bg-gold-light border border-gold/20 text-ink/70">
                      ☀ Morning · {sessionGroups.Morning.length}
                    </div>
                  )}
                  {sessionGroups.Afternoon.length > 0 && (
                    <div className="rounded-lg px-2 py-1 text-[9px] lg:text-[10px] font-semibold truncate bg-sky-light border border-sky/20 text-ink/70">
                      ☁ Afternoon · {sessionGroups.Afternoon.length}
                    </div>
                  )}
                  {sessionGroups.Evening.length > 0 && (
                    <div className="rounded-lg px-2 py-1 text-[9px] lg:text-[10px] font-semibold truncate bg-lavender-light border border-lavender/20 text-ink/70">
                      ☾ Evening · {sessionGroups.Evening.length}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── TIMELINE VIEW (daily, 15-min precision with current-time indicator) ─────────

const TL_START = 9;  // 09:00
const TL_END   = 19; // 19:00
const TL_HOURS = TL_END - TL_START; // 10 hours
const TL_SLOTS = TL_HOURS * 4;      // 40 quarter-hour slots

const BAR_COLORS = [
  { bg: 'bg-sky/50', border: 'border-sky/30' },
  { bg: 'bg-lavender/50', border: 'border-lavender/30' },
  { bg: 'bg-rose/50', border: 'border-rose/30' },
  { bg: 'bg-gold/50', border: 'border-gold/30' },
  { bg: 'bg-mint/50', border: 'border-mint/30' },
  { bg: 'bg-coral/40', border: 'border-coral/30' },
];

const SESSION_HOURS: Record<string, { start: number; end: number }> = {
  Morning:   { start: 9,    end: 13 },
  Afternoon: { start: 14,   end: 16.5 },
  Evening:   { start: 16.5, end: 19 },
};

function TimelineView({ date, visits }: { date: Date; visits: Visit[] }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isViewingToday = isToday(date);
  const showTimeLine = isViewingToday && currentHour >= TL_START && currentHour <= TL_END;
  const timeLinePercent = ((currentHour - TL_START) / TL_HOURS) * 100;

  // Build 15-min slot labels for the header
  const hourLabels = Array.from({ length: TL_HOURS }, (_, i) => TL_START + i);

  return (
    <div className="flex-1 bg-white rounded-3xl shadow-card overflow-hidden min-h-0">
      <div className="overflow-auto h-full">
        {/* Header: hour labels + tick marks for quarter hours */}
        <div className="sticky top-0 z-20 bg-white border-b-2 border-cream-dark">
          <div className="flex min-w-[1100px]">
            <div className="w-[180px] flex-shrink-0 p-3 border-r border-cream-dark flex items-center">
              <span className="text-xs font-semibold text-ink/40">
                {format(date, 'EEE, MMM d')}
              </span>
            </div>
            <div className="flex-1 flex flex-col">
              {/* Hour labels row */}
              <div className="flex">
                {hourLabels.map(hour => (
                  <div key={hour} className="flex-1 flex items-center justify-center py-2.5">
                    <span className="text-xs lg:text-sm font-bold font-display text-ink">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>
              {/* Tick marks row */}
              <div className="flex h-2">
                {Array.from({ length: TL_SLOTS }, (_, i) => {
                  const isHour = i % 4 === 0;
                  const isHalf = i % 4 === 2;
                  return (
                    <div key={i} className="flex-1 flex justify-start">
                      <div className={`${
                        isHour ? 'w-0.5 h-full bg-ink/15' : isHalf ? 'w-px h-1.5 bg-ink/10' : 'w-px h-1 bg-ink/6'
                      }`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Child rows */}
        <div className="min-w-[1100px]">
          {visits.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-ink/30 text-sm">
              No visits for this day
            </div>
          ) : (
            visits.map((v, idx) => {
              const color = BAR_COLORS[idx % BAR_COLORS.length];
              const sessionH = SESSION_HOURS[v.session] || { start: 9, end: 13 };
              const barLeft = ((sessionH.start - TL_START) / TL_HOURS) * 100;
              const barWidth = ((sessionH.end - sessionH.start) / TL_HOURS) * 100;
              const statusLabel = v.status === 'checked-in' ? 'In Club' : v.status === 'checked-out' ? 'Checked Out' : 'Pending';
              const timeRange = `${formatHour(sessionH.start)}–${formatHour(sessionH.end)}`;

              return (
                <div key={v.id} className="flex border-b border-cream-dark/50">
                  {/* Child info */}
                  <div className="w-[180px] flex-shrink-0 flex items-center gap-3 px-4 py-5 border-r border-cream-dark bg-white relative z-[1]">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-white ${
                      color.bg.replace('/50', '').replace('/40', '')
                    }`}>
                      {v.childName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink truncate">{v.childName}</p>
                      <p className="text-[11px] text-ink/40 truncate">Room {v.roomNumber}</p>
                    </div>
                  </div>

                  {/* Bar area */}
                  <div className="flex-1 relative flex items-center" style={{ minHeight: 76 }}>
                    {/* 15-min grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: TL_SLOTS }, (_, i) => {
                        const isHr = i % 4 === 0;
                        const isHf = i % 4 === 2;
                        return (
                          <div
                            key={i}
                            className={`flex-1 ${isHr ? 'border-l-2 border-ink/10' : isHf ? 'border-l border-ink/8' : 'border-l border-cream-dark/50'}`}
                          />
                        );
                      })}
                    </div>
                    {/* Current time indicator */}
                    {showTimeLine && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-coral z-20"
                        style={{ left: `${timeLinePercent}%` }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-coral rounded-full" />
                      </div>
                    )}

                    {/* Session bar */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-12 lg:h-14 z-10 rounded-full ${color.bg} border ${color.border} flex items-center justify-between px-4 overflow-hidden`}
                      style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs lg:text-sm font-bold text-ink/80 truncate">{v.childName}</span>
                        {v.parentPreferences && v.parentPreferences.trim() && (
                          <span className="text-[10px] text-lavender font-semibold bg-lavender-light/70 px-1.5 py-0.5 rounded-full flex-shrink-0 hidden lg:inline-flex">
                            {v.parentPreferences}
                          </span>
                        )}
                        {v.allergies && v.allergies !== 'N/A' && (
                          <span className="flex items-center gap-1 text-[10px] text-coral font-semibold flex-shrink-0">
                            <AlertCircle className="w-3 h-3" /> {v.allergies}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] lg:text-xs text-ink/40 font-medium hidden sm:block">{timeRange}</span>
                        <span className={`text-[10px] lg:text-[11px] font-bold px-2 py-0.5 rounded-full
                          ${v.status === 'checked-in' ? 'bg-white/70 text-mint' : v.status === 'checked-out' ? 'bg-white/50 text-ink/30' : 'bg-white/50 text-ink/50'}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="border-t-2 border-cream-dark px-4 py-3">
          <div className="flex items-center justify-center gap-6 lg:gap-10">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-mint" />
              <span className="text-xs text-ink/40 font-medium">In Club</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gold" />
              <span className="text-xs text-ink/40 font-medium">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-ink/20" />
              <span className="text-xs text-ink/40 font-medium">Checked Out</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-coral rounded-full" />
              <span className="text-xs text-ink/40 font-medium">Now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// ── KID DETAIL MODAL ────────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<string, { bg: string; light: string; text: string }> = {
  coral:    { bg: 'bg-coral',    light: 'bg-coral-light',    text: 'text-coral' },
  sky:      { bg: 'bg-sky',      light: 'bg-sky-light',      text: 'text-sky' },
  gold:     { bg: 'bg-gold',     light: 'bg-gold-light',     text: 'text-gold' },
  mint:     { bg: 'bg-mint',     light: 'bg-mint-light',     text: 'text-mint' },
  lavender: { bg: 'bg-lavender', light: 'bg-lavender-light', text: 'text-lavender' },
  rose:     { bg: 'bg-rose',     light: 'bg-rose-light',     text: 'text-rose' },
};

function KidDetailModal({
  visit,
  activities,
  onClose,
}: {
  visit: Visit;
  activities: Activity[];
  onClose: () => void;
}) {
  const [contactInfo, setContactInfo] = useState<{ phone?: string; email?: string } | null>(null);

  useEffect(() => {
    if (!visit.registrationId) return;
    getDoc(doc(db, 'kc_registrations', visit.registrationId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setContactInfo({ phone: data.phone, email: data.email });
      }
    });
  }, [visit.registrationId]);

  const statusLabel = visit.status === 'checked-in' ? 'In Club' : visit.status === 'checked-out' ? 'Checked Out' : 'Pending';
  const statusColor = visit.status === 'checked-in' ? 'bg-mint-light text-mint' : visit.status === 'checked-out' ? 'bg-cream-dark text-ink/30' : 'bg-gold-light text-ink/50';

  // Which activities is this kid assigned to?
  const assignedActivities = activities.filter(a =>
    a.assignedKids.some(k => k.visitId === visit.id)
  );
  const unassignedActivities = activities.filter(a =>
    !a.assignedKids.some(k => k.visitId === visit.id)
  );

  const handleAssign = async (activity: Activity) => {
    const now = format(new Date(), 'HH:mm');
    const updated = [
      ...activity.assignedKids,
      { visitId: visit.id!, childName: visit.childName, time: now },
    ];
    await updateDoc(doc(db, 'kc_activities', activity.id), { assignedKids: updated });
  };

  const handleRemove = async (activity: Activity) => {
    const updated = activity.assignedKids.filter(k => k.visitId !== visit.id);
    await updateDoc(doc(db, 'kc_activities', activity.id), { assignedKids: updated });
  };

  const handleTogglePaid = async (activity: Activity) => {
    const updated = activity.assignedKids.map(k =>
      k.visitId === visit.id ? { ...k, paid: !k.paid } : k
    );
    await updateDoc(doc(db, 'kc_activities', activity.id), { assignedKids: updated });
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-end sm:items-center justify-center z-50 p-4 animate-fade" onClick={onClose}>
      <div className="bg-white rounded-3xl p-5 lg:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold
              ${visit.status === 'checked-in' ? 'bg-mint text-white' : visit.status === 'checked-out' ? 'bg-ink/10 text-ink/30' : 'bg-gold/20 text-ink/50'}`}>
              {visit.childName[0]}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-ink">{visit.childName}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${statusColor}`}>{statusLabel}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-ink/30 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="bg-cream rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3 h-3 text-ink/30" />
              <span className="text-[10px] text-ink/40 font-medium">Room</span>
            </div>
            <p className="text-sm font-bold text-ink">{visit.roomNumber}</p>
          </div>
          <div className="bg-cream rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3 text-ink/30" />
              <span className="text-[10px] text-ink/40 font-medium">Parent</span>
            </div>
            <p className="text-sm font-bold text-ink truncate">{visit.parentName}</p>
          </div>
          <div className="bg-cream rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-ink/30" />
              <span className="text-[10px] text-ink/40 font-medium">Session</span>
            </div>
            <p className="text-sm font-bold text-ink">{visit.session}</p>
          </div>
          <div className="bg-cream rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3 text-ink/30" />
              <span className="text-[10px] text-ink/40 font-medium">Pickup</span>
            </div>
            <p className="text-sm font-bold text-ink truncate">{visit.pickupMethod}</p>
          </div>
        </div>

        {/* Contact details */}
        {contactInfo && (contactInfo.phone || contactInfo.email) && (
          <div className="bg-sky-light border border-sky/20 rounded-xl px-3 py-2.5 mb-3 space-y-1.5">
            <p className="text-[10px] font-bold text-sky mb-1">Contact Details</p>
            {contactInfo.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-sky flex-shrink-0" />
                <a href={`tel:${contactInfo.phone}`} className="text-ink font-medium hover:underline">{contactInfo.phone}</a>
              </div>
            )}
            {contactInfo.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 text-sky flex-shrink-0" />
                <a href={`mailto:${contactInfo.email}`} className="text-ink font-medium hover:underline truncate">{contactInfo.email}</a>
              </div>
            )}
          </div>
        )}

        {/* Guest type & check in/out times */}
        <div className="bg-cream rounded-xl p-3 mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink/40">Guest Type</span>
            <span className="font-semibold text-ink">{visit.guestType}</span>
          </div>
          {visit.checkInTime && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink/40">Checked In</span>
              <span className="font-semibold text-mint">{visit.checkInTime} by {visit.checkInBy}</span>
            </div>
          )}
          {visit.checkOutTime && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink/40">Checked Out</span>
              <span className="font-semibold text-ink/50">{visit.checkOutTime} by {visit.checkOutBy}</span>
            </div>
          )}
        </div>

        {/* Allergies */}
        {visit.allergies && visit.allergies !== 'N/A' && (
          <div className="bg-coral-light border border-coral/20 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-coral flex-shrink-0" />
            <span className="text-xs font-semibold text-coral">{visit.allergies}</span>
          </div>
        )}

        {/* Preferences */}
        {visit.parentPreferences && visit.parentPreferences.trim() && (
          <div className="bg-lavender-light border border-lavender/20 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-lavender flex-shrink-0" />
            <span className="text-xs text-ink/60">"{visit.parentPreferences}"</span>
          </div>
        )}

        {/* Activities section */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-ink/30" />
            <span className="font-bold text-sm text-ink">Activities</span>
          </div>

          {/* Assigned activities */}
          {assignedActivities.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {assignedActivities.map(a => {
                const c = ACTIVITY_COLORS[a.color] || ACTIVITY_COLORS.coral;
                const kid = a.assignedKids.find(k => k.visitId === visit.id);
                const isPaid = kid?.paid;
                return (
                  <div key={a.id} className={`${c.light} rounded-xl px-3 py-2.5 border border-${a.color}/20`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 ${c.bg} rounded-lg flex items-center justify-center`}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink">{a.name}</p>
                        <p className="text-[10px] text-ink/40">{a.price} AED · {kid?.time}</p>
                      </div>
                      <button
                        onClick={() => handleTogglePaid(a)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors
                          ${isPaid ? 'bg-mint-light text-mint' : 'bg-coral-light text-coral'}`}
                      >
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </button>
                      <button
                        onClick={() => handleRemove(a)}
                        className="text-[10px] font-semibold text-ink/20 hover:text-coral transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available activities to assign */}
          {unassignedActivities.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-ink/30 font-semibold uppercase tracking-wider mb-1">Available to assign</p>
              {unassignedActivities.map(a => {
                const c = ACTIVITY_COLORS[a.color] || ACTIVITY_COLORS.coral;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleAssign(a)}
                    className="w-full flex items-center gap-2.5 bg-cream hover:bg-cream-dark rounded-xl px-3 py-2.5 transition-colors text-left"
                  >
                    <div className={`w-7 h-7 ${c.bg}/20 rounded-lg flex items-center justify-center`}>
                      <Palette className={`w-3.5 h-3.5 ${c.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink">{a.name}</p>
                      <p className="text-[10px] text-ink/40">{a.price} AED per kid</p>
                    </div>
                    <span className={`text-[10px] font-bold ${c.text} ${c.light} px-2 py-1 rounded-lg`}>
                      + Assign
                    </span>
                  </button>
                );
              })}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-xs text-ink/20 text-center py-3">No activities created today</p>
          ) : (
            <p className="text-xs text-mint text-center py-3 font-medium">Assigned to all activities</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ADD EVENT MODAL ──────────────────────────────────────────────────────────

const SESSIONS_LIST: Session[] = ['Morning', 'Afternoon', 'Evening'];
const GUEST_TYPES: GuestType[] = ['Hotel', 'Residence', 'Day Pass'];
const PICKUP_METHODS: PickupMethod[] = ['with mom', 'with dad', 'with nanny', 'with guardian'];

function AddEventModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    childName: '',
    parentName: '',
    roomNumber: '',
    guestType: 'Hotel' as GuestType,
    session: 'Morning' as Session,
    date: format(defaultDate, 'yyyy-MM-dd'),
    pickupMethod: 'with mom' as PickupMethod,
    allergies: '',
    securityPin: '',
  });

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.childName.trim() || !form.parentName.trim() || !form.roomNumber.trim()) return;
    setSaving(true);
    await createVisit({
      registrationId: '',
      childId: '',
      childName: form.childName.trim(),
      parentName: form.parentName.trim(),
      roomNumber: form.roomNumber.trim(),
      guestType: form.guestType,
      session: form.session,
      date: form.date,
      status: 'pending',
      checkInTime: null,
      checkInBy: null,
      checkOutTime: null,
      checkOutBy: null,
      pickupMethod: form.pickupMethod,
      departureDate: '',
      staffNotes: '',
      operaChecked: false,
      disclaimerSigned: false,
      securityPin: form.securityPin,
      allergies: form.allergies.trim() || 'N/A',
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-end sm:items-center justify-center z-50 p-4 animate-fade">
      <div className="bg-white rounded-3xl p-5 lg:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display font-bold text-lg text-ink">Add Event</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-ink/30 hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Child name */}
          <div>
            <label className="label">Child Name *</label>
            <input type="text" className="input" placeholder="e.g. Emma" value={form.childName} onChange={e => update('childName', e.target.value)} />
          </div>

          {/* Parent name */}
          <div>
            <label className="label">Parent Name *</label>
            <input type="text" className="input" placeholder="e.g. John Smith" value={form.parentName} onChange={e => update('parentName', e.target.value)} />
          </div>

          {/* Room + Guest type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Room Number *</label>
              <input type="text" className="input" placeholder="e.g. 204" value={form.roomNumber} onChange={e => update('roomNumber', e.target.value)} />
            </div>
            <div>
              <label className="label">Guest Type</label>
              <select className="input" value={form.guestType} onChange={e => update('guestType', e.target.value)}>
                {GUEST_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => update('date', e.target.value)} />
          </div>

          {/* Session */}
          <div>
            <label className="label">Session</label>
            <div className="grid grid-cols-3 gap-2">
              {SESSIONS_LIST.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update('session', s)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all min-h-[44px]
                    ${form.session === s ? 'bg-ink border-ink text-cream' : 'border-cream-dark text-ink'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pickup method */}
          <div>
            <label className="label">Pickup Method</label>
            <select className="input" value={form.pickupMethod} onChange={e => update('pickupMethod', e.target.value)}>
              {PICKUP_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Allergies */}
          <div>
            <label className="label">Allergies</label>
            <input type="text" className="input" placeholder="e.g. Peanuts, or leave empty" value={form.allergies} onChange={e => update('allergies', e.target.value)} />
          </div>

          {/* Security PIN */}
          <div>
            <label className="label">Security PIN (4 digits)</label>
            <input type="text" className="input" inputMode="numeric" maxLength={4} placeholder="e.g. 1234" value={form.securityPin} onChange={e => update('securityPin', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !form.childName.trim() || !form.parentName.trim() || !form.roomNumber.trim()}
          className="w-full bg-gold text-ink font-bold py-3.5 rounded-2xl mt-6 disabled:opacity-40 transition-all min-h-[48px]"
        >
          {saving ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </div>
  );
}

// ── HELPERS ─────────────────────────────────────────────────────────────────────

function groupBySession(visits: Visit[]) {
  const groups = { Morning: [] as Visit[], Afternoon: [] as Visit[], Evening: [] as Visit[] };
  visits.forEach(v => {
    if (groups[v.session as keyof typeof groups]) {
      groups[v.session as keyof typeof groups].push(v);
    }
  });
  return groups;
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, Menu, X, LogOut, User, AlertCircle } from 'lucide-react';
import { useTodayVisits } from '../../hooks/useTodayVisits';
import { Visit } from '../../types';

interface Props {
  activeStaff: string;
  onMenuToggle: () => void;
  onLogout: () => void;
}

const FILTERS = ['All', 'Kids', 'Parents', 'Sessions', 'Allergies'] as const;
type Filter = (typeof FILTERS)[number];

export default function TopHeader({ activeStaff, onMenuToggle, onLogout }: Props) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [showResults, setShowResults] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const { visits } = useTodayVisits();

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter search results
  const searchResults = query.trim().length >= 2 ? filterVisits(visits, query, activeFilter) : [];

  return (
    <div className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-cream-dark">
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
        {/* Hamburger — visible below xl */}
        <button
          onClick={onMenuToggle}
          className="xl:hidden w-9 h-9 rounded-xl bg-white shadow-card flex items-center justify-center hover:bg-cream-dark transition-colors flex-shrink-0"
        >
          <Menu className="w-4 h-4 text-ink" />
        </button>

        {/* Search */}
        <div ref={searchRef} className="flex-1 relative min-w-0">
          <div className="flex items-center gap-2 lg:gap-3 bg-white rounded-2xl px-3 lg:px-4 py-2.5 shadow-card">
            <Search className="w-4 h-4 text-ink/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => query.trim().length >= 2 && setShowResults(true)}
              className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink/30 focus:outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(''); setShowResults(false); }} className="text-ink/30 hover:text-ink/60">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Filters — hidden on small tablets */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">
              <span className="text-ink/20 text-xs mr-1">in:</span>
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => { setActiveFilter(f); if (query.trim().length >= 2) setShowResults(true); }}
                  className={`px-2 lg:px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap
                    ${activeFilter === f
                      ? 'bg-ink text-cream'
                      : 'text-ink/40 hover:text-ink/60 hover:bg-cream-dark'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Search results dropdown */}
          {showResults && query.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-card border border-cream-dark overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-ink/30">
                  No results for "{query}" in {activeFilter}
                </div>
              ) : (
                <div className="py-2">
                  <p className="px-4 py-1.5 text-[10px] font-bold text-ink/30 uppercase tracking-wider">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} in {activeFilter}
                  </p>
                  {searchResults.slice(0, 10).map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setShowResults(false); setQuery(''); navigate('/staff/live'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream/50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${v.status === 'checked-in' ? 'bg-mint-light text-mint' : v.status === 'checked-out' ? 'bg-cream-dark text-ink/40' : 'bg-gold-light text-gold'}`}>
                        {v.childName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{v.childName}</p>
                        <p className="text-[11px] text-ink/40 truncate">
                          {v.parentName} · Room {v.roomNumber} · {v.session}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                          ${v.status === 'checked-in' ? 'bg-mint-light text-mint' : v.status === 'checked-out' ? 'bg-cream-dark text-ink/40' : 'bg-gold-light text-ink/60'}`}>
                          {v.status === 'checked-in' ? 'In' : v.status === 'checked-out' ? 'Out' : 'Pending'}
                        </span>
                        {v.allergies && v.allergies !== 'N/A' && (
                          <span className="flex items-center gap-0.5 text-[10px] text-coral font-semibold">
                            <AlertCircle className="w-2.5 h-2.5" /> {v.allergies}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {searchResults.length > 10 && (
                    <p className="px-4 py-2 text-[11px] text-ink/30 text-center">
                      +{searchResults.length - 10} more results
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
              className="w-9 h-9 rounded-xl bg-white shadow-card flex items-center justify-center hover:bg-cream-dark transition-colors relative"
            >
              <Bell className="w-4 h-4 text-ink/40" />
              {visits.filter(v => v.checkInTime || v.checkOutTime).length > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-coral rounded-full border-2 border-cream" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-card border border-cream-dark overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-cream-dark flex items-center justify-between">
                  <h3 className="font-bold text-sm text-ink">Activity</h3>
                  <span className="text-[10px] text-ink/30 font-medium">Today</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {visits
                    .filter(v => v.checkInTime || v.checkOutTime)
                    .sort((a, b) => {
                      const tA = a.checkOutTime || a.checkInTime || '';
                      const tB = b.checkOutTime || b.checkInTime || '';
                      return tB.localeCompare(tA);
                    })
                    .slice(0, 8)
                    .map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-cream-dark/50 last:border-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${v.status === 'checked-in' ? 'bg-mint-light text-mint' : 'bg-cream-dark text-ink/40'}`}>
                          {v.childName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">{v.childName}</p>
                          <p className="text-[10px] text-ink/40">
                            {v.status === 'checked-out'
                              ? `Checked out at ${v.checkOutTime} by ${v.checkOutBy}`
                              : `Checked in at ${v.checkInTime} by ${v.checkInBy}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  {visits.filter(v => v.checkInTime).length === 0 && (
                    <p className="text-sm text-ink/30 text-center py-6">No activity yet</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate('/staff/settings')}
            className="hidden sm:flex w-9 h-9 rounded-xl bg-white shadow-card items-center justify-center hover:bg-cream-dark transition-colors"
          >
            <Settings className="w-4 h-4 text-ink/40" />
          </button>

          {/* Profile / Logout */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
              className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center ml-1 hover:bg-ink/80 transition-colors"
            >
              <span className="text-cream text-xs font-bold">{activeStaff[0]}</span>
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-card border border-cream-dark overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-cream-dark">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center">
                      <span className="text-cream text-xs font-bold">{activeStaff[0]}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-ink">{activeStaff}</p>
                      <p className="text-[10px] text-ink/40">Kids Club Staff</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowProfile(false); navigate('/staff/settings'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream/50 transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-ink/40" />
                    <span className="text-sm text-ink font-medium">Settings</span>
                  </button>
                  <button
                    onClick={() => { setShowProfile(false); onLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-coral-light transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-coral" />
                    <span className="text-sm text-coral font-medium">Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function filterVisits(visits: Visit[], query: string, filter: Filter): Visit[] {
  const q = query.toLowerCase();
  return visits.filter(v => {
    switch (filter) {
      case 'Kids':
        return v.childName.toLowerCase().includes(q);
      case 'Parents':
        return v.parentName.toLowerCase().includes(q);
      case 'Sessions':
        return v.session.toLowerCase().includes(q);
      case 'Allergies':
        return v.allergies && v.allergies !== 'N/A' && v.allergies.toLowerCase().includes(q);
      case 'All':
      default:
        return (
          v.childName.toLowerCase().includes(q) ||
          v.parentName.toLowerCase().includes(q) ||
          v.roomNumber.toLowerCase().includes(q) ||
          v.session.toLowerCase().includes(q) ||
          (v.allergies && v.allergies.toLowerCase().includes(q))
        );
    }
  });
}

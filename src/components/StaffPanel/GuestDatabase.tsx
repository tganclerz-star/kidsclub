import { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { getAllVisits } from '../../lib/db';
import { Visit } from '../../types';

export default function GuestDatabase() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllVisits().then(data => {
      setVisits(data);
      setLoading(false);
    });
  }, []);

  const filtered = visits.filter(
    v =>
      v.childName.toLowerCase().includes(query.toLowerCase()) ||
      v.parentName.toLowerCase().includes(query.toLowerCase()) ||
      v.roomNumber.includes(query),
  );

  const exportCSV = () => {
    const headers =
      'Date,Room,Type,Parent,Child,Session,Check-in,By,Check-out,By,Status,Allergies\n';
    const rows = filtered
      .map(
        v =>
          `${v.date},${v.roomNumber},${v.guestType},"${v.parentName}","${v.childName}",${v.session},` +
          `${v.checkInTime || ''},${v.checkInBy || ''},${v.checkOutTime || ''},${v.checkOutBy || ''},${v.status},"${v.allergies}"`,
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kids-club-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">Guest Database</h1>
        <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 self-start">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 lg:mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
        <input
          type="text"
          className="input pl-11"
          placeholder="Search by room, parent or child name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Card view for small screens, table for larger */}
      {/* Mobile/tablet card view */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <p className="text-center py-8 text-ink/30">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-ink/30">No results found</p>
        ) : (
          filtered.map(v => (
            <div key={v.id} className="card !p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-sm text-ink">{v.childName}</p>
                  <p className="text-xs text-ink/40">{v.parentName} · Room {v.roomNumber}</p>
                </div>
                <span
                  className={
                    v.status === 'checked-in'
                      ? 'status-in'
                      : v.status === 'checked-out'
                        ? 'status-out'
                        : 'status-pending'
                  }
                >
                  {v.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/50">
                <span>{v.date}</span>
                <span>{v.guestType}</span>
                <span className="badge bg-cream-dark text-ink/60 !text-[10px] !px-2 !py-0.5">{v.session}</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-ink/40">
                {v.checkInTime && <span>In: {v.checkInTime} ({v.checkInBy})</span>}
                {v.checkOutTime && <span>Out: {v.checkOutTime} ({v.checkOutBy})</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block bg-white rounded-3xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark">
                {['Date', 'Room', 'Parent', 'Child', 'Session', 'Check-in', 'Check-out', 'Status'].map(
                  h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs text-ink/40 font-semibold uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink/30">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink/30">
                    No results found
                  </td>
                </tr>
              ) : (
                filtered.map(v => (
                  <tr
                    key={v.id}
                    className="border-b border-cream-dark/50 hover:bg-cream/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-ink/60 whitespace-nowrap">{v.date}</td>
                    <td className="px-4 py-3 font-medium">{v.roomNumber}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate">{v.parentName}</td>
                    <td className="px-4 py-3 font-semibold max-w-[150px] truncate">{v.childName}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-cream-dark text-ink/60">{v.session}</span>
                    </td>
                    <td className="px-4 py-3 text-ink/60 whitespace-nowrap">{v.checkInTime || '—'}</td>
                    <td className="px-4 py-3 text-ink/60 whitespace-nowrap">{v.checkOutTime || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          v.status === 'checked-in'
                            ? 'status-in'
                            : v.status === 'checked-out'
                              ? 'status-out'
                              : 'status-pending'
                        }
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

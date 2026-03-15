import { useState, useEffect } from 'react';
import { Search, FileText, User, Phone, Mail, MapPin, Calendar, Shield, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { getAllRegistrations } from '../../lib/db';
import { Registration } from '../../types';

export default function Documents() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getAllRegistrations().then(data => {
      setRegistrations(data);
      setLoading(false);
    });
  }, []);

  const filtered = registrations.filter(r =>
    r.parentName.toLowerCase().includes(query.toLowerCase()) ||
    r.roomNumber.includes(query) ||
    r.children.some(c => c.name.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">Documents</h1>
          <p className="text-sm text-ink/40 mt-0.5">Parent registration forms</p>
        </div>
        <div className="badge bg-ink text-cream self-start">
          {registrations.length} {registrations.length === 1 ? 'registration' : 'registrations'}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 lg:mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
        <input
          type="text"
          className="input pl-11"
          placeholder="Search by parent name, room number or child name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Registration cards */}
      {loading ? (
        <div className="text-center py-12 text-ink/30">Loading registrations...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-ink/30">
          {query ? 'No registrations match your search' : 'No registrations yet'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reg => {
            const isExpanded = expandedId === reg.id;
            return (
              <div key={reg.id} className="card !p-0 overflow-hidden">
                {/* Header — always visible */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : reg.id!)}
                  className="w-full flex items-center gap-4 p-4 lg:p-5 text-left hover:bg-cream/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gold-light flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-ink">{reg.parentName}</h3>
                      <span className="badge bg-cream-dark text-ink/50 !text-[10px]">{reg.guestType}</span>
                    </div>
                    <p className="text-xs text-ink/40 mt-0.5">
                      Room {reg.roomNumber} · {reg.children.length} {reg.children.length === 1 ? 'child' : 'children'}
                      {reg.departureDate && ` · Departs ${reg.departureDate}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {reg.disclaimerSigned && (
                      <span className="status-in !text-[10px] hidden sm:inline-flex">Signed</span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-ink/30" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-ink/30" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-cream-dark px-4 lg:px-5 py-4 lg:py-5 space-y-5 bg-cream/20">
                    {/* Parent info */}
                    <div>
                      <p className="label mb-3">Parent / Guardian</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={reg.parentName} />
                        <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={reg.phone} />
                        {reg.email && <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={reg.email} />}
                        {reg.country && <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Country" value={reg.country} />}
                        <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Departure" value={reg.departureDate || '—'} />
                        <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Pickup" value={reg.pickupMethod} />
                      </div>
                    </div>

                    {/* Children */}
                    <div>
                      <p className="label mb-3">Children</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {reg.children.map((child, idx) => {
                          const colors = [
                            'bg-gold-light border-gold/20',
                            'bg-rose-light border-rose/20',
                            'bg-sky-light border-sky/20',
                            'bg-mint-light border-mint/20',
                            'bg-coral-light border-coral/20',
                            'bg-lavender-light border-lavender/20',
                          ];
                          return (
                            <div key={child.id} className={`rounded-2xl border-2 p-3 ${colors[idx % colors.length]}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-sm text-ink">{child.name}</span>
                                <span className="text-[10px] text-ink/40 font-medium">
                                  {child.gender === 'M' ? '♂' : '♀'} · {child.age} yrs
                                </span>
                              </div>
                              {child.birthdate && (
                                <p className="text-[11px] text-ink/40">Born: {child.birthdate}</p>
                              )}
                              {child.allergies && child.allergies !== 'N/A' && (
                                <div className="flex items-center gap-1 mt-1.5 text-xs text-coral font-semibold">
                                  <AlertCircle className="w-3 h-3" /> {child.allergies}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Security & preferences */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gold-light/50 rounded-2xl p-3">
                        <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-1">Security PIN</p>
                        <p className="font-bold text-sm text-ink/50">Encrypted</p>
                      </div>
                      {reg.parentPreferences && (
                        <div className="bg-lavender-light/50 rounded-2xl p-3">
                          <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-1">Preferences</p>
                          <p className="text-sm text-ink/70">{reg.parentPreferences}</p>
                        </div>
                      )}
                    </div>

                    {/* Signature */}
                    {reg.signature && (
                      <div>
                        <p className="label mb-3">Parent Signature</p>
                        <div className="bg-white rounded-2xl border-2 border-cream-dark p-3 inline-block">
                          <img src={reg.signature} alt="Parent signature" className="h-20 object-contain" />
                        </div>
                      </div>
                    )}

                    {/* Status row */}
                    <div className="flex flex-wrap gap-2">
                      <span className={reg.disclaimerSigned ? 'status-in' : 'status-pending'}>
                        {reg.disclaimerSigned ? 'Disclaimer signed' : 'Disclaimer not signed'}
                      </span>
                      <span className={reg.isFirstVisit ? 'badge bg-sky-light text-sky' : 'badge bg-cream-dark text-ink/40'}>
                        {reg.isFirstVisit ? 'First visit' : 'Returning guest'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2">
      <div className="text-ink/30">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-ink/30 font-medium">{label}</p>
        <p className="text-sm text-ink font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

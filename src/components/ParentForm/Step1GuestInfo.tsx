import { GuestType } from '../../types';

interface Props {
  data: {
    guestType: GuestType;
    roomNumber: string;
    parentName: string;
    phone: string;
    email: string;
    country: string;
  };
  onChange: (field: string, value: string) => void;
}

const GUEST_TYPES = [
  { value: 'Hotel', label: 'Hotel Guest', desc: 'Currently staying' },
  { value: 'Residence', label: 'Residence', desc: 'Long-term resident' },
  { value: 'Day Pass', label: 'Day Pass', desc: 'Day visitor' },
] as const;

const COUNTRIES = [
  'United Arab Emirates',
  'Poland',
  'Russia',
  'United Kingdom',
  'USA',
  'Germany',
  'France',
  'Netherlands',
  'Kyrgyzstan',
  'Kazakhstan',
  'Azerbaijan',
  'Ukraine',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Italy',
  'Spain',
  'China',
  'India',
  'Other',
];

export default function Step1GuestInfo({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label className="label">Guest Type</label>
        <div className="grid grid-cols-3 gap-2">
          {GUEST_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange('guestType', t.value)}
              className={`p-3 rounded-2xl border-2 text-left transition-all
                ${
                  data.guestType === t.value
                    ? 'border-ink bg-ink text-cream'
                    : 'border-cream-dark bg-white text-ink hover:border-ink/20'
                }`}
            >
              <div className="font-bold text-xs mb-0.5">{t.label}</div>
              <div
                className={`text-[10px] ${data.guestType === t.value ? 'text-cream/60' : 'text-ink/40'}`}
              >
                {t.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Room / Unit Number *</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. 530"
          value={data.roomNumber}
          onChange={e => onChange('roomNumber', e.target.value)}
        />
      </div>
      <div>
        <label className="label">Parent / Guardian Name *</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Ms. Anna Smith"
          value={data.parentName}
          onChange={e => onChange('parentName', e.target.value)}
        />
      </div>
      <div>
        <label className="label">Phone Number *</label>
        <input
          type="tel"
          className="input"
          placeholder="+971 50 000 0000"
          value={data.phone}
          onChange={e => onChange('phone', e.target.value)}
        />
      </div>
      <div>
        <label className="label">Email Address</label>
        <input
          type="email"
          className="input"
          placeholder="your@email.com"
          value={data.email}
          onChange={e => onChange('email', e.target.value)}
        />
      </div>
      <div>
        <label className="label">Country</label>
        <select
          className="select"
          value={data.country}
          onChange={e => onChange('country', e.target.value)}
        >
          <option value="">Select country...</option>
          {COUNTRIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

import { useRef } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { PickupMethod } from '../../types';

interface Props {
  data: {
    securityPin: string;
    pickupMethod: PickupMethod;
    parentPreferences: string;
    departureDate: string;
  };
  onChange: (field: string, value: string) => void;
}

const PICKUP_OPTIONS = [
  { value: 'with mom', label: 'Mom', emoji: '👩' },
  { value: 'with dad', label: 'Dad', emoji: '👨' },
  { value: 'with nanny', label: 'Nanny', emoji: '🧑‍🍼' },
  { value: 'with guardian', label: 'Guardian', emoji: '🧑' },
] as const;

export default function Step3Safety({ data, onChange }: Props) {
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePinInput = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const current = data.securityPin.split('');
    while (current.length < 4) current.push('');
    current[idx] = digit;
    onChange('securityPin', current.join(''));
    if (digit && idx < 3) pinRefs[idx + 1].current?.focus();
  };

  const handlePinKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !data.securityPin[idx] && idx > 0)
      pinRefs[idx - 1].current?.focus();
  };

  return (
    <div className="space-y-7">
      {/* PIN */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-ink" />
          </div>
          <div>
            <p className="font-bold text-sm">Security PIN</p>
            <p className="text-xs text-ink/50">Required at pickup — staff will verify</p>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map(idx => (
            <input
              key={idx}
              ref={pinRefs[idx]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="pin-digit"
              value={data.securityPin[idx] || ''}
              placeholder="·"
              onChange={e => handlePinInput(idx, e.target.value)}
              onKeyDown={e => handlePinKey(idx, e)}
            />
          ))}
        </div>

        {data.securityPin.length > 0 && data.securityPin.length < 4 && (
          <div className="flex items-center gap-1.5 mt-3 text-coral text-xs">
            <AlertCircle className="w-3.5 h-3.5" /> Please enter all 4 digits
          </div>
        )}

        <div className="mt-4 p-3 bg-gold-light rounded-2xl">
          <p className="text-xs text-ink/70 leading-relaxed">
            <strong>Important:</strong> Remember this PIN. Staff will ask for it when collecting your
            child.
          </p>
        </div>
      </div>

      {/* Pickup */}
      <div>
        <label className="label">Who will collect the child?</label>
        <div className="grid grid-cols-2 gap-2">
          {PICKUP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('pickupMethod', opt.value)}
              className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all
                ${
                  data.pickupMethod === opt.value
                    ? 'bg-ink border-ink text-cream'
                    : 'bg-white border-cream-dark text-ink'
                }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="font-semibold text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Departure */}
      <div>
        <label className="label">Departure Date</label>
        <input
          type="date"
          className="input"
          value={data.departureDate}
          onChange={e => onChange('departureDate', e.target.value)}
        />
      </div>

      {/* Preferences */}
      <div>
        <label className="label">Parent Preferences (optional)</label>
        <textarea
          className="input resize-none h-24"
          placeholder="e.g. No screen time, outdoor play, vegetarian snacks..."
          value={data.parentPreferences}
          onChange={e => onChange('parentPreferences', e.target.value)}
        />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { CheckCircle, User, Shield, Heart } from 'lucide-react';
import { Registration } from '../../types';
import SignaturePad from './SignaturePad';

interface Props {
  data: Registration;
  disclaimerSigned: boolean;
  onDisclaimerChange: (v: boolean) => void;
  onSignatureChange: (sig: string) => void;
}

export default function Step4Confirm({ data, disclaimerSigned, onDisclaimerChange, onSignatureChange }: Props) {
  const [pinVisible, setPinVisible] = useState(false);

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/60">Review your information before submitting.</p>

      {/* Guest summary */}
      <div className="card !p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-ink/40" />
          <span className="font-bold text-sm">Guest Information</span>
        </div>
        {(
          [
            ['Name', data.parentName],
            ['Room', `${data.guestType} · Room ${data.roomNumber}`],
            ['Phone', data.phone],
            ...(data.email ? [['Email', data.email]] : []),
            ['Country', data.country],
            ['Departure', data.departureDate || '—'],
            ['Pickup by', data.pickupMethod],
          ] as [string, string][]
        ).map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-ink/40 font-medium">{l}</span>
            <span className="text-ink font-semibold">{v}</span>
          </div>
        ))}
      </div>

      {/* Children */}
      <div className="card !p-5">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-rose" />
          <span className="font-bold text-sm">Children ({data.children.length})</span>
        </div>
        {data.children.map((child, idx) => (
          <div key={child.id} className="py-2 border-b border-cream-dark last:border-0">
            <div className="flex justify-between">
              <span className="font-semibold text-sm">{child.name || `Child ${idx + 1}`}</span>
              <span className="text-xs text-ink/40">
                {child.gender === 'M' ? 'Boy' : 'Girl'} · {child.age} yrs
              </span>
            </div>
            {child.allergies && child.allergies !== 'N/A' && (
              <div className="mt-1 text-xs text-coral font-medium">
                {"⚠"} {child.allergies}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PIN */}
      <div className="p-5 bg-gold-light border-2 border-gold/20 rounded-3xl">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-ink" />
          <span className="font-bold text-sm">Security PIN</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="w-10 h-11 bg-white border-2 border-gold/30 rounded-xl flex items-center justify-center text-lg font-bold"
              >
                {pinVisible ? data.securityPin[i] : '•'}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPinVisible(!pinVisible)}
            className="text-xs text-ink/50 hover:text-ink ml-2"
          >
            {pinVisible ? 'Hide' : 'Reveal'}
          </button>
        </div>
      </div>

      {/* Signature */}
      <div className="card !p-5">
        <SignaturePad value={data.signature} onChange={onSignatureChange} />
      </div>

      {/* Disclaimer */}
      <div className="card !p-5 space-y-4">
        <p className="text-xs text-ink/60 leading-relaxed">
          <strong className="text-ink">Disclaimer:</strong> I consent to my child participating in
          Kids Club activities. I confirm medical information is accurate. I understand staff will
          supervise my child and I am responsible for pickup at the agreed time. I release the hotel
          from liability for minor incidents during supervised play.
        </p>
        <button
          type="button"
          onClick={() => onDisclaimerChange(!disclaimerSigned)}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
            ${
              disclaimerSigned
                ? 'bg-mint-light border-mint/40'
                : 'bg-cream border-cream-dark hover:border-ink/20'
            }`}
        >
          <div
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0
            ${disclaimerSigned ? 'bg-mint border-mint' : 'border-ink/30'}`}
          >
            {disclaimerSigned && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
          <span className="text-sm font-semibold text-left">
            I have read and agree to the terms above
          </span>
        </button>
      </div>
    </div>
  );
}

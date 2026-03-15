import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useStaff } from '../../hooks/useStaff';

interface Props {
  onLogin: (name: string) => void;
}

export default function StaffLogin({ onLogin }: Props) {
  const { staff, loading } = useStaff();
  const [selected, setSelected] = useState('');

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="max-w-sm w-full animate-slide-up">
        <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <Shield className="w-8 h-8 text-ink" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white text-center mb-2">
          Staff Access
        </h1>
        <p className="text-white/40 text-sm text-center mb-8">Select your name to continue</p>

        <div className="space-y-2 mb-6">
          {loading ? (
            <p className="text-white/30 text-sm text-center">Loading...</p>
          ) : (
            staff
              .filter(s => s.active)
              .map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.name)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all
                  ${
                    selected === s.name
                      ? 'bg-gold border-gold text-ink'
                      : 'border-white/10 text-white hover:border-white/20 bg-white/5'
                  }`}
                >
                  {s.name}
                  <span className="text-xs font-normal ml-2 opacity-50">{s.role}</span>
                </button>
              ))
          )}
        </div>

        <button
          disabled={!selected}
          onClick={() => selected && onLogin(selected)}
          className="w-full bg-gold text-ink font-bold py-4 rounded-2xl disabled:opacity-30 transition-all active:scale-95"
        >
          Enter Staff Panel
        </button>
      </div>
    </div>
  );
}

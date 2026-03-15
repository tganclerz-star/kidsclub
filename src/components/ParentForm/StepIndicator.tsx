import { Check } from 'lucide-react';

const STEPS = ['Guest', 'Children', 'Safety', 'Confirm'];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 pb-4">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center gap-1">
            <div className={`flex flex-col items-center ${n < STEPS.length ? 'flex-1' : ''}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done ? 'bg-gold text-ink' : active ? 'bg-ink text-cream' : 'bg-cream-dark text-ink/30'}`}
              >
                {done ? <Check className="w-4 h-4" /> : n}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? 'text-ink' : 'text-ink/30'}`}>
                {label}
              </span>
            </div>
            {n < STEPS.length && (
              <div className={`h-px w-8 mb-4 mx-1 ${done ? 'bg-gold' : 'bg-cream-dark'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

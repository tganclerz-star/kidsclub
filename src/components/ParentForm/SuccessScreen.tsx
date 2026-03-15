import { CheckCircle } from 'lucide-react';

interface Props {
  pin: string;
  childrenCount: number;
  onReset: () => void;
}

export default function SuccessScreen({ pin, childrenCount, onReset }: Props) {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center max-w-sm w-full text-center animate-slide-up">
        <div className="w-20 h-20 bg-gold rounded-3xl flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-ink" />
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">All set!</h1>
        <p className="text-white/50 text-sm mb-8">
          {childrenCount === 1
            ? 'Your child has'
            : `Your ${childrenCount} children have`}{' '}
          been registered. Staff will check them in shortly.
        </p>

        {/* PIN reminder */}
        <div className="w-full bg-gold/10 border border-gold/20 rounded-3xl p-6 mb-6">
          <p className="text-gold text-xs font-semibold uppercase tracking-wide mb-3">
            Your Security PIN
          </p>
          {pin && pin.length === 4 ? (
            <>
              <div className="flex gap-3 justify-center mb-3">
                {pin.split('').map((d, i) => (
                  <div
                    key={i}
                    className="w-14 h-16 bg-gold rounded-2xl flex items-center justify-center text-2xl font-bold text-ink"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-xs">
                You will need this PIN when collecting your child. Please remember it.
              </p>
            </>
          ) : (
            <p className="text-white/50 text-sm">
              Use the same PIN you registered with to collect your child.
            </p>
          )}
        </div>

        <button
          onClick={onReset}
          className="w-full bg-white/10 text-white font-semibold py-4 rounded-2xl hover:bg-white/15 transition-all"
        >
          Register another child
        </button>
      </div>
    </div>
  );
}

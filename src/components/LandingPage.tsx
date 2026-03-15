import { Star, Shield, Users } from 'lucide-react';

export default function LandingPage() {
  const openInNewWindow = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-slide-up">
        <div className="w-20 h-20 bg-gold rounded-3xl flex items-center justify-center mb-8 shadow-glow">
          <Star className="w-10 h-10 text-ink" strokeWidth={2} />
        </div>
        <h1 className="font-display text-4xl text-white font-bold mb-2 text-center">Kids Club</h1>
        <p className="text-white/40 text-sm mb-12 text-center">Check-in &amp; management system</p>

        <div className="w-full space-y-3">
          <button
            onClick={() => openInNewWindow('/register')}
            className="w-full flex items-center justify-center gap-3 bg-gold text-ink font-bold py-4 rounded-2xl text-base hover:bg-yellow-300 transition-all active:scale-95"
          >
            <Users className="w-5 h-5" />
            Register my child
          </button>
          <button
            onClick={() => openInNewWindow('/staff')}
            className="w-full flex items-center justify-center gap-3 bg-white/10 text-white font-semibold py-4 rounded-2xl hover:bg-white/15 transition-all border border-white/10"
          >
            <Shield className="w-5 h-5" />
            Staff panel
          </button>
        </div>
        <p className="text-white/20 text-xs mt-10 text-center">Powered by ME Solutions</p>
      </div>
    </div>
  );
}

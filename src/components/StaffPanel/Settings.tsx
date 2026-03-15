import { useState } from 'react';
import { Clock, Shield, Users, Bell, Palette, Globe } from 'lucide-react';

export default function Settings() {
  const [sessions, setSessions] = useState({
    morning:   { start: '09:00', end: '13:00', enabled: true },
    afternoon: { start: '14:00', end: '16:30', enabled: true },
    evening:   { start: '16:30', end: '19:00', enabled: true },
  });
  const [maxChildren, setMaxChildren] = useState(30);
  const [requirePin, setRequirePin] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In production this would save to Firestore
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <div className="mb-6 lg:mb-8">
        <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink/40 mt-0.5">Configure Kids Club preferences</p>
      </div>

      <div className="space-y-6">
        {/* Session Times */}
        <SettingsSection
          icon={<Clock className="w-5 h-5 text-gold" />}
          title="Session Times"
          description="Configure daily session time windows"
        >
          {Object.entries(sessions).map(([key, session]) => {
            const colors: Record<string, string> = {
              morning: 'bg-gold-light border-gold/20',
              afternoon: 'bg-sky-light border-sky/20',
              evening: 'bg-lavender-light border-lavender/20',
            };
            return (
              <div key={key} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${colors[key]}`}>
                <label className="flex items-center gap-2 cursor-pointer min-w-[100px]">
                  <input
                    type="checkbox"
                    checked={session.enabled}
                    onChange={e => setSessions(prev => ({
                      ...prev,
                      [key]: { ...prev[key as keyof typeof prev], enabled: e.target.checked },
                    }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-semibold text-ink capitalize">{key}</span>
                </label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={session.start}
                    onChange={e => setSessions(prev => ({
                      ...prev,
                      [key]: { ...prev[key as keyof typeof prev], start: e.target.value },
                    }))}
                    className="input !w-auto !py-2 text-xs"
                    disabled={!session.enabled}
                  />
                  <span className="text-ink/30 text-xs">to</span>
                  <input
                    type="time"
                    value={session.end}
                    onChange={e => setSessions(prev => ({
                      ...prev,
                      [key]: { ...prev[key as keyof typeof prev], end: e.target.value },
                    }))}
                    className="input !w-auto !py-2 text-xs"
                    disabled={!session.enabled}
                  />
                </div>
              </div>
            );
          })}
        </SettingsSection>

        {/* Capacity */}
        <SettingsSection
          icon={<Users className="w-5 h-5 text-sky" />}
          title="Capacity"
          description="Maximum children per session"
        >
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={50}
              value={maxChildren}
              onChange={e => setMaxChildren(Number(e.target.value))}
              className="flex-1 accent-ink"
            />
            <div className="w-16 text-center">
              <span className="text-2xl font-bold font-display text-ink">{maxChildren}</span>
              <p className="text-[10px] text-ink/30">max kids</p>
            </div>
          </div>
        </SettingsSection>

        {/* Security */}
        <SettingsSection
          icon={<Shield className="w-5 h-5 text-mint" />}
          title="Security"
          description="PIN and checkout safety settings"
        >
          <ToggleRow
            label="Require PIN at checkout"
            description="Staff must verify parent's 4-digit PIN before releasing a child"
            enabled={requirePin}
            onChange={setRequirePin}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          icon={<Bell className="w-5 h-5 text-coral" />}
          title="Notifications"
          description="Alert preferences"
        >
          <ToggleRow
            label="Allergy alerts"
            description="Show prominent warnings for children with allergies"
            enabled={notifications}
            onChange={setNotifications}
          />
        </SettingsSection>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} className="btn-primary">
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-mint font-medium">Settings saved successfully</span>}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card !p-4 lg:!p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-cream-dark flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-sm text-ink">{title}</h3>
          <p className="text-[11px] text-ink/40">{description}</p>
        </div>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label, description, enabled, onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink/40">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-mint' : 'bg-cream-dark'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

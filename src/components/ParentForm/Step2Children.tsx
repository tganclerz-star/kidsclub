import { Plus, Trash2, User } from 'lucide-react';
import { differenceInYears } from 'date-fns';
import { Child, Gender } from '../../types';

interface Props {
  children: Child[];
  onChange: (c: Child[]) => void;
}

const CARD_COLORS = [
  'bg-gold-light border-gold/30',
  'bg-rose-light border-rose/30',
  'bg-sky-light border-sky/30',
  'bg-mint-light border-mint/30',
  'bg-coral-light border-coral/30',
  'bg-lavender-light border-lavender/30',
];

const genId = () => Math.random().toString(36).substr(2, 9);
const emptyChild = (): Child => ({
  id: genId(),
  name: '',
  age: 0,
  gender: 'M',
  birthdate: '',
  allergies: 'N/A',
});

export default function Step2Children({ children, onChange }: Props) {
  const add = () => children.length < 6 && onChange([...children, emptyChild()]);
  const remove = (id: string) => children.length > 1 && onChange(children.filter(c => c.id !== id));
  const update = (id: string, field: keyof Child, value: string | number) => {
    if (field === 'birthdate' && typeof value === 'string' && value) {
      const age = differenceInYears(new Date(), new Date(value));
      onChange(children.map(c => (c.id === id ? { ...c, birthdate: value, age: Math.max(0, age) } : c)));
    } else {
      onChange(children.map(c => (c.id === id ? { ...c, [field]: value } : c)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-ink/50">Add all children joining today</p>
        <button
          type="button"
          onClick={add}
          disabled={children.length >= 6}
          className="flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-ink/70 disabled:opacity-30"
        >
          <Plus className="w-4 h-4" /> Add child
        </button>
      </div>

      {children.map((child, idx) => (
        <div
          key={child.id}
          className={`rounded-3xl border-2 p-5 space-y-4 ${CARD_COLORS[idx % CARD_COLORS.length]}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-ink/10 rounded-xl flex items-center justify-center">
                <User className="w-4 h-4 text-ink/60" />
              </div>
              <span className="font-bold text-sm">Child {idx + 1}</span>
            </div>
            {children.length > 1 && (
              <button
                type="button"
                onClick={() => remove(child.id)}
                className="w-7 h-7 bg-ink/10 rounded-lg flex items-center justify-center hover:bg-ink/20"
              >
                <Trash2 className="w-3.5 h-3.5 text-ink/60" />
              </button>
            )}
          </div>

          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              className="input"
              placeholder="Child's name"
              value={child.name}
              onChange={e => update(child.id, 'name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gender</label>
              <div className="flex gap-2">
                {(['M', 'F'] as Gender[]).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update(child.id, 'gender', g)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                      ${
                        child.gender === g
                          ? 'bg-ink border-ink text-cream'
                          : 'bg-white border-ink/10 text-ink'
                      }`}
                  >
                    {g === 'M' ? '♂ Boy' : '♀ Girl'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Age</label>
              <div className="input flex items-center text-ink font-semibold bg-white/60">
                {child.birthdate ? `${child.age} yrs` : '—'}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Date of Birth</label>
            <input
              type="date"
              className="input"
              value={child.birthdate}
              onChange={e => update(child.id, 'birthdate', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Allergies / Medical Notes</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Nuts, Dairy — or N/A"
              value={child.allergies}
              onChange={e => update(child.id, 'allergies', e.target.value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

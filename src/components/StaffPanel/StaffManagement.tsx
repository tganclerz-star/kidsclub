import { useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { useStaff } from '../../hooks/useStaff';
import { addStaffMember, toggleStaffActive } from '../../lib/db';

interface Props {
  activeStaff: string;
}

export default function StaffManagement({ activeStaff }: Props) {
  const { staff, setStaff } = useStaff();
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Kids Club Staff');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const id = await addStaffMember({ name: newName.trim(), role: newRole, active: true });
    setStaff(prev => [...prev, { id, name: newName.trim(), role: newRole, active: true }]);
    setNewName('');
    setAdding(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await toggleStaffActive(id, !active);
    setStaff(prev => prev.map(s => (s.id === id ? { ...s, active: !active } : s)));
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <h1 className="font-display text-xl lg:text-2xl font-bold text-ink">Staff Management</h1>
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {adding && (
        <div className="card mb-4 space-y-3">
          <h3 className="font-bold text-sm">New Staff Member</h3>
          <input
            className="input"
            placeholder="Full name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Role"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-gold flex-1">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="btn-ghost flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {staff.map(s => (
          <div
            key={s.id}
            className={`flex items-center justify-between p-4 rounded-2xl transition-all
            ${s.active ? 'bg-white shadow-card' : 'bg-cream-dark opacity-60'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                ${s.name === activeStaff ? 'bg-gold text-ink' : 'bg-ink text-cream'}`}
              >
                {s.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {s.name}
                  {s.name === activeStaff && (
                    <span className="ml-2 text-xs text-gold font-medium">● You</span>
                  )}
                </p>
                <p className="text-xs text-ink/40">{s.role}</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(s.id!, s.active)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all
                ${
                  s.active
                    ? 'bg-cream-dark text-ink hover:bg-ink hover:text-cream'
                    : 'bg-mint-light text-mint hover:bg-mint hover:text-white'
                }`}
            >
              <Power className="w-3.5 h-3.5" />
              {s.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

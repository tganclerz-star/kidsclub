import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import Dashboard from './Dashboard';
import Schedule from './Schedule';
import LiveKids from './LiveKids';
import GuestDatabase from './GuestDatabase';
import StaffManagement from './StaffManagement';
import Activities from './Activities';
import Documents from './Documents';
import Shifts from './Shifts';
import Reports from './Reports';
import Settings from './Settings';
import StaffLogin from './StaffLogin';

export default function StaffPanel() {
  const [activeStaff, setActiveStaff] = useState<string | null>(
    localStorage.getItem('kc_activeStaff'),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogin = (name: string) => {
    localStorage.setItem('kc_activeStaff', name);
    setActiveStaff(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('kc_activeStaff');
    setActiveStaff(null);
  };

  if (!activeStaff) return <StaffLogin onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar
        activeStaff={activeStaff}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopHeader activeStaff={activeStaff} onMenuToggle={() => setSidebarOpen(true)} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<Dashboard activeStaff={activeStaff} />} />
            <Route path="schedule" element={<Schedule activeStaff={activeStaff} />} />
            <Route path="live" element={<LiveKids activeStaff={activeStaff} />} />
            <Route path="guests" element={<GuestDatabase />} />
            <Route path="activities" element={<Activities activeStaff={activeStaff} />} />
            <Route path="team" element={<StaffManagement activeStaff={activeStaff} />} />
            <Route path="shifts" element={<Shifts activeStaff={activeStaff} />} />
            <Route path="docs" element={<Documents />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/staff" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

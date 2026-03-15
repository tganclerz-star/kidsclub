import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Database,
  UserCog, Star, LogOut, FolderOpen, Settings,
  BarChart3, X, Clock, Palette,
} from 'lucide-react';

interface Props {
  activeStaff: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const GENERAL_NAV = [
  { label: 'Dashboard',  icon: LayoutDashboard, path: '/staff' },
  { label: 'Schedule',   icon: Calendar,        path: '/staff/schedule' },
  { label: 'Live Kids',  icon: Users,           path: '/staff/live' },
  { label: 'Guests',     icon: Database,        path: '/staff/guests' },
  { label: 'Activities', icon: Palette,         path: '/staff/activities' },
];

const TOOLS_NAV = [
  { label: 'Team',      icon: UserCog,    path: '/staff/team' },
  { label: 'Shifts',    icon: Clock,      path: '/staff/shifts' },
  { label: 'Documents', icon: FolderOpen, path: '/staff/docs' },
  { label: 'Reports',   icon: BarChart3,  path: '/staff/reports' },
  { label: 'Settings',  icon: Settings,   path: '/staff/settings' },
];

export default function Sidebar({ activeStaff, onLogout, open, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/staff' && location.pathname.startsWith(path));

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Overlay for tablet */}
      {open && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 xl:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed xl:static inset-y-0 left-0 z-50
        w-60 bg-ink flex flex-col py-6 px-3 flex-shrink-0
        transform transition-transform duration-200 ease-out
        xl:m-3 xl:h-[calc(100vh-24px)] xl:rounded-3xl
        h-full rounded-r-3xl xl:rounded-r-3xl
        ${open ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
      `}>
        {/* Logo + close button */}
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-8 h-8 bg-gold rounded-xl flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-ink" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-display font-bold text-sm leading-none">Kids Club</p>
            <p className="text-white/30 text-[10px] mt-0.5">Staff Panel</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-mint hidden xl:block" />
          <button onClick={onClose} className="xl:hidden w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* General section */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          <p className="sidebar-section-label">General</p>
          {GENERAL_NAV.map(item => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`sidebar-link w-full ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}

          <div className="pt-4">
            <p className="sidebar-section-label">Tools</p>
            {TOOLS_NAV.map(item => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`sidebar-link w-full ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Staff footer */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex items-center gap-2.5 px-3 mb-3">
            <div className="w-8 h-8 bg-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-bold text-xs">{activeStaff[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{activeStaff}</p>
              <p className="text-white/30 text-[10px]">On duty</p>
            </div>
          </div>
          <button onClick={onLogout} className="sidebar-link w-full text-white/30 hover:text-white/60">
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </div>
    </>
  );
}

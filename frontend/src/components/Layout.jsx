import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/participants', label: 'Participants', icon: '👥' },
  { to: '/wheel', label: 'Draw Wheel', icon: '🎡' },
  { to: '/winners', label: 'Winner History', icon: '🏆' },
  { to: '/groups', label: 'Groups', icon: '💬' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-slate-900 text-slate-200 md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-2xl">🎯</span>
          <div>
            <div className="text-sm font-bold text-white">LINE Lottery</div>
            <div className="text-xs text-slate-400">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-600 font-semibold text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-1 truncate text-sm font-medium text-white">{user?.display_name}</div>
          <div className="mb-3 text-xs text-slate-400">
            {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'} · {user?.username}
          </div>
          <button onClick={handleLogout} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700">
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:pl-60">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="font-bold text-slate-900">🎯 LINE Lottery</div>
          <button onClick={handleLogout} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs">
            ออกจากระบบ
          </button>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                  isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/participants', label: 'Participants', icon: '👥' },
  { to: '/wheel', label: 'Draw Wheel', icon: '🎡' },
  { to: '/winners', label: 'Winner History', icon: '🏆' },
  { to: '/groups', label: 'Groups', icon: '💬' },
  { to: '/slips', label: 'Verify Slips', icon: '🧾' },
  { to: '/transactions', label: 'รายการโอนเงิน', icon: '💰' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar (desktop & mobile slide-over) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform duration-300 md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-sm font-bold text-white">LINE Lottery</div>
              <div className="text-xs text-slate-400">Admin Panel</div>
            </div>
          </div>
          <button 
            className="text-slate-400 hover:text-white md:hidden"
            onClick={closeMobileMenu}
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-600 font-semibold text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-1 truncate text-sm font-medium text-white">{user?.display_name}</div>
          <div className="mb-3 text-xs text-slate-400">
            {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'} · {user?.username}
          </div>
          <button onClick={handleLogout} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors">
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
          <div className="flex items-center gap-3">
            <button 
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="font-bold text-slate-900 md:hidden">🎯 LINE Lottery</div>
          </div>
          <div className="flex items-center">
            <button onClick={handleLogout} className="hidden md:block rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
              ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

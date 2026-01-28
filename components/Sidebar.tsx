
import React from 'react';
import { User, UserRole } from '../types';

type View = 'dashboard' | 'pos' | 'orders' | 'inventory' | 'reps' | 'users' | 'profile';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, currentUser, onLogout }) => {
  if (!currentUser) return null;

  const navItems = [
    { id: 'dashboard', label: 'Хяналтын самбар', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'pos', label: 'Борлуулалт (POS)', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { id: 'orders', label: 'Захиалгууд', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { id: 'inventory', label: 'Бараа материал', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'reps', label: 'Борлуулагчид', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', restrictTo: [UserRole.ADMIN, UserRole.SALES_MANAGER] },
    { id: 'users', label: 'Хэрэглэгчид', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', restrictTo: [UserRole.ADMIN] },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.restrictTo && !item.restrictTo.includes(currentUser.role)) return false;
    return true;
  });

  return (
    <div className="h-full w-64 md:w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl">
      <div className="p-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">N</div>
          <span className="text-xl font-black tracking-tighter uppercase">NEO ERP</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onViewChange(item.id as View)}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
            </svg>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 mt-auto border-t border-slate-800/50 space-y-2">
        <button 
          type="button"
          onClick={() => onViewChange('profile')}
          className={`w-full flex items-center p-3 rounded-2xl transition-all ${
            currentView === 'profile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 mr-3 flex-shrink-0">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-black">
                {currentUser.username?.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-xs font-bold truncate">{currentUser.username}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{currentUser.role}</p>
          </div>
        </button>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onLogout();
          }}
          className="w-full flex items-center px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-2xl transition-all duration-200"
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Гарах
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

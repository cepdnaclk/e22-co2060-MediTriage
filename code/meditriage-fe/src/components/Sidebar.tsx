import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import ConfirmModal from './ui/ConfirmModal';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  queueCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, queueCount }) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number }>({ top: 0, height: 0 });

  const items = [
    {
      id: 'dashboard', label: 'Overview', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
      )
    },
    {
      id: 'queue', label: 'Patient Queue', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
      )
    },
    {
      id: 'history', label: 'History', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },
    {
      id: 'settings', label: 'Settings', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      )
    },
  ];

  // Sliding indicator position
  useEffect(() => {
    if (!navRef.current) return;
    const buttons = navRef.current.querySelectorAll('button');
    const idx = items.findIndex(i => i.id === activeTab);
    if (idx >= 0 && buttons[idx]) {
      const btn = buttons[idx] as HTMLElement;
      setIndicatorStyle({ top: btn.offsetTop, height: btn.offsetHeight });
    }
  }, [activeTab]);

  return (
    <>
      <aside
        className="w-72 bg-white flex flex-col fixed z-50 font-sans"
        style={{ margin: '20px', height: '-webkit-fill-available', borderRadius: '35px', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.05)' }}
      >
        <div style={{ height: '-webkit-fill-available', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="p-8" style={{ paddingTop: '40px' }}>
            <div className="flex items-center justify-center" style={{ marginBottom: '40px' }}>
              <img src="/assets/branding/MediTriage.png" alt="MediTriage" className="object-contain" style={{ height: '125px' }} />
            </div>

            <nav ref={navRef} className="relative" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Sliding active indicator */}
              <div
                className="absolute left-0 w-full rounded-[20px] bg-[#17406E] shadow-xl shadow-[#17406E]/10"
                style={{
                  top: indicatorStyle.top,
                  height: indicatorStyle.height,
                  transition: 'top 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s ease',
                  zIndex: 0,
                }}
              />
              {items.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-sm font-semibold rounded-[20px] transition-colors duration-200 group relative z-10 ${activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    {tab.icon}
                    {tab.label}
                  </div>
                  {tab.id === 'queue' && queueCount !== undefined && queueCount > 0 && (
                    <span className={`text-xs font-bold px-2 py-1 ${activeTab === tab.id ? 'text-white' : 'text-gray-600'}`} style={{ borderRadius: '50%', backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgb(231, 231, 231)' }}>{queueCount}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div style={{ borderTop: '1px solid #e1e1e1', margin: '2rem', padding: '0', paddingTop: '25px' }}>
            <div className="flex items-center" style={{ marginBottom: '30px', gap: '12px' }}>
              <img
                src={user.avatar || (user.role === UserRole.NURSE ? '/assets/images/Nurse.jpg' : '/assets/images/Doctor.jpg')}
                alt={user.name}
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #17406E', objectFit: 'cover' }}
              />
              <div className="flex-1 min-w-0" style={{ display: 'flex', gap: '3px', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                <p className="text-xs text-[#17406E] font-semibold capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center gap-3 text-gray-500 hover:text-red-500 transition-colors w-full"
              style={{ fontSize: '15px', fontWeight: 500, marginLeft: '4px', marginBottom: '5px' }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '21px', height: '21px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Log Out
            </button>
          </div>
        </div>
      </aside>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Confirm Logout"
        description="Are you sure you want to end your session?"
        confirmLabel="Log Out"
        onConfirm={onLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
};

export default Sidebar;
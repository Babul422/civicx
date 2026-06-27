import React from 'react';
import { Shield, Menu, X, Flame, Plus } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
}

export default function Navbar({ activeView, onNavigate, currentUser }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'report', label: 'Report', icon: '📷' },
    { id: 'dashboard', label: 'Issues', icon: '📋' },
    { id: 'impact', label: 'Impact', icon: '📊' },
    { id: 'authority', label: 'Authority', icon: '🔐' }
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    setIsOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-16 shadow-sm" id="main-navbar">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          
          {/* LEFT: Shield Icon & Logo */}
          <button
            onClick={() => onNavigate('map')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
            id="navbar-brand-logo"
          >
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Shield className="w-6 h-6 fill-blue-500/10" />
            </div>
            <div className="text-left font-sans text-xl tracking-tight">
              <span className="font-extrabold text-slate-900">Community</span>
              <span className="font-black text-blue-600 ml-1">Hero</span>
            </div>
          </button>

          {/* CENTER: Pill Navigation Tabs (Desktop only) */}
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-100 p-1 rounded-full" id="desktop-nav-pills">
            {navItems.map((item) => {
              const isActive = activeView === item.id || (item.id === 'map' && activeView === 'issue');
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id={`nav-pill-${item.id}`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* RIGHT: User Profile & Report Button */}
          <div className="flex items-center gap-4">
            {/* User Profile Info */}
            {currentUser && (
              <div className="hidden lg:flex items-center gap-2.5 border-r border-slate-100 pr-4" id="nav-user-stats">
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full border border-slate-100 bg-slate-50"
                />
                <div className="text-left font-sans">
                  <span className="text-xs font-bold text-slate-800 block -mb-0.5 leading-tight">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-amber-600 flex items-center">
                      <Flame className="w-3.5 h-3.5 fill-current mr-0.5" />
                      {currentUser.xp_points} XP
                    </span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded font-mono">
                      {currentUser.level}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* + Report Issue CTA */}
            <button
              onClick={() => onNavigate('report')}
              className="h-9 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-full px-4 py-2 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              id="navbar-cta-report"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Report Issue</span>
            </button>

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:outline-none cursor-pointer"
              id="navbar-mobile-toggle"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </nav>

      {/* MOBILE: Full-screen overlay menu */}
      {isOpen && (
        <div className="fixed inset-0 top-16 bg-white z-40 flex flex-col md:hidden animate-fade-in" id="navbar-mobile-menu">
          <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = activeView === item.id || (item.id === 'map' && activeView === 'issue');
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`flex items-center justify-between w-full h-14 px-4 rounded-2xl border-b border-slate-50 text-sm font-bold tracking-tight transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  id={`mobile-nav-pill-${item.id}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </span>
                  <span className="text-slate-400 font-mono text-xs">&rarr;</span>
                </button>
              );
            })}

            {currentUser && (
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3.5 mt-8 border border-slate-100">
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full border border-slate-200"
                />
                <div className="text-left font-sans">
                  <span className="text-sm font-bold text-slate-800 block">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-amber-600 flex items-center bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                      <Flame className="w-4 h-4 fill-current mr-0.5" />
                      {currentUser.xp_points} XP
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-lg font-mono">
                      {currentUser.level}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

import React from 'react';
import { Map, Camera, ClipboardList, BarChart3 } from 'lucide-react';

interface MobileNavProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export default function MobileNav({ activeView, onNavigate }: MobileNavProps) {
  const tabs = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'report', label: 'Report', icon: Camera, isPrimary: true },
    { id: 'dashboard', label: 'Issues', icon: ClipboardList },
    { id: 'impact', label: 'Impact', icon: BarChart3 }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 md:hidden pb-safe flex justify-around items-center h-16 shadow-lg" id="mobile-bottom-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id || (tab.id === 'map' && activeView === 'issue');

        if (tab.isPrimary) {
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className="relative flex flex-col items-center justify-center -mt-5"
              id="mobile-nav-report-btn"
            >
              <div className="w-13 h-13 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border-4 border-white">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 mt-1">Report</span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="flex flex-col items-center justify-center w-20 h-full text-[10px] font-semibold transition-all"
          >
            <div className={`p-1.5 transition-all ${isActive ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5" />
            </div>
            {isActive && (
              <span className="text-blue-600 font-bold tracking-tight animate-fade-in">
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

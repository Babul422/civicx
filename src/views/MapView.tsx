import React, { useEffect, useRef, useState } from 'react';
import { Issue } from '../types';
import { Filter, Award, ShieldAlert, CheckCircle, Flame } from 'lucide-react';

interface MapViewProps {
  issues: Issue[];
  onNavigateToIssue: (id: string) => void;
}

const ISSUE_TYPES = [
  { id: 'all', label: 'All Types' },
  { id: 'pothole', label: '🕳️ Potholes' },
  { id: 'waterlogging', label: '🌊 Flooding' },
  { id: 'broken_streetlight', label: '💡 Streetlights' },
  { id: 'garbage', label: '🗑️ Garbage' },
  { id: 'water_leakage', label: '💧 Water Leaks' },
  { id: 'damaged_footpath', label: '🚶 Broken Sidewalks' },
  { id: 'fallen_tree', label: '🌳 Fallen Trees' }
];

const STATUS_TYPES = [
  { id: 'all', label: 'All Statuses' },
  { id: 'open', label: '🔴 Open' },
  { id: 'in_progress', label: '🔵 In Progress' },
  { id: 'resolved', label: '✅ Resolved' }
];

const WARDS = [
  { id: 'all', label: 'All Wards' },
  { id: '151', label: 'Ward 151 (Koramangala)' },
  { id: '75', label: 'Ward 75 (Indiranagar)' },
  { id: '84', label: 'Ward 84 (Whitefield)' },
  { id: '184', label: 'Ward 184 (JP Nagar)' },
  { id: '170', label: 'Ward 170 (Jayanagar)' },
  { id: '174', label: 'Ward 174 (HSR Layout)' }
];

export default function MapView({ issues, onNavigateToIssue }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Filter States
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWard, setSelectedWard] = useState<string>('all');

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesType = selectedType === 'all' || issue.issue_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || issue.status === selectedStatus;
    const matchesWard = selectedWard === 'all' || issue.ward_number === parseInt(selectedWard, 10);
    return matchesType && matchesStatus && matchesWard;
  });

  // Calculate stats for bottom bar
  const criticalCount = issues.filter((i) => i.severity >= 8 && i.status !== 'resolved').length;
  const openCount = issues.filter((i) => i.status !== 'resolved').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;

  // Expose view detail to window for Leaflet popups
  useEffect(() => {
    (window as any).viewIssueDetail = (id: string) => {
      onNavigateToIssue(id);
    };
    return () => {
      delete (window as any).viewIssueDetail;
    };
  }, [onNavigateToIssue]);

  // Leaflet map initialization
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Centered on Bengaluru
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([12.9716, 77.5946], 12);

    mapInstanceRef.current = map;

    // Add Zoom controls to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Modern Voyager tile layer (trustworthy, neutral light style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers when filteredIssues changes
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add custom markers for filtered issues
    filteredIssues.forEach((issue) => {
      let color = '#3B82F6'; // Default Minor (blue)
      let size = 12;
      let symbol = '';

      if (issue.status === 'resolved') {
        color = '#10B981'; // Green for resolved
        size = 12;
        symbol = '✓';
      } else if (issue.severity >= 8) {
        color = '#EF4444'; // Red for Critical
        size = 16;
      } else if (issue.severity >= 5) {
        color = '#F59E0B'; // Amber for Moderate
        size = 14;
      }

      // Create a gorgeous custom HTML divIcon instead of standard circleMarker
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center rounded-full border-2 border-white shadow-md text-white font-extrabold transition-all duration-300 hover:scale-130 cursor-pointer" 
               style="background-color: ${color}; width: ${size + 4}px; height: ${size + 4}px; font-size: ${size - 2}px; line-height: 1;">
            ${symbol}
            ${issue.severity >= 8 && issue.status !== 'resolved' ? '<span class="absolute -inset-1 rounded-full border-2 border-red-500 animate-ping opacity-60"></span>' : ''}
          </div>
        `,
        className: 'custom-map-pin-div',
        iconSize: [size + 4, size + 4],
        iconAnchor: [(size + 4) / 2, (size + 4) / 2]
      });

      const marker = L.marker([issue.latitude, issue.longitude], { icon: customIcon });

      const popupContent = `
        <div class="w-[260px] bg-white rounded-2xl overflow-hidden flex flex-col font-sans border border-slate-100 shadow-xl">
          <div class="relative h-[130px] w-full bg-slate-50">
            <img src="${issue.photo_url}" alt="${issue.issue_type}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
          </div>
          <div class="p-4 space-y-3">
            <div class="flex flex-wrap gap-1.5">
              <span class="bg-slate-100 text-slate-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                ${issue.issue_type.replace(/_/g, ' ')}
              </span>
              <span class="${issue.severity >= 8 ? 'bg-red-50 text-red-700' : issue.severity >= 5 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'} text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Severity ${issue.severity}/10
              </span>
            </div>
            <h4 class="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
              ${issue.address_text}
            </h4>
            <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold pt-1">
              <span class="flex items-center gap-1">
                👍 ${issue.upvote_count} · Ward ${issue.ward_number}
              </span>
              <div class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full ${issue.status === 'resolved' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}"></span>
                <span class="capitalize font-bold">${issue.status.replace('_', ' ')}</span>
              </div>
            </div>
            <button 
              onclick="viewIssueDetail('${issue.id}')" 
              class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm text-center block mt-2"
            >
              View Details &rarr;
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        minWidth: 260
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Zoom and pan to fit markers if filters are applied
    if (markersRef.current.length > 0 && (selectedType !== 'all' || selectedStatus !== 'all' || selectedWard !== 'all')) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [filteredIssues, selectedType, selectedStatus, selectedWard]);

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden" id="map-view-root">
      
      {/* Floating Filter Pill Bar */}
      <div className="absolute top-4 left-4 right-4 z-[40] max-w-5xl mx-auto flex flex-col md:flex-row gap-3 items-center">
        <div className="w-full bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-100 p-2 flex items-center justify-between gap-4">
          
          {/* Category Chips scroll container */}
          <div className="flex-1 flex gap-1.5 overflow-x-auto hide-scrollbar px-2" id="filter-scroll-container">
            {ISSUE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`h-8 px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  selectedType === type.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Quick Select drop downs on desktop */}
          <div className="hidden sm:flex gap-2 pr-2" id="dropdowns-container">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
            >
              {STATUS_TYPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
            >
              {WARDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Fullscreen Leaflet Map */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full z-10 bg-slate-50" id="homepage-leaflet-map" />

      {/* Floating stats bar */}
      <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[40] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-4 w-[90%] max-w-xl flex justify-around items-center" id="floating-stats-pill">
        <div className="flex-1 text-center">
          <span className="text-xs font-bold text-red-600 block leading-tight">
            🔴 {criticalCount}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">Critical</span>
        </div>
        
        <div className="w-px h-8 bg-slate-100" />
        
        <div className="flex-1 text-center">
          <span className="text-xs font-bold text-amber-500 block leading-tight">
            🟡 {openCount}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">Active Open</span>
        </div>

        <div className="w-px h-8 bg-slate-100" />

        <div className="flex-1 text-center">
          <span className="text-xs font-bold text-emerald-600 block leading-tight">
            ✅ {resolvedCount}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">Resolved</span>
        </div>
      </div>

    </div>
  );
}

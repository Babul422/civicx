import React, { useState } from 'react';
import { Search, Grid, List, AlertTriangle, ArrowUpDown, Clock, ThumbsUp, Sparkles } from 'lucide-react';
import { Issue } from '../types';
import IssueCard from '../components/ui/IssueCard';

interface DashboardViewProps {
  issues: Issue[];
  onNavigateToIssue: (id: string) => void;
}

export default function DashboardView({ issues, onNavigateToIssue }: DashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'upvoted' | 'critical'>('latest');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const issueTypes = [
    { id: 'all', label: 'All Types', icon: '✨' },
    { id: 'pothole', label: 'Potholes', icon: '🕳️' },
    { id: 'waterlogging', label: 'Flooding', icon: '🌊' },
    { id: 'broken_streetlight', label: 'Streetlights', icon: '💡' },
    { id: 'garbage', label: 'Garbage', icon: '🗑️' },
    { id: 'water_leakage', label: 'Water Leaks', icon: '💧' },
    { id: 'damaged_footpath', label: 'Sidewalks', icon: '🚶' },
    { id: 'fallen_tree', label: 'Trees', icon: '🌳' }
  ];

  const statusTypes = [
    { id: 'all', label: 'All Statuses' },
    { id: 'open', label: '🔴 Open' },
    { id: 'in_progress', label: '🔵 In Progress' },
    { id: 'resolved', label: '✅ Resolved' }
  ];

  // Helper to count issues dynamically
  const getCategoryCount = (typeId: string) => {
    if (typeId === 'all') return issues.length;
    return issues.filter((i) => i.issue_type === typeId).length;
  };

  // Filters logic
  let filtered = issues.filter((issue) => {
    const matchesSearch =
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.address_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.issue_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || issue.issue_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || issue.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Sorting logic
  filtered.sort((a, b) => {
    if (sortBy === 'upvoted') {
      return b.upvote_count - a.upvote_count;
    }
    if (sortBy === 'critical') {
      return b.severity - a.severity;
    }
    // Default latest
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-28 font-sans" id="dashboard-view-root">
      
      {/* Page Title Block */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Public Issues Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Browse, monitor, and upvote hyperlocal municipal reports reported across Bengaluru wards.
          </p>
        </div>
        
        {/* Toggle sort options */}
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-full self-start" id="directory-sort-tabs">
          <button
            onClick={() => setSortBy('latest')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              sortBy === 'latest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ⏰ Latest
          </button>
          <button
            onClick={() => setSortBy('upvoted')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              sortBy === 'upvoted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🔥 Upvoted
          </button>
          <button
            onClick={() => setSortBy('critical')}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
              sortBy === 'critical' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ⚠️ Critical
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* LEFT COLUMN: Sidebar category selectors */}
        <div className="space-y-6 lg:sticky lg:top-24" id="sidebar-filters-column">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Categories
            </span>
            <div className="flex flex-col gap-1" id="category-filter-list">
              {issueTypes.map((type) => {
                const count = getCategoryCount(type.id);
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                    <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick status status card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Workflow Status
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-xs rounded-xl px-4 py-3 font-bold cursor-pointer focus:outline-none"
            >
              {statusTypes.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive main directory with search bar & toggle views */}
        <div className="lg:col-span-3 space-y-6" id="directory-main-column">
          
          {/* Action search box header */}
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Search className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by street name, landmark, ward or department..."
                className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold placeholder-slate-400"
              />
            </div>

            {/* Grid/List layout selector */}
            <div className="flex bg-slate-50 border border-slate-100 rounded-full p-1 self-stretch sm:self-auto" id="layout-toggle-container">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Layout"
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="List Layout"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>

          {/* Issue list results */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl py-16 px-6 text-center max-w-md mx-auto" id="empty-search-box">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <span className="font-extrabold text-slate-800 block text-lg tracking-tight">No Matching Reports</span>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                We couldn't find any civic reports matching your filters. Try selecting another category or clearing search keywords.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                  setSelectedStatus('all');
                }}
                className="mt-6 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold text-xs rounded-full transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}
              id="issues-cards-container"
            >
              {filtered.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  variant={viewMode}
                  onViewDetails={onNavigateToIssue}
                />
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

import React from 'react';
import { ThumbsUp, CheckSquare, Eye, ArrowRight } from 'lucide-react';
import { Issue } from '../../types';
import StatusBadge from './StatusBadge';
import SeverityBadge from './SeverityBadge';

interface IssueCardProps {
  key?: string | number;
  issue: Issue;
  variant?: 'grid' | 'list' | 'map-popup';
  onViewDetails?: (id: string) => void;
}

export function formatTimeAgo(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (isNaN(seconds)) return 'some time ago';
    if (seconds < 0) return 'just now';
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mins ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch (e) {
    return 'recently';
  }
}

export default function IssueCard({ issue, variant = 'grid', onViewDetails }: IssueCardProps) {
  const formattedType = issue.issue_type.replace(/_/g, ' ').toUpperCase();
  const timeAgoStr = formatTimeAgo(issue.created_at);

  if (variant === 'map-popup') {
    return (
      <div className="w-[260px] bg-white rounded-2xl overflow-hidden flex flex-col font-sans border border-slate-100 shadow-xl">
        <div className="relative h-[140px] w-full">
          <img
            src={issue.photo_url}
            alt={formattedType}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="p-4.5 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {issue.issue_type.replace(/_/g, ' ')}
            </span>
            <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Level {issue.severity}
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">
            {issue.address_text}
          </h4>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-slate-400" /> {issue.upvote_count}
            </span>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${issue.status === 'resolved' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
              <span className="capitalize font-semibold">{issue.status.replace('_', ' ')}</span>
            </div>
          </div>

          <button
            onClick={() => onViewDetails?.(issue.id)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5"
          >
            View Details <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
        {/* Photo Left */}
        <div className="w-28 h-24 md:w-32 md:h-24 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 bg-slate-50">
          <img
            src={issue.photo_url}
            alt={formattedType}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content Right */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {issue.issue_type.replace(/_/g, ' ')}
              </span>
              <SeverityBadge severity={issue.severity} />
            </div>
            
            <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-1">
              {issue.address_text}
            </h3>

            <p className="text-xs text-slate-400 font-medium">
              Ward {issue.ward_number} · <span className="font-mono">{timeAgoStr}</span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 mt-1">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                👍 {issue.upvote_count}
              </span>
              <span className="flex items-center gap-1">
                ✅ {issue.verification_count} verified
              </span>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={issue.status} />
              <button
                onClick={() => onViewDetails?.(issue.id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                View <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Grid variant
  return (
    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Photo header */}
      <div className="relative h-48 w-full bg-slate-50 overflow-hidden">
        <img
          src={issue.photo_url}
          alt={formattedType}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* badges absolute */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/95 backdrop-blur-sm shadow-sm text-[10px] font-extrabold text-slate-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {issue.issue_type.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <SeverityBadge severity={issue.severity} />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
            {issue.department}
          </span>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-1 mb-1">
            {issue.address_text}
          </h3>
          <p className="text-xs text-slate-500 font-medium font-mono mb-4">
            Ward {issue.ward_number} · {timeAgoStr}
          </p>
        </div>

        <div>
          <hr className="border-slate-100 my-3" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                👍 {issue.upvote_count}
              </span>
              <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                ✅ {issue.verification_count}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={issue.status} />
              <button
                onClick={() => onViewDetails?.(issue.id)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-xl border border-blue-100/50 transition-all cursor-pointer"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

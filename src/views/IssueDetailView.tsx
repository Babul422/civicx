import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Sparkles, Heart, CheckCircle2, AlertTriangle, Clock, MapPin, Twitter, Send, Check } from 'lucide-react';
import { Issue, User } from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import SeverityBadge from '../components/ui/SeverityBadge';
import { toast } from '../components/ui/Toast';

interface IssueDetailViewProps {
  issueId: string;
  currentUser: User | null;
  onBack: () => void;
  onRefreshIssues: () => void;
}

export default function IssueDetailView({ issueId, currentUser, onBack, onRefreshIssues }: IssueDetailViewProps) {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [photoViewMode, setPhotoViewMode] = useState<'reported' | 'resolved'>('reported');
  const [tweetUrlInput, setTweetUrlInput] = useState<string>('');

  const [hasUpvoted, setHasUpvoted] = useState<boolean>(false);
  const [hasVerified, setHasVerified] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [isUpvoteBouncing, setIsUpvoteBouncing] = useState<boolean>(false);

  const fetchIssue = async () => {
    try {
      const response = await fetch(`/api/issues/${issueId}`);
      if (!response.ok) {
        throw new Error('Issue not found');
      }
      const data = await response.json();
      setIssue(data);
      setTweetUrlInput(data.tweet_url || '');

      if (data.status === 'resolved' && data.resolved_photo_url) {
        setPhotoViewMode('resolved');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !miniMapRef.current || !issue) return;

    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }

    const map = L.map(miniMapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: false
    }).setView([issue.latitude, issue.longitude], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    let pinColor = '#EF4444';
    if (issue.status === 'resolved') pinColor = '#10B981';
    else if (issue.severity >= 5) pinColor = '#F97316';

    L.circleMarker([issue.latitude, issue.longitude], {
      radius: 12,
      fillColor: pinColor,
      color: '#FFFFFF',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map);

    miniMapInstanceRef.current = map;

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [issue]);

  const handleUpvote = async () => {
    if (!issue || actionLoading || hasUpvoted) return;
    setActionLoading(true);
    setIsUpvoteBouncing(true);
    setTimeout(() => setIsUpvoteBouncing(false), 300);

    try {
      const response = await fetch(`/api/issues/${issueId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id })
      });

      if (response.ok) {
        const updated = await response.json();
        setIssue(updated);
        setHasUpvoted(true);
        toast.success('Issue Upvoted!', 'Thank you for supporting this civic escalation.');
        onRefreshIssues();
      } else {
        const errData = await response.json();
        if (errData.error === 'Already upvoted') {
          setHasUpvoted(true);
        }
      }
    } catch (e) {
      console.error('Upvote failed:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!issue || actionLoading || hasVerified) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/issues/${issueId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id })
      });

      if (response.ok) {
        const updated = await response.json();
        setIssue(updated);
        setHasVerified(true);
        toast.success('Audit Verified!', '+10 XP added to your community score.');
        onRefreshIssues();
      } else {
        const errData = await response.json();
        if (errData.error === 'Already verified') {
          setHasVerified(true);
        }
      }
    } catch (e) {
      console.error('Verification failed:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTweetUrl = async () => {
    if (!issue || !tweetUrlInput.trim()) return;

    try {
      const response = await fetch(`/api/issues/${issueId}/tweet-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_url: tweetUrlInput })
      });

      if (response.ok) {
        const updated = await response.json();
        setIssue(updated);
        toast.success('Twitter Campaign Linked!', 'SLA urgency escalated successfully.');
        onRefreshIssues();
      }
    } catch (e) {
      console.error('Saving tweet URL failed:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]" id="loading-issue-details">
        <span className="border-4 border-blue-200 border-t-blue-600 rounded-full w-12 h-12 animate-spin block mb-4" />
        <span className="text-sm font-semibold text-slate-500 font-mono">Retrieving report details...</span>
      </div>
    );
  }

  if (errorMsg || !issue) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center" id="error-issue-details">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Issue Details Unretrievable</h2>
        <p className="text-sm text-slate-500 mt-1">{errorMsg || 'The issue you are looking for does not exist.'}</p>
        <button onClick={onBack} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer">
          &larr; Back to Map
        </button>
      </div>
    );
  }

  const slaDeadlineDate = new Date(issue.sla_deadline);
  const now = new Date();
  const timeDiff = slaDeadlineDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const isOverdue = daysDiff <= 0 && issue.status !== 'resolved';

  const reportedDateStr = new Date(issue.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(issue.ai_generated_tweet || '')}`;

  return (
    <div className="max-w-[720px] mx-auto px-6 py-8 pb-24 font-sans" id="issue-detail-root">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-xs mb-6 transition-all cursor-pointer group"
        id="back-to-map-btn"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Back to Map</span>
      </button>

      {/* Main Container */}
      <div className="space-y-6">

        {/* Big Header Photo Block */}
        <div className="relative h-[400px] w-full bg-slate-50 rounded-3xl overflow-hidden shadow-md group border border-slate-100" id="detail-image-box">
          <img
            src={photoViewMode === 'reported' ? issue.photo_url : issue.resolved_photo_url || issue.photo_url}
            alt="Report photo"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
            referrerPolicy="no-referrer"
          />
          {issue.status === 'resolved' && (
            <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/95 backdrop-blur-sm text-white font-extrabold text-sm py-3 px-6 text-center shadow-lg flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 fill-white/10 stroke-[2.5]" />
              Resolved by Bangalore Civic Authority
            </div>
          )}
        </div>

        {/* Side-by-Side Photo Comparison (Resolved showcase) */}
        {issue.status === 'resolved' && issue.resolved_photo_url && (
          <div className="grid grid-cols-2 gap-4" id="resolved-photo-showcase">
            <div className="relative h-[200px] rounded-2xl overflow-hidden border border-slate-100 shadow-sm group">
              <img src={issue.photo_url} alt="Before" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <span className="absolute top-3 left-3 bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md shadow tracking-wider">
                BEFORE
              </span>
            </div>
            <div className="relative h-[200px] rounded-2xl overflow-hidden border border-slate-100 shadow-sm group">
              <img src={issue.resolved_photo_url} alt="After" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <span className="absolute top-3 left-3 bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md shadow tracking-wider">
                AFTER
              </span>
            </div>
          </div>
        )}

        {/* Badges Layout Grid */}
        <div className="flex flex-wrap items-center gap-2.5 py-2">
          <span className="bg-slate-100 text-slate-800 text-xs font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider border border-slate-200">
            {issue.issue_type.replace(/_/g, ' ')}
          </span>
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
        </div>

        {/* Location & Address card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <MapPin className="w-6 h-6 fill-blue-500/10" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                {issue.address_text}
              </h2>
              <span className="text-xs text-slate-400 font-bold font-mono block mt-1">
                Ward {issue.ward_number} · Reported on {reportedDateStr}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 font-semibold leading-relaxed bg-slate-50 border border-slate-100/50 p-4.5 rounded-2xl">
            {issue.description || 'No extended description provided by reporter.'}
          </p>
        </div>

        {/* Action Panel for Upvote & Verification */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between" id="actions-panel">
          
          <div className="flex-1 w-full space-y-1 text-left">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Citizen Verification Audits</span>
            <p className="text-xs text-slate-500 leading-normal">
              Increase the trust score to automatically flag this issue to department ward officers.
            </p>
          </div>

          <div className="flex w-full md:w-auto items-center gap-3">
            {/* Upvote Button with Pop scale animation */}
            <button
              onClick={handleUpvote}
              disabled={hasUpvoted || actionLoading}
              style={{ transform: isUpvoteBouncing ? 'scale(1.15)' : 'scale(1)' }}
              className={`flex-1 md:flex-none h-12 px-5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                hasUpvoted
                  ? 'bg-blue-50 border border-blue-200 text-blue-600'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700'
              }`}
              id="upvote-action-btn"
            >
              <Heart className={`w-4 h-4 ${hasUpvoted ? 'fill-blue-500 text-blue-500' : 'text-slate-400'}`} />
              <span>{hasUpvoted ? 'Upvoted' : 'Upvote (+5 XP)'}</span>
              <span className="bg-white/90 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-slate-500">
                {issue.upvote_count}
              </span>
            </button>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={hasVerified || actionLoading}
              className={`flex-1 md:flex-none h-12 px-5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                hasVerified
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700'
              }`}
              id="verify-action-btn"
            >
              <CheckCircle2 className={`w-4 h-4 ${hasVerified ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>{hasVerified ? 'Verified' : 'Verify (+10 XP)'}</span>
              <span className="bg-white/90 border border-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-slate-500">
                {issue.verification_count}
              </span>
            </button>
          </div>

        </div>

        {/* SLA and mini-map metrics panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* SLA Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Service Level Target</span>
            
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-100 text-red-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block">
                  {issue.status === 'resolved' ? 'Resolved On Time' : isOverdue ? 'SLA Target Breached' : `SLA Target: ${daysDiff} Days Remaining`}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5 block">
                  Deadline: {new Date(issue.sla_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {isOverdue && (
              <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3 text-[10px] font-bold leading-normal flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Escalated priority to division executive engineer.</span>
              </div>
            )}
          </div>

          {/* Map mini card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm relative overflow-hidden h-[130px]" id="mini-map-box">
            <div ref={miniMapRef} className="absolute inset-0 z-10 w-full h-full" id="detail-mini-map" />
            <div className="absolute bottom-2 left-2 z-20 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border border-slate-100 text-slate-600">
              {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
            </div>
          </div>

        </div>

        {/* Twitter X Campaign Card */}
        <div className="bg-slate-900 border border-slate-950 rounded-3xl p-6 text-white shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-6 right-6 text-sky-400/20">
            <Twitter className="w-20 h-20 fill-current" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Twitter className="w-5 h-5 text-sky-400 fill-current" />
              <span className="text-xs font-bold uppercase tracking-widest font-mono text-slate-300">
                X Campaign Mobilization
              </span>
            </div>
            <span className="text-[9px] font-extrabold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg text-sky-400 font-mono">
              {issue.tweet_url ? 'OFFICIALLY LINKED' : 'READY TO ESCALATE'}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 relative z-10">
            <p className="text-xs font-medium font-mono text-slate-300 italic leading-relaxed">
              "{issue.ai_generated_tweet}"
            </p>
          </div>

          {!issue.tweet_url ? (
            <div className="space-y-4 pt-1 relative z-10">
              <a
                href={tweetIntentUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full h-11 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow shadow-sky-500/20"
              >
                <Twitter className="w-4 h-4 fill-current" />
                <span>Publish Escalation on X (Twitter)</span>
              </a>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Link Your Published Tweet URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tweetUrlInput}
                    onChange={(e) => setTweetUrlInput(e.target.value)}
                    placeholder="https://x.com/username/status/1234567..."
                    className="flex-1 h-10 bg-slate-950 border border-slate-800 text-xs rounded-xl px-3.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={handleSaveTweetUrl}
                    disabled={!tweetUrlInput.trim()}
                    className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Link URL
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2 relative z-10">
              <a
                href={issue.tweet_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:underline"
              >
                🌐 View Official Escalation Campaign on X (Twitter) &rarr;
              </a>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

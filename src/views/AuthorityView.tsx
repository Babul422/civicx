import React, { useState, useRef } from 'react';
import { ShieldCheck, AlertTriangle, Lock, Eye, Calendar, Clock, Filter, Sparkles, Check, Flame, ArrowRight, Shield } from 'lucide-react';
import { Issue, IssueStatus } from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import { toast } from '../components/ui/Toast';

interface AuthorityViewProps {
  issues: Issue[];
  onNavigateToIssue: (id: string) => void;
  onRefreshIssues: () => void;
}

export default function AuthorityView({ issues, onNavigateToIssue, onRefreshIssues }: AuthorityViewProps) {
  // Password auth state
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Filter and queue states
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('open_and_progress');

  // Resolution modal / action states
  const [actioningIssueId, setActioningIssueId] = useState<string | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<IssueStatus>('resolved');
  const [resolutionPhoto, setResolutionPhoto] = useState<File | null>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const depts = [
    { id: 'all', label: 'All Departments' },
    { id: 'BBMP', label: 'BBMP (Municipal Corp)' },
    { id: 'BESCOM', label: 'BESCOM (Electricity)' },
    { id: 'BWSSB', label: 'BWSSB (Water & Sewage)' }
  ];

  const statuses = [
    { id: 'open_and_progress', label: 'Active Worklist' },
    { id: 'resolved', label: 'Resolved Archive' },
    { id: 'all', label: 'All Reports' }
  ];

  // Auth Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setAuthError(null);
      toast.success('Access Granted', 'Logged in as Ward Authority Officer.');
    } else {
      setAuthError('Unauthorized: Invalid authority credential.');
      toast.error('Auth Failed', 'Invalid security pin.');
    }
  };

  // Priority Metric calculation
  const getPriorityScore = (issue: Issue) => {
    return issue.severity * Math.max(1, issue.upvote_count);
  };

  const checkIsOverdue = (issue: Issue) => {
    if (issue.status === 'resolved') return false;
    return new Date(issue.sla_deadline).getTime() < new Date().getTime();
  };

  // Filter & Queue issues
  const filteredQueue = issues.filter((issue) => {
    const matchesDept = selectedDept === 'all' || issue.department === selectedDept;
    
    let matchesStatus = true;
    if (selectedStatus === 'open_and_progress') {
      matchesStatus = issue.status === 'open' || issue.status === 'in_progress';
    } else if (selectedStatus === 'resolved') {
      matchesStatus = issue.status === 'resolved';
    }

    return matchesDept && matchesStatus;
  });

  filteredQueue.sort((a, b) => {
    return getPriorityScore(b) - getPriorityScore(a);
  });

  const handleUpdateStatus = async (issueId: string, nextStatus: IssueStatus) => {
    if (nextStatus === 'resolved') {
      setActioningIssueId(issueId);
      setResolutionStatus('resolved');
      setResolutionPhoto(null);
      setResolutionPreview(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          authority_password: 'admin123'
        })
      });

      if (response.ok) {
        toast.success('Status Updated', 'Worker deployed successfully.');
        onRefreshIssues();
      } else {
        toast.error('Error', 'Action unauthorized or server error.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResolutionPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolutionPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actioningIssueId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append('status', resolutionStatus);
    formData.append('authority_password', 'admin123');
    if (resolutionPhoto) {
      formData.append('resolved_photo', resolutionPhoto);
    }

    try {
      const response = await fetch(`/api/issues/${actioningIssueId}/status`, {
        method: 'PATCH',
        body: formData
      });

      if (response.ok) {
        setActioningIssueId(null);
        setResolutionPhoto(null);
        setResolutionPreview(null);
        toast.success('Issue Resolved!', 'Proof photo linked and XP points distributed.');
        onRefreshIssues();
      } else {
        const d = await response.json();
        setSubmitError(d.error || 'Failed to update status.');
      }
    } catch (err) {
      setSubmitError('Network failure occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Standard locked login form
  if (!isAuthenticated) {
    return (
      <div className="max-w-[420px] mx-auto px-6 py-16 text-center font-sans" id="authority-login-root">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
            <Shield className="w-8 h-8 fill-blue-500/10" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
              Municipal Officer Ingress
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              BBMP, BESCOM, and BWSSB official credentials verification portal.
            </p>
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl py-2.5 px-3.5 text-rose-800 text-xs font-bold leading-normal">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold tracking-widest text-sm text-slate-800"
            />
            <button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-98 text-white font-extrabold rounded-full transition-all cursor-pointer text-xs shadow-md"
            >
              🔓 Login as Authority
            </button>
          </form>

          <p className="text-[10px] text-slate-400 font-mono font-bold">
            Development credentials PIN: <span className="font-extrabold text-blue-600">admin123</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-28 font-sans" id="authority-workspace-root">
      
      {/* Workspace Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display flex items-center">
            <ShieldCheck className="text-blue-600 mr-2 w-8 h-8 fill-blue-500/10" />
            Authority Action Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Real-time critical routing worklist sorted by citizen-votes x severity priority indices.
          </p>
        </div>

        {/* Lock Session */}
        <button
          onClick={() => {
            setIsAuthenticated(false);
            setPassword('');
            toast.info('Session Terminated', 'Console locked safely.');
          }}
          className="bg-slate-50 border border-slate-200 text-slate-600 font-extrabold px-4 py-2 rounded-xl text-xs hover:bg-slate-100 transition-colors cursor-pointer self-start shadow-sm"
        >
          🔒 Lock Console
        </button>
      </div>

      {/* Bento Controls Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Control Panel */}
        <div className="space-y-6 lg:sticky lg:top-24" id="filters-left-panel">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Worklist Controls
            </span>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-bold cursor-pointer focus:outline-none"
                >
                  {depts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Queue Scope
                </label>
                <div className="flex flex-col gap-1.5" id="queue-status-filters">
                  {statuses.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStatus(s.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedStatus === s.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right workspace Action List Table */}
        <div className="lg:col-span-3 space-y-6" id="workspace-right-panel">
          
          {filteredQueue.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl py-16 px-6 text-center max-w-sm mx-auto" id="empty-queue-box">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="font-extrabold text-slate-800 block text-lg tracking-tight">All Clear!</span>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                No active pending reports filed under your current queue parameters. Great job!
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden" id="authority-queue-table">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-4 px-5">Priority Index</th>
                      <th className="py-4 px-5">Civic Problem</th>
                      <th className="py-4 px-5">Target SLA</th>
                      <th className="py-4 px-5">Location</th>
                      <th className="py-4 px-5">Department Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredQueue.map((issue) => {
                      const isOverdue = checkIsOverdue(issue);
                      const score = getPriorityScore(issue);

                      return (
                        <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors" id={`queue-row-${issue.id}`}>
                          {/* Priority Score badge */}
                          <td className="py-4 px-5 font-mono">
                            <span className="bg-blue-50 border border-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-xl text-xs">
                              🔥 {score}
                            </span>
                          </td>

                          {/* Problem details */}
                          <td className="py-4 px-5">
                            <div className="flex items-center space-x-3.5 max-w-xs">
                              <img
                                src={issue.photo_url}
                                alt="thumbnail"
                                className="w-14 h-11 object-cover rounded-xl border border-slate-100 flex-shrink-0 bg-slate-50"
                                referrerPolicy="no-referrer"
                              />
                              <div className="text-left">
                                <span className="font-extrabold text-slate-800 block leading-tight">
                                  {issue.issue_type.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5 block">Report #{issue.id.substring(0, 8)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Target SLA Deadline */}
                          <td className="py-4 px-5 font-mono font-bold">
                            {issue.status === 'resolved' ? (
                              <span className="text-emerald-600">SLA Closed</span>
                            ) : isOverdue ? (
                              <span className="bg-red-50 border border-red-100 text-red-600 px-2 py-0.5 rounded-lg text-[9px]">
                                ⚠️ SLA BREACHED
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                {new Date(issue.sla_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </td>

                          {/* Location text */}
                          <td className="py-4 px-5 text-slate-500 font-bold max-w-[140px] truncate">
                            {issue.address_text}
                          </td>

                          {/* Current Status Badge */}
                          <td className="py-4 px-5">
                            <StatusBadge status={issue.status} />
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onNavigateToIssue(issue.id)}
                                className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-2 rounded-xl border border-slate-200/50 transition-all cursor-pointer"
                                title="View Public Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {issue.status !== 'resolved' && (
                                <>
                                  {issue.status === 'open' && (
                                    <button
                                      onClick={() => handleUpdateStatus(issue.id, 'in_progress')}
                                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-3 py-2 rounded-xl border border-amber-200 transition-all text-[10px] cursor-pointer"
                                    >
                                      🛠️ Deploy Worker
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUpdateStatus(issue.id, 'resolved')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-2 rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                                  >
                                    ✨ Resolve Issue
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Resolution Photo Modal Popup Overlay */}
      {actioningIssueId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="resolution-photo-modal">
          <div className="bg-white border border-slate-100 rounded-[30px] p-6 shadow-2xl max-w-md w-full space-y-5 animate-scale-up">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-1.5">
                <Sparkles className="text-emerald-600 w-5.5 h-5.5" />
                Upload Repair Verification Photo
              </h2>
              <p className="text-xs text-slate-400 mt-1">Provide clear visual proof that the reported municipal issue has been repaired.</p>
            </div>

            {submitError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-800 text-xs font-bold leading-normal">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={submitResolution} className="space-y-4">
              {/* Photo Upload dropzone */}
              {!resolutionPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 p-6 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center h-48"
                >
                  <ShieldCheck className="w-10 h-10 text-emerald-600 mb-2 animate-bounce-slow" />
                  <span className="text-sm font-bold text-slate-700 block">Select Proof Photo</span>
                  <span className="text-[10px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                    Proof photo of repaired sidewalk lane, streetlight filament, trash cleared zone, etc.
                  </span>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 h-48">
                  <img src={resolutionPreview} alt="Proof preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setResolutionPhoto(null);
                      setResolutionPreview(null);
                    }}
                    className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-all cursor-pointer"
                  >
                    Change Photo
                  </button>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActioningIssueId(null);
                    setResolutionPhoto(null);
                    setResolutionPreview(null);
                  }}
                  className="flex-1 h-11 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-full text-xs transition-colors cursor-pointer border border-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !resolutionPhoto}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-full text-xs transition-all cursor-pointer shadow shadow-emerald-500/10 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Proof...' : 'Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

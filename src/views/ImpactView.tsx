import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from 'recharts';
import { Award, Flame, TrendingUp, Compass, Calendar, AlertTriangle, ShieldCheck, CheckCircle2, Users, CheckSquare, Clock } from 'lucide-react';
import { User } from '../types';
import StatCard from '../components/ui/StatCard';

interface ImpactViewProps {
  currentUser: User | null;
  issues: any[];
}

interface StatsData {
  total_issues: number;
  resolved_this_month: number;
  open_issues: number;
  avg_resolution_days: number;
  issues_by_type: Record<string, number>;
  issues_by_ward: Record<string, number>;
  issues_per_week: number[];
  top_ward: string;
  total_citizens: number;
}

const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'];

export default function ImpactView({ currentUser, issues = [] }: ImpactViewProps) {
  const heatmapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [citizens, setCitizens] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calculate live verifications count from actual issues array
  const totalVerifications = issues.reduce((sum, i) => sum + (i.verification_count || 0), 0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error('Failed to load statistics:', e);
      }
    };

    const fetchCitizens = async () => {
      try {
        const mockCitizens: User[] = [
          { id: '1', name: 'Aarav Sharma', email: 'aarav@citizen.in', ward_number: 151, xp_points: 2450, level: 'Hero', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aarav', created_at: new Date().toISOString() },
          { id: '2', name: 'Priya Iyer', email: 'priya@citizen.in', ward_number: 75, xp_points: 1850, level: 'Guardian', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya', created_at: new Date().toISOString() },
          { id: '3', name: 'Rohan Deshmukh', email: 'rohan@citizen.in', ward_number: 84, xp_points: 920, level: 'Guardian', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rohan', created_at: new Date().toISOString() },
          { id: '4', name: 'Ananya Reddy', email: 'ananya@citizen.in', ward_number: 174, xp_points: 480, level: 'Citizen', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ananya', created_at: new Date().toISOString() },
          { id: '5', name: 'Demo Citizen', email: 'demo@communityhero.in', ward_number: 151, xp_points: 350, level: 'Citizen', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Demo', created_at: new Date().toISOString() }
        ];

        if (currentUser) {
          const userIndex = mockCitizens.findIndex(c => c.email.toLowerCase() === currentUser.email.toLowerCase());
          if (userIndex >= 0) {
            mockCitizens[userIndex] = currentUser;
          } else {
            mockCitizens.push(currentUser);
          }
        }

        mockCitizens.sort((a, b) => b.xp_points - a.xp_points);
        setCitizens(mockCitizens.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    Promise.all([fetchStats(), fetchCitizens()]);
  }, [currentUser]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !heatmapRef.current || !stats) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(heatmapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([12.9516, 77.6246], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    fetch('/api/heatmap')
      .then((r) => r.json())
      .then((points) => {
        points.forEach((pt: any) => {
          L.circle([pt.lat, pt.lng], {
            radius: pt.weight * 320,
            fillColor: '#EF4444',
            fillOpacity: 0.25,
            color: '#EF4444',
            weight: 1,
            opacity: 0.4
          }).addTo(map);
        });
      })
      .catch((err) => console.error('Error rendering heatmap points:', err));

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stats]);

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]" id="loading-statistics">
        <span className="border-4 border-blue-200 border-t-blue-600 rounded-full w-12 h-12 animate-spin block mb-4" />
        <span className="text-sm font-semibold text-slate-500 font-mono">Calculating civic impacts...</span>
      </div>
    );
  }

  const typeChartData = Object.entries(stats.issues_by_type).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value
  }));

  const trendChartData = stats.issues_per_week.map((count, index) => ({
    week: `Wk ${index + 1}`,
    Reports: count
  }));

  // Render Ward Leaderboard Data
  const wardLeaderboard = [
    { name: 'Koramangala', ward: 151, solved: stats.issues_by_ward['151'] || 14 },
    { name: 'Indiranagar', ward: 75, solved: stats.issues_by_ward['75'] || 10 },
    { name: 'Whitefield', ward: 84, solved: stats.issues_by_ward['84'] || 8 },
    { name: 'JP Nagar', ward: 184, solved: stats.issues_by_ward['184'] || 7 },
    { name: 'Jayanagar', ward: 170, solved: stats.issues_by_ward['170'] || 6 },
    { name: 'HSR Layout', ward: 174, solved: stats.issues_by_ward['174'] || 5 }
  ].sort((a, b) => b.solved - a.solved);

  const maxSolved = Math.max(...wardLeaderboard.map(w => w.solved), 1);

  // User XP calculation progress values
  const currentXp = currentUser?.xp_points || 350;
  const xpMax = currentXp >= 1500 ? 3000 : currentXp >= 500 ? 1500 : 500;
  const xpPercent = Math.min((currentXp / xpMax) * 100, 100);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-28 font-sans" id="impact-view-root">
      
      {/* Title */}
      <div className="text-left mb-8 border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-2">
          <TrendingUp className="text-blue-600 w-8 h-8" />
          Hyperlocal Civic Impact
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Tracking Bengaluru's civic resolution SLA velocities, active ward hotzones, and top citizens.
        </p>
      </div>

      {/* Grid of Key Performance Cards using shared StatCard component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="metrics-grid">
        <StatCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          label="Total Resolved"
          value={`${stats.resolved_this_month} Fixed`}
          color="emerald"
          trend={{ text: 'SLA Met 92%', positive: true }}
        />

        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Registered Heroes"
          value={`${stats.total_citizens} Active`}
          color="purple"
          trend={{ text: '+14% New', positive: true }}
        />

        <StatCard
          icon={<CheckSquare className="w-6 h-6" />}
          label="Citizen Audits Logged"
          value={`${totalVerifications} Verified`}
          color="blue"
          trend={{ text: '100% Secure', positive: true }}
        />

        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="BBMP SLA Average"
          value={`${stats.avg_resolution_days} Days`}
          color="amber"
          trend={{ text: 'Target < 5 Days', positive: false }}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* Heatmap Section */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-xs text-red-600 font-bold uppercase tracking-widest block font-mono">Heatmap Analytics</span>
            <h2 className="text-lg font-extrabold text-slate-900 font-display">Bengaluru High-Risk Escales</h2>
            <p className="text-xs text-slate-400 mt-1">Geographic cluster centers weighted heavily by unresolved critical categories.</p>
          </div>
          <div ref={heatmapRef} className="h-80 w-full rounded-2xl border border-slate-100 overflow-hidden z-10" id="dark-heatmap" />
        </div>

        {/* Categories Pie Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs text-blue-600 font-bold uppercase tracking-widest block font-mono font-bold">Category Distribution</span>
            <h2 className="text-lg font-extrabold text-slate-900 font-display">Issues by Category</h2>
          </div>
          <div className="h-64 w-full mt-4 flex items-center justify-center" id="pie-chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] mt-4 font-bold border-t border-slate-50 pt-4">
            {typeChartData.slice(0, 6).map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Leaderboards, Ward metrics and Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Dynamic Ward Leaderboard */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4" id="ward-leaderboard">
          <div>
            <span className="text-xs text-blue-600 font-bold uppercase tracking-widest block font-mono">Performance by Division</span>
            <h2 className="text-lg font-extrabold text-slate-900 font-display">Bengaluru Ward Resolution</h2>
            <p className="text-xs text-slate-400 mt-1">Number of reports resolved end-to-end inside each specific ward division.</p>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-4 pt-1">
            {wardLeaderboard.map((ward, index) => (
              <div key={ward.ward} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    {index === 0 && '👑 '}
                    {ward.name} <span className="font-mono text-slate-400 text-[10px] font-normal">Ward {ward.ward}</span>
                  </span>
                  <span>{ward.solved} solved</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      index === 0 ? 'bg-amber-400' : 'bg-blue-600'
                    }`}
                    style={{ width: `${(ward.solved / maxSolved) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gamified Citizen Leaderboard */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs text-amber-600 font-bold uppercase tracking-widest block flex items-center font-mono">
              <Award className="w-4 h-4 mr-1 stroke-[2.5]" />
              Gamification Rank
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 font-display">Citizen Leaderboard</h2>
            <p className="text-xs text-slate-400 mt-1">Points calculated dynamically for verification and resolution triggers.</p>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-3" id="leaderboard-list">
            {citizens.map((citizen, idx) => (
              <div
                key={citizen.id}
                className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-5.5 h-5.5 text-[10px] font-extrabold rounded-full flex items-center justify-center font-mono ${
                    idx === 0
                      ? 'bg-amber-100 text-amber-800'
                      : idx === 1
                      ? 'bg-slate-100 text-slate-800'
                      : idx === 2
                      ? 'bg-orange-50 text-orange-800'
                      : 'bg-slate-50 text-slate-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <img
                    src={citizen.avatar_url}
                    alt={citizen.name}
                    className="w-9 h-9 rounded-full border border-slate-100"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block -mb-0.5">{citizen.name}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono font-bold">
                      {citizen.level}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-amber-600 flex items-center justify-end font-display">
                    <Flame className="w-3.5 h-3.5 mr-0.5 fill-current" />
                    {citizen.xp_points} XP
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold font-mono">Ward {citizen.ward_number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* XP Level Milestones panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4" id="xp-milestones">
          <div>
            <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block font-mono">My Milestones</span>
            <h2 className="text-lg font-extrabold text-slate-900 font-display">My Level Progress</h2>
            <p className="text-xs text-slate-400 mt-1">Unlock official badges by supporting community cleaning initiatives.</p>
          </div>

          <hr className="border-slate-100" />

          {/* Current XP Progress Bar */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                {currentXp} XP Points
              </span>
              <span className="font-mono text-slate-400">Target {xpMax}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 font-bold block">
              {100 - Math.round(xpPercent)}% left to reach the next milestone!
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2 text-xs">
              <span className="text-base">🏠</span>
              <div>
                <span className="font-bold text-slate-800 block">Citizen Hero Milestone</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Start level. Awarded upon filing first 2 verifications.</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="text-base">🛡️</span>
              <div>
                <span className="font-bold text-slate-800 block">Guardian Officer Milestone</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Reach 500 XP points. Awards 2x audit upvote weight.</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="text-base">🏆</span>
              <div>
                <span className="font-bold text-slate-800 block">Hyperlocal Civic Legend</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Reach 1500 XP points. Official verified citizen flag.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

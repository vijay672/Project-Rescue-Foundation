import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { 
  CheckCircle, 
  Clock, 
  Users, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight, 
  MapPin, 
  ShieldAlert,
  Calendar,
  UserCheck,
  UserX,
  Mail,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import type { Activity, DashboardMetrics, Region, User } from '../../types';
import { api } from '../../services/api';

interface ManagerOverviewProps {
  metrics: DashboardMetrics | null;
  activities: Activity[];
  regions: Region[];
  onSelectTab: (tab: string) => void;
  onSelectActivity: (activity: Activity) => void;
  currentUser?: User;
}

export const ManagerOverview: React.FC<ManagerOverviewProps> = ({
  metrics,
  activities,
  regions,
  onSelectTab,
  onSelectActivity,
  currentUser,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Pending user registrations awaiting manager approval
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setIsLoadingPending(true);
    try {
      const data = await api.getPendingUsers();
      setPendingUsers(data);
    } catch (e) {
      console.warn('Failed to fetch pending user registrations:', e);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      const res = await api.approveUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setActionNotice(res.message || 'Account approved! Acceptance email confirmation sent to user.');
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice(`Approval error: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setApprovingId(userId);
    try {
      const res = await api.rejectUser(userId, 'Registration credentials could not be verified by Operations Management.');
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setActionNotice(res.message || 'Registration request declined.');
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice(`Action error: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    if (!chartRef.current || !metrics) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#17252B',
        borderColor: '#17252B',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: '{b}: {c} verified field reports',
      },
      grid: {
        top: 20,
        right: 15,
        bottom: 25,
        left: 30,
      },
      xAxis: {
        type: 'category',
        data: metrics.dailyTrend.map((d) => d.date),
        axisLine: { lineStyle: { color: '#E4E9E7' } },
        axisLabel: { color: '#64737A', fontSize: 11, fontFamily: 'Plus Jakarta Sans' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F0F3F2' } },
        axisLabel: { color: '#64737A', fontSize: 11, fontFamily: 'JetBrains Mono' },
      },
      series: [
        {
          data: metrics.dailyTrend.map((d) => d.count),
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: { color: '#176B68', width: 3 },
          itemStyle: { color: '#176B68' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(23, 107, 104, 0.25)' },
              { offset: 1, color: 'rgba(23, 107, 104, 0.0)' },
            ]),
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [metrics]);

  const urgentReviews = activities.filter((a) => a.status === 'under_review').slice(0, 4);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Editorial Title Banner with Personalized Greeting (Requirement 7) */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#176B68] tracking-wide uppercase">
              Operational Command · Regional Operations Bureau
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17252B] mt-1">
              Hi {currentUser?.name?.split(' ')[0] || 'Manager'} 👋
            </h1>
            <p className="text-xs text-[#64737A] mt-0.5">
              Live multi-region intake monitoring, reporting compliance, and caseworker registration governance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('manager_activities')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Open Review Queue
            </button>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-[#247A58]/10 border border-[#247A58]/30 text-xs font-medium text-[#247A58] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Requirement 5 & 6: Pending Caseworker Registration Approvals Section */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E9E7]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#17252B]">
                Pending Account Approvals & Access Requests
              </h2>
              {pendingUsers.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B7791F]/15 text-[#B7791F] border border-[#B7791F]/30 animate-pulse">
                  {pendingUsers.length} Action Needed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#247A58]/10 text-[#247A58] border border-[#247A58]/20">
                  All Approved
                </span>
              )}
            </div>
            <p className="text-xs text-[#64737A] mt-0.5">
              New registrations require manager acceptance before users can sign in. Approving dispatches an official confirmation email from your manager address ({currentUser?.email || 'your organization administrator'}).
            </p>
          </div>

          <button
            onClick={loadPendingUsers}
            disabled={isLoadingPending}
            className="text-xs font-semibold text-[#176B68] hover:underline cursor-pointer"
          >
            Refresh Requests
          </button>
        </div>

        {pendingUsers.length > 0 ? (
          <div className="divide-y divide-[#E4E9E7]">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8F6] px-3 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#17252B]">{user.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#176B68]/10 text-[#176B68] font-semibold border border-[#176B68]/20 uppercase">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64737A] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[#17252B]">{user.email}</span>
                    <span aria-hidden="true">·</span>
                    <span>Requested: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-[#64737A]">
                      <Smartphone className="w-3 h-3 text-[#176B68]" />
                      {user.deviceInfo || 'Client Device'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={approvingId === user.id}
                    className="px-3 py-1.5 rounded-lg border border-[#C34D4D]/30 text-[#C34D4D] hover:bg-[#C34D4D]/10 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={approvingId === user.id}
                    className="px-3.5 py-1.5 rounded-lg bg-[#247A58] hover:bg-[#1E674A] text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    {approvingId === user.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Accept & Send Approval Email</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#64737A]">
            <CheckCircle className="w-6 h-6 text-[#247A58] mx-auto mb-1.5" />
            <p className="font-medium text-[#17252B]">No pending account registrations.</p>
            <p className="text-[11px] text-[#64737A] mt-0.5">
              When a caseworker registers, their request will appear here for your review and authorization.
            </p>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64737A]">Weekly Field Reports</span>
            <span className="text-[11px] font-mono text-[#247A58] font-bold">LIVE</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#17252B] mt-1.5 sm:mt-2">
            {metrics?.totalThisWeek || activities.length}
          </div>
          <div className="text-[11px] text-[#64737A] mt-1">
            Target: {metrics?.expectedWeeklyReports || 95} reports
          </div>
        </div>

        <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64737A]">Reporting Compliance</span>
            <span className="text-[11px] font-mono text-[#176B68] font-bold">GLOBAL</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#17252B] mt-1.5 sm:mt-2">
            {metrics?.complianceRate || 100}%
          </div>
          <div className="text-[11px] text-[#64737A] mt-1">
            Across {regions.length} active deployment corridors
          </div>
        </div>

        <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64737A]">Pending Supervisory Review</span>
            <span className="text-[11px] font-mono text-[#B7791F] font-bold">ACTION</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#17252B] mt-1.5 sm:mt-2">
            {metrics?.pendingReviewCount || urgentReviews.length}
          </div>
          <div className="text-[11px] text-[#64737A] mt-1">
            Cases awaiting validation & directives
          </div>
        </div>

        <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64737A]">Open Directives</span>
            <span className="text-[11px] font-mono text-[#176B68] font-bold">QUEUE</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#17252B] mt-1.5 sm:mt-2">
            {metrics?.unacknowledgedFeedbackCount || 0}
          </div>
          <div className="text-[11px] text-[#64737A] mt-1">
            Unacknowledged caseworker directives
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#17252B]">
                Intake Volume Trend (Past 7 Days)
              </h2>
              <p className="text-xs text-[#64737A]">Aggregated field submissions across all corridors</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#176B68] font-semibold bg-[#176B68]/10 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real-Time Ingestion</span>
            </div>
          </div>
          <div ref={chartRef} className="h-64 sm:h-72 w-full" />
        </div>

        {/* Regional Target Breakdown */}
        <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#17252B]">
              Corridor Target Compliance
            </h2>
            <button
              onClick={() => onSelectTab('manager_compliance')}
              className="text-xs font-semibold text-[#176B68] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-4">
            {regions.map((r) => {
              const regMetrics = metrics?.regionalBreakdown.find((m) => m.regionId === r.id);
              const count = regMetrics?.submittedCount || activities.filter((a) => a.regionId === r.id).length;
              const expected = r.expectedWeeklyReports || 30;
              const pct = Math.min(100, Math.round((count / expected) * 100));

              return (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#17252B] truncate">{r.name}</span>
                    <span className="font-mono text-[#64737A] tabular-nums">
                      {count}/{expected} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E4E9E7] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80 ? 'bg-[#247A58]' : pct >= 50 ? 'bg-[#176B68]' : 'bg-[#B7791F]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Urgent Reviews Action Block */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E9E7]">
          <div>
            <h2 className="text-sm font-bold text-[#17252B]">
              High-Priority Activity Reports Pending Supervisory Action
            </h2>
            <p className="text-xs text-[#64737A]">
              Caseworker submissions requiring evidence verification and clearance
            </p>
          </div>
          <button
            onClick={() => onSelectTab('manager_activities')}
            className="text-xs font-semibold text-[#176B68] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Go to Full Review Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {urgentReviews.length > 0 ? (
          <div className="divide-y divide-[#E4E9E7]">
            {urgentReviews.map((act) => (
              <div
                key={act.id}
                onClick={() => onSelectActivity(act)}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8F6] px-2 rounded-lg transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-sm font-semibold text-[#17252B] group-hover:text-[#176B68] transition-colors">
                    {act.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#64737A] mt-0.5">
                    <span className="font-medium text-[#17252B]">Staff: {act.staffName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{act.regionName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(act.clientCapturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {act.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#247A58] flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> GPS verified (±{act.location.accuracy}m)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-[#B7791F] px-2.5 py-1 bg-[#B7791F]/10 rounded-md">
                    Needs Review
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#D1D9D6] group-hover:text-[#176B68] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#64737A]">
            All submitted cases have been reviewed. Outstanding review queue is clear.
          </div>
        )}
      </div>
    </div>
  );
};

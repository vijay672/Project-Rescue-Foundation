import React from 'react';
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Calendar,
  ShieldCheck
} from 'lucide-react';
import type { Activity, DashboardMetrics, Region } from '../../types';

interface TeamComplianceProps {
  metrics: DashboardMetrics | null;
  activities: Activity[];
  regions: Region[];
}

export const TeamCompliance: React.FC<TeamComplianceProps> = ({
  metrics,
  activities,
  regions,
}) => {
  // Aggregate staff activity records
  const staffSummary = [
    {
      id: 'usr-amina-01',
      name: 'Amina Diallo',
      region: 'Eastern Rift & Northern Corridor',
      submittedCount: activities.filter((a) => a.staffId === 'usr-amina-01').length || 2,
      expectedCount: 5,
      complianceRate: 80,
      unacknowledgedFeedback: 1,
      lastActive: 'Today, 14:30',
      gpsCoverage: '100% Verified',
    },
    {
      id: 'usr-joseph-02',
      name: 'Joseph Kiptoo',
      region: 'Eastern Rift & Northern Corridor',
      submittedCount: 4,
      expectedCount: 5,
      complianceRate: 80,
      unacknowledgedFeedback: 0,
      lastActive: 'Yesterday',
      gpsCoverage: '90% Verified',
    },
    {
      id: 'usr-chariya-03',
      name: 'Chariya Somchai',
      region: 'Mekong River Transit Basin',
      submittedCount: 5,
      expectedCount: 5,
      complianceRate: 100,
      unacknowledgedFeedback: 0,
      lastActive: 'Today, 11:15',
      gpsCoverage: '100% Verified',
    },
    {
      id: 'usr-mateo-04',
      name: 'Mateo Morales',
      region: 'Andean Humanitarian Corridor',
      submittedCount: 3,
      expectedCount: 5,
      complianceRate: 60,
      unacknowledgedFeedback: 1,
      lastActive: '2 days ago',
      gpsCoverage: '75% (Mountain terrain)',
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-[#17252B]">
          Field Staff Reporting Compliance & Engagement
        </h1>
        <p className="text-xs text-[#64737A] mt-0.5">
          Weekly expected reporting quotas versus filed case dossiers, directive acknowledgements, and regional coverage.
        </p>
      </div>

      {/* Compliance Overview Matrix */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E9E7]">
          <div>
            <h2 className="text-sm font-bold text-[#17252B]">Active Field Personnel Reporting Ledger</h2>
            <p className="text-xs text-[#64737A]">Evaluated strictly against institutional case protocols</p>
          </div>
          <div className="text-xs font-mono text-[#247A58] font-bold">
            Average Compliance: {metrics?.complianceRate || 80}%
          </div>
        </div>

        {/* Mobile View: High-density responsive personnel cards */}
        <div className="sm:hidden mt-4 space-y-3">
          {staffSummary.map((staff) => (
            <div
              key={staff.id}
              className="p-4 rounded-xl border border-[#E4E9E7] bg-[#F7F8F6] space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-[#17252B]">{staff.name}</div>
                  <div className="text-[11px] text-[#64737A] mt-0.5">{staff.region}</div>
                </div>
                <span
                  className={`font-mono text-xs tabular-nums font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    staff.complianceRate >= 80
                      ? 'text-[#247A58] bg-[#247A58]/10 border border-[#247A58]/20'
                      : 'text-[#B7791F] bg-[#B7791F]/10 border border-[#B7791F]/20'
                  }`}
                >
                  {staff.complianceRate}% Quota
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#64737A]">Weekly Dossiers Filed:</span>
                  <span className="font-mono font-bold text-[#17252B] tabular-nums">
                    {staff.submittedCount} / {staff.expectedCount} reports
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#E4E9E7] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      staff.complianceRate >= 80 ? 'bg-[#247A58]' : 'bg-[#B7791F]'
                    }`}
                    style={{ width: `${Math.min(100, (staff.submittedCount / staff.expectedCount) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4E9E7] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div>
                  {staff.unacknowledgedFeedback > 0 ? (
                    <span className="text-[#B7791F] font-bold flex items-center gap-1 font-mono">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {staff.unacknowledgedFeedback} Directive Pending
                    </span>
                  ) : (
                    <span className="text-[#247A58] flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Directives Clear
                    </span>
                  )}
                </div>
                <div className="text-[#64737A] font-mono">
                  GPS: {staff.gpsCoverage}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Data Table */}
        <div className="hidden sm:block overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E9E7] text-[#64737A]">
                <th className="pb-3 font-semibold">Caseworker</th>
                <th className="pb-3 font-semibold">Assigned Region</th>
                <th className="pb-3 font-semibold text-right">Filed / Expected</th>
                <th className="pb-3 font-semibold text-center">Compliance</th>
                <th className="pb-3 font-semibold">Unack. Directives</th>
                <th className="pb-3 font-semibold">GPS Quality</th>
                <th className="pb-3 font-semibold">Last Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E9E7]">
              {staffSummary.map((staff) => (
                <tr key={staff.id} className="hover:bg-[#F7F8F6] transition-colors">
                  <td className="py-3.5 font-bold text-[#17252B]">{staff.name}</td>
                  <td className="py-3.5 text-[#64737A]">{staff.region}</td>
                  <td className="py-3.5 text-right font-mono tabular-nums font-bold text-[#17252B]">
                    {staff.submittedCount} / {staff.expectedCount}
                  </td>
                  <td className="py-3.5 text-center">
                    <span
                      className={`font-mono tabular-nums font-bold px-2 py-0.5 rounded-md ${
                        staff.complianceRate >= 80
                          ? 'text-[#247A58] bg-[#247A58]/10'
                          : 'text-[#B7791F] bg-[#B7791F]/10'
                      }`}
                    >
                      {staff.complianceRate}%
                    </span>
                  </td>
                  <td className="py-3.5">
                    {staff.unacknowledgedFeedback > 0 ? (
                      <span className="text-[#B7791F] font-bold flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {staff.unacknowledgedFeedback} Pending
                      </span>
                    ) : (
                      <span className="text-[#247A58] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> All Clear
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-[#64737A] font-mono">{staff.gpsCoverage}</td>
                  <td className="py-3.5 text-[#64737A]">{staff.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

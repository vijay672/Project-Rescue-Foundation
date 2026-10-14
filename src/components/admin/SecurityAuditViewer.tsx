import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Lock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';
import type { AuditEvent } from '../../types';

interface SecurityAuditViewerProps {
  auditLogs: AuditEvent[];
}

export const SecurityAuditViewer: React.FC<SecurityAuditViewerProps> = ({ auditLogs }) => {
  const [filterAction, setFilterAction] = useState('all');

  const filtered = auditLogs.filter(
    (log) => filterAction === 'all' || log.action === filterAction
  );

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#176B68] tracking-wide uppercase">
              Immutable Cryptographic Audit Trail
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#17252B] mt-0.5">
              System Security & Operational Event Log
            </h1>
            <p className="text-xs text-[#64737A] mt-0.5">
              Tamper-evident log of case submissions, status transitions, geofence validations, and authentication sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#247A58] bg-[#247A58]/10 px-3 py-1.5 rounded-lg border border-[#247A58]/20 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Ledger Sealed</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#E4E9E7] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#64737A]">
            Showing {filtered.length} audit entries
          </span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            aria-label="Filter Audit Action"
            className="px-3 py-1.5 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg text-[#17252B] font-medium"
          >
            <option value="all">All Security Actions</option>
            <option value="ACTIVITY_RECORDED">Case Submissions</option>
            <option value="ACTIVITY_STATUS_CHANGE">Status Transitions</option>
            <option value="FEEDBACK_DISPATCHED">Feedback Dispatched</option>
            <option value="USER_ROLE_SWITCH">Role Switches</option>
            <option value="POLICY_UPDATE">Policy Updates</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table & Mobile Cards */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs">
        {/* Mobile View: Audit Event Cards */}
        <div className="sm:hidden space-y-3">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl border border-[#E4E9E7] bg-[#F7F8F6] space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[11px] font-bold text-[#176B68] block">
                    {log.action}
                  </span>
                  <div className="text-[10px] text-[#64737A] font-mono mt-0.5">
                    {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)} UTC
                  </div>
                </div>
                <span
                  className={`font-semibold text-[11px] px-2 py-0.5 rounded-md shrink-0 ${
                    log.status === 'success'
                      ? 'text-[#247A58] bg-[#247A58]/10 border border-[#247A58]/20'
                      : 'text-[#C34D4D] bg-[#C34D4D]/10 border border-[#C34D4D]/20'
                  }`}
                >
                  {log.status}
                </span>
              </div>

              <div className="pt-2 border-t border-[#E4E9E7]/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#64737A]">Actor:</span>
                  <span className="font-bold text-[#17252B]">
                    {log.actorName} <span className="font-normal text-[#64737A]">({log.actorRole})</span>
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#64737A]">Target:</span>
                  <span className="text-[#17252B] truncate max-w-[180px]">
                    {log.resourceType}:{log.resourceId.slice(0, 10)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#64737A]">Client IP:</span>
                  <span className="text-[#64737A]">{log.ipAddress}</span>
                </div>
              </div>

              {log.details && (
                <div className="pt-2 border-t border-[#E4E9E7]/60 text-[11px] text-[#17252B] bg-white p-2 rounded-lg border border-[#E4E9E7]">
                  {log.details}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden sm:block overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E9E7] text-[#64737A]">
                  <th className="pb-3 font-semibold">Timestamp (UTC)</th>
                  <th className="pb-3 font-semibold">Actor & Role</th>
                  <th className="pb-3 font-semibold">Event Action</th>
                  <th className="pb-3 font-semibold">Target Resource</th>
                  <th className="pb-3 font-semibold">Client IP</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9E7]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F7F8F6] transition-colors">
                    <td className="py-3.5 font-mono text-[#64737A] whitespace-nowrap">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3.5 font-bold text-[#17252B]">
                      {log.actorName}
                      <div className="text-[10px] text-[#64737A] font-normal">{log.actorRole}</div>
                    </td>
                    <td className="py-3.5 font-mono text-[#176B68] font-bold">
                      {log.action}
                    </td>
                    <td className="py-3.5 font-mono text-[#64737A]">
                      {log.resourceType}:{log.resourceId.slice(0, 10)}
                    </td>
                    <td className="py-3.5 font-mono text-[#64737A]">
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md ${
                          log.status === 'success'
                            ? 'text-[#247A58] bg-[#247A58]/10'
                            : 'text-[#C34D4D] bg-[#C34D4D]/10'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-[#17252B] max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-[#64737A]">
              No audit records matching filter criteria. Audit events are recorded automatically during system activity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

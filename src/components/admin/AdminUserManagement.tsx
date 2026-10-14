import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Plus, 
  Lock, 
  CheckCircle,
  Smartphone
} from 'lucide-react';
import type { User, UserRole } from '../../types';

interface AdminUserManagementProps {
  users: User[];
  onToggleUserStatus: (userId: string, currentStatus: User['status']) => Promise<void>;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  onToggleUserStatus,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggle = async (userId: string, currentStatus: User['status']) => {
    setUpdatingId(userId);
    try {
      await onToggleUserStatus(userId, currentStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#176B68] tracking-wide uppercase">
              System Administration · Access Governance
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#17252B] mt-0.5">
              User Accounts & Regional RBAC Permissions
            </h1>
            <p className="text-xs text-[#64737A] mt-0.5">
              Manage field personnel clearances, cryptographic MFA enrollment, and account operational status.
            </p>
          </div>
        </div>
      </div>

      {/* Users Table & Mobile Cards */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs">
        {/* Mobile View: User Account Cards */}
        <div className="sm:hidden space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-xl border border-[#E4E9E7] bg-[#F7F8F6] space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#17252B] truncate">{u.name}</div>
                  <div className="text-[11px] text-[#64737A] truncate">{u.email}</div>
                </div>
                <span
                  className={`font-semibold text-xs px-2 py-0.5 rounded-md shrink-0 ${
                    u.status === 'active'
                      ? 'text-[#247A58] bg-[#247A58]/10 border border-[#247A58]/20'
                      : 'text-[#C34D4D] bg-[#C34D4D]/10 border border-[#C34D4D]/20'
                  }`}
                >
                  {u.status}
                </span>
              </div>

              <div className="text-xs space-y-1 pt-1 border-t border-[#E4E9E7]/60">
                <div className="flex items-center justify-between">
                  <span className="text-[#64737A]">Role:</span>
                  <span className="font-mono font-semibold text-[#17252B] capitalize">
                    {u.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64737A]">Regions:</span>
                  <span className="text-[#17252B] font-medium truncate max-w-[200px] text-right">
                    {u.regions.join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64737A]">Hardware MFA:</span>
                  <span className="text-[#247A58] font-semibold flex items-center gap-1 font-mono text-[11px]">
                    <Lock className="w-3 h-3" /> Enforced
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4E9E7]">
                <button
                  onClick={() => handleToggle(u.id, u.status)}
                  disabled={updatingId === u.id}
                  className={`w-full py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    u.status === 'active'
                      ? 'text-[#C34D4D] border-[#C34D4D]/30 hover:bg-[#C34D4D]/10 bg-white'
                      : 'text-[#247A58] border-[#247A58]/30 hover:bg-[#247A58]/10 bg-white'
                  }`}
                >
                  {updatingId === u.id ? 'Updating...' : u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden sm:block overflow-x-auto">
          {users.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E9E7] text-[#64737A]">
                  <th className="pb-3 font-semibold">User & Identity</th>
                  <th className="pb-3 font-semibold">Role Tier</th>
                  <th className="pb-3 font-semibold">Assigned Region Clearances</th>
                  <th className="pb-3 font-semibold">MFA State</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9E7]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F7F8F6] transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-[#17252B]">{u.name}</div>
                      <div className="text-[#64737A] text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-4 font-mono font-semibold text-[#17252B] capitalize">
                      {u.role.replace('_', ' ')}
                    </td>
                    <td className="py-4 text-[#64737A]">
                      {u.regions.join(', ')}
                    </td>
                    <td className="py-4">
                      <span className="text-[#247A58] font-semibold flex items-center gap-1 font-mono">
                        <Lock className="w-3.5 h-3.5" /> Enforced
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md ${
                          u.status === 'active'
                            ? 'text-[#247A58] bg-[#247A58]/10'
                            : 'text-[#C34D4D] bg-[#C34D4D]/10'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => handleToggle(u.id, u.status)}
                        disabled={updatingId === u.id}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          u.status === 'active'
                            ? 'text-[#C34D4D] border-[#C34D4D]/30 hover:bg-[#C34D4D]/10'
                            : 'text-[#247A58] border-[#247A58]/30 hover:bg-[#247A58]/10'
                        }`}
                      >
                        {updatingId === u.id ? 'Updating...' : u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-[#64737A]">
              No user accounts found in directory. New accounts will appear here as personnel register.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

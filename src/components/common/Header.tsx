import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Shield, 
  Smartphone, 
  Download, 
  X, 
  CheckCircle2, 
  ChevronRight,
  ExternalLink,
  Mail,
  KeyRound
} from 'lucide-react';
import type { User, UserRole, AppNotification } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { ProfileManagementModal } from './ProfileManagementModal';
import { EmailOutboxModal } from './EmailOutboxModal';

interface HeaderProps {
  currentUser: User;
  onLogout?: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onManualSync: () => void;
  onToggleSimulatedOffline: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  notifications?: AppNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onProfileUpdated?: (user: User) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  isOnline,
  isSyncing,
  pendingCount,
  onManualSync,
  onToggleSimulatedOffline,
  activeTab,
  onSelectTab,
  notifications = [],
  onMarkNotificationRead,
  onProfileUpdated,
}) => {
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOutboxModal, setShowOutboxModal] = useState(false);

  const safeNotifications = notifications || [];
  const unreadCount = safeNotifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E4E9E7] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Brand Wordmark (Responsive truncate on small screens) */}
          <div className="flex items-center gap-2.5 shrink min-w-0">
            <button
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
              aria-label="Project Rescue Home"
            >
              <div className="w-8 h-8 rounded-lg bg-[#17252B] flex items-center justify-center text-[#FFFFFF] font-bold text-sm shrink-0 shadow-xs">
                <span className="text-[#176B68] font-black mr-0.5">P</span>R
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold tracking-tight text-[#17252B] truncate block leading-tight">
                  <span className="hidden xs:inline">Project Rescue Foundation</span>
                  <span className="xs:hidden">Project Rescue</span>
                </span>
                <span className="text-[10px] text-[#64737A] font-medium tracking-normal hidden md:block truncate">
                  Field Operations & Case Dossiers
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#64737A] shrink-0">
            {currentUser.role === 'field_staff' && (
              <>
                <button
                  onClick={() => onSelectTab('home')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'home'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Staff Portal
                </button>
                <button
                  onClick={() => onSelectTab('activities')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'activities'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  My Field Reports
                </button>
                <button
                  onClick={() => onSelectTab('feedback')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'feedback'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Feedback Inbox
                </button>
                <button
                  onClick={() => onSelectTab('settings')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Offline Diagnostics
                </button>
              </>
            )}

            {currentUser.role === 'operations_manager' && (
              <>
                <button
                  onClick={() => onSelectTab('manager_overview')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'manager_overview'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Regional Dashboard
                </button>
                <button
                  onClick={() => onSelectTab('manager_activities')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'manager_activities'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Activity Review
                </button>
                <button
                  onClick={() => onSelectTab('manager_geo')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'manager_geo'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Geographic Ops
                </button>
                <button
                  onClick={() => onSelectTab('manager_compliance')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'manager_compliance'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Reporting Compliance
                </button>
              </>
            )}

            {currentUser.role === 'system_admin' && (
              <>
                <button
                  onClick={() => onSelectTab('admin_users')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'admin_users'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  User Governance
                </button>
                <button
                  onClick={() => onSelectTab('admin_audit')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'admin_audit'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Security Audit Log
                </button>
                <button
                  onClick={() => onSelectTab('manager_overview')}
                  className={`py-1 transition-colors whitespace-nowrap ${
                    activeTab === 'manager_overview'
                      ? 'text-[#176B68] border-b-2 border-[#176B68] font-bold'
                      : 'hover:text-[#17252B]'
                  }`}
                >
                  Operations View
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Mobile-First Compact Action Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Sync State Badge / Trigger */}
            <button
              onClick={onManualSync}
              disabled={isSyncing || !isOnline}
              title={
                !isOnline 
                  ? 'Offline: Changes stored in IndexedDB' 
                  : pendingCount > 0 
                  ? `${pendingCount} items pending sync. Click to push.` 
                  : 'All records synchronized.'
              }
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                !isOnline
                  ? 'bg-[#C34D4D]/10 text-[#C34D4D] border-[#C34D4D]/20'
                  : pendingCount > 0
                  ? 'bg-[#B7791F]/10 text-[#B7791F] border-[#B7791F]/30 hover:bg-[#B7791F]/20'
                  : 'bg-[#F7F8F6] text-[#247A58] border-[#E4E9E7] hover:bg-[#E4E9E7]'
              }`}
            >
              {isOnline ? (
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#176B68]' : ''}`} />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-[#C34D4D]" />
              )}
              {pendingCount > 0 && (
                <span className="font-mono tabular-nums text-[11px] font-bold">
                  {pendingCount}
                </span>
              )}
              <span className="hidden md:inline font-normal">
                {!isOnline ? 'Offline' : pendingCount > 0 ? 'Sync' : 'Synced'}
              </span>
            </button>

            {/* System Email Outbox Log */}
            <button
              onClick={() => setShowOutboxModal(true)}
              aria-label="View System Dispatched Emails"
              title="Dispatched Email Log (Approvals, Reviews, OTPs)"
              className="relative p-2 rounded-lg text-[#17252B] hover:bg-[#F7F8F6] border border-transparent hover:border-[#E4E9E7] transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#176B68]" />
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => setShowNotificationsDrawer(true)}
              aria-label="View Operational Notifications"
              className="relative p-2 rounded-lg text-[#17252B] hover:bg-[#F7F8F6] border border-transparent hover:border-[#E4E9E7] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#C34D4D] ring-2 ring-white" />
              )}
            </button>

            {/* Desktop-only PWA button */}
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            {/* User Profile Avatar Button */}
            <button
              onClick={() => setShowProfileDrawer(true)}
              aria-label="Open User Profile and Settings"
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#F7F8F6] hover:bg-[#E4E9E7] border border-[#E4E9E7] transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#176B68] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left text-xs min-w-0">
                <div className="font-bold text-[#17252B] truncate max-w-[110px]">
                  {currentUser.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-[#64737A] capitalize truncate">
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Slide-Over Drawer */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-[88vw] sm:max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-[#E4E9E7] animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-[#E4E9E7] flex items-center justify-between bg-[#F7F8F6]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#176B68]" />
                <h3 className="text-sm font-bold text-[#17252B]">
                  Operational Notifications ({safeNotifications.length})
                </h3>
              </div>
              <button
                onClick={() => setShowNotificationsDrawer(false)}
                className="p-1 text-[#64737A] hover:text-[#17252B] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {safeNotifications.length > 0 ? (
                safeNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onMarkNotificationRead?.(n.id)}
                    className={`p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                      n.read
                        ? 'bg-[#F7F8F6] border-[#E4E9E7] text-[#64737A]'
                        : 'bg-white border-[#176B68]/30 shadow-2xs text-[#17252B] ring-1 ring-[#176B68]/10'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-bold text-[#17252B]">{n.title}</span>
                      <span className="text-[10px] font-mono text-[#64737A]">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="leading-relaxed mt-0.5">{n.message}</p>
                    {!n.read && (
                      <div className="mt-2 text-[10px] font-bold text-[#176B68] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Mark read
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-[#64737A]">
                  <Bell className="w-8 h-8 text-[#64737A]/30 mx-auto mb-2" />
                  <div className="font-bold text-[#17252B]">No new notifications</div>
                  <p className="mt-1">Important case and directive updates will appear here.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E4E9E7] bg-[#F7F8F6]">
              <button
                onClick={() => setShowNotificationsDrawer(false)}
                className="w-full py-2 text-xs font-semibold text-[#17252B] bg-white border border-[#E4E9E7] rounded-lg hover:bg-[#E4E9E7]"
              >
                Close Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile & Account Settings Drawer */}
      {showProfileDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-[88vw] sm:max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-[#E4E9E7] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E4E9E7] flex items-center justify-between bg-[#F7F8F6]">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-[#176B68]" />
                <h3 className="text-sm font-bold text-[#17252B]">Authenticated Session</h3>
              </div>
              <button
                onClick={() => setShowProfileDrawer(false)}
                className="p-1 text-[#64737A] hover:text-[#17252B] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Profile Card */}
              <div className="p-4 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#17252B] text-white flex items-center justify-center font-bold text-sm">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[#17252B] text-sm">{currentUser.name}</div>
                    <div className="text-[#64737A]">{currentUser.email}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E4E9E7] flex items-center justify-between">
                  <span className="font-semibold text-[#64737A]">Assigned Role</span>
                  <span className="font-bold text-[#176B68] capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#64737A]">MFA Security</span>
                  <span className="text-[#247A58] font-bold font-mono flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Enforced (Hardware)
                  </span>
                </div>
              </div>

              {/* Authenticated RBAC Permissions Scope */}
              <div className="p-4 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#17252B] uppercase tracking-wide text-[11px]">
                    Role-Based Access Scope
                  </span>
                  <span className="text-[10px] text-[#247A58] font-bold bg-[#247A58]/10 px-2 py-0.5 rounded-full border border-[#247A58]/20">
                    Enterprise Policy Enforced
                  </span>
                </div>
                <p className="text-[11px] text-[#64737A] leading-relaxed">
                  {currentUser.role === 'field_staff' &&
                    'Field Staff privilege: Authorized to record new case reports, view self-uploaded evidence, and acknowledge supervisory feedback.'}
                  {currentUser.role === 'operations_manager' &&
                    'Operations Manager privilege: Full access to inspect all regional field activities, review media evidence, and issue directives.'}
                  {currentUser.role === 'system_admin' &&
                    'System Administrator privilege: Full administrative governance over user accounts, role allocations, and security audit logs.'}
                </p>
                {currentUser.regions && currentUser.regions.length > 0 && (
                  <div className="pt-2 border-t border-[#E4E9E7]/80 text-[11px]">
                    <span className="text-[#64737A]">Assigned Region(s): </span>
                    <span className="font-semibold text-[#17252B] capitalize">
                      {currentUser.regions.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Account Profile & Credentials Management (Requirement 2 & 3) */}
              <div className="p-4 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] space-y-2.5">
                <div className="font-bold text-[#17252B] uppercase tracking-wide text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#176B68]" />
                    <span>Account Profile & Credentials</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#64737A]">
                  Update your display name, Caseworker ID, organizational email, or change account password.
                </p>
                <button
                  onClick={() => {
                    setShowProfileDrawer(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full py-2 px-3 bg-[#176B68] hover:bg-[#208783] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Manage Profile & Password</span>
                </button>
              </div>

              {/* View Dispatched Emails Link */}
              <button
                onClick={() => {
                  setShowProfileDrawer(false);
                  setShowOutboxModal(true);
                }}
                className="w-full p-3 bg-white hover:bg-[#F7F8F6] border border-[#E4E9E7] rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#176B68]" />
                  <div>
                    <div className="text-xs font-bold text-[#17252B]">System Outbox Dispatches</div>
                    <div className="text-[10px] text-[#64737A]">Audit log of approval emails, review notices & OTPs</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64737A]" />
              </button>

              {/* Network Link & Offline Controls */}
              <div className="p-4 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] space-y-3">
                <div className="font-bold text-[#17252B] uppercase tracking-wide text-[11px]">
                  Field Network Controls
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64737A]">Simulate Field Network Drop:</span>
                  <button
                    onClick={onToggleSimulatedOffline}
                    className={`px-3 py-1.5 rounded-md font-bold text-xs border transition-colors ${
                      isOnline
                        ? 'bg-white text-[#C34D4D] border-[#C34D4D]/30 hover:bg-[#C34D4D]/10'
                        : 'bg-[#247A58] text-white border-transparent'
                    }`}
                  >
                    {isOnline ? 'Go Offline' : 'Go Online'}
                  </button>
                </div>
                <div className="text-[11px] text-[#64737A]">
                  When offline, case entries and evidence are safely written to encrypted local storage.
                </div>
              </div>

              {/* Install PWA on Mobile */}
              <div className="sm:hidden pt-2">
                <PWAInstallButton />
              </div>

              {/* Log Out Button */}
              <div className="pt-4 border-t border-[#E4E9E7]">
                <button
                  onClick={() => {
                    setShowProfileDrawer(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#C34D4D] bg-[#C34D4D]/10 hover:bg-[#C34D4D]/20 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Profile Management Modal */}
      <ProfileManagementModal
        currentUser={currentUser}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdated={(updated) => {
          onProfileUpdated?.(updated);
        }}
      />

      {/* Email Outbox Inspector Modal */}
      <EmailOutboxModal
        isOpen={showOutboxModal}
        onClose={() => setShowOutboxModal(false)}
      />
    </>
  );
};

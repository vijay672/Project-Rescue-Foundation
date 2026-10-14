import React from 'react';
import { 
  Home, 
  FileText, 
  PlusCircle, 
  MessageSquare, 
  HardDrive,
  BarChart3,
  CheckSquare,
  MapPin,
  Users,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import type { UserRole } from '../../types';

interface BottomNavProps {
  role: UserRole;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreate: () => void;
  unreadFeedbackCount: number;
  pendingSyncCount: number;
}

interface NavTabItem {
  id: string;
  label: string;
  icon: any;
  isAction?: boolean;
  badgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  activeTab,
  onSelectTab,
  onOpenCreate,
  unreadFeedbackCount,
  pendingSyncCount,
}) => {
  // Mobile navigation configuration tailored to user role
  const fieldStaffTabs: NavTabItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activities', label: 'Reports', icon: FileText, badgeCount: pendingSyncCount },
    { id: 'create', label: 'New', icon: PlusCircle, isAction: true },
    { id: 'feedback', label: 'Directives', icon: MessageSquare, badgeCount: unreadFeedbackCount },
    { id: 'settings', label: 'Storage', icon: HardDrive },
  ];

  const managerTabs: NavTabItem[] = [
    { id: 'manager_overview', label: 'Overview', icon: BarChart3 },
    { id: 'manager_activities', label: 'Reviews', icon: CheckSquare },
    { id: 'manager_geo', label: 'Geo Ops', icon: MapPin },
    { id: 'manager_compliance', label: 'Team', icon: Users },
  ];

  const adminTabs: NavTabItem[] = [
    { id: 'admin_users', label: 'Accounts', icon: Users },
    { id: 'admin_audit', label: 'Audit Log', icon: ShieldAlert },
    { id: 'manager_overview', label: 'Overview', icon: BarChart3 },
  ];

  const currentTabs: NavTabItem[] = role === 'field_staff' 
    ? fieldStaffTabs 
    : role === 'operations_manager' 
    ? managerTabs 
    : adminTabs;

  return (
    <nav 
      aria-label="Mobile Navigation" 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E4E9E7] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe"
    >
      <div 
        className="grid items-center h-16 px-2 gap-1"
        style={{ gridTemplateColumns: `repeat(${currentTabs.length}, minmax(0, 1fr))` }}
      >
        {currentTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={onOpenCreate}
                aria-label="Create New Field Activity Report"
                className="flex flex-col items-center justify-center min-h-[48px] py-1 text-[#176B68] active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-[#176B68] text-white flex items-center justify-center shadow-md shadow-[#176B68]/30">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-[#17252B] mt-0.5 tracking-tight">New</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all relative min-w-0 cursor-pointer ${
                isActive 
                  ? 'bg-[#17252B] text-white shadow-xs' 
                  : 'text-[#64737A] hover:text-[#17252B] hover:bg-[#F7F8F6]'
              }`}
            >
              <div className="relative shrink-0">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#64737A]'}`} />
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] bg-[#C34D4D] text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center shadow-2xs">
                    {tab.badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold mt-1 tracking-tight truncate max-w-full text-center ${isActive ? 'text-white' : 'text-[#64737A]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

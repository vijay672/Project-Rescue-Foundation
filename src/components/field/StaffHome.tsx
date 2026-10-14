import React from 'react';
import { 
  PlusCircle, 
  Clock, 
  MapPin, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  HardDriveDownload,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { Activity, FeedbackMessage, User } from '../../types';

interface StaffHomeProps {
  currentUser: User;
  activities: Activity[];
  feedback: FeedbackMessage[];
  pendingSyncCount: number;
  isOnline: boolean;
  onOpenCreate: () => void;
  onSelectTab: (tab: string) => void;
  onSelectActivity: (activity: Activity) => void;
}

export const StaffHome: React.FC<StaffHomeProps> = ({
  currentUser,
  activities,
  feedback,
  pendingSyncCount,
  isOnline,
  onOpenCreate,
  onSelectTab,
  onSelectActivity,
}) => {
  const unreadFeedback = feedback.filter((f) => f.status === 'open');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const submittedToday = activities.filter(
    (a) => new Date(a.clientCapturedAt).getTime() >= todayStart.getTime()
  ).length;

  const recentActivities = activities.slice(0, 4);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Editorial Greeting & Field Readiness Status */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#176B68] tracking-wide uppercase">
              Field Operations Desk · East Africa Corridor
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[#17252B] mt-1 text-balance">
              Hi {currentUser.name.split(' ')[0] || currentUser.name} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#64737A] mt-1 max-w-xl leading-relaxed">
              All field reports and evidence captured offline are securely preserved in local device storage and automatically synced when reconnected.
            </p>
          </div>

          {/* Primary Mobile-Friendly CTA */}
          <button
            onClick={onOpenCreate}
            className="flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-[#176B68] hover:bg-[#208783] active:scale-[0.98] rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Create Field Report</span>
          </button>
        </div>

        {/* Operational Status Metric Row (Zero-Pill Typography) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[#E4E9E7]">
          <div>
            <div className="text-[11px] sm:text-xs font-medium text-[#64737A]">Today's Submissions</div>
            <div className="text-xl sm:text-2xl font-bold text-[#17252B] font-mono tabular-nums mt-0.5 sm:mt-1">
              {submittedToday}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#247A58] mt-0.5 font-medium">
              Daily target: 1 report
            </div>
          </div>

          <div>
            <div className="text-[11px] sm:text-xs font-medium text-[#64737A]">Offline Sync Queue</div>
            <div className="text-xl sm:text-2xl font-bold text-[#17252B] font-mono tabular-nums mt-0.5 sm:mt-1">
              {pendingSyncCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#64737A] mt-0.5">
              {pendingSyncCount === 0 ? 'Durable store in sync' : 'Queued in IndexedDB'}
            </div>
          </div>

          <div>
            <div className="text-[11px] sm:text-xs font-medium text-[#64737A]">Unread Feedback</div>
            <div className="text-xl sm:text-2xl font-bold text-[#17252B] font-mono tabular-nums mt-0.5 sm:mt-1">
              {unreadFeedback.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#64737A] mt-0.5">
              {unreadFeedback.length > 0 ? (
                <button
                  onClick={() => onSelectTab('feedback')}
                  className="text-[#B7791F] font-semibold hover:underline"
                >
                  Review comments →
                </button>
              ) : (
                'All feedback acknowledged'
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] sm:text-xs font-medium text-[#64737A]">Link Status</div>
            <div className="text-sm sm:text-base font-bold text-[#17252B] flex items-center gap-1.5 mt-1 sm:mt-2">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#247A58]" />
                  <span className="text-[11px] sm:text-xs text-[#247A58] font-bold">Encrypted Active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C34D4D]" />
                  <span className="text-[11px] sm:text-xs text-[#C34D4D] font-bold">Offline</span>
                </>
              )}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#64737A] mt-0.5">
              {isOnline ? 'Direct central sync' : 'Offline caching enabled'}
            </div>
          </div>
        </div>
      </div>

      {/* Unread Managerial Feedback Alert Banner */}
      {unreadFeedback.length > 0 && (
        <div className="bg-[#B7791F]/10 border border-[#B7791F]/30 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-[#B7791F] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-[#17252B]">
                Managerial Review Feedback Requires Acknowledgement ({unreadFeedback.length})
              </h3>
              <p className="text-xs text-[#64737A] mt-0.5">
                "{unreadFeedback[0].message}"
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('feedback')}
            className="w-full sm:w-auto px-3 py-1.5 text-xs font-bold text-[#17252B] bg-white border border-[#E4E9E7] hover:bg-[#F7F8F6] rounded-lg shadow-2xs whitespace-nowrap text-center cursor-pointer"
          >
            Acknowledge Receipt
          </button>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E9E7]">
          <div>
            <h2 className="text-base font-bold text-[#17252B]">Recent Case Dossiers & Activities</h2>
            <p className="text-xs text-[#64737A]">Verified timeline of case submissions from your active assignments</p>
          </div>
          <button
            onClick={() => onSelectTab('activities')}
            className="text-xs font-semibold text-[#176B68] hover:underline flex items-center gap-1"
          >
            <span>View All ({activities.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentActivities.length > 0 ? (
          <div className="divide-y divide-[#E4E9E7]">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => onSelectActivity(activity)}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8F6] px-2 rounded-lg transition-colors cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[#17252B] group-hover:text-[#176B68] transition-colors">
                    {activity.title}
                  </div>
                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#64737A]">
                    <span className="capitalize">{activity.category.replace('_', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(activity.clientCapturedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {activity.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 text-[#247A58] truncate max-w-[200px]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {activity.location.structuredAddress?.area 
                              ? `${activity.location.structuredAddress.area}, ${activity.location.structuredAddress.city || activity.location.structuredAddress.state}`
                              : activity.location.addressApprox || `GPS Verified (±${activity.location.accuracy}m)`}
                          </span>
                        </span>
                      </>
                    )}
                    {activity.mediaAssets.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activity.mediaAssets.length} file{activity.mediaAssets.length > 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {activity.syncStatus === 'pending' ? (
                    <span className="text-xs font-semibold text-[#B7791F] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Pending Sync
                    </span>
                  ) : activity.status === 'approved' ? (
                    <span className="text-xs font-semibold text-[#247A58] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                  ) : activity.status === 'revision_requested' ? (
                    <span className="text-xs font-semibold text-[#C34D4D] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Revision Requested
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#64737A]">
                      Under Review
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-[#D1D9D6] group-hover:text-[#176B68] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-[#64737A]/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#17252B]">No reports yet</h3>
            <p className="text-xs text-[#64737A] mt-1 max-w-sm mx-auto">
              Your field activity reports will appear here once you create your first entry.
            </p>
            <button
              onClick={onOpenCreate}
              className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-lg shadow-2xs transition-colors"
            >
              Create your first report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

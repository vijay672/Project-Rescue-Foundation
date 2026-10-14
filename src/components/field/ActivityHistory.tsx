import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download,
  Camera,
  ShieldCheck,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  ShieldAlert
} from 'lucide-react';
import type { Activity, MediaAsset, User } from '../../types';
import { SecureMediaPreviewModal } from '../common/SecureMediaPreviewModal';

interface ActivityHistoryProps {
  activities: Activity[];
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity | null) => void;
  onOpenCreate: () => void;
  currentUser?: User;
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({
  activities,
  selectedActivity,
  onSelectActivity,
  onOpenCreate,
  currentUser,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [previewMedia, setPreviewMedia] = useState<MediaAsset | null>(null);

  const filteredActivities = activities.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.narrative.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Controls */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E4E9E7]">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#17252B]">
              Field Reports & Historical Activity Records
            </h1>
            <p className="text-xs text-[#64737A] mt-0.5">
              Comprehensive case activities with GPS coordinates and verified media attachments.
            </p>
          </div>
          <button
            onClick={onOpenCreate}
            className="px-4 py-2 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-lg shadow-xs transition-colors shrink-0"
          >
            + New Activity
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search narrative keywords..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B]"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B] font-medium"
            >
              <option value="all">All Approval States</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="pending_sync">Pending Sync</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by Category"
              className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B] font-medium"
            >
              <option value="all">All Operation Categories</option>
              <option value="safehouse_intake">Safehouse Intake</option>
              <option value="surveillance_patrol">Transit Watch & Surveillance</option>
              <option value="direct_assistance">Emergency Direct Assistance</option>
              <option value="medical_outreach">Medical Outreach</option>
              <option value="legal_support">Legal Support</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feed of Activities */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <div className="text-xs font-semibold text-[#64737A] pb-3 border-b border-[#E4E9E7]">
          Showing {filteredActivities.length} of {activities.length} total records
        </div>

        {filteredActivities.length > 0 ? (
          <div className="divide-y divide-[#E4E9E7]">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => onSelectActivity(act)}
                className="py-5 hover:bg-[#F7F8F6] px-3 rounded-lg transition-colors cursor-pointer space-y-2 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-sm font-bold text-[#17252B] group-hover:text-[#176B68] transition-colors">
                    {act.title}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {act.syncStatus === 'pending' ? (
                      <span className="text-xs font-semibold text-[#B7791F] flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" /> Local Queue
                      </span>
                    ) : act.status === 'approved' ? (
                      <span className="text-xs font-semibold text-[#247A58] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : act.status === 'revision_requested' ? (
                      <span className="text-xs font-semibold text-[#C34D4D] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Needs Revision
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-[#64737A]">
                        Under Review
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#64737A] line-clamp-2 leading-relaxed">
                  {act.narrative}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#64737A] pt-1">
                  <span className="capitalize font-medium text-[#17252B]">
                    {act.category.replace('_', ' ')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{act.regionName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {new Date(act.clientCapturedAt).toLocaleString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {act.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 text-[#247A58] font-medium truncate max-w-[240px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {act.location.structuredAddress?.area 
                            ? `${act.location.structuredAddress.area}, ${act.location.structuredAddress.city || act.location.structuredAddress.state}`
                            : act.location.addressApprox || `${act.location.latitude.toFixed(4)}, ${act.location.longitude.toFixed(4)}`}
                        </span>
                      </span>
                    </>
                  )}
                  {act.mediaAssets.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Camera className="w-3 h-3 text-[#176B68]" />
                        {act.mediaAssets.length} file{act.mediaAssets.length > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64737A]">
            <FileText className="w-10 h-10 text-[#64737A]/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#17252B]">No reports yet</h3>
            <p className="mt-1 max-w-sm mx-auto text-[#64737A]">
              Your field activity reports will appear here once you create your first entry.
            </p>
            <button
              onClick={onOpenCreate}
              className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-lg shadow-2xs transition-colors"
            >
              Create your first report
            </button>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-[#64737A]">
            <Search className="w-10 h-10 text-[#64737A]/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#17252B]">No matching reports</h3>
            <p className="mt-1 max-w-sm mx-auto text-[#64737A]">
              Try adjusting your search keywords or filter criteria.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="mt-4 px-4 py-2 text-xs font-bold text-[#17252B] bg-[#F7F8F6] border border-[#E4E9E7] hover:bg-[#E4E9E7] rounded-lg transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal / Dossier View */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17252B]/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E4E9E7] overflow-hidden my-auto flex flex-col max-h-[96vh] sm:max-h-[90vh] min-w-0">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E4E9E7] flex items-center justify-between bg-[#F7F8F6]">
              <div className="min-w-0 pr-2">
                <span className="text-xs font-mono uppercase text-[#176B68] font-semibold">
                  Case Record #{selectedActivity.id.slice(0, 8)}
                </span>
                <h2 className="text-base font-bold text-[#17252B] mt-0.5 truncate">
                  {selectedActivity.title}
                </h2>
              </div>
              <button
                onClick={() => onSelectActivity(null)}
                className="p-1.5 text-[#64737A] hover:text-[#17252B] rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 min-w-0">
              {/* Status Banner */}
              <div className="p-3.5 rounded-xl border border-[#E4E9E7] bg-[#F7F8F6] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[#64737A]">Caseworker: </span>
                  <strong className="text-[#17252B]">{selectedActivity.staffName}</strong>
                </div>
                <div>
                  <span className="text-[#64737A]">Region: </span>
                  <strong className="text-[#17252B]">{selectedActivity.regionName}</strong>
                </div>
                <div>
                  <span className="text-[#64737A]">Status: </span>
                  <strong className="capitalize text-[#176B68]">{selectedActivity.status.replace('_', ' ')}</strong>
                </div>
              </div>

              {/* Narrative Content */}
              <div>
                <h3 className="text-xs font-bold text-[#17252B] uppercase tracking-wide mb-2">
                  Operational Narrative & Observations
                </h3>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9E7] text-sm text-[#17252B] leading-relaxed whitespace-pre-wrap">
                  {selectedActivity.narrative}
                </div>
              </div>

              {/* GPS Geolocation & Structured Address Verification Box */}
              {selectedActivity.location ? (
                <div className="p-4 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#17252B]">
                    <ShieldCheck className="w-4 h-4 text-[#247A58]" />
                    <span>Cryptographic GPS Geolocation Stamp</span>
                  </div>

                  {/* Human-Readable Address Component */}
                  <div className="p-3 bg-white rounded-lg border border-[#E4E9E7] space-y-1.5">
                    <div className="text-[11px] font-bold text-[#176B68] uppercase tracking-wider">
                      Detected Location
                    </div>
                    <div className="text-sm font-bold text-[#17252B] leading-snug">
                      {selectedActivity.location.structuredAddress?.formattedAddress || selectedActivity.location.addressApprox || 'Coordinates logged'}
                    </div>

                    {selectedActivity.location.structuredAddress?.status === 'resolved' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-2 border-t border-[#E4E9E7] text-[11px]">
                        <div>
                          <span className="text-[#64737A] block font-medium">Area:</span>
                          <strong className="text-[#17252B] truncate block">{selectedActivity.location.structuredAddress.area || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[#64737A] block font-medium">City:</span>
                          <strong className="text-[#17252B] truncate block">{selectedActivity.location.structuredAddress.city || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[#64737A] block font-medium">District:</span>
                          <strong className="text-[#17252B] truncate block">{selectedActivity.location.structuredAddress.district || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[#64737A] block font-medium">State:</span>
                          <strong className="text-[#17252B] truncate block">{selectedActivity.location.structuredAddress.state || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[#64737A] block font-medium">Country:</span>
                          <strong className="text-[#17252B] truncate block">{selectedActivity.location.structuredAddress.country || '—'}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-[#64737A]">Latitude</div>
                      <div className="text-[#17252B] font-semibold">{selectedActivity.location.latitude.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64737A]">Longitude</div>
                      <div className="text-[#17252B] font-semibold">{selectedActivity.location.longitude.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64737A]">Accuracy Radius</div>
                      <div className="text-[#247A58] font-semibold">Approximately {selectedActivity.location.accuracy} meters</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#E4E9E7] text-[11px] text-[#64737A]">
                    Captured at: {new Date(selectedActivity.location.capturedAt).toISOString()} · Source: Hardware GNSS
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] text-xs text-[#64737A]">
                  No GPS coordinates recorded (field exception applied).
                </div>
              )}

              {/* Attached Evidence Media */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#17252B] uppercase tracking-wide">
                    Evidence Media & Attachments ({selectedActivity.mediaAssets.length})
                  </h3>
                  {(() => {
                    const isManager = currentUser?.role === 'operations_manager' || currentUser?.role === 'system_admin';
                    const isOwner = Boolean(
                      currentUser?.id && 
                      selectedActivity.staffId && 
                      (currentUser.id === selectedActivity.staffId || currentUser.email === selectedActivity.staffName)
                    );
                    const canAccess = isManager || isOwner;

                    return canAccess ? (
                      <span className="text-[10px] text-[#247A58] font-semibold bg-[#247A58]/10 px-2 py-0.5 rounded-full border border-[#247A58]/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        {isManager ? 'Manager Clearance: Full Access' : 'Ownership Verified: Full Access'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#C34D4D] font-semibold bg-[#C34D4D]/10 px-2 py-0.5 rounded-full border border-[#C34D4D]/20 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Restricted: Other Caseworker's Upload
                      </span>
                    );
                  })()}
                </div>

                {selectedActivity.mediaAssets.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedActivity.mediaAssets.map((asset) => {
                      const isManager = currentUser?.role === 'operations_manager' || currentUser?.role === 'system_admin';
                      const isOwner = Boolean(
                        currentUser?.id && 
                        selectedActivity.staffId && 
                        (currentUser.id === selectedActivity.staffId || currentUser.email === selectedActivity.staffName)
                      );
                      const canAccess = isManager || isOwner;

                      return (
                        <div
                          key={asset.id}
                          className={`p-3 rounded-xl border space-y-2 flex flex-col justify-between transition-colors ${
                            canAccess ? 'border-[#E4E9E7] bg-[#F7F8F6]' : 'border-[#C34D4D]/20 bg-[#C34D4D]/5'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#17252B] truncate" title={asset.filename}>
                                {asset.filename}
                              </span>
                              {canAccess ? (
                                <span className="text-[10px] text-[#247A58] font-semibold font-mono bg-[#247A58]/10 px-1.5 py-0.5 rounded">
                                  CLEAN
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#C34D4D] font-semibold font-mono bg-[#C34D4D]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  LOCKED
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#64737A] font-mono break-all">
                              SHA-256: {asset.sha256Hash.slice(0, 24)}...
                            </div>
                            <div className="text-[11px] text-[#64737A]">
                              Size: {(asset.sizeBytes / 1024).toFixed(0)} KB · {asset.mimeType}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#E4E9E7]/80 flex items-center justify-between">
                            {canAccess ? (
                              <>
                                <span className="text-[10px] text-[#64737A] font-mono">15m Signed Token</span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewMedia(asset)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#176B68] bg-white border border-[#176B68]/30 rounded-lg hover:bg-[#176B68]/10 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Preview Evidence</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-[#C34D4D]">Author Access Only</span>
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#64737A] bg-[#E4E9E7]/50 border border-[#E4E9E7] rounded-lg opacity-70 cursor-not-allowed"
                                  title="Field caseworkers cannot access other users' uploaded evidence"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Restricted</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-[#64737A] italic">No attachments attached to this report.</div>
                )}
              </div>
            </div>

            {/* Secure Media Preview Modal with Short-Lived Signed URLs & PDF Thumbnail Rendering */}
            <SecureMediaPreviewModal
              isOpen={Boolean(previewMedia)}
              onClose={() => setPreviewMedia(null)}
              media={previewMedia}
              activity={selectedActivity}
              currentUser={currentUser || null}
            />

            <div className="px-4 sm:px-6 py-3 border-t border-[#E4E9E7] bg-[#F7F8F6] flex justify-end">
              <button
                onClick={() => onSelectActivity(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#17252B] bg-white border border-[#E4E9E7] rounded-lg hover:bg-[#E4E9E7] transition-colors text-center cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

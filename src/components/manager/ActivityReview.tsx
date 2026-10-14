import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  FileText, 
  ShieldCheck, 
  Camera,
  X,
  Clock,
  Eye,
  Download,
  Loader2,
  Lock
} from 'lucide-react';
import type { Activity, FeedbackType, Region, MediaAsset, User } from '../../types';
import { SecureMediaPreviewModal } from '../common/SecureMediaPreviewModal';

interface ActivityReviewProps {
  activities: Activity[];
  regions: Region[];
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity | null) => void;
  onUpdateStatus: (id: string, status: Activity['status'], note?: string) => Promise<void>;
  onSendFeedback: (payload: { activityId: string; type: FeedbackType; message: string }) => Promise<void>;
  currentUser?: User;
}

export const ActivityReview: React.FC<ActivityReviewProps> = ({
  activities,
  regions,
  selectedActivity,
  onSelectActivity,
  onUpdateStatus,
  onSendFeedback,
  currentUser,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Feedback Composer state
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('operational_guidance');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const filtered = activities.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.narrative.toLowerCase().includes(search.toLowerCase()) ||
      a.staffName.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || a.regionId === selectedRegion;
    const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
    return matchesSearch && matchesRegion && matchesStatus;
  });

  const [reviewError, setReviewError] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaAsset | null>(null);

  const handleSendFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !feedbackText.trim()) return;

    setIsSubmittingFeedback(true);
    setReviewError(null);
    try {
      await onSendFeedback({
        activityId: selectedActivity.id,
        type: feedbackType,
        message: feedbackText.trim(),
      });
      setFeedbackText('');
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (err: any) {
      setReviewError(`Feedback dispatch error: ${err.message}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleQuickStatusChange = async (status: Activity['status']) => {
    if (!selectedActivity) return;
    setReviewError(null);
    try {
      await onUpdateStatus(
        selectedActivity.id, 
        status, 
        feedbackText.trim() ? feedbackText.trim() : undefined
      );
      if (feedbackText.trim()) setFeedbackText('');
    } catch (err: any) {
      setReviewError(`Status update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Title & Filter Bar */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <h1 className="text-xl font-bold tracking-tight text-[#17252B]">
          Field Case Dossiers & Supervisory Review
        </h1>
        <p className="text-xs text-[#64737A] mt-0.5">
          Inspect caseworker reports, verify GNSS coordinates, and issue directives or commendations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64737A] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff name or narrative..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B]"
            />
          </div>

          <div>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              aria-label="Filter by Assigned Region"
              className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B] font-medium"
            >
              <option value="all">All Operational Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by Review Status"
              className="w-full px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B] font-medium"
            >
              <option value="all">All Review States</option>
              <option value="under_review">Awaiting Review</option>
              <option value="approved">Approved</option>
              <option value="revision_requested">Revision Requested</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Master Feed on Left, Selected Dossier on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List Column */}
        <div className="lg:col-span-5 bg-white border border-[#E4E9E7] rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#64737A] px-2 pb-3 border-b border-[#E4E9E7]">
            Showing {filtered.length} Case Records
          </div>

          <div className="divide-y divide-[#E4E9E7] mt-1 max-h-[750px] overflow-y-auto">
            {filtered.map((act) => {
              const isSelected = selectedActivity?.id === act.id;
              return (
                <div
                  key={act.id}
                  onClick={() => onSelectActivity(act)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-colors space-y-1.5 ${
                    isSelected
                      ? 'bg-[#176B68]/10 border border-[#176B68]/30'
                      : 'hover:bg-[#F7F8F6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#17252B] truncate">{act.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        act.status === 'approved'
                          ? 'text-[#247A58] bg-[#247A58]/10'
                          : act.status === 'revision_requested'
                          ? 'text-[#C34D4D] bg-[#C34D4D]/10'
                          : 'text-[#B7791F] bg-[#B7791F]/10'
                      }`}
                    >
                      {act.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-[#64737A] line-clamp-2">{act.narrative}</p>

                  <div className="flex items-center justify-between text-[11px] text-[#64737A] pt-1">
                    <span className="font-medium text-[#17252B]">{act.staffName}</span>
                    <span className="font-mono tabular-nums">
                      {new Date(act.clientCapturedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Inspection Column */}
        <div className="lg:col-span-7 bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
          {reviewError && (
            <div className="mb-4 p-3 bg-[#C34D4D]/10 border border-[#C34D4D]/30 rounded-xl text-xs text-[#C34D4D] flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{reviewError}</span>
            </div>
          )}

          {selectedActivity ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#E4E9E7]">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-[#176B68] font-bold">
                    Case #{selectedActivity.id.slice(0, 8)} · {selectedActivity.regionName}
                  </div>
                  <h2 className="text-lg font-bold text-[#17252B] mt-0.5 truncate">
                    {selectedActivity.title}
                  </h2>
                  <div className="text-xs text-[#64737A] mt-1">
                    Filed by <strong>{selectedActivity.staffName}</strong> on{' '}
                    {new Date(selectedActivity.clientCapturedAt).toLocaleString()}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleQuickStatusChange('approved')}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-white bg-[#247A58] hover:bg-[#1e6649] rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange('revision_requested')}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-[#C34D4D] bg-[#C34D4D]/10 hover:bg-[#C34D4D]/20 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Request Revision</span>
                  </button>
                </div>
              </div>

              {/* Narrative Text */}
              <div>
                <h3 className="text-xs font-bold text-[#17252B] uppercase tracking-wide mb-2">
                  Caseworker Field Narrative
                </h3>
                <div className="p-4 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7] text-sm text-[#17252B] leading-relaxed whitespace-pre-wrap">
                  {selectedActivity.narrative}
                </div>
              </div>

              {/* GPS Data & Human-Readable Location Check */}
              {selectedActivity.location ? (
                <div className="p-4 rounded-xl bg-[#F7F8F6] border border-[#E4E9E7] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#17252B]">
                    <ShieldCheck className="w-4 h-4 text-[#247A58]" />
                    <span>PostGIS Geolocation & Address Verification</span>
                  </div>

                  {/* Human-Readable Location Card */}
                  <div className="p-3 bg-white rounded-lg border border-[#E4E9E7] space-y-1.5">
                    <div className="text-[11px] font-bold text-[#176B68] uppercase tracking-wider">
                      Detected Location
                    </div>
                    <div className="text-sm font-bold text-[#17252B] leading-snug">
                      {selectedActivity.location.structuredAddress?.formattedAddress || selectedActivity.location.addressApprox || 'Coordinates acquired'}
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
                      <div className="text-[10px] text-[#64737A]">Lat/Lng Coordinates</div>
                      <div className="font-bold text-[#17252B]">
                        {selectedActivity.location.latitude.toFixed(6)}, {selectedActivity.location.longitude.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64737A]">Accuracy Radius</div>
                      <div className="font-bold text-[#247A58]">Approximately {selectedActivity.location.accuracy} meters</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64737A]">Timestamp</div>
                      <div className="text-[#64737A]">
                        {new Date(selectedActivity.location.capturedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] text-xs text-[#64737A]">
                  No GPS coordinates recorded with this entry.
                </div>
              )}

              {/* Media Gallery */}
              {selectedActivity.mediaAssets.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-[#17252B] uppercase tracking-wide">
                      Attached Evidence ({selectedActivity.mediaAssets.length})
                    </h3>
                    <span className="text-[10px] text-[#176B68] font-semibold bg-[#176B68]/10 px-2 py-0.5 rounded-full border border-[#176B68]/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Managerial Clearance: Full Access
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedActivity.mediaAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="p-3 bg-[#F7F8F6] border border-[#E4E9E7] rounded-xl text-xs space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#17252B] truncate text-xs" title={asset.filename}>
                              {asset.filename}
                            </span>
                            <span className="text-[10px] text-[#247A58] font-semibold bg-[#247A58]/10 px-1.5 py-0.5 rounded">
                              CLEAN
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-[#64737A]">
                            SHA-256: {asset.sha256Hash.slice(0, 20)}...
                          </div>
                          <div className="text-[11px] text-[#64737A]">
                            Size: {(asset.sizeBytes / 1024).toFixed(0)} KB · {asset.mimeType}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E4E9E7]/80 flex items-center justify-between">
                          <span className="text-[10px] text-[#64737A] font-mono">Author: {selectedActivity.staffName}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewMedia(asset)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#176B68] bg-white border border-[#176B68]/30 rounded-lg hover:bg-[#176B68]/10 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview Evidence</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Secure Media Preview Modal with Short-Lived Signed URLs & PDF Thumbnail Rendering */}
              <SecureMediaPreviewModal
                isOpen={Boolean(previewMedia)}
                onClose={() => setPreviewMedia(null)}
                media={previewMedia}
                activity={selectedActivity}
                currentUser={currentUser || null}
              />

              {/* Direct Feedback Composer */}
              <div className="p-5 rounded-2xl bg-[#F7F8F6] border border-[#E4E9E7]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#17252B] uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#176B68]" />
                    <span>Issue Managerial Directive / Feedback</span>
                  </h3>
                  {feedbackSuccess && (
                    <span className="text-xs text-[#247A58] font-bold">
                      Directive dispatched to caseworker!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSendFeedbackSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'operational_guidance', label: 'Guidance' },
                      { id: 'commendation', label: 'Commendation' },
                      { id: 'revision_request', label: 'Revision' },
                      { id: 'improvement_suggestion', label: 'Suggestion' },
                      { id: 'follow_up_required', label: 'Follow-Up' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFeedbackType(t.id as FeedbackType)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                          feedbackType === t.id
                            ? 'bg-[#17252B] text-white border-[#17252B]'
                            : 'bg-white text-[#64737A] border-[#E4E9E7] hover:border-[#17252B]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Enter confidential guidance, praise, or revision expectations for this caseworker..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B]"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingFeedback || !feedbackText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Directive</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center">
              <FileText className="w-12 h-12 text-[#64737A]/30 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[#17252B]">No Case Selected</h3>
              <p className="text-xs text-[#64737A] mt-1 max-w-xs mx-auto">
                Select an activity report from the left column to inspect evidence, review narrative observations, or issue directives.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

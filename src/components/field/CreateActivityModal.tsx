import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  Upload, 
  FileText, 
  Video, 
  Save, 
  Send, 
  AlertCircle, 
  Check, 
  Loader2, 
  Trash2,
  ShieldCheck
} from 'lucide-react';
import type { Activity, LocationData, MediaAsset, Region, User } from '../../types';
import { getCurrentGPSLocation } from '../../services/geo';
import { storeLocalMediaAttachment } from '../../services/media';
import { localDb } from '../../services/db';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  regions: Region[];
  isOnline: boolean;
  onSubmit: (activity: Activity) => Promise<void>;
}

const CATEGORIES = [
  { id: 'safehouse_intake', label: 'Safehouse Intake & Reception' },
  { id: 'direct_assistance', label: 'Emergency Direct Assistance' },
  { id: 'surveillance_patrol', label: 'Transit Watch & Surveillance' },
  { id: 'medical_outreach', label: 'Medical & Psychological Triage' },
  { id: 'legal_support', label: 'Legal Safeguard & Documentation' },
  { id: 'community_education', label: 'Community Prevention Outreach' },
];

export const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  regions,
  isOnline,
  onSubmit,
}) => {
  const [draftId, setDraftId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Activity['category']>('safehouse_intake');
  const [regionId, setRegionId] = useState(currentUser.regions[0] || 'reg-east-africa');
  const [narrative, setNarrative] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<any>(null);

  // Initialize or restore active draft on open
  useEffect(() => {
    if (isOpen) {
      loadOrCreateDraft();
    }
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [isOpen]);

  // Periodic Auto-Drafting to IndexedDB every 5 seconds if dirty
  useEffect(() => {
    if (!isOpen || !draftId) return;

    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraftToIndexedDB(true);
    }, 4000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, narrative, category, regionId, location, mediaAssets]);

  const loadOrCreateDraft = async () => {
    try {
      const existingDraft = await localDb.drafts.orderBy('updatedAt').reverse().first();
      if (existingDraft && existingDraft.data) {
        setDraftId(existingDraft.id);
        setTitle(existingDraft.data.title || '');
        setCategory((existingDraft.data.category as Activity['category']) || 'safehouse_intake');
        setRegionId(existingDraft.data.regionId || currentUser.regions[0] || 'reg-east-africa');
        setNarrative(existingDraft.data.narrative || '');
        if (existingDraft.data.location) setLocation(existingDraft.data.location);
        if (existingDraft.data.mediaAssets) setMediaAssets(existingDraft.data.mediaAssets);
        setLastAutoSavedAt(existingDraft.updatedAt);
        return;
      }
    } catch (e) {
      console.warn('Failed to inspect drafts:', e);
    }

    // Create fresh draft ID
    const newId = crypto.randomUUID();
    setDraftId(newId);
    setTitle('');
    setNarrative('');
    setLocation(null);
    setMediaAssets([]);
  };

  const saveDraftToIndexedDB = async (isAuto = false) => {
    if (!draftId || (!title && !narrative)) return;
    try {
      const now = new Date().toISOString();
      await localDb.drafts.put({
        id: draftId,
        updatedAt: now,
        isAutoSaved: isAuto,
        data: {
          id: draftId,
          title,
          category,
          regionId,
          narrative,
          location: location || undefined,
          mediaAssets,
        },
      });
      setLastAutoSavedAt(now);
    } catch (err) {
      console.error('Draft save failure:', err);
    }
  };

  const handleCaptureGPS = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const res = await getCurrentGPSLocation(50, 15000, isOnline);
      if (res.location) {
        setLocation(res.location);
      }
      if (res.error) {
        setLocationError(res.error);
      }
    } catch (err: any) {
      setLocationError(err.message || 'GPS coordinates unavailable');
    } finally {
      setIsLocating(false);
    }
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setFormError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { mediaAsset } = await storeLocalMediaAttachment(draftId, file);
        setMediaAssets((prev) => [...prev, mediaAsset]);
      }
    } catch (err: any) {
      setFormError(`Media ingest note: ${err.message}`);
    } finally {
      setIsProcessingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    setMediaAssets((prev) => prev.filter((m) => m.id !== mediaId));
    await localDb.mediaBlobs.delete(mediaId);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('Please provide a brief operational title.');
      return;
    }
    if (!narrative.trim()) {
      setFormError('Please enter your field narrative description.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedReg = regions.find((r) => r.id === regionId);
      const activityPayload: Activity = {
        id: draftId,
        idempotencyKey: `idemp-${draftId}`,
        staffId: currentUser.id,
        staffName: currentUser.name,
        regionId,
        regionName: selectedReg ? selectedReg.name : 'Regional Field Command',
        title: title.trim(),
        narrative: narrative.trim(),
        category,
        clientCapturedAt: new Date().toISOString(),
        location: location || undefined,
        mediaAssets,
        status: isOnline ? 'under_review' : 'pending_sync',
        version: 1,
        syncStatus: isOnline ? 'synced' : 'pending',
        tags: [category.replace('_', ' ')],
        feedbackCount: 0,
      };

      await onSubmit(activityPayload);

      // Clean up the draft now that it's queued or submitted
      await localDb.drafts.delete(draftId);
      onClose();
    } catch (err: any) {
      setFormError(`Failed to save activity: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17252B]/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E4E9E7] overflow-hidden my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh] min-w-0">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E4E9E7] flex items-center justify-between bg-[#F7F8F6]">
          <div className="min-w-0 pr-2">
            <h2 className="text-base font-bold text-[#17252B] truncate">New Case & Field Activity Report</h2>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#64737A] mt-0.5">
              <span className="truncate">Field Caseworker: {currentUser.name}</span>
              <span aria-hidden="true">·</span>
              {lastAutoSavedAt && (
                <span className="text-[#247A58] flex items-center gap-1 font-mono text-[11px] shrink-0">
                  <Check className="w-3 h-3" /> Auto-saved {new Date(lastAutoSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64737A] hover:text-[#17252B] hover:bg-[#E4E9E7] rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 min-w-0">
          {formError && (
            <div className="p-3 bg-[#C34D4D]/10 border border-[#C34D4D]/30 rounded-xl text-xs text-[#C34D4D] flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Operational Title */}
          <div>
            <label className="block text-xs font-bold text-[#17252B] mb-1.5">
              Activity Title / Focus Area *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Safehouse intake assessment for referral #402"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] focus:ring-1 focus:ring-[#176B68] text-[#17252B]"
            />
          </div>

          {/* Category & Region Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                Activity Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B] font-medium"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                Designated Operational Region *
              </label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B] font-medium"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Narrative Textarea (Core Humanitarian Field Record) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#17252B]">
                Confidential Field Narrative & Observations *
              </label>
              <span className="text-[11px] font-mono text-[#64737A]">
                {narrative.length} characters
              </span>
            </div>
            <textarea
              rows={5}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Record factual observations, safety concerns, triage evaluations, or escort details. Do not include unencrypted identities without institutional clearance."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] focus:ring-1 focus:ring-[#176B68] text-[#17252B] placeholder:text-[#64737A]/60"
            />
          </div>

          {/* GPS Location Capture Section */}
          <div className="p-4 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#176B68]" />
                  <span className="text-xs font-bold text-[#17252B]">
                    GPS Geolocation Verification
                  </span>
                </div>
                <p className="text-[11px] text-[#64737A] mt-1 leading-relaxed">
                  Attaches verifiable satellite latitude and longitude coordinates.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCaptureGPS}
                disabled={isLocating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#17252B] hover:bg-[#176B68] rounded-lg transition-colors shrink-0 disabled:opacity-50"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Acquiring Lock...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{location ? 'Re-acquire GPS' : 'Capture GPS'}</span>
                  </>
                )}
              </button>
            </div>

            {location && (
              <div className="mt-3 pt-3 border-t border-[#E4E9E7]/60 space-y-2 text-xs">
                {/* Human-Readable Address Header */}
                <div className="bg-white p-3 rounded-lg border border-[#E4E9E7] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#176B68]">
                    <ShieldCheck className="w-4 h-4 text-[#247A58]" />
                    <span>Detected Location</span>
                  </div>
                  <div className="text-sm font-bold text-[#17252B] mt-1 leading-snug">
                    {location.structuredAddress?.formattedAddress || location.addressApprox || 'Coordinates acquired'}
                  </div>

                  {location.structuredAddress?.status === 'resolved' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2 pt-2 border-t border-[#E4E9E7] text-[11px]">
                      <div>
                        <span className="text-[#64737A] block font-medium">Area:</span>
                        <strong className="text-[#17252B] truncate block">{location.structuredAddress.area || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[#64737A] block font-medium">City:</span>
                        <strong className="text-[#17252B] truncate block">{location.structuredAddress.city || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[#64737A] block font-medium">District:</span>
                        <strong className="text-[#17252B] truncate block">{location.structuredAddress.district || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[#64737A] block font-medium">State:</span>
                        <strong className="text-[#17252B] truncate block">{location.structuredAddress.state || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[#64737A] block font-medium">Country:</span>
                        <strong className="text-[#17252B] truncate block">{location.structuredAddress.country || '—'}</strong>
                      </div>
                    </div>
                  )}

                  {location.structuredAddress?.status === 'pending' && (
                    <div className="text-[11px] text-[#B7791F] font-medium mt-1.5 flex items-center gap-1">
                      <span>Offline capture: Address resolution queued for next sync.</span>
                    </div>
                  )}
                </div>

                {/* Accuracy & Technical Geodesic Coordinates */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64737A] px-1">
                  <span>Accuracy: <strong className="font-mono text-[#17252B]">Approximately {location.accuracy} meters</strong></span>
                  <span className="font-mono">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                  <span>{new Date(location.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}

            {locationError && (
              <div className="mt-2 text-[11px] text-[#B7791F] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}
          </div>

          {/* Media Attachments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#17252B]">
                Evidence Media & Supporting Documents ({mediaAssets.length}) <span className="text-[#64737A] font-normal">(Max 50 MB / file)</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,application/pdf,video/mp4"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingMedia}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#176B68] hover:bg-[#176B68]/10 rounded-lg transition-colors border border-[#176B68]/30"
              >
                {isProcessingMedia ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>Add Photos / Documents</span>
              </button>
            </div>

            {mediaAssets.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative p-2.5 bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-[#176B68] shrink-0 border border-[#E4E9E7]">
                        {asset.mimeType.startsWith('image/') ? (
                          <Camera className="w-3.5 h-3.5" />
                        ) : asset.mimeType.includes('pdf') ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : (
                          <Video className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(asset.id)}
                        className="text-[#64737A] hover:text-[#C34D4D] p-0.5 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {asset.thumbnailUrl && (
                      <img
                        src={asset.thumbnailUrl}
                        alt="Preview"
                        className="w-full h-20 object-cover rounded mb-1.5 border border-[#E4E9E7]"
                      />
                    )}

                    <div className="text-[11px] font-medium text-[#17252B] truncate" title={asset.filename}>
                      {asset.filename}
                    </div>
                    <div className="text-[10px] text-[#64737A] font-mono mt-0.5">
                      {(asset.sizeBytes / 1024).toFixed(0)} KB · SHA-256 Verified
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[#E4E9E7] rounded-xl p-4 text-center text-xs text-[#64737A]">
                No attachments uploaded. Photographs, intake forms, and case notes are stored locally in IndexedDB until synchronized.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#E4E9E7] bg-[#F7F8F6] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={() => saveDraftToIndexedDB(false)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#17252B] hover:bg-white rounded-lg border border-[#E4E9E7] transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-semibold text-[#64737A] hover:text-[#17252B] transition-colors text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-[#176B68] hover:bg-[#208783] rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isOnline ? 'Submit for Review' : 'Queue Offline Report'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

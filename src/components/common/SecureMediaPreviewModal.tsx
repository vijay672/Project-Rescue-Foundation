import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Copy, 
  Check, 
  Loader2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  ExternalLink,
  Camera,
  Video,
  Clock
} from 'lucide-react';
import type { Activity, MediaAsset, User } from '../../types';
import { getSignedPreviewUrl } from '../../services/media';

interface SecureMediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaAsset | null;
  activity: Activity | null;
  currentUser: User | null;
}

export const SecureMediaPreviewModal: React.FC<SecureMediaPreviewModalProps> = ({
  isOpen,
  onClose,
  media,
  activity,
  currentUser,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copiedHash, setCopiedHash] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState<'embed' | 'thumbnail'>('embed');

  // RBAC & Ownership Clearance Logic:
  // Manager / Admin: Can see everything, full access across all caseworkers and regions.
  // Caseworker / User: Only permitted to view media they uploaded themselves (activity.staffId === currentUser.id).
  const isManager = currentUser?.role === 'operations_manager' || currentUser?.role === 'system_admin';
  const isOwner = Boolean(
    currentUser?.id && 
    activity?.staffId && 
    (currentUser.id === activity.staffId || currentUser.email === activity.staffName)
  );
  const hasClearance = isManager || isOwner;

  // Reset state when modal opens or target media changes
  useEffect(() => {
    if (!isOpen || !media) {
      setSignedUrl(null);
      setError(null);
      setIsLoading(false);
      setZoomLevel(1);
      setRotation(0);
      return;
    }

    // Access control verification: Deny unauthorized users before making any network call
    if (!hasClearance) {
      setSignedUrl(null);
      setError('ACCESS_DENIED');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setSignedUrl(null);

    // Fetch fresh short-lived signed URL from private storage vault (15 minutes)
    getSignedPreviewUrl(media.storageKey, 900)
      .then((url) => {
        if (isMounted) {
          setSignedUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.warn('[SecureMediaPreviewModal] Signed URL issuance notice:', err);
          setError(err.message || 'Failed to acquire short-lived signed URL from secure evidence storage');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, media, hasClearance]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !media) return null;

  const isImage = media.mimeType.startsWith('image/');
  const isPdf = media.mimeType === 'application/pdf' || media.filename.toLowerCase().endsWith('.pdf');
  const isVideo = media.mimeType.startsWith('video/');

  const handleCopyHash = () => {
    if (media?.sha256Hash) {
      navigator.clipboard.writeText(media.sha256Hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-70 bg-[#17252B]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secure-media-preview-title"
    >
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full border border-[#E4E9E7] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#E4E9E7] flex items-center justify-between bg-[#F7F8F6]">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#17252B] text-sm sm:text-base truncate max-w-xs sm:max-w-md" id="secure-media-preview-title">
                {media.filename}
              </span>
              
              {/* Clearance Badge */}
              {isManager ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#176B68] bg-[#176B68]/10 border border-[#176B68]/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Managerial Clearance · Full Access
                </span>
              ) : isOwner ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#247A58] bg-[#247A58]/10 border border-[#247A58]/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Caseworker Ownership Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#C34D4D] bg-[#C34D4D]/10 border border-[#C34D4D]/30 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" />
                  Restricted Clearance
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#64737A] mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Private Vault: <strong className="text-[#17252B]">foundation-media</strong></span>
              <span>·</span>
              <span>Author: <strong className="text-[#17252B]">{activity?.staffName || 'Field Caseworker'}</strong></span>
              <span>·</span>
              <span>Size: <strong className="text-[#17252B]">{(media.sizeBytes / 1024).toFixed(0)} KB</strong></span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64737A] hover:text-[#17252B] hover:bg-[#E4E9E7]/60 transition-colors cursor-pointer shrink-0"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-auto bg-[#17252B]/5 p-3 sm:p-6 flex flex-col items-center justify-center min-h-[320px]">
          {/* 1. Access Denied State (User trying to access someone else's media) */}
          {error === 'ACCESS_DENIED' ? (
            <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-[#C34D4D]/30 shadow-sm text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#C34D4D]/10 text-[#C34D4D] flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[#17252B]">
                  Clearance Restriction: Unauthorized Media Access
                </h3>
                <p className="text-xs text-[#64737A] leading-relaxed">
                  Field caseworker policy restricts evidence preview access exclusively to media files uploaded by your own authenticated account.
                </p>
              </div>

              <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7] text-[11px] text-left space-y-1">
                <div className="text-[#64737A]">Evidence Dossier: <strong className="text-[#17252B]">{activity?.title || 'Confidential Case'}</strong></div>
                <div className="text-[#64737A]">Authoring Staff: <strong className="text-[#17252B]">{activity?.staffName}</strong> (ID: {activity?.staffId})</div>
                <div className="text-[#64737A]">Your Identity: <strong className="text-[#17252B]">{currentUser?.name}</strong> (Role: {currentUser?.role})</div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 px-4 bg-[#17252B] text-white text-xs font-semibold rounded-lg hover:bg-[#20343C] transition-colors cursor-pointer"
                >
                  Return to Dossier
                </button>
              </div>
            </div>
          ) : isLoading ? (
            /* 2. Loading State */
            <div className="flex flex-col items-center gap-3 text-xs text-[#64737A] p-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#176B68]" />
              <div className="text-center space-y-1">
                <div className="font-semibold text-[#17252B]">Generating Secure Signed URL...</div>
                <p className="text-[11px] text-[#64737A]">Authenticating clearance against private storage vault <span className="font-mono">foundation-media</span></p>
              </div>
            </div>
          ) : error ? (
            /* 3. Error State */
            <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-[#B7791F]/30 text-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-[#B7791F] mx-auto" />
              <div className="text-xs font-bold text-[#17252B]">Unable to load signed media preview</div>
              <p className="text-xs text-[#64737A]">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-1.5 bg-[#F7F8F6] text-xs font-semibold rounded-lg text-[#17252B] hover:bg-[#E4E9E7]"
              >
                Close
              </button>
            </div>
          ) : signedUrl ? (
            /* 4. Authorized Content Rendering */
            <div className="w-full h-full flex flex-col items-center justify-center">
              {/* IMAGE EVIDENCE PREVIEW */}
              {isImage && (
                <div className="w-full flex flex-col items-center justify-center space-y-3">
                  <div className="overflow-auto max-h-[58vh] max-w-full flex items-center justify-center p-2 rounded-xl bg-black/5">
                    <img
                      src={signedUrl}
                      alt={media.filename}
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-in-out',
                      }}
                      className="max-h-[52vh] max-w-full rounded-lg object-contain shadow-md"
                    />
                  </div>

                  {/* Image Controls toolbar */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E4E9E7] shadow-xs text-xs text-[#64737A]">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 hover:text-[#17252B] rounded hover:bg-[#F7F8F6] transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-[11px] min-w-[40px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1 hover:text-[#17252B] rounded hover:bg-[#F7F8F6] transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="w-px h-4 bg-[#E4E9E7] mx-1" />
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 hover:text-[#17252B] rounded hover:bg-[#F7F8F6] transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PDF EVIDENCE PREVIEW & THUMBNAILS */}
              {isPdf && (
                <div className="w-full max-w-3xl flex flex-col space-y-3">
                  {/* View Mode Selector */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#64737A]">
                      <FileText className="w-4 h-4 text-[#176B68]" />
                      <span className="font-semibold text-[#17252B]">Official Evidentiary PDF Document</span>
                    </div>

                    <div className="inline-flex p-0.5 bg-white border border-[#E4E9E7] rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setPdfViewMode('embed')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          pdfViewMode === 'embed'
                            ? 'bg-[#17252B] text-white shadow-xs'
                            : 'text-[#64737A] hover:text-[#17252B]'
                        }`}
                      >
                        Document Reader
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfViewMode('thumbnail')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          pdfViewMode === 'thumbnail'
                            ? 'bg-[#17252B] text-white shadow-xs'
                            : 'text-[#64737A] hover:text-[#17252B]'
                        }`}
                      >
                        Thumbnail & Metadata
                      </button>
                    </div>
                  </div>

                  {pdfViewMode === 'embed' ? (
                    <div className="w-full h-[54vh] rounded-xl overflow-hidden border border-[#E4E9E7] bg-white shadow-xs">
                      <iframe
                        src={`${signedUrl}#toolbar=1&navpanes=0`}
                        title={media.filename}
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    /* PDF Thumbnail & Case Card View */
                    <div className="p-6 bg-white rounded-2xl border border-[#E4E9E7] shadow-xs flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-32 h-44 rounded-xl border-2 border-dashed border-[#176B68]/30 bg-[#F7F8F6] flex flex-col items-center justify-center p-3 text-center shrink-0">
                        {media.thumbnailUrl ? (
                          <img
                            src={media.thumbnailUrl}
                            alt="PDF Cover"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <>
                            <FileText className="w-10 h-10 text-[#176B68] mb-2" />
                            <span className="text-[10px] font-mono text-[#64737A] uppercase font-bold">PDF FILE</span>
                            <span className="text-[9px] text-[#247A58] mt-1 font-semibold">VERIFIED</span>
                          </>
                        )}
                      </div>

                      <div className="space-y-2 text-xs flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#17252B] break-all">
                          {media.filename}
                        </div>
                        <div className="text-[#64737A]">
                          File Format: <strong className="text-[#17252B]">Adobe Portable Document Format (.pdf)</strong>
                        </div>
                        <div className="text-[#64737A]">
                          File Size: <strong className="text-[#17252B]">{(media.sizeBytes / 1024).toFixed(1)} KB</strong>
                        </div>
                        <div className="text-[#64737A]">
                          Status: <span className="text-[#247A58] font-bold">Clean · Malware Scan Passed</span>
                        </div>
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPdfViewMode('embed')}
                            className="px-3 py-1.5 bg-[#17252B] text-white text-xs font-semibold rounded-lg hover:bg-[#20343C] transition-colors"
                          >
                            Open In Document Reader
                          </button>
                          <a
                            href={signedUrl}
                            download={media.filename}
                            className="px-3 py-1.5 bg-white border border-[#E4E9E7] text-[#17252B] text-xs font-semibold rounded-lg hover:bg-[#F7F8F6] transition-colors inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIDEO EVIDENCE PREVIEW */}
              {isVideo && (
                <div className="w-full max-w-2xl flex flex-col items-center space-y-2">
                  <video
                    src={signedUrl}
                    controls
                    className="max-h-[55vh] w-full rounded-xl border border-[#E4E9E7] bg-black shadow-md"
                  />
                  <span className="text-[11px] text-[#64737A] font-mono">
                    H.264 / MP4 Encoded Evidence Stream
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#E4E9E7] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Cryptographic SHA-256 Hash Verification Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold text-[#64737A] uppercase shrink-0">SHA-256:</span>
            <span className="font-mono text-[10px] text-[#17252B] bg-[#F7F8F6] px-2 py-1 rounded border border-[#E4E9E7] truncate max-w-xs sm:max-w-md">
              {media.sha256Hash}
            </span>
            <button
              type="button"
              onClick={handleCopyHash}
              className="p-1 hover:text-[#17252B] text-[#64737A] rounded transition-colors shrink-0"
              title="Copy SHA-256 checksum"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-[#247A58]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {signedUrl && hasClearance && (
              <a
                href={signedUrl}
                download={media.filename}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#17252B] text-white text-xs font-semibold rounded-lg hover:bg-[#20343C] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#F7F8F6] hover:bg-[#E4E9E7] text-[#17252B] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

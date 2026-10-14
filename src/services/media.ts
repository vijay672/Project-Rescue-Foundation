import { localDb } from './db';
import type { MediaAsset, MediaMimeType } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

export const SUPABASE_STORAGE_BUCKET = 'foundation-media';

export const ALLOWED_MIME_TYPES: MediaMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
];

// Supabase Free Plan enforces a strict 50 MB per-file upload limit
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 52,428,800 bytes

/**
 * Validates a file against Supabase Storage bucket rules before staging or uploading
 */
export function validateMediaFile(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type as MediaMimeType)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type || 'unknown'}". Allowed formats: JPEG, PNG, WebP, PDF, MP4.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the Supabase Free plan maximum limit of 50 MB per file.`,
    };
  }

  return { valid: true };
}

/**
 * Compute real SHA-256 hash using the Web Cryptography API
 */
export async function computeSHA256(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate client-side thumbnail data URL for offline image previews.
 * Optimizes mobile viewport rendering without modifying or recompressing
 * the original evidentiary file binary.
 */
export async function generateClientThumbnail(file: Blob, maxWidth = 320): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return '';
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = maxWidth / img.width;
      const width = Math.min(maxWidth, img.width);
      const height = img.width > maxWidth ? img.height * scale : img.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

/**
 * Ingest and locally persist a media attachment in IndexedDB.
 * Enforces the 50 MB Supabase Free plan limit and supported MIME types.
 */
export async function storeLocalMediaAttachment(
  activityId: string,
  file: File
): Promise<{ mediaAsset: MediaAsset; localBlobId: string }> {
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sha256 = await computeSHA256(file);
  const mediaId = crypto.randomUUID();
  let thumbnailUrl = '';

  if (file.type.startsWith('image/')) {
    thumbnailUrl = await generateClientThumbnail(file, 280);
  }

  // Store in Dexie IndexedDB
  await localDb.mediaBlobs.put({
    id: mediaId,
    activityId,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    blob: file,
    sha256Hash: sha256,
    createdAt: new Date().toISOString(),
    syncStatus: 'local_only',
    uploadProgress: 0,
  });

  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storageKey = `activities/${activityId}/${mediaId}_${safeFilename}`;

  const mediaAsset: MediaAsset = {
    id: mediaId,
    filename: file.name,
    mimeType: file.type as MediaMimeType,
    sizeBytes: file.size,
    sha256Hash: sha256,
    status: 'quarantined',
    storageKey,
    thumbnailUrl,
    uploadedAt: new Date().toISOString(),
    processingNote: 'Offline staged in IndexedDB. Queued for Supabase Storage upload.',
  };

  return { mediaAsset, localBlobId: mediaId };
}

/**
 * Upload a media blob to the private Supabase Storage bucket 'foundation-media'
 * and register its metadata in PostgreSQL public.media_assets
 */
export async function uploadMediaToSupabaseStorage(
  activityId: string,
  mediaId: string,
  blob: Blob,
  filename: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ storageKey: string; sha256: string }> {
  const validation = validateMediaFile({ name: filename, size: blob.size, type: blob.type });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sha256 = await computeSHA256(blob);
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storageKey = `activities/${activityId}/${mediaId}_${safeFilename}`;

  onProgress?.(10);

  if (isSupabaseConfigured() && supabase) {
    // 1. Upload to Supabase Storage private bucket
    const { error: storageError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(storageKey, blob, {
        contentType: blob.type,
        upsert: true,
      });

    if (storageError) {
      throw new Error(`Supabase Storage upload failed: ${storageError.message}`);
    }

    onProgress?.(70);

    // 2. Insert / Update metadata record in public.media_assets
    const { error: dbError } = await supabase.from('media_assets').upsert({
      id: mediaId,
      activity_id: activityId,
      filename,
      mime_type: blob.type,
      size_bytes: blob.size,
      sha256_hash: sha256,
      storage_key: storageKey,
      status: 'clean',
      processing_note: 'Verified in private Supabase Storage bucket (foundation-media)',
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      console.warn('Supabase media metadata upsert warning:', dbError.message);
    }

    onProgress?.(100);
    return { storageKey, sha256 };
  }

  // Fallback: Express Server route
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('activityId', activityId);
  formData.append('mediaId', mediaId);

  onProgress?.(40);
  const res = await fetch('/api/v1/media/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed with HTTP ${res.status}: ${errText}`);
  }

  onProgress?.(100);
  return { storageKey, sha256 };
}

/**
 * Acquire an authenticated short-lived signed URL for private evidence previews
 * from the 'foundation-media' bucket.
 */
export async function getSignedPreviewUrl(
  storageKey: string,
  expiresInSeconds = 900
): Promise<string> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL from secure storage: ${error?.message}`);
    }

    return data.signedUrl;
  }

  // Fallback to backend API
  const res = await fetch(`/api/v1/media/signed-url?storageKey=${encodeURIComponent(storageKey)}`);
  if (!res.ok) {
    throw new Error(`Failed to obtain signed URL: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.signedUrl;
}

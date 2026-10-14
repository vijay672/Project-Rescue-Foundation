import Dexie, { type Table } from 'dexie';
import type { Activity, FeedbackMessage, SyncOperation } from '../types';

export interface LocalDraft {
  id: string; // client UUID
  updatedAt: string;
  data: Partial<Activity>;
  isAutoSaved: boolean;
}

export interface LocalMediaBlob {
  id: string; // client UUID
  activityId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  sha256Hash: string;
  createdAt: string;
  syncStatus: 'local_only' | 'uploading' | 'synced' | 'failed';
  uploadProgress: number;
}

export interface SyncMetadataRecord {
  key: string;
  value: any;
  updatedAt: string;
}

export class ProjectRescueDatabase extends Dexie {
  drafts!: Table<LocalDraft, string>;
  mediaBlobs!: Table<LocalMediaBlob, string>;
  syncQueue!: Table<SyncOperation, string>;
  activityCache!: Table<Activity, string>;
  feedbackCache!: Table<FeedbackMessage, string>;
  syncMetadata!: Table<SyncMetadataRecord, string>;

  constructor() {
    super('ProjectRescueFoundationDB');
    this.version(1).stores({
      drafts: 'id, updatedAt, isAutoSaved',
      mediaBlobs: 'id, activityId, mimeType, syncStatus',
      syncQueue: 'id, idempotencyKey, action, status, createdAt',
      activityCache: 'id, staffId, regionId, status, clientCapturedAt',
      feedbackCache: 'id, threadId, activityId, authorId, status',
      syncMetadata: 'key, updatedAt',
    });
  }
}

export const localDb = new ProjectRescueDatabase();

// Storage Quota and Health Diagnostics Helper
export async function getStorageDiagnostics() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      const isPersisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;

      return {
        usageBytes: usage,
        quotaBytes: quota,
        percentUsed: Math.round(percentUsed * 10) / 10,
        isPersisted,
        supported: true,
      };
    } catch {
      // Fallback
    }
  }
  return {
    usageBytes: 0,
    quotaBytes: 0,
    percentUsed: 0,
    isPersisted: false,
    supported: false,
  };
}

// Request durable persistent storage from browser if supported
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

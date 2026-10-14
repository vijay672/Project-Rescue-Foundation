import { localDb } from './db';
import { api } from './api';
import { resolvePendingAddress } from './geo';
import type { Activity, SyncOperation } from '../types';

export interface SyncEngineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  successfulSyncCount: number;
}

type SyncListener = (state: SyncEngineState) => void;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private syncTimer: any = null;
  private simulatedOffline = false;

  private state: SyncEngineState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
    successfulSyncCount: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Periodic sync poll every 30 seconds when online
      this.syncTimer = setInterval(() => {
        if (this.isNetworkAvailable() && !this.isSyncing) {
          this.sync();
        }
      }, 30000);

      this.updatePendingCount();
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  public isNetworkAvailable(): boolean {
    if (this.simulatedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public toggleSimulatedOffline(forceOffline?: boolean): boolean {
    if (forceOffline !== undefined) {
      this.simulatedOffline = forceOffline;
    } else {
      this.simulatedOffline = !this.simulatedOffline;
    }
    this.handleNetworkChange(this.isNetworkAvailable());
    return this.simulatedOffline;
  }

  public getIsSimulatedOffline(): boolean {
    return this.simulatedOffline;
  }

  private handleNetworkChange(isOnline: boolean) {
    this.state.isOnline = isOnline;
    this.notify();
    if (isOnline && !this.isSyncing) {
      this.sync();
    }
  }

  public async updatePendingCount(): Promise<number> {
    try {
      const count = await localDb.syncQueue.where('status').equals('pending').count();
      const mediaPending = await localDb.mediaBlobs.where('syncStatus').equals('local_only').count();
      this.state.pendingCount = count + mediaPending;
      this.notify();
      return this.state.pendingCount;
    } catch {
      return 0;
    }
  }

  /**
   * Queue an activity submission into durable IndexedDB queue
   */
  public async queueActivitySubmission(activity: Activity): Promise<void> {
    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      idempotencyKey: activity.idempotencyKey,
      action: 'create_activity',
      payload: activity,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    // Store in local cache optimistically
    await localDb.activityCache.put({
      ...activity,
      status: 'pending_sync',
      syncStatus: 'pending',
    });

    // Add to durable sync queue
    await localDb.syncQueue.put(operation);
    await this.updatePendingCount();

    // Trigger sync immediately if online
    if (this.isNetworkAvailable()) {
      this.sync();
    }
  }

  /**
   * Run the sync protocol: push mutations, upload media blobs, and pull latest cache
   */
  public async sync(): Promise<{ success: boolean; pushed: number; errors: string[] }> {
    if (this.isSyncing || !this.isNetworkAvailable()) {
      return { success: false, pushed: 0, errors: ['Network is currently offline or sync already in progress'] };
    }

    this.isSyncing = true;
    this.state.isSyncing = true;
    this.state.lastError = null;
    this.notify();

    const errors: string[] = [];
    let pushedCount = 0;

    try {
      // Step 1: Upload any pending or failed media blobs to Supabase Storage
      const pendingBlobs = await localDb.mediaBlobs
        .filter((b) => b.syncStatus === 'local_only' || b.syncStatus === 'failed')
        .toArray();

      for (const mediaRecord of pendingBlobs) {
        try {
          await localDb.mediaBlobs.update(mediaRecord.id, { 
            syncStatus: 'uploading',
            uploadProgress: 10,
          });

          await api.uploadMedia(
            mediaRecord.activityId,
            mediaRecord.id,
            mediaRecord.blob,
            mediaRecord.filename,
            async (pct) => {
              await localDb.mediaBlobs.update(mediaRecord.id, { uploadProgress: pct });
            }
          );

          await localDb.mediaBlobs.update(mediaRecord.id, { 
            syncStatus: 'synced',
            uploadProgress: 100,
          });
        } catch (err: any) {
          await localDb.mediaBlobs.update(mediaRecord.id, { 
            syncStatus: 'failed',
            uploadProgress: 0,
          });
          errors.push(`Media upload failed for ${mediaRecord.filename}: ${err.message}`);
        }
      }

      // Step 2: Push pending activity mutations with idempotency deduplication
      const pendingOperations = await localDb.syncQueue.where('status').equals('pending').toArray();

      for (const op of pendingOperations) {
        try {
          if (op.action === 'create_activity') {
            const payload = { ...op.payload };
            if (payload.location && payload.location.structuredAddress?.status !== 'resolved') {
              try {
                const resolvedLoc = await resolvePendingAddress(payload.location);
                payload.location = resolvedLoc;
              } catch (e) {
                console.warn('[SyncEngine] Address resolution deferred:', e);
              }
            }
            const result = await api.createActivity(payload);
            // Server acknowledged the operation
            await localDb.syncQueue.update(op.id, { status: 'completed' });
            await localDb.activityCache.put({
              ...result.activity,
              syncStatus: 'synced',
            });
            pushedCount++;
          }
        } catch (err: any) {
          const nextRetry = op.retryCount + 1;
          const delayJitter = Math.min(1000 * Math.pow(2, nextRetry) + Math.random() * 500, 30000);
          console.warn(`[SyncEngine] Retry ${nextRetry} in ${delayJitter}ms for op ${op.id}`, err);

          await localDb.syncQueue.update(op.id, {
            retryCount: nextRetry,
            lastError: err.message,
            status: nextRetry >= 5 ? 'failed' : 'pending',
          });
          errors.push(`Operation ${op.id}: ${err.message}`);
        }
      }

      // Clean up completed queue items older than 24 hours
      await localDb.syncQueue.where('status').equals('completed').delete();

      // Step 3: Pull incremental update to populate local cache
      try {
        const pullRes = await api.getActivities();
        if (pullRes?.activities?.length) {
          await localDb.activityCache.bulkPut(pullRes.activities);
        }
      } catch (pullErr: any) {
        // Non-blocking if pull fails
        console.warn('[SyncEngine] Incremental cache pull failed:', pullErr);
      }

      this.state.lastSyncAt = new Date().toISOString();
      this.state.successfulSyncCount += pushedCount;
      if (errors.length > 0) {
        this.state.lastError = errors[0];
      }
    } catch (globalErr: any) {
      this.state.lastError = globalErr.message;
      errors.push(globalErr.message);
    } finally {
      this.isSyncing = false;
      this.state.isSyncing = false;
      await this.updatePendingCount();
      this.notify();
    }

    return {
      success: errors.length === 0,
      pushed: pushedCount,
      errors,
    };
  }

  public getState(): SyncEngineState {
    return { ...this.state };
  }
}

export const syncEngine = new SyncEngine();

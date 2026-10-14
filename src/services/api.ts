import type { 
  Activity, 
  AuditEvent, 
  DashboardMetrics, 
  FeedbackMessage, 
  Region, 
  User, 
  UserRole,
  AppNotification,
  StructuredAddress,
  OutboxEmail
} from '../types';
import { supabaseAuth, isSupabaseConfigured } from './supabase';
import { supabaseData } from './supabaseData';

export const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {
        errJson = { message: res.statusText };
      }
      throw new ApiError(res.status, errJson.message || `HTTP ${res.status}`, errJson);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    // Network failure (offline or unreachable)
    throw new ApiError(0, err.message || 'Network unreachable. Client running offline.');
  }
}

export const api = {
  // ============================================================================
  // Auth & Session (Supabase Auth & Production JWT Flow)
  // ============================================================================
  async getSession(): Promise<{ user: User | null; sessionValid: boolean; expiresAt?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { user } = await supabaseAuth.getSession();
        if (user) {
          return { user, sessionValid: true, expiresAt: new Date(Date.now() + 86400000).toISOString() };
        }
        return { user: null, sessionValid: false };
      } catch (err) {
        console.warn('Supabase getSession error:', err);
      }
    }
    return request('/auth/session');
  },

  async login(payload: { email?: string; password?: string }): Promise<{ user: User; sessionValid: boolean; expiresAt: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { user } = await supabaseAuth.login(payload.email, payload.password);
        return {
          user,
          sessionValid: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        };
      } catch (err: any) {
        throw err;
      }
    }
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async register(payload: { email: string; password: string; name: string; role?: UserRole }): Promise<{ user: User; sessionValid?: boolean; pendingApproval?: boolean; message?: string }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async loginWithGoogle(payload?: { email: string; name: string; avatar?: string; role?: UserRole }): Promise<{ user: User; sessionValid?: boolean; pendingApproval?: boolean; message?: string }> {
    if (isSupabaseConfigured()) {
      try {
        await supabaseAuth.signInWithGoogle();
        const { user } = await supabaseAuth.getSession();
        if (user) {
          return { user, sessionValid: true };
        }
      } catch (err) {
        console.warn('Supabase OAuth notice:', err);
      }
    }
    return request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async requestPasswordOtp(email: string): Promise<{ success: boolean; message: string; otpHint?: string }> {
    return request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPasswordWithOtp(payload: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return request('/auth/reset-password-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.requestPasswordOtp(email);
  },

  async updateProfile(payload: { name?: string; id?: string; email?: string; currentPassword?: string; newPassword?: string }): Promise<{ success: boolean; user: User; message: string }> {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getPendingUsers(): Promise<User[]> {
    return request('/auth/pending-users');
  },

  async approveUser(userId: string, regionId?: string): Promise<{ success: boolean; user: User; message: string }> {
    return request('/auth/approve-user', {
      method: 'POST',
      body: JSON.stringify({ userId, regionId }),
    });
  },

  async rejectUser(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return request('/auth/reject-user', {
      method: 'POST',
      body: JSON.stringify({ userId, reason }),
    });
  },

  async getOutboxEmails(): Promise<OutboxEmail[]> {
    return request('/system/outbox');
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      await supabaseAuth.logout();
    } catch {}
    return request('/auth/logout', { method: 'POST' });
  },

  // ============================================================================
  // Reverse Geocoding (PostGIS & OSM)
  // ============================================================================
  async reverseGeocode(lat: number, lng: number): Promise<StructuredAddress> {
    return request(`/geo/reverse?lat=${lat}&lng=${lng}`);
  },

  // ============================================================================
  // Notifications
  // ============================================================================
  async getNotifications(): Promise<AppNotification[]> {
    return request('/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean; notifications: AppNotification[] }> {
    return request(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  // ============================================================================
  // Regions
  // ============================================================================
  async getRegions(): Promise<Region[]> {
    if (isSupabaseConfigured()) {
      try {
        const regions = await supabaseData.getRegions();
        if (regions.length > 0) return regions;
      } catch (err) {
        console.warn('Supabase getRegions error:', err);
      }
    }
    return request('/regions');
  },

  // ============================================================================
  // Activities (Supabase PostgreSQL & PostGIS)
  // ============================================================================
  async getActivities(params?: {
    staffId?: string;
    regionId?: string;
    status?: string;
    search?: string;
    since?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ activities: Activity[]; totalCount: number; serverCursor: string }> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseData.getActivities(params);
      } catch (err) {
        console.warn('Supabase getActivities error:', err);
      }
    }

    const query = new URLSearchParams();
    if (params?.staffId) query.set('staffId', params.staffId);
    if (params?.regionId) query.set('regionId', params.regionId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.since) query.set('since', params.since);
    return request(`/activities?${query.toString()}`);
  },

  async getActivityById(id: string): Promise<Activity> {
    if (isSupabaseConfigured()) {
      try {
        const act = await supabaseData.getActivityById(id);
        if (act) return act;
      } catch (err) {
        console.warn('Supabase getActivityById error:', err);
      }
    }
    return request(`/activities/${id}`);
  },

  async createActivity(activity: Activity): Promise<{ activity: Activity; isDuplicate: boolean }> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseData.createActivity(activity);
      } catch (err) {
        console.warn('Supabase createActivity error, attempting fallback:', err);
      }
    }

    return request('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  async updateActivityStatus(
    id: string, 
    status: Activity['status'], 
    reviewNote?: string,
    actor?: User
  ): Promise<{ activity: Activity }> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseData.updateActivityStatus(id, status, reviewNote, actor);
      } catch (err) {
        console.warn('Supabase updateActivityStatus error, attempting fallback:', err);
      }
    }

    return request(`/activities/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNote }),
    });
  },

  // ============================================================================
  // Supabase Storage Private Media Pipeline (foundation-media)
  // ============================================================================
  async getMediaSignedUrl(storageKey: string, mediaId?: string): Promise<{
    mediaId?: string;
    signedUrl: string;
    status: string;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const signedUrl = await supabaseData.createMediaSignedUrl(storageKey, 900);
        return {
          mediaId,
          signedUrl,
          status: 'clean',
        };
      } catch (err) {
        console.warn('Supabase createMediaSignedUrl error, falling back to server route:', err);
      }
    }

    const query = new URLSearchParams();
    if (storageKey) query.set('storageKey', storageKey);
    if (mediaId) query.set('mediaId', mediaId);
    return request(`/media/signed-url?${query.toString()}`);
  },

  // Backwards compatible method for download tokens
  async getR2PresignedDownloadUrl(mediaId: string): Promise<{
    mediaId: string;
    filename: string;
    downloadUrl: string;
    status: string;
  }> {
    const res = await this.getMediaSignedUrl('', mediaId);
    return {
      mediaId,
      filename: 'evidence-file',
      downloadUrl: res.signedUrl,
      status: res.status,
    };
  },

  async uploadMedia(
    activityId: string, 
    mediaId: string, 
    file: Blob, 
    filename: string,
    onProgress?: (percent: number) => void
  ): Promise<{
    mediaAssetId: string;
    status: string;
    sha256: string;
    storageKey?: string;
  }> {
    // 50 MB Supabase Free limit check
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds the 50MB Supabase Storage limit.`);
    }

    if (isSupabaseConfigured()) {
      try {
        const { computeSHA256 } = await import('./media');
        const sha256 = await computeSHA256(file);
        onProgress?.(30);

        const { storageKey } = await supabaseData.uploadMediaToStorage(
          activityId,
          mediaId,
          file,
          filename,
          file.type || 'application/octet-stream',
          sha256
        );

        onProgress?.(100);
        return {
          mediaAssetId: mediaId,
          status: 'clean',
          sha256,
          storageKey,
        };
      } catch (err) {
        console.warn('Supabase storage upload failed, attempting backend fallback:', err);
      }
    }

    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('activityId', activityId);
    formData.append('mediaId', mediaId);

    onProgress?.(50);
    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Media upload failed with HTTP ${res.status}`);
    }
    onProgress?.(100);
    return await res.json();
  },

  // ============================================================================
  // Feedback
  // ============================================================================
  async getFeedback(params?: {
    activityId?: string;
    staffId?: string;
    unreadOnly?: boolean;
  }): Promise<FeedbackMessage[]> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseData.getFeedback(params);
      } catch (err) {
        console.warn('Supabase getFeedback error:', err);
      }
    }

    const query = new URLSearchParams();
    if (params?.activityId) query.set('activityId', params.activityId);
    if (params?.staffId) query.set('staffId', params.staffId);
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    return request(`/feedback?${query.toString()}`);
  },

  async sendFeedback(payload: {
    activityId: string;
    type: FeedbackMessage['type'];
    message: string;
  }, actor?: User): Promise<FeedbackMessage> {
    if (isSupabaseConfigured() && actor) {
      try {
        return await supabaseData.sendFeedback(payload, actor);
      } catch (err) {
        console.warn('Supabase sendFeedback error:', err);
      }
    }

    return request('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async acknowledgeFeedback(id: string): Promise<FeedbackMessage> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseData.acknowledgeFeedback(id);
      } catch (err) {
        console.warn('Supabase acknowledgeFeedback error:', err);
      }
    }

    return request(`/feedback/${id}/acknowledge`, {
      method: 'POST',
    });
  },

  // ============================================================================
  // Dashboard & Analytics (Real Supabase RPC or server calculation)
  // ============================================================================
  async getMetrics(regionId?: string): Promise<DashboardMetrics> {
    if (isSupabaseConfigured()) {
      try {
        const metrics = await supabaseData.getMetrics(regionId);
        if (metrics) return metrics;
      } catch (err) {
        console.warn('Supabase getMetrics error:', err);
      }
    }

    const query = regionId ? `?regionId=${encodeURIComponent(regionId)}` : '';
    return request(`/analytics/metrics${query}`);
  },

  // ============================================================================
  // Admin & Audit
  // ============================================================================
  async getUsers(): Promise<User[]> {
    if (isSupabaseConfigured()) {
      try {
        const users = await supabaseData.getUsers();
        if (users.length > 0) return users;
      } catch (err) {
        console.warn('Supabase getUsers error:', err);
      }
    }
    return request('/admin/users');
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<User> {
    if (isSupabaseConfigured()) {
      try {
        await supabaseData.updateUserStatus(userId, status);
      } catch (err) {
        console.warn('Supabase updateUserStatus error:', err);
      }
    }
    return request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getAuditLogs(limit = 100): Promise<AuditEvent[]> {
    if (isSupabaseConfigured()) {
      try {
        const logs = await supabaseData.getAuditLogs(limit);
        if (logs.length > 0) return logs;
      } catch (err) {
        console.warn('Supabase getAuditLogs error:', err);
      }
    }
    return request(`/admin/audit-logs?limit=${limit}`);
  },

  // ============================================================================
  // Celery Worker & Background Processing Pipeline
  // ============================================================================
  async getWorkerHealth(): Promise<{
    workerStatus: string;
    activeWorkers: number;
    broker: string;
    queues: Array<{ name: string; priority: string; pendingTasks: number }>;
    antivirusEngine: string;
    imageProcessor: string;
    tasksProcessed: number;
    recentTasks?: any[];
    uptime: string;
  }> {
    return request('/worker/health');
  },

  async getMediaQuarantineStatus(mediaId: string): Promise<{
    mediaId: string;
    status: string;
    storageKey?: string;
    filename?: string;
    processingMetadata?: any;
    scanner?: string;
    derivatives?: string[];
  }> {
    return request(`/media/${encodeURIComponent(mediaId)}/status`);
  },

  async triggerTestWorkerScan(): Promise<{
    message: string;
    taskId: string;
    mediaId: string;
  }> {
    return request('/worker/trigger-test-scan', { method: 'POST' });
  },
};


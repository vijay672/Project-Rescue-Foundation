import { supabase, isSupabaseConfigured } from './supabase';
import type { 
  Activity, 
  AuditEvent, 
  DashboardMetrics, 
  FeedbackMessage, 
  Region, 
  User, 
  StructuredAddress,
  LocationData
} from '../types';

/**
 * Maps Supabase relational query result into frontend Activity type
 */
function mapSupabaseActivity(row: any): Activity {
  const loc = row.activity_locations?.[0] || row.activity_locations;
  let locationData: LocationData | undefined = undefined;

  if (loc && loc.latitude != null && loc.longitude != null) {
    const structuredAddress: StructuredAddress | undefined = loc.formatted_address ? {
      formattedAddress: loc.formatted_address,
      area: loc.area || undefined,
      neighborhood: loc.neighborhood || undefined,
      city: loc.city || undefined,
      district: loc.district || undefined,
      state: loc.state || undefined,
      postalCode: loc.postal_code || undefined,
      country: loc.country || undefined,
      provider: (loc.geocode_provider as any) || 'backend_osm',
      status: (loc.geocode_status as any) || 'resolved',
    } : undefined;

    locationData = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy || 10,
      capturedAt: loc.captured_at || row.client_captured_at,
      source: (loc.source as any) || 'gps',
      isVerified: loc.is_verified ?? true,
      addressApprox: loc.formatted_address || undefined,
      structuredAddress,
    };
  }

  const mediaAssets = (row.media_assets || []).map((m: any) => ({
    id: m.id,
    filename: m.filename,
    mimeType: m.mime_type,
    sizeBytes: Number(m.size_bytes),
    sha256Hash: m.sha256_hash,
    status: m.status,
    storageKey: m.storage_key,
    uploadedAt: m.created_at,
    processingNote: m.processing_note,
  }));

  const feedbackList = row.feedback_messages || [];
  const hasUnread = feedbackList.some((f: any) => f.status === 'open' && !f.read_at);

  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    staffId: row.staff_id,
    staffName: row.staff_name,
    regionId: row.region_id,
    regionName: row.region_name,
    title: row.title,
    narrative: row.narrative,
    category: row.category,
    clientCapturedAt: row.client_captured_at,
    serverReceivedAt: row.server_received_at,
    status: row.status,
    version: row.version || 1,
    syncStatus: 'synced',
    tags: row.tags || [],
    feedbackCount: feedbackList.length,
    hasUnreadFeedback: hasUnread,
    location: locationData,
    mediaAssets,
  };
}

export const supabaseData = {
  /**
   * Fetch activities from Supabase with region scoping, filters, pagination
   */
  async getActivities(params?: {
    staffId?: string;
    regionId?: string;
    status?: string;
    search?: string;
    since?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ activities: Activity[]; totalCount: number; serverCursor: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { activities: [], totalCount: 0, serverCursor: '' };
    }

    let query = supabase
      .from('activities')
      .select(`
        *,
        activity_locations (*),
        media_assets (*),
        feedback_messages (*)
      `, { count: 'exact' })
      .order('client_captured_at', { ascending: false });

    if (params?.staffId) {
      query = query.eq('staff_id', params.staffId);
    }
    if (params?.regionId) {
      query = query.eq('region_id', params.regionId);
    }
    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }
    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,narrative.ilike.%${params.search}%,staff_name.ilike.%${params.search}%`);
    }
    if (params?.since) {
      query = query.gt('updated_at', params.since);
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    const activities = (data || []).map(mapSupabaseActivity);
    return {
      activities,
      totalCount: count || activities.length,
      serverCursor: new Date().toISOString(),
    };
  },

  /**
   * Fetch single activity by ID
   */
  async getActivityById(id: string): Promise<Activity | null> {
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        activity_locations (*),
        media_assets (*),
        feedback_messages (*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapSupabaseActivity(data);
  },

  /**
   * Create activity in Supabase with idempotent transactional function
   */
  async createActivity(activity: Activity): Promise<{ activity: Activity; isDuplicate: boolean }> {
    if (!supabase || !isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const loc = activity.location;
    const { data, error } = await supabase.rpc('sync_activity_idempotent', {
      p_id: activity.id,
      p_idempotency_key: activity.idempotencyKey,
      p_staff_id: activity.staffId,
      p_staff_name: activity.staffName,
      p_region_id: activity.regionId,
      p_region_name: activity.regionName,
      p_title: activity.title,
      p_narrative: activity.narrative,
      p_category: activity.category,
      p_client_captured_at: activity.clientCapturedAt,
      p_tags: activity.tags || [],
      p_latitude: loc?.latitude ?? null,
      p_longitude: loc?.longitude ?? null,
      p_accuracy: loc?.accuracy ?? null,
      p_address_approx: loc?.addressApprox ?? null,
      p_area: loc?.structuredAddress?.area ?? null,
      p_city: loc?.structuredAddress?.city ?? null,
      p_district: loc?.structuredAddress?.district ?? null,
      p_state: loc?.structuredAddress?.state ?? null,
      p_country: loc?.structuredAddress?.country ?? null,
      p_geocode_status: loc?.structuredAddress?.status ?? 'pending',
    });

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    const isDuplicate = data?.is_duplicate ?? false;

    // Persist media assets metadata to PostgreSQL public.media_assets table
    if (activity.mediaAssets && activity.mediaAssets.length > 0) {
      for (const m of activity.mediaAssets) {
        try {
          await supabase.from('media_assets').upsert({
            id: m.id,
            activity_id: activity.id,
            filename: m.filename,
            mime_type: m.mimeType,
            size_bytes: m.sizeBytes,
            sha256_hash: m.sha256Hash,
            storage_key: m.storageKey,
            status: m.status || 'quarantined',
            processing_note: m.processingNote || 'Attached to field activity report',
          });
        } catch (mediaErr) {
          console.warn('Failed to upsert media asset metadata:', mediaErr);
        }
      }
    }

    const created = await this.getActivityById(activity.id);

    return {
      activity: created || { ...activity, syncStatus: 'synced' },
      isDuplicate,
    };
  },

  /**
   * Update activity status (Manager Review)
   */
  async updateActivityStatus(
    id: string,
    status: Activity['status'],
    reviewNote?: string,
    actor?: User
  ): Promise<{ activity: Activity }> {
    if (!supabase || !isSupabaseConfigured()) {
      throw new Error('Database connection is not configured.');
    }

    const { error } = await supabase
      .from('activities')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }

    // Insert feedback message if review note provided
    if (reviewNote && actor) {
      await supabase.from('feedback_messages').insert({
        thread_id: crypto.randomUUID(),
        activity_id: id,
        author_id: actor.id,
        author_name: actor.name,
        author_role: actor.role,
        type: status === 'revision_requested' ? 'revision_request' : 'operational_guidance',
        message: reviewNote,
        status: 'open',
      });
    }

    // Insert audit log
    if (actor) {
      await supabase.from('audit_records').insert({
        actor_id: actor.id,
        actor_name: actor.name,
        actor_role: actor.role,
        action: `ACTIVITY_STATUS_CHANGE_${status.toUpperCase()}`,
        resource_type: 'activity',
        resource_id: id,
        status: 'success',
        details: reviewNote || `Status changed to ${status}`,
      });
    }

    const updated = await this.getActivityById(id);
    if (!updated) {
      throw new Error('Activity updated but could not be re-fetched.');
    }

    return { activity: updated };
  },

  /**
   * Fetch regions from Supabase
   */
  async getRegions(): Promise<Region[]> {
    if (!supabase || !isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('code');

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      country: r.country,
      center: [r.latitude || 0, r.longitude || 0] as [number, number],
      activeStaffCount: r.active_staff_count || 0,
      expectedWeeklyReports: r.expected_weekly_reports || 30,
    }));
  },

  /**
   * Fetch feedback messages from Supabase
   */
  async getFeedback(params?: {
    activityId?: string;
    staffId?: string;
    unreadOnly?: boolean;
  }): Promise<FeedbackMessage[]> {
    if (!supabase || !isSupabaseConfigured()) return [];

    let query = supabase
      .from('feedback_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.activityId) {
      query = query.eq('activity_id', params.activityId);
    }
    if (params?.unreadOnly) {
      query = query.eq('status', 'open');
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((f: any) => ({
      id: f.id,
      threadId: f.thread_id,
      activityId: f.activity_id,
      authorId: f.author_id,
      authorName: f.author_name,
      authorRole: f.author_role,
      type: f.type,
      message: f.message,
      createdAt: f.created_at,
      readAt: f.read_at,
      acknowledgedAt: f.acknowledged_at,
      revisionCompletedAt: f.revision_completed_at,
      status: f.status,
    }));
  },

  /**
   * Send new feedback message
   */
  async sendFeedback(payload: {
    activityId: string;
    type: FeedbackMessage['type'];
    message: string;
  }, actor: User): Promise<FeedbackMessage> {
    if (!supabase || !isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const newFeedback = {
      thread_id: crypto.randomUUID(),
      activity_id: payload.activityId,
      author_id: actor.id,
      author_name: actor.name,
      author_role: actor.role,
      type: payload.type,
      message: payload.message,
      status: 'open',
    };

    const { data, error } = await supabase
      .from('feedback_messages')
      .insert(newFeedback)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to send feedback: ${error?.message}`);
    }

    return {
      id: data.id,
      threadId: data.thread_id,
      activityId: data.activity_id,
      authorId: data.author_id,
      authorName: data.author_name,
      authorRole: data.author_role,
      type: data.type,
      message: data.message,
      createdAt: data.created_at,
      status: data.status,
    };
  },

  /**
   * Acknowledge feedback message
   */
  async acknowledgeFeedback(id: string): Promise<FeedbackMessage> {
    if (!supabase || !isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('feedback_messages')
      .update({
        status: 'acknowledged',
        acknowledged_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to acknowledge feedback: ${error?.message}`);
    }

    return {
      id: data.id,
      threadId: data.thread_id,
      activityId: data.activity_id,
      authorId: data.author_id,
      authorName: data.author_name,
      authorRole: data.author_role,
      type: data.type,
      message: data.message,
      createdAt: data.created_at,
      acknowledgedAt: data.acknowledged_at,
      status: data.status,
    };
  },

  /**
   * Real Manager Dashboard Metrics computed from Supabase RPC
   */
  async getMetrics(regionId?: string): Promise<DashboardMetrics | null> {
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.rpc('get_dashboard_metrics', {
      p_region_id: regionId || null,
    });

    if (error || !data) {
      console.warn('get_dashboard_metrics RPC error:', error);
      return null;
    }

    return data as DashboardMetrics;
  },

  /**
   * Profiles list for Admin
   */
  async getUsers(): Promise<User[]> {
    if (!supabase || !isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      regions: p.assigned_regions || [],
      status: p.status,
      mfaEnabled: p.mfa_enabled ?? true,
      lastLoginAt: p.last_login_at || new Date().toISOString(),
      deviceInfo: p.device_info,
    }));
  },

  /**
   * Update user status (Admin)
   */
  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update user status: ${error.message}`);
    }
  },

  /**
   * Audit records list (Admin)
   */
  async getAuditLogs(limit = 100): Promise<AuditEvent[]> {
    if (!supabase || !isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('audit_records')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((a: any) => ({
      id: a.id,
      timestamp: a.timestamp,
      actorId: a.actor_id || 'system',
      actorName: a.actor_name,
      actorRole: a.actor_role,
      action: a.action,
      resourceType: a.resource_type,
      resourceId: a.resource_id,
      regionId: a.region_id || undefined,
      ipAddress: a.ip_address,
      userAgent: a.user_agent,
      status: a.status,
      details: a.details,
    }));
  },

  /**
   * Request short-lived signed URL for private evidence media in 'foundation-media'
   */
  async createMediaSignedUrl(storageKey: string, expiresInSeconds = 900): Promise<string> {
    if (!supabase || !isSupabaseConfigured()) {
      throw new Error('Storage client is not configured.');
    }

    const { data, error } = await supabase.storage
      .from('foundation-media')
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL from storage: ${error?.message}`);
    }

    return data.signedUrl;
  },

  /**
   * Upload media blob directly to storage private bucket 'foundation-media'
   */
  async uploadMediaToStorage(
    activityId: string,
    mediaId: string,
    blob: Blob,
    filename: string,
    mimeType: string,
    sha256: string
  ): Promise<{ storageKey: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      throw new Error('Storage client is not configured.');
    }

    // 50 MB Free tier enforcement
    if (blob.size > 50 * 1024 * 1024) {
      throw new Error(`File size exceeds 50MB file size limit.`);
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `activities/${activityId}/${mediaId}_${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from('foundation-media')
      .upload(storageKey, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    // Save metadata in public.media_assets
    await supabase.from('media_assets').upsert({
      id: mediaId,
      activity_id: activityId,
      filename,
      mime_type: mimeType,
      size_bytes: blob.size,
      sha256_hash: sha256,
      storage_key: storageKey,
      status: 'clean',
      processing_note: 'Verified in private secure storage bucket',
      updated_at: new Date().toISOString(),
    });

    return { storageKey };
  },
};


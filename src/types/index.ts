export type UserRole = 'field_staff' | 'operations_manager' | 'system_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  regions: string[]; // e.g. ["reg-east-africa", "reg-se-asia"]
  status: 'active' | 'suspended' | 'pending_approval' | 'rejected';
  avatar?: string;
  mfaEnabled: boolean;
  lastLoginAt: string;
  deviceInfo?: string;
}

export interface OutboxEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  category: 'account_approval' | 'activity_review' | 'security_otp' | 'system_alert';
  sentAt: string;
}

export interface Region {
  id: string;
  code: string;
  name: string;
  country: string;
  center: [number, number]; // [lat, lng]
  activeStaffCount: number;
  expectedWeeklyReports: number;
}

export interface StructuredAddress {
  formattedAddress: string;
  area?: string; // locality / neighborhood
  neighborhood?: string;
  city?: string; // town / village / city
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  provider: 'backend_osm' | 'google_maps' | 'offline_pending';
  status: 'resolved' | 'pending' | 'failed';
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  capturedAt: string;
  source: 'gps' | 'network' | 'manual_exception';
  isVerified: boolean;
  addressApprox?: string;
  structuredAddress?: StructuredAddress;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'directive' | 'case_approval' | 'revision' | 'system';
  createdAt: string;
  read: boolean;
  activityId?: string;
}

export type MediaMimeType = 
  | 'image/jpeg' 
  | 'image/png' 
  | 'image/webp' 
  | 'application/pdf' 
  | 'video/mp4';

export interface MediaAsset {
  id: string;
  filename: string;
  mimeType: MediaMimeType;
  sizeBytes: number;
  sha256Hash: string;
  status: 'quarantined' | 'scanning' | 'clean' | 'derivative_ready' | 'rejected';
  storageKey: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  uploadedAt: string;
  processingNote?: string;
}

export type ActivityStatus = 'draft' | 'pending_sync' | 'submitted' | 'under_review' | 'revision_requested' | 'approved';

export interface Activity {
  id: string; // Client-generated UUID
  idempotencyKey: string;
  staffId: string;
  staffName: string;
  regionId: string;
  regionName: string;
  title: string;
  narrative: string;
  category: 'direct_assistance' | 'safehouse_intake' | 'surveillance_patrol' | 'medical_outreach' | 'legal_support' | 'community_education';
  clientCapturedAt: string;
  serverReceivedAt?: string;
  location?: LocationData;
  mediaAssets: MediaAsset[];
  status: ActivityStatus;
  version: number;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  tags: string[];
  feedbackCount: number;
  hasUnreadFeedback?: boolean;
}

export type FeedbackType = 'commendation' | 'improvement_suggestion' | 'revision_request' | 'operational_guidance' | 'follow_up_required';

export interface FeedbackMessage {
  id: string;
  threadId: string;
  activityId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  type: FeedbackType;
  message: string;
  createdAt: string;
  readAt?: string;
  acknowledgedAt?: string;
  revisionCompletedAt?: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  regionId?: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'denied' | 'error';
  details?: string;
}

export interface DashboardMetrics {
  totalSubmittedToday: number;
  totalThisWeek: number;
  expectedWeeklyReports: number;
  complianceRate: number; // percentage
  pendingReviewCount: number;
  revisionRequestedCount: number;
  activeDeployments: number;
  unacknowledgedFeedbackCount: number;
  regionalBreakdown: {
    regionId: string;
    regionName: string;
    submittedCount: number;
    expectedCount: number;
    compliancePct: number;
  }[];
  dailyTrend: {
    date: string;
    count: number;
  }[];
}

export interface SyncOperation {
  id: string;
  idempotencyKey: string;
  action: 'create_activity' | 'update_activity' | 'acknowledge_feedback';
  payload: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'in_flight' | 'completed' | 'failed';
}

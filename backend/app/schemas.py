from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class StructuredAddressModel(BaseModel):
    formattedAddress: str
    area: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postalCode: Optional[str] = None
    provider: str = "backend_osm"
    status: str = "resolved"

class LocationPayload(BaseModel):
    latitude: float
    longitude: float
    accuracy: float
    source: str = "gps"
    capturedAt: datetime
    structuredAddress: Optional[StructuredAddressModel] = None

class MediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    filename: str
    mimeType: str
    sizeBytes: int
    sha256Hash: str
    status: str
    storageKey: str

class ActivityCreatePayload(BaseModel):
    id: UUID
    idempotencyKey: str
    staffId: UUID
    regionId: str
    title: str = Field(..., min_length=3, max_length=255)
    narrative: str = Field(..., min_length=10)
    category: str
    clientCapturedAt: datetime
    location: Optional[LocationPayload] = None
    mediaAssets: List[Dict[str, Any]] = []

class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    idempotencyKey: str
    staffId: UUID
    regionId: str
    title: str
    narrative: str
    category: str
    status: str
    version: int
    clientCapturedAt: datetime
    serverReceivedAt: datetime
    location: Optional[Dict[str, Any]] = None
    mediaAssets: List[MediaAssetResponse] = []

class ActivityStatusUpdatePayload(BaseModel):
    status: str = Field(..., pattern="^(approved|revision_requested|under_review|archived)$")
    reason: Optional[str] = None

class FeedbackCreatePayload(BaseModel):
    activityId: UUID
    type: str
    message: str = Field(..., min_length=5)

class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    activityId: UUID
    authorId: UUID
    type: str
    message: str
    status: str
    createdAt: datetime
    acknowledgedAt: Optional[datetime] = None

class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    timestamp: datetime
    actorId: UUID
    actorName: str
    actorRole: str
    action: str
    resourceType: str
    resourceId: str
    ipAddress: str
    userAgent: str
    status: str
    details: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str
    regions: List[str]
    status: str
    mfaEnabled: bool

class RegionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    country: str
    expectedWeeklyReports: int

class MetricsResponse(BaseModel):
    totalActivities: int
    pendingReviewCount: int
    approvedCount: int
    revisionRequestedCount: int
    activeFieldStaffCount: int
    weeklyVelocity: List[Dict[str, Any]]

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    createdAt: str
    read: bool
    linkTab: Optional[str] = None

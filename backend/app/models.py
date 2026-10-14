import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Enum,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
from geoalchemy2 import Geometry

Base = declarative_base()

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # 'field_staff', 'operations_manager', 'system_admin'
    is_active = Column(Boolean, default=True, nullable=False)
    mfa_enforced = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    activities = relationship("Activity", back_populates="staff")
    audit_events = relationship("AuditEvent", back_populates="actor")


class Region(Base):
    __tablename__ = "regions"

    id = Column(String(50), primary_key=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    boundary = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)
    center_point = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    expected_weekly_reports = Column(Integer, default=20, nullable=False)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key = Column(String(100), unique=True, nullable=False, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    region_id = Column(String(50), ForeignKey("regions.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    narrative = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    status = Column(String(50), default="under_review", nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)

    client_captured_at = Column(DateTime(timezone=True), nullable=False)
    server_received_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    staff = relationship("User", back_populates="activities")
    location = relationship("ActivityLocation", back_populates="activity", uselist=False, cascade="all, delete-orphan")
    media_assets = relationship("MediaAsset", back_populates="activity", cascade="all, delete-orphan")
    feedback_threads = relationship("FeedbackThread", back_populates="activity", cascade="all, delete-orphan")


class ActivityLocation(Base):
    __tablename__ = "activity_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False, unique=True, index=True)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    accuracy_meters = Column(Float, nullable=False)
    source = Column(String(50), default="gps", nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    captured_at = Column(DateTime(timezone=True), nullable=False)

    activity = relationship("Activity", back_populates="location")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    storage_key = Column(String(512), nullable=False)
    status = Column(String(50), default="quarantined", nullable=False) # 'quarantined', 'scanning', 'clean', 'rejected'
    processing_metadata = Column(JSONB, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    activity = relationship("Activity", back_populates="media_assets")


class FeedbackThread(Base):
    __tablename__ = "feedback_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False) # commendation, revision_request, guidance
    message = Column(Text, nullable=False)
    status = Column(String(50), default="open", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)

    activity = relationship("Activity", back_populates="feedback_threads")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(255), nullable=False)
    status = Column(String(20), default="success", nullable=False)
    details = Column(Text, nullable=True)

    actor = relationship("User", back_populates="audit_events")

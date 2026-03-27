"""
Pydantic schemas and SQLAlchemy ORM models for the Helpdesk AI system.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Text, Float, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


# ─── SQLAlchemy ORM ───────────────────────────────────────────────────────────

class TicketORM(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(20), unique=True, index=True)
    title = Column(String(300))
    description = Column(Text)
    masked_description = Column(Text, default="")
    category = Column(String(50))
    priority = Column(String(20))
    status = Column(String(30), default="open")
    resolution = Column(Text, default="")
    # New Fields for RBAC & Advanced AI
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_path = Column(String(500), nullable=True)
    rca_analysis = Column(Text, nullable=True)
    rca_status = Column(String(30), default="not_generated") # not_generated | generated
    
    # Relationships
    user = relationship("UserORM", back_populates="tickets", foreign_keys=[user_id])
    agent = relationship("UserORM", back_populates="assigned_tickets", foreign_keys=[assigned_agent_id])
    confidence = Column(Float, default=0.0)
    sentiment = Column(String(20), default="Neutral")
    sentiment_score = Column(Float, default=0.0)
    action_taken = Column(String(50), default="")
    assigned_agent = Column(String(100), default="")
    sla_hours = Column(Integer, default=24)
    similarity_score = Column(Float, default=0.0)
    language = Column(String(10), default="en")
    duplicate_of = Column(String(20), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class UserORM(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True)
    hashed_password = Column(String(200))
    role = Column(String(20), default="user") # user | agent | admin
    avatar = Column(String(200), nullable=True)
    
    # Analytics for leaderboard
    tickets_resolved = Column(Integer, default=0)
    avg_resolution_time = Column(Float, default=0.0) # in hours
    feedback_rating = Column(Float, default=0.0)
    
    tickets = relationship("TicketORM", back_populates="user", foreign_keys=[TicketORM.user_id])
    assigned_tickets = relationship("TicketORM", back_populates="agent", foreign_keys=[TicketORM.assigned_agent_id])

class NotificationORM(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200))
    message = Column(Text)
    type = Column(String(50)) # ticket_update | incident_alert | general
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class IncidentORM(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50))
    message = Column(Text)
    ticket_ids = Column(Text) # JSON list of IDs
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FeedbackORM(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(20), index=True)
    rating = Column(Integer)       # 1–5
    helpful = Column(String(5))    # "yes" / "no"
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class TicketSubmit(BaseModel):
    title: str = Field(..., min_length=5, max_length=300)
    description: str = Field(..., min_length=10, max_length=5000)
    language: Optional[str] = None  # If None, auto-detect


class SimilarTicket(BaseModel):
    ticket_id: str
    title: str
    category: str
    similarity: float
    resolution: str


class ClassificationResult(BaseModel):
    ticket_id: str
    title: str
    description: str
    category: str
    confidence: float           # 0–100
    priority: str
    sentiment: str
    sentiment_score: float
    action_taken: str           # auto_resolved | routed | escalated
    assigned_agent: str
    resolution: str
    rca_analysis: str           # NEW: Root Cause Analysis
    similar_tickets: List[SimilarTicket]
    sla_hours: int
    sla_deadline: str
    similarity_score: float
    is_duplicate: bool
    duplicate_of: str
    language: str
    status: str
    created_at: str


class TicketOut(BaseModel):
    ticket_id: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    confidence: float
    sentiment: str
    action_taken: str
    assigned_agent: str
    resolution: str
    rca_analysis: str
    sla_hours: int
    similarity_score: float
    language: str
    duplicate_of: str
    created_at: str
    resolved_at: Optional[str] = None

    class Config:
        from_attributes = True


class AnalyticsSummary(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    in_progress_tickets: int
    resolution_rate: float
    escalation_rate: float
    avg_confidence: float
    category_distribution: dict
    priority_distribution: dict
    daily_volume: list
    agent_workload: dict
    avg_resolution_hours: float
    f1_scores: dict


class FeedbackIn(BaseModel):
    ticket_id: str
    rating: int = Field(..., ge=1, le=5)
    helpful: str = Field(..., pattern="^(yes|no)$")
    comment: Optional[str] = ""


class KBArticle(BaseModel):
    ticket_id: str
    title: str
    category: str
    priority: str
    resolution: str
    created_at: str
    similarity_score: float = 0.0

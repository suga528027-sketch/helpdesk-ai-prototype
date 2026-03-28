"""
FastAPI main application — AI-Powered IT Helpdesk Ticket Classification & Resolution System.
"""
import os
import uuid
import random
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from dotenv import load_dotenv

load_dotenv()

from database import init_db, get_db
from models import (
    TicketORM, FeedbackORM, UserORM, IncidentORM, NotificationORM,
    TicketSubmit, ClassificationResult, TicketOut,
    AnalyticsSummary, FeedbackIn, KBArticle, SimilarTicket,
)
from classifier import (
    classify_category, predict_priority, analyze_sentiment,
    decide_action, assign_agent, get_agent_workload, get_sla_hours,
)
from rag import build_index, retrieve_similar, check_duplicate, get_best_resolution, add_to_index
from llm import generate_resolution, mask_pii, perform_rca, review_resolution
from translation import normalize_ticket
from auth import create_access_token, get_password_hash, verify_password, get_current_user, check_role
from websocket import manager
from scheduler import monitor_major_incidents
from vision import process_image_attachment
from reports import send_email_report
from chatbot import get_chatbot_response
from rca_generator import generate_rca_report

import asyncio
from fastapi import WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup - fail gracefully on Render to avoid crash loop
    try:
        await init_db()
        print("Database initialized.")
    except Exception as e:
        print(f"DB Init Failed: {e}")

    try:
        success = build_index()
        print(f"RAG Index: {'OK' if success else 'FAIL'}")
    except Exception as e:
        print(f"RAG Index Error: {e}")
    
    # Start background scheduler
    asyncio.create_task(monitor_major_incidents())
    print("Incident monitor started.")
    
    yield
    print("Shutting down.")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SolveWise AI: Intelligent Resolution Engine",
    description="Intelligent IT support ticket classification and resolution system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_ticket_id() -> str:
    return f"TKT-{random.randint(1000, 9999)}"


def iso_now() -> str:
    return datetime.utcnow().isoformat()


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "time": iso_now()}


async def _process_ticket_submission(title: str, description: str, language: Optional[str], db: AsyncSession):
    """Core logic shared between JSON and Form submission."""
    t_id = make_ticket_id()
    
    # 0. PII Scrubbing Agent (🛡️ Privacy Guard)
    masked_description = mask_pii(description)

    # 1. Language normalization
    title_en, desc_en, lang_detected = normalize_ticket(title, masked_description, language)

    # 2. Duplicate detection
    is_dup, dup_of = check_duplicate(title_en, desc_en)

    # 3. Classification
    category, confidence = classify_category(title_en, desc_en)

    # 4. Sentiment
    sentiment, sentiment_score = analyze_sentiment(title_en, desc_en)

    # 5. Priority
    priority = predict_priority(title_en, desc_en, sentiment)

    # 6. Agent decision
    action = decide_action(confidence)
    agent = assign_agent() if action != "auto_resolved" else "AUTO"

    # 7. SLA
    sla_hours = get_sla_hours(priority, sentiment)
    sla_deadline = (datetime.utcnow() + timedelta(hours=sla_hours)).isoformat()

    # 8. RAG retrieval
    similar = retrieve_similar(title_en, desc_en)
    sim_score = similar[0]["similarity"] if similar else 0.0

    # 9. Resolution generation
    raw_resolution = generate_resolution(title_en, desc_en, category, priority, similar, confidence)

    # 10. RCA Agent (🔍 Diagnostic Brain - NEW!)
    rca_analysis = perform_rca(title_en, desc_en, category)

    # 11. Self-Correction Agent (🧪 Reviewer - NEW!)
    final_resolution, was_revised = review_resolution(desc_en, raw_resolution)
    if was_revised:
        print(f"Agentic System: Resolution for {t_id} was revised by QC Agent.")

    # 12. Ticket status
    status = "resolved" if action == "auto_resolved" else ("in_progress" if action == "routed" else "open")
    if is_dup:
        status = "duplicate"
    
    now = datetime.utcnow()

    # 13. Persist to DB
    orm_ticket = TicketORM(
        ticket_id=t_id,
        title=title,
        description=description,
        masked_description=masked_description,
        category=category,
        priority=priority,
        status=status,
        resolution=final_resolution if status == "resolved" else "",
        rca_analysis=rca_analysis,
        confidence=confidence,
        sentiment=sentiment,
        sentiment_score=sentiment_score,
        action_taken=action,
        assigned_agent=agent,
        sla_hours=sla_hours,
        similarity_score=sim_score,
        language=lang_detected,
        duplicate_of=dup_of,
        created_at=now,
        resolved_at=now if status == "resolved" else None,
    )
    db.add(orm_ticket)
    await db.commit()
    await db.refresh(orm_ticket)

    # 14. Add to RAG KB if auto-resolved
    if status == "resolved":
        add_to_index(t_id, title_en, desc_en, final_resolution, category, priority)

    similar_out = [SimilarTicket(**s) for s in similar]

    return ClassificationResult(
        ticket_id=t_id,
        title=title,
        description=description,
        category=category,
        confidence=round(confidence, 1),
        priority=priority,
        sentiment=sentiment,
        sentiment_score=round(sentiment_score, 2),
        action_taken=action,
        assigned_agent=agent,
        resolution=final_resolution,
        rca_analysis=rca_analysis,
        similar_tickets=similar_out,
        sla_hours=sla_hours,
        sla_deadline=sla_deadline,
        similarity_score=round(sim_score, 1),
        is_duplicate=is_dup,
        duplicate_of=dup_of,
        language=lang_detected,
        status=status,
        created_at=now.isoformat(),
    )

@app.post("/ticket/submit", response_model=ClassificationResult)
async def submit_ticket(ticket: TicketSubmit, db: AsyncSession = Depends(get_db)):
    """Main ticket submission endpoint — classify, retrieve, resolve, decide."""
    return await _process_ticket_submission(ticket.title, ticket.description, ticket.language, db)


@app.get("/ticket/{ticket_id}", response_model=TicketOut)
async def get_ticket(ticket_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TicketORM).where(TicketORM.ticket_id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return TicketOut(
        ticket_id=ticket.ticket_id,
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        confidence=ticket.confidence,
        sentiment=ticket.sentiment,
        action_taken=ticket.action_taken,
        assigned_agent=ticket.assigned_agent,
        resolution=ticket.resolution,
        sla_hours=ticket.sla_hours,
        similarity_score=ticket.similarity_score,
        language=ticket.language,
        duplicate_of=ticket.duplicate_of,
        created_at=ticket.created_at.isoformat(),
        resolved_at=ticket.resolved_at.isoformat() if ticket.resolved_at else None,
    )


@app.get("/tickets/all")
async def get_all_tickets(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    query = select(TicketORM).order_by(TicketORM.created_at.desc())
    if category:
        query = query.where(TicketORM.category == category)
    if priority:
        query = query.where(TicketORM.priority == priority)
    if status:
        query = query.where(TicketORM.status == status)
    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    tickets = result.scalars().all()

    return [
        {
            "ticket_id": t.ticket_id, "title": t.title, "category": t.category,
            "priority": t.priority, "status": t.status, "confidence": t.confidence,
            "sentiment": t.sentiment, "action_taken": t.action_taken,
            "assigned_agent": t.assigned_agent, "sla_hours": t.sla_hours,
            "created_at": t.created_at.isoformat(),
        }
        for t in tickets
    ]


@app.get("/analytics/summary", response_model=AnalyticsSummary)
async def analytics_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TicketORM))
    all_tickets = result.scalars().all()

    try:
        total = len(all_tickets)
        if total == 0:
            return AnalyticsSummary(
                total_tickets=0, open_tickets=0, resolved_tickets=0, in_progress_tickets=0,
                resolution_rate=0, escalation_rate=0, avg_confidence=0,
                category_distribution={}, priority_distribution={}, daily_volume=[],
                agent_workload={}, avg_resolution_hours=0, f1_scores={},
            )

        open_c = sum(1 for t in all_tickets if t.status == "open")
        resolved_c = sum(1 for t in all_tickets if t.status == "resolved")
        ip_c = sum(1 for t in all_tickets if t.status == "in_progress")
        escalated_c = sum(1 for t in all_tickets if t.action_taken == "escalated")
        avg_conf = sum(t.confidence for t in all_tickets) / total
    except Exception as e:
        print(f"Summary calc error: {e}")
        raise HTTPException(status_code=500, detail="Analytics calculation failed")

    cat_dist = {}
    for t in all_tickets:
        cat_dist[t.category] = cat_dist.get(t.category, 0) + 1

    pri_dist = {}
    for t in all_tickets:
        pri_dist[t.priority] = pri_dist.get(t.priority, 0) + 1

    # Daily volume (last 30 days)
    from collections import defaultdict
    daily = defaultdict(int)
    for t in all_tickets:
        day = t.created_at.strftime("%Y-%m-%d")
        daily[day] += 1
    daily_volume = [{"date": k, "count": v} for k, v in sorted(daily.items())[-30:]]

    # Agent workload
    agent_wl = get_agent_workload()
    # Also count from DB
    db_agent_counts = {}
    for t in all_tickets:
        if t.assigned_agent and t.assigned_agent != "AUTO":
            db_agent_counts[t.assigned_agent] = db_agent_counts.get(t.assigned_agent, 0) + 1

    # Avg resolution hours
    res_times = []
    for t in all_tickets:
        if t.resolved_at and t.created_at:
            delta = (t.resolved_at - t.created_at).total_seconds() / 3600
            res_times.append(delta)
    avg_res_hours = sum(res_times) / len(res_times) if res_times else 0

    # Simulated F1 scores per category
    f1_scores = {
        "Infrastructure": round(random.uniform(0.82, 0.94), 3),
        "Application": round(random.uniform(0.79, 0.92), 3),
        "Security": round(random.uniform(0.85, 0.96), 3),
        "Database": round(random.uniform(0.81, 0.93), 3),
        "Network": round(random.uniform(0.80, 0.91), 3),
        "Access Management": round(random.uniform(0.84, 0.95), 3),
    }

    return AnalyticsSummary(
        total_tickets=total,
        open_tickets=open_c,
        resolved_tickets=resolved_c,
        in_progress_tickets=ip_c,
        resolution_rate=round(resolved_c / total * 100, 1),
        escalation_rate=round(escalated_c / total * 100, 1),
        avg_confidence=round(avg_conf, 1),
        category_distribution=cat_dist,
        priority_distribution=pri_dist,
        daily_volume=daily_volume,
        agent_workload=db_agent_counts or agent_wl,
        avg_resolution_hours=round(avg_res_hours, 1),
        f1_scores=f1_scores,
    )


@app.post("/feedback")
async def submit_feedback(feedback: FeedbackIn, db: AsyncSession = Depends(get_db)):
    orm = FeedbackORM(
        ticket_id=feedback.ticket_id,
        rating=feedback.rating,
        helpful=feedback.helpful,
        comment=feedback.comment or "",
        created_at=datetime.utcnow(),
    )
    db.add(orm)
    await db.commit()
    return {"message": "Feedback recorded. Thank you!"}


@app.get("/knowledge-base", response_model=List[KBArticle])
async def knowledge_base(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(default=50, le=100),
):
    query = select(TicketORM).where(TicketORM.status == "resolved").order_by(TicketORM.created_at.desc())
    if category:
        query = query.where(TicketORM.category == category)
    query = query.limit(limit)
    result = await db.execute(query)
    tickets = result.scalars().all()

    articles = []
    for t in tickets:
        if search:
            if search.lower() not in (t.title + " " + (t.resolution or "")).lower():
                continue
        articles.append(KBArticle(
            ticket_id=t.ticket_id,
            title=t.title,
            category=t.category,
            priority=t.priority,
            resolution=t.resolution or "",
            created_at=t.created_at.isoformat(),
            similarity_score=t.similarity_score,
        ))
    return articles


# ─── New Features: Auth & RBAC ──────────────────────────────────────────

@app.post("/auth/register")
async def register(username: str, email: str, password: str, role: str = "user", db: AsyncSession = Depends(get_db)):
    # Check if exists
    res = await db.execute(select(UserORM).where(UserORM.username == username))
    if res.scalar_one_or_none():
        raise HTTPException(400, "Username already taken")
    
    hashed = get_password_hash(password)
    new_user = UserORM(
        username=username,
        email=email,
        hashed_password=hashed,
        role=role
    )
    db.add(new_user)
    await db.commit()
    return {"message": "User created successfully"}

@app.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(UserORM).where(UserORM.username == form_data.username))
    user = res.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.get("/auth/me")
async def get_me(user: UserORM = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "role": user.role, "email": user.email}

# ─── New Features: WebSockets ───────────────────────────────────────────

@app.websocket("/ws/{user_id}/{role}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, role: str):
    await manager.connect(websocket, user_id, role)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, role)

# ─── New Features: Major Incident Alerting ───────────────────────────────

from models import IncidentORM

@app.get("/incidents/active")
async def get_active_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IncidentORM).where(IncidentORM.is_active == True))
    return result.scalars().all()

# ─── New Features: RCA Generator ────────────────────────────────────────

@app.post("/ticket/{ticket_id}/rca")
async def generate_ticket_rca(ticket_id: str, db: AsyncSession = Depends(get_db), current_user = Depends(check_role(["admin", "agent"]))):
    res = await db.execute(select(TicketORM).where(TicketORM.ticket_id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    
    # Generate the report using Claude
    rca_text = await generate_rca_report(ticket_id, ticket)
    ticket.rca_analysis = rca_text
    ticket.rca_status = "generated"
    await db.commit()
    
    return {"ticket_id": ticket_id, "rca_analysis": rca_text}

# ─── New Features: AI Chatbot ───────────────────────────────────────────

@app.post("/chatbot/query")
async def chatbot_query(query: str, db: AsyncSession = Depends(get_db), current_user: Optional[UserORM] = Depends(lambda: None)):
    # Fallback to a systemic user ID if not logged in
    user_id = current_user.id if current_user else 0
    response = await get_chatbot_response(query, user_id, db)
    return {"response": response}

@app.get("/analytics/agents")
async def get_agent_workload_analytics(db: AsyncSession = Depends(get_db)):
    """Chart-friendly workload distribution for all agents."""
    try:
        result = await db.execute(select(TicketORM))
        tickets = result.scalars().all()
        counts = {}
        for t in tickets:
            ag = t.assigned_agent or "Unassigned"
            if ag not in counts:
                counts[ag] = { "total": 0, "resolved": 0, "open": 0 }
            counts[ag]["total"] += 1
            st = (t.status or "open").lower()
            if st == "resolved":
                counts[ag]["resolved"] += 1
            else:
                counts[ag]["open"] += 1
        return counts
    except Exception as e:
        print(f"Agent analytics error: {e}")
        return {}

# ─── New Features: Agent Leaderboard ────────────────────────────────────

@app.get("/agents/leaderboard")
async def agent_leaderboard(db: AsyncSession = Depends(get_db)):
    # Simulate scores based on data
    res = await db.execute(select(UserORM).where(UserORM.role == "agent").order_by(UserORM.tickets_resolved.desc()))
    agents = res.scalars().all()
    return [{
        "rank": i+1,
        "name": a.username,
        "resolved": a.tickets_resolved,
        "rating": a.feedback_rating,
        "avg_time": f"{a.avg_resolution_time}h"
    } for i, a in enumerate(agents)]

# ─── New Features: Weekly Reports ───────────────────────────────────────

@app.post("/reports/send-weekly")
async def trigger_weekly_report(email: str, db: AsyncSession = Depends(get_db), current_user = Depends(lambda: None)):
    await send_email_report(email)
    return {"message": "Report sent to " + email}

# ─── Image Upload Support ──────────────────────────────────────────────

@app.post("/ticket/submit-with-image", response_model=ClassificationResult)
async def submit_ticket_with_image(
    title: str = Form(...), 
    description: str = Form(...),
    language: str = Form("en"),
    image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    # If image, process with Vision API
    vision_text = ""
    img_path = ""
    if image:
        contents = await image.read()
        vision_result = await process_image_attachment(contents, image.content_type)
        if vision_result:
            vision_text = f"\n[AI VISION EXTRACT]: {vision_result['summary']} | Error Code: {vision_result['error_code']}\n"
        
        # Save file locally
        os.makedirs("./uploads", exist_ok=True)
        img_path = f"uploads/{uuid.uuid4()}_{image.filename}"
        with open(img_path, "wb") as f:
            f.write(contents)

    # Enhance description with vision data
    enhanced_description = description + vision_text
    
    # Process the ticket
    result = await _process_ticket_submission(title, enhanced_description, language, db)
    
    # Update with image path if needed
    if img_path:
        # We need to fetch the ORM object to update it or just assume it's in DB
        res = await db.execute(select(TicketORM).where(TicketORM.ticket_id == result.ticket_id))
        orm_ticket = res.scalar_one_or_none()
        if orm_ticket:
            orm_ticket.image_path = img_path
            await db.commit()
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

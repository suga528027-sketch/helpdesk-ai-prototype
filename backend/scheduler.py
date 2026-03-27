import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal as SessionLocal
from models import TicketORM, IncidentORM, NotificationORM
from websocket import manager

async def monitor_major_incidents():
    """Background task to detect category spikes (proactive alerting)."""
    while True:
        try:
            async with SessionLocal() as db:
                # Check tickets from the last 60 minutes
                one_hour_ago = datetime.utcnow() - timedelta(minutes=60)
                
                # Query categories with 5+ tickets in the last hour
                # Using SQLite compatible group_concat
                query = select(
                    TicketORM.category,
                    func.count(TicketORM.id).label("count"),
                    func.group_concat(TicketORM.ticket_id).label("ticket_ids")
                ).where(
                    TicketORM.created_at >= one_hour_ago
                ).group_by(
                    TicketORM.category
                ).having(
                    func.count(TicketORM.id) >= 5
                )
                
                result = await db.execute(query)
                spikes = result.all()
                
                for category, count, ticket_ids in spikes:
                    # Check if we already have an active incident for this category
                    existing = await db.execute(
                        select(IncidentORM).where(
                            IncidentORM.category == category,
                            IncidentORM.is_active == True
                        )
                    )
                    if not existing.scalar_one_or_none():
                        # Trigger New Major Incident
                        incident_msg = f"🔥 MAJOR INCIDENT DETECTED: {count} new tickets in {category} within the last hour."
                        new_incident = IncidentORM(
                            category=category,
                            message=incident_msg,
                            ticket_ids=ticket_ids,
                            is_active=True
                        )
                        db.add(new_incident)
                        
                        # Notify Admins and Agents via WS
                        alert = {
                            "type": "incident_alert",
                            "title": "Major Incident Alert",
                            "message": incident_msg,
                            "category": category
                        }
                        await manager.broadcast_to_role(alert, "admin")
                        await manager.broadcast_to_role(alert, "agent")
                
                await db.commit()
                
        except Exception as e:
            print(f"Background monitor error: {e}")
            
        await asyncio.sleep(60 * 15) # Wait 15 minutes before next check

import os
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from anthropic import Anthropic
from models import TicketORM

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

async def get_chatbot_response(user_query: str, user_id: int, db: AsyncSession) -> str:
    """Smart AI Chatbot to check ticket status and answer helpdesk FAQs."""
    # 1. Check if query is about a specific ticket
    import re
    ticket_match = re.search(r'(#|TKT-)(\d{4,8})', user_query)
    
    context = ""
    if ticket_match:
        t_id = ticket_match.group(0).replace("#", "TKT-")
        result = await db.execute(select(TicketORM).where(TicketORM.ticket_id == t_id))
        ticket = result.scalar_one_or_none()
        if ticket:
            context = f"""
            Ticket {t_id} Details:
            Title: {ticket.title}
            Status: {ticket.status}
            Priority: {ticket.priority}
            Resolution: {ticket.resolution or 'No resolution yet'}
            Assigned Agent: {ticket.assigned_agent or 'Awaiting assignment'}
            Last Updated: {ticket.created_at.isoformat()}
            """

    # 2. General Query with Context
    prompt = f"""You are a helpful IT Helpdesk Assistant. 
Answer the user's query about their IT issues. 
If context is provided below, use it to accurately update them on their ticket status.
Otherwise, summarize common IT procedures or ask for their ticket ID.

User Query: {user_query}
Ticket Context: {context}

Response (helpful, friendly, brief):"""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=250,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        return "I'm having trouble accessing the live system right now, but you can view your tickets in the dashboard. Is there anything else I can help with?"

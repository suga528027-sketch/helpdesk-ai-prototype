import os
import re
from datetime import datetime
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from anthropic import Anthropic
from models import TicketORM

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
client = Anthropic(api_key=ANTHROPIC_API_KEY) if (ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your_claude_api_key_here") else None

async def get_chatbot_response(user_query: str, user_id: int, db: AsyncSession) -> str:
    """Smart AI Chatbot to check ticket status and answer helpdesk FAQs."""
    q_low = user_query.lower()
    
    # 1. Check if query is about a specific ticket
    ticket_match = re.search(r'(#|TKT-)?(\d{4})', user_query)
    context = ""
    if ticket_match:
        t_num = ticket_match.group(2)
        t_id = f"TKT-{t_num}"
        result = await db.execute(select(TicketORM).where(TicketORM.ticket_id == t_id))
        ticket = result.scalar_one_or_none()
        if ticket:
            dup_info = f"\n⚠️ Duplicate of: {ticket.duplicate_of}" if ticket.duplicate_of else ""
            created = ticket.created_at.strftime("%Y-%m-%d %H:%M") if ticket.created_at else "N/A"
            context = (
                f"📌 Ticket {t_id} Details:\n"
                f"• Title: {ticket.title}\n"
                f"• Status: {ticket.status.upper()}\n"
                f"• Priority: {ticket.priority}\n"
                f"• Agent: {ticket.assigned_agent or 'Awaiting assignment'}\n"
                f"• Resolution: {ticket.resolution or 'No resolution yet'}\n"
                f"• Created: {created}{dup_info}"
            )

    # 2. General Query Handling & Offline Mode
    if not client:
        offline_prefix = "🤖 [Offline Mode Active]"
        
        if context:
            return f"{offline_prefix} I've retrieved your ticket details from the local database:\n\n{context}"
            
        # Mock FAQ responses for common IT queries
        if "password" in q_low or "reset" in q_low:
            return f"{offline_prefix} To reset your password, visit the SSO portal at sso.company.com or press Ctrl+Alt+Del on your workstation. Need a formal ticket? Just describe your issue!"
        if "vpn" in q_low or "connect" in q_low:
            return f"{offline_prefix} VPN issues are often solved by re-authenticating your MFA or switching to the 'Global-Connect' gateway. Check your system tray for the icon."
        if "wifi" in q_low or "network" in q_low:
            return f"{offline_prefix} Ensure you are connected to 'Company-Guest' or 'Company-Enterprise'. If your laptop can't see the network, try toggling Airplane Mode."
        if "hi" in q_low or "hello" in q_low:
            return f"{offline_prefix} Hello! I am the Helpdesk AI. I'm currently running in local-fallback mode. I can help you check ticket status (type #1234) or give basic IT tips."

        return f"{offline_prefix} I found no specific ticket ID in your message. While my Brain is offline (missing API Key), you can check any ticket by typing its ID like #3115."

    # 3. LLM Generation (if online)
    prompt = f"""You are a helpful IT Helpdesk Assistant. 
Answer the user's query about their IT issues. 
If context is provided below, use it to accurately update them on their ticket status.
Otherwise, summarize common IT procedures or ask for their ticket ID.

User Query: {user_query}
Ticket Context: {context}

Response (helpful, friendly, brief):"""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=250,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"Chatbot API error: {e}")
        return "I'm having trouble accessing the live AI system right now. Please check your connectivity or API key configurations."

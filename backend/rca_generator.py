import os
from typing import Optional
from anthropic import Anthropic
from models import TicketORM
try:
    from fpdf import FPDF
except ImportError:
    FPDF = None

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

async def generate_rca_report(ticket_id: str, ticket: TicketORM) -> str:
    """Full-featured AI-driven Root Cause Analysis report with PDF output."""
    prompt = f"""You are a Senior Root Cause Analysis (RCA) Expert. Generate a professional RCA report for this IT issue.
Ticket Details:
Title: {ticket.title}
Description: {ticket.description}
Category: {ticket.category}
Resolution: {ticket.resolution}

Generate an RCA with these sections:
Problem Summary (brief, non-technical)
Root Cause (technical depth)
Business Impact (e.g., productivity loss, security risk)
Corrective Actions (steps taken to resolve)
Preventative Measures (how to ensure it doesn't happen again)
Final Prevention Score (0-100)

Format it for a professional corporate document."""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        return f"AI Root Cause Analysis for {ticket_id} is currently unavailable. Please try again later."

def create_rca_pdf(ticket_id: str, rca_text: str) -> str:
    """Creates a downloadable PDF of the generated RCA."""
    if not FPDF:
        return "Not Generated (FPDF missing)"
        
    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(200, 10, txt=f"Root Cause Analysis Report - {ticket_id}", ln=True, align='C')
        pdf.ln(10)
        
        pdf.set_font("Arial", size=12)
        # Handle unicode if needed or simple multi_cell for text
        pdf.multi_cell(0, 10, txt=rca_text)
        
        os.makedirs("./data/rca", exist_ok=True)
        filepath = f"./data/rca/rca_{ticket_id}.pdf"
        pdf.output(filepath)
        return filepath
    except Exception as e:
        print(f"PDF creation error: {e}")
        return "RCA PDF Generation failed"

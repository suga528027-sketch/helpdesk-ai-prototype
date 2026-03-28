import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from sqlalchemy import select, func
from database import AsyncSessionLocal as SessionLocal
from models import TicketORM

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

async def generate_weekly_report():
    """Compiles weekly helpdesk performance and sends it via email."""
    async with SessionLocal() as db:
        # Check tickets from the last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        # 1. Total Count
        result = await db.execute(select(func.count(TicketORM.id)).where(TicketORM.created_at >= seven_days_ago))
        total = result.scalar()
        
        # 2. Resolution Rate
        res_count = await db.execute(select(func.count(TicketORM.id)).where(TicketORM.created_at >= seven_days_ago, TicketORM.status == "resolved"))
        resolved = res_count.scalar()
        rate = (resolved / total * 100) if total > 0 else 0
        
        # 3. Categorization
        cat_counts = await db.execute(select(TicketORM.category, func.count(TicketORM.id)).where(TicketORM.created_at >= seven_days_ago).group_by(TicketORM.category).order_by(func.count(TicketORM.id).desc()))
        top_cats = cat_counts.all()[:3]
        
        return {
            "total": total,
            "resolved": resolved,
            "rate": round(rate, 1),
            "top_categories": ", ".join([f"{c}: {v}" for c, v in top_cats])
        }

async def send_email_report(to_email: str):
    """Sends the formatted HTML weekly summary report."""
    data = await generate_weekly_report()
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📊 Weekly IT Helpdesk Summary - {datetime.utcnow().strftime('%Y-%m-%d')}"
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="background: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #ddd;">
          <h2 style="color: #333;">HelpDesk Weekly Report 🚀</h2>
          <p>Here is your performance summary for the last 7 days:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f8f8f8;">
              <td style="padding: 10px; border: 1px solid #ddd;">Total Tickets</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><b>{data['total']}</b></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Auto-Resolution Rate</td>
              <td style="padding: 10px; border: 1px solid #ddd;"><b>{data['rate']}%</b></td>
            </tr>
            <tr style="background: #f8f8f8;">
              <td style="padding: 10px; border: 1px solid #ddd;">Top Categories</td>
              <td style="padding: 10px; border: 1px solid #ddd;">{data['top_categories']}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #777; margin-top: 20px;">This is an automated system report.</p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))
    
    if SMTP_USER and SMTP_PASS:
        try:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, to_email, msg.as_string())
            print(f"Weekly report sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"Email error: {e}")
            raise Exception(f"Failed to send email: {e}")
    else:
        print(f"Offline Mode: Report for {to_email} generated (SMTP config missing).")
        return True

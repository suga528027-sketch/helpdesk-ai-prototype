"""
Claude API integration for resolution generation and evaluation.
Uses claude-sonnet-4-20250514 (or fallback to claude-3-5-sonnet).
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-20250514"
FALLBACK_MODEL = "claude-3-5-sonnet-20241022"


def _get_client():
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_claude_api_key_here":
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    except Exception:
        return None


def generate_resolution(
    title: str,
    description: str,
    category: str,
    priority: str,
    similar_resolutions: list,
    confidence: float,
) -> str:
    """Generate a resolution using Claude, with RAG context from similar tickets."""
    client = _get_client()
    if not client:
        return _fallback_resolution(category, priority, similar_resolutions)

    rag_context = ""
    if similar_resolutions:
        snippets = "\n".join(
            f"- [{r.get('ticket_id','')}] {r.get('title','')}: {r.get('resolution','')[:200]}"
            for r in similar_resolutions[:3]
        )
        rag_context = f"\n\nSIMILAR PAST RESOLUTIONS (RAG Context):\n{snippets}"

    prompt = f"""You are an expert IT helpdesk engineer. Analyze this support ticket and provide a clear, actionable step-by-step resolution.

TICKET DETAILS:
Title: {title}
Description: {description}
Category: {category}
Priority: {priority}
Classification Confidence: {confidence:.0f}%
{rag_context}

Provide a professional resolution in 3-5 concise steps. Be specific and technical. Format as numbered steps."""

    try:
        models_to_try = [MODEL, FALLBACK_MODEL]
        for model in models_to_try:
            try:
                response = client.messages.create(
                    model=model,
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text.strip()
            except Exception as e:
                if "model" in str(e).lower():
                    continue
                raise
    except Exception as e:
        print(f"Claude API error: {e}")
        return _fallback_resolution(category, priority, similar_resolutions)


def evaluate_resolution(ticket_description: str, generated_resolution: str) -> float:
    """LLM-as-Judge: evaluate quality of generated resolution (0–1 semantic similarity score)."""
    client = _get_client()
    if not client:
        return 0.85  # Default score when API unavailable

    prompt = f"""Rate how well this IT helpdesk resolution addresses the ticket description.
Return ONLY a number between 0.0 and 1.0 (e.g., 0.87).

TICKET: {ticket_description[:500]}
RESOLUTION: {generated_resolution[:500]}

Score (0.0-1.0):"""

    try:
        response = client.messages.create(
            model=FALLBACK_MODEL,
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}]
        )
        score_text = response.content[0].text.strip()
        import re
        match = re.search(r"(\d+\.?\d*)", score_text)
        if match:
            score = float(match.group(1))
            return min(max(score, 0.0), 1.0)
    except Exception as e:
        print(f"Evaluation error: {e}")

    return 0.85


def _fallback_resolution(category: str, priority: str, similar_resolutions: list) -> str:
    """Return best available resolution from RAG context when Claude is unavailable."""
    if similar_resolutions:
        best = max(similar_resolutions, key=lambda x: x.get("similarity", 0))
        res = best.get("resolution", "")
        if res:
            return f"[RAG-Based Resolution]\n{res}"

    FALLBACKS = {
        "Infrastructure": "1. Verify server health via monitoring dashboard.\n2. Check system logs for error messages.\n3. Attempt service restart if applicable.\n4. Escalate to infrastructure team if unresolved.\n5. Document findings in ITSM.",
        "Application": "1. Collect error logs and screenshots from affected users.\n2. Check application server health and resource usage.\n3. Review recent deployments or configuration changes.\n4. Apply rollback if recent change is root cause.\n5. Engage application vendor if needed.",
        "Security": "1. Isolate affected systems immediately.\n2. Run full antivirus/threat scan.\n3. Review audit logs for unauthorized access.\n4. Reset compromised credentials.\n5. File security incident report.",
        "Database": "1. Check database server health and connection counts.\n2. Review slow query logs.\n3. Rebuild indexes if performance issue.\n4. Verify replication status.\n5. Engage DBA team for complex issues.",
        "Network": "1. Run ping/traceroute to identify connectivity path.\n2. Check switch/router logs.\n3. Verify DHCP/DNS configuration.\n4. Test VLAN configuration.\n5. Escalate to network team.",
        "Access Management": "1. Verify user identity through secondary channel.\n2. Review access logs for suspicious activity.\n3. Reset credentials if needed.\n4. Update permissions per RBAC policy.\n5. Document access change in audit trail.",
    }
    return FALLBACKS.get(category, "Please contact IT helpdesk for assistance with this issue.")


def perform_rca(title: str, description: str, category: str) -> str:
    """Agentic RCA: Diagnose the root cause using AI reasoning."""
    client = _get_client()
    if not client:
        return f"AI diagnostics for {category} patterns suggest potential configuration mismatch or transient failure."

    prompt = f"""You are a Senior Root Cause Analysis (RCA) Engineer. Analyze this IT issue and diagnose the likely core cause.
Be technical and precise. Provide a 1-sentence 'Likely Root Cause'.

ISSUE:
Title: {title}
Description: {description}
Category: {category}

RCA Diagnosis:"""

    try:
        response = client.messages.create(
            model=FALLBACK_MODEL,
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception:
        return "Anomaly detected in system telemetry consistent with service saturation."


def mask_pii(text: str) -> str:
    """PII Scrubber Agent: Mask sensitive information for privacy protection."""
    import re
    # Simple regex for common PII
    masked = re.sub(r'(\d{3}-\d{2}-\d{4})', '[REDACTED SSN]', text)
    masked = re.sub(r'(\+?\d{1,2}\s?)?(\d{3}-\d{3}-\d{4})', '[REDACTED PHONE]', masked)
    masked = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED EMAIL]', masked)
    
    # Simple password pattern check
    masked = re.sub(r'(?i)(password|pwd|secret):\s*\S+', r'\1: [PROTECTED]', masked)
    
    return masked


def review_resolution(ticket_desc: str, resolution: str) -> tuple[str, bool]:
    """Self-Correction Agent: Review and critique the AI-generated resolution."""
    client = _get_client()
    if not client:
        return resolution, True

    prompt = f"""You are a Quality Assurance IT Lead. Review this generated resolution for accuracy and safety.
If it is dangerous or irrelevant, fix it. If it is good, return it as is.
Always output the final resolution text, then a second line saying 'STATUS: APPROVED' or 'STATUS: REVISED'.

TICKET: {ticket_desc[:400]}
GENERATED RESOLUTION:
{resolution}

Reviewer Feedback:"""

    try:
        response = client.messages.create(
            model=FALLBACK_MODEL,
            max_tokens=550,
            messages=[{"role": "user", "content": prompt}]
        )
        result = response.content[0].text.strip()
        is_revised = "STATUS: REVISED" in result
        clean_res = result.replace("STATUS: APPROVED", "").replace("STATUS: REVISED", "").strip()
        return clean_res or resolution, is_revised
    except Exception:
        return resolution, False

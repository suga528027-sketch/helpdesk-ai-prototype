import os
import base64
from typing import Optional
import httpx
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

async def process_image_attachment(image_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[dict]:
    """Use Claude Vision to extract error details from terminal screenshots or UI errors."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_claude_api_key_here":
        # Mock Response for Demo/Hackathon if no API Key provided
        return {
            "error_message": "Kernel panic (not syncing): Attempted to kill idle task!",
            "app_name": "Linux Kernel Runtime",
            "error_code": "0x000F72",
            "summary": "AI Vision (Offline Mode) detected a system-level kernel error. RAG resolutions will prioritize infrastructure restore."
        }
    
    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    
    prompt = """Analyze this IT issue screenshot. Extract:
1. Error Message Text (exact verbatim)
2. Application Name (if visible)
3. Error Code (e.g., 0x004, HTTP 500)
4. A 1-sentence description of what's happening.

Format as a JSON object:
{
  "error_message": "",
  "app_name": "",
  "error_code": "",
  "summary": ""
}"""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": encoded_image,
                            },
                        },
                        {"type": "text", "text": prompt}
                    ],
                }
            ],
        )
        
        # Simple JSON extract
        raw_text = response.content[0].text
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        if start != -1 and end != -1:
            import json
            return json.loads(raw_text[start:end])
    except Exception as e:
        print(f"Vision API Error: {e}")
    return None

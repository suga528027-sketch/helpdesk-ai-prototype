"""
Language detection and translation utilities.
Falls back gracefully if packages aren't available.
"""
from typing import Tuple


def detect_language(text: str) -> str:
    """Detect language code of text. Returns 'en' on failure."""
    try:
        from langdetect import detect
        lang = detect(text)
        return lang
    except Exception:
        return "en"


def translate_to_english(text: str, source_lang: str = "auto") -> str:
    """Translate text to English using deep-translator. Returns original on failure."""
    if source_lang == "en":
        return text
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source=source_lang if source_lang != "auto" else "auto", target="en")
        if len(text) > 4000:
            chunks = [text[i:i+4000] for i in range(0, len(text), 4000)]
            return " ".join(translator.translate(chunk) for chunk in chunks)
        return translator.translate(text)
    except Exception as e:
        print(f"Translation failed: {e}")
        return text


def normalize_ticket(title: str, description: str, language: str = None) -> Tuple[str, str, str]:
    """Auto-detect language and translate to English if needed."""
    combined = title + " " + description
    if not language:
        language = detect_language(combined)

    if language != "en":
        title = translate_to_english(title, language)
        description = translate_to_english(description, language)

    return title, description, language

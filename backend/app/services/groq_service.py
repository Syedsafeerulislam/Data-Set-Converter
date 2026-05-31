"""
Groq LLM translation service.

Supports ALL directions between 3 languages:
  urdu      ↔ roman_urdu
  urdu      ↔ english
  english   ↔ roman_urdu

Roman Urdu = Urdu written in Latin alphabet (WhatsApp/SMS style)
  e.g. "میں ٹھیک ہوں" → "main theek hoon"

Urdu = Nastaliq Arabic script
  e.g. "I am fine" → "میں ٹھیک ہوں"
"""
import json
import re
import asyncio
from typing import List, Optional
from groq import AsyncGroq, Groq
from app.utils.config import settings

# ─────────────────────────────────────────────────────────────────
# Language detection helpers
# ─────────────────────────────────────────────────────────────────
URDU_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")

ROMAN_URDU_WORDS = {
    "hai", "hain", "mein", "main", "nahi", "nahin", "kya", "aur", "ki",
    "ka", "ke", "ko", "se", "ne", "par", "ap", "aap", "hum", "tum",
    "yeh", "woh", "kuch", "bhi", "hi", "to", "tha", "thi", "tha",
    "hoga", "hogi", "karo", "karna", "jana", "aana", "theek", "accha",
    "achha", "bahut", "bohat", "shukriya", "mehrbani", "zaroor",
}


def detect_language(text: str) -> str:
    """Return 'urdu', 'roman_urdu', or 'english'."""
    if not text or not isinstance(text, str):
        return "english"
    text_clean = text.strip()
    if not text_clean:
        return "english"

    # Count Urdu/Arabic script chars
    urdu_chars = len(URDU_RE.findall(text_clean))
    if urdu_chars >= 3:
        return "urdu"

    # Check Roman Urdu by keyword matching
    words_lower = set(re.findall(r"\b[a-zA-Z]+\b", text_clean.lower()))
    roman_hits = len(words_lower & ROMAN_URDU_WORDS)
    if roman_hits >= 2:
        return "roman_urdu"

    return "english"


# ─────────────────────────────────────────────────────────────────
# Prompt templates for each conversion direction
# ─────────────────────────────────────────────────────────────────

PROMPTS = {

    # ── Urdu → Roman Urdu ──────────────────────────────────────────
    ("urdu", "roman_urdu"): """You are an expert Urdu-to-Roman-Urdu transliterator.

TASK: Convert Urdu script (Nastaliq) to Roman Urdu (Urdu written in Latin/English alphabet).
This is TRANSLITERATION, NOT translation. The meaning stays in Urdu — only the script changes.

RULES:
- "میں ٹھیک ہوں" → "main theek hoon"  (NOT "I am fine")
- Use natural Pakistani typing style (WhatsApp/social media)
- Common mappings: ہ→h, ع→a/nothing, ق→q, غ→gh, ش→sh, چ→ch, ژ→zh
- ث/س/ص→s, ت/ط→t, ذ/ز/ض/ظ→z, د/ڈ→d, ر/ڑ→r, ی→i/y/ee, و→o/u/w
- Keep English words, numbers, names unchanged
- Keep punctuation

Return ONLY: {"results": ["...", "..."]} with exactly N strings.""",

    # ── Roman Urdu → Urdu ──────────────────────────────────────────
    ("roman_urdu", "urdu"): """You are an expert Roman-Urdu-to-Urdu converter.

TASK: Convert Roman Urdu (Urdu written in Latin alphabet) back into Urdu Nastaliq script.
This is TRANSLITERATION back to script, NOT translation.

RULES:
- "main theek hoon" → "میں ٹھیک ہوں"
- "ap kaise hain" → "آپ کیسے ہیں"
- Use correct Urdu orthography (proper vowel marks where needed)
- Keep English words/names in English
- Keep numbers unchanged

Return ONLY: {"results": ["...", "..."]} with exactly N strings.""",

    # ── English → Roman Urdu ───────────────────────────────────────
    ("english", "roman_urdu"): """You are an expert English-to-Roman-Urdu translator.

TASK: Translate English text into natural conversational Pakistani Urdu,
then write that Urdu in Roman/Latin script (NOT in Urdu script).

RULES:
- "I am fine, how are you?" → "main theek hoon, aap kaise hain?"
- "The president gave a speech" → "president ne speech di"
- Use everyday Pakistani Urdu vocabulary, avoid overly literary words
- Keep proper nouns (names, cities, brands) in English
- Keep numbers in English
- Match the tone: casual for casual, formal for formal news text

Return ONLY: {"results": ["...", "..."]} with exactly N strings.""",

    # ── Roman Urdu → English ───────────────────────────────────────
    ("roman_urdu", "english"): """You are an expert Roman-Urdu-to-English translator.

TASK: Translate Roman Urdu (Urdu written in Latin alphabet) into natural English.

RULES:
- "main theek hoon" → "I am fine"
- "ap kaise hain" → "How are you?"
- Produce fluent, natural English
- Match tone: casual stays casual, formal stays formal
- Keep proper nouns (names, cities) unchanged

Return ONLY: {"results": ["...", "..."]} with exactly N strings.""",

    # ── Urdu → English ─────────────────────────────────────────────
    ("urdu", "english"): """You are an expert Urdu-to-English translator.

TASK: Translate Urdu (Nastaliq script) into natural English.

RULES:
- Produce fluent, idiomatic English
- Match the register: formal/informal, news/casual
- Keep proper nouns (names, cities) in recognisable form
- Keep numbers unchanged

Return ONLY: {"results": ["...", "..."]} with exactly N strings.""",

    # ── English → Urdu ─────────────────────────────────────────────
    ("english", "urdu"): """You are an expert English-to-Urdu translator.

TASK: Translate English text into natural Urdu written in Nastaliq script.

RULES:
- Produce correct, fluent Urdu
- Use common Pakistani Urdu vocabulary
- Match the register: formal news → formal Urdu, casual → casual Urdu
- Keep proper nouns (names, cities, brands) in recognisable form
- Write numbers in English digits (not Urdu numerals)

Return ONLY: {"results": ["...", "..."]} with exactly N strings.""",
}


# ─────────────────────────────────────────────────────────────────
# Translator class
# ─────────────────────────────────────────────────────────────────
class GroqTranslator:
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY missing — add it to backend/.env")
        self.async_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.sync_client  = Groq(api_key=settings.GROQ_API_KEY)
        self.model        = settings.GROQ_MODEL
        self.temperature  = settings.GROQ_TEMPERATURE
        self._sem         = asyncio.Semaphore(settings.MAX_CONCURRENT)

    def _get_system(self, src: str, tgt: str) -> str:
        key = (src, tgt)
        if key not in PROMPTS:
            raise ValueError(f"Unsupported conversion: {src} → {tgt}")
        return PROMPTS[key]

    # ── sync (single text, used by /text endpoint) ────────────────
    def translate_sync(self, text: str, src: str, tgt: str) -> str:
        if not text or not text.strip():
            return text
        if src == tgt:
            return text
        system = self._get_system(src, tgt)
        prompt = (
            f"Convert exactly 1 text. Respond in JSON.\n"
            f'INPUT: {json.dumps([text], ensure_ascii=False)}\n'
            f'Return JSON: {{"results": ["..."]}}'
        )
        resp = self.sync_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system},
                      {"role": "user",   "content": prompt}],
            temperature=self.temperature,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        arr = self._parse(raw, 1)
        return arr[0] if arr else text

    # ── async batch (used by dataset pipeline) ────────────────────
    async def translate_batch(self, texts: List[str], src: str, tgt: str) -> List[str]:
        if not texts:
            return []
        if src == tgt:
            return list(texts)

        # track non-empty slots
        idx   = [i for i, t in enumerate(texts) if str(t).strip()]
        items = [str(texts[i]) for i in idx]
        if not items:
            return list(texts)

        system = self._get_system(src, tgt)
        prompt = (
            f"Convert exactly {len(items)} texts in order. Respond in JSON.\n"
            f'INPUT: {json.dumps(items, ensure_ascii=False)}\n'
            f'Return JSON: {{"results": ["...", ...]}}'
            f' with EXACTLY {len(items)} strings.'
        )

        async with self._sem:
            try:
                resp = await self.async_client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "system", "content": system},
                              {"role": "user",   "content": prompt}],
                    temperature=self.temperature,
                    response_format={"type": "json_object"},
                )
                arr = self._parse(resp.choices[0].message.content, len(items))
            except Exception as e:
                print(f"[Groq batch error] {type(e).__name__}: {e}")
                arr = items  # fall back to originals

        result = list(texts)
        for src_i, val in zip(idx, arr):
            result[src_i] = val
        return result

    # ── JSON parser ───────────────────────────────────────────────
    @staticmethod
    def _parse(raw: str, expected: int) -> List[str]:
        try:
            data = json.loads(raw)
        except Exception:
            m = re.search(r"\[.*?\]", raw, re.S)
            if m:
                try:
                    data = {"results": json.loads(m.group())}
                except Exception:
                    return [""] * expected
            else:
                return [""] * expected

        arr: list = []
        if isinstance(data, dict):
            for k in ("results", "result", "output", "translations", "items", "converted"):
                if isinstance(data.get(k), list):
                    arr = data[k]; break
            if not arr:
                for v in data.values():
                    if isinstance(v, list):
                        arr = v; break
        elif isinstance(data, list):
            arr = data

        arr = [str(x) for x in arr]
        if len(arr) < expected:
            arr += [""] * (expected - len(arr))
        return arr[:expected]


_instance: Optional[GroqTranslator] = None


def get_translator() -> GroqTranslator:
    global _instance
    if _instance is None:
        _instance = GroqTranslator()
    return _instance

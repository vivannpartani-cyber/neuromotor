"""
Central LLM factory.
Uses Groq's OpenAI-compatible endpoint so we can run openai/gpt-oss-120b
without needing a separate langchain-groq package.
"""
import os
from langchain_openai import ChatOpenAI

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL    = "openai/gpt-oss-120b"

def get_llm(temperature: float = 0.0) -> ChatOpenAI:
    """Return a ChatOpenAI client wired to Groq's API."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GROQ_API_KEY is not set. "
            "Get a free key at https://console.groq.com and add it to corpus_callosum/.env"
        )
    return ChatOpenAI(
        model=GROQ_MODEL,
        base_url=GROQ_BASE_URL,
        api_key=api_key,
        temperature=temperature,
    )

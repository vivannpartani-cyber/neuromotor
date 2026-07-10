"""
Temporal Lobe — Pattern Recognition & Anti-Pattern Detection
Recognizes code patterns, design patterns, and dangerous anti-patterns.
Fires during: code review, security scan, architect modes.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

LLM = lambda: ChatOpenAI(
    model="qwen/qwen3-32b",
    temperature=0,
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

def temporal_node(state: AgentState) -> dict:
    llm = LLM()
    code_context = state.get("editor_code") or state.get("repo_code") or ""
    wernicke = state.get("wernicke_out", "")
    sys_prompt = f"""You are the Temporal Lobe — the pattern recognition center of the brain.
Your job is to identify PATTERNS, ANTI-PATTERNS, and CODE SMELLS.

What Wernicke's comprehended:
{wernicke}

CODE CONTEXT:
{code_context[:4000] if code_context else "No code provided — analyze based on the user's description."}

Your output:
- Recognized design patterns used (or that should be used)
- Anti-patterns detected (God Object, Spaghetti Code, N+1 queries, hardcoded secrets, etc.)
- Code smell catalog (magic numbers, duplicated logic, dead code, etc.)
- Security patterns: auth patterns, injection vulnerabilities, exposed credentials
- Recommendations for better architectural patterns

Format as categorized bullet points."""
    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User request: {state.get('user_input', '')}")
    ])
    return {"temporal_out": resp.content}

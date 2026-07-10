"""
Wernicke's Area — Code Comprehension
Reads and semantically understands the user's code or prompt.
This fires first: it READS before anything else can act.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

LLM = lambda: ChatOpenAI(
    model="llama-3.3-70b-versatile",
    temperature=0,
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

def wernicke_node(state: AgentState) -> dict:
    llm = LLM()
    code_context = state.get("editor_code") or state.get("repo_code") or ""
    sys_prompt = f"""You are Wernicke's Area — the language comprehension center of the brain.
Your ONLY job is to READ and UNDERSTAND what the user wants and what their code does.
Produce a concise semantic summary (3-5 sentences max) covering:
- What the user is trying to accomplish
- What the code/repo actually does (if provided)
- Key variables, functions, or structures involved
- Any obvious mismatches between intent and implementation

CODE CONTEXT:
{code_context[:3000] if code_context else "No code provided."}

Do NOT suggest fixes. Just comprehend."""
    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User request: {state.get('user_input', '')}")
    ])
    return {"wernicke_out": resp.content}

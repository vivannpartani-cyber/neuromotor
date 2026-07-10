"""
Parietal Lobe — Logical Reasoning & Execution Tracing
Traces code execution, finds bugs, analyzes algorithms step-by-step.
Fires during: debug, code review, bug detection modes.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

LLM = lambda: ChatOpenAI(
    model="llama3-8b-8192",
    max_retries=1,
    temperature=0,
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

def parietal_node(state: AgentState) -> dict:
    llm = LLM()
    code_context = state.get("editor_code") or state.get("repo_code") or ""
    mode = state.get("mode", "chat")
    
    if mode == "chat":
        return {"parietal_out": "Parietal lobe bypassed in chat mode."}
    
    wernicke = state.get("wernicke_out", "")
    sys_prompt = f"""You are the Parietal Lobe — the spatial and logical reasoning center.
Your job is to TRACE EXECUTION and FIND BUGS.

What Wernicke's comprehended:
{wernicke}

CODE TO ANALYZE:
{code_context[:4000] if code_context else "No code provided — analyze based on the user's description."}

Your output (be specific and surgical):
- Step-by-step execution trace of any problematic path
- Exact line or function where logic fails (if any)
- Time/space complexity assessment
- Off-by-one errors, infinite loops, wrong conditions, null dereferences
- Edge cases not handled

Format as bullet points. Be ruthless."""
    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User request: {state.get('user_input', '')}")
    ])
    return {"parietal_out": resp.content}

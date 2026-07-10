"""
Broca's Area — Code & Language Generation
Executes the Prefrontal's plan. Writes the actual code and explanation.
This is the OUTPUT generator — fires last in the cognitive chain.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

LLM = lambda: ChatOpenAI(
    model="llama-3.3-70b-versatile",
    temperature=0.1,
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

def broca_node(state: AgentState) -> dict:
    llm = LLM()
    sys_prompt = f"""You are Broca's Area — the language and code production center of the brain.
You receive a structured plan from the Prefrontal Cortex and EXECUTE it into the final developer-facing response.

THE PLAN FROM PREFRONTAL CORTEX:
{state.get('prefrontal_out', '')}

WHAT WERNICKE'S UNDERSTOOD:
{state.get('wernicke_out', '')}

WHAT PARIETAL FOUND (bugs/logic):
{state.get('parietal_out', '')}

WHAT TEMPORAL FOUND (patterns):
{state.get('temporal_out', '')}

USER EMOTION (from Amygdala): {state.get('emotion_state', 'neutral')}

INSTRUCTIONS:
- Write clear, production-quality code in the appropriate language
- Use markdown formatting with proper code blocks (```language ... ```)
- If debugging: show the BROKEN version, then the FIXED version with inline comments
- If architecting: produce a clear system diagram in ASCII or text, then code scaffolding
- If reviewing: produce a structured report with severity ratings [🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low]
- Adapt verbosity to the user's emotional state — if frustrated, be direct and concise
- End with a "Cerebellum will refine the code style" note if code was generated

This is the FINAL response the user will read."""
    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Original request: {state.get('user_input', '')}")
    ])
    return {"broca_out": resp.content}

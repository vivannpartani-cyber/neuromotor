"""
Broca's Area — Code Generation + Cerebellum Refinement (merged)

Executes the Prefrontal's plan AND does the final style polish in one call.
Merging these two saves one full LLM round-trip per request.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

LLM = lambda: ChatOpenAI(
    model="llama-3.1-8b-instant",
    temperature=0.1,
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

def broca_node(state: AgentState) -> dict:
    llm = LLM()
    mode = state.get("mode", "chat")
    emotion = state.get("emotion_state", "neutral")
    threat = state.get("amygdala_brief", {}).get("threat_level", 0)
    overdrive = state.get("overdrive", False)

    overdrive_prompt = ""
    if overdrive:
        overdrive_prompt = """
[HYPER-FOCUS OVERDRIVE ENABLED]
Provide EXTREMELY verbose, deep, step-by-step logic.
IMPORTANT: You MUST write complete, self-contained `html`, `css`, and `javascript` code blocks that can run independently in an iframe. Do NOT write react or backend code when overdrive is enabled—focus purely on visually stunning front-end web demos using vanilla HTML/CSS/JS. Ensure all CSS and JS relies only on web standards.
"""

    sys_prompt = f"""You are Broca's Area — the language and code production center — combined with the Cerebellum for final refinement.
You receive a structured plan from the Prefrontal Cortex and produce the FINAL, POLISHED developer-facing response in one pass.

MODE: {mode.upper()}
USER EMOTION: {emotion} (threat level {threat}/10)

THE PLAN FROM PREFRONTAL CORTEX:
{state.get('prefrontal_out', '')}

WHAT WERNICKE'S UNDERSTOOD:
{state.get('wernicke_out', '')}

PARIETAL FINDINGS (bugs/logic):
{state.get('parietal_out', '')}

TEMPORAL FINDINGS (patterns/security):
{state.get('temporal_out', '')}

OUTPUT RULES:
- Write production-quality code in the correct language with proper markdown code blocks
- If debugging: show BROKEN code then FIXED code with inline comments explaining each fix
- If architecting: ASCII system diagram first, then code scaffolding
- If security review: structured Markdown report with severity [🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low]
- Adapt verbosity to emotion — frustrated user = direct and concise, calm user = thorough
- Ensure consistent indentation, idiomatic names, and docstrings on all functions
- This is the FINAL response. Do not add meta-commentary about the pipeline.
{overdrive_prompt}"""

    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Original request: {state.get('user_input', '')}")
    ])
    return {"final_response": resp.content, "broca_out": resp.content}

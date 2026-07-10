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
IMPORTANT: You MUST write complete, self-contained code blocks using STRICT Markdown formatting with the exact tags: `html`, `css`, and `javascript`. 
For example:
```html
<!-- your html -->
```
```css
/* your css */
```
```javascript
// your js
```
If you do not use these exact markdown tags, the Live Sandbox will FAIL to render. Focus purely on visually stunning front-end web demos using vanilla HTML/CSS/JS. Do not write Node.js or backend code when overdrive is enabled.
"""

    # Truncate each upstream output to keep total prompt within free-tier token limits
    T = 600
    plan    = (state.get('prefrontal_out', '') or '')[:T]
    wern    = (state.get('wernicke_out',   '') or '')[:T]
    pari    = (state.get('parietal_out',   '') or '')[:T]
    temp    = (state.get('temporal_out',   '') or '')[:T]

    sys_prompt = f"""You are Broca's Area — code production + Cerebellum refinement in one pass.

MODE: {mode.upper()} | EMOTION: {emotion} | THREAT: {threat}/10

PLAN: {plan}
COMPREHENSION: {wern}
LOGIC: {pari}
PATTERNS: {temp}

RULES:
- Production-quality code with proper markdown fences
- Debug mode: show broken then fixed code
- Architect mode: ASCII diagram then scaffolding
- Security mode: severity-tagged markdown report
- Final response only — no meta-commentary
{overdrive_prompt}"""

    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Original request: {state.get('user_input', '')}")
    ])
    return {"final_response": resp.content, "broca_out": resp.content}

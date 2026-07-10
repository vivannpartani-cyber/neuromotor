"""
Prefrontal Cortex — Planning & Architecture Decisions
The highest-order node. Plans systems, makes decisions, structures output.
Fires during: architect, chat (general), all modes as the planner.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

LLM = lambda: ChatOpenAI(
    model="llama-3.1-8b-instant",
    temperature=0.2,
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

def prefrontal_node(state: AgentState) -> dict:
    llm = LLM()
    wernicke = state.get("wernicke_out", "")
    parietal = state.get("parietal_out", "")
    temporal = state.get("temporal_out", "")
    mode = state.get("mode", "chat")
    overdrive = state.get("overdrive", False)

    if mode == "chat":
        return {"prefrontal_out": "Prefrontal cortex bypassed in chat mode. Proceed to generate directly."}

    overdrive_prompt = ""
    if overdrive:
        overdrive_prompt = """
[HYPER-FOCUS OVERDRIVE ENABLED]
Provide EXTREMELY verbose, deep, step-by-step logic.
IMPORTANT: You MUST plan for complete, self-contained code blocks using STRICT Markdown formatting with the exact tags: `html`, `css`, and `javascript`. 
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
    
    # Cap upstream context to avoid blowing token budget
    T = 500
    w = (wernicke  or '')[:T]
    p = (parietal  or '')[:T]
    t = (temporal  or '')[:T]
    mem = str(state.get('hippocampus_report', {}).get('memory_summary', ''))[:200]

    sys_prompt = f"""You are the Prefrontal Cortex — planning center.
Produce a SHORT structured plan (bullet points, max 200 words) for Broca to execute.

MODE: {mode.upper()} | EMOTION: {state.get('emotion_state','neutral')} | THREAT: {state.get('amygdala_brief',{}).get('threat_level',0)}/10
MEMORY: {mem}
COMPREHENSION: {w}
LOGIC: {p}
PATTERNS: {t}
{overdrive_prompt}
This plan goes to Broca's Area. Be concise."""
    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User request: {state.get('user_input', '')}")
    ])
    return {"prefrontal_out": resp.content}

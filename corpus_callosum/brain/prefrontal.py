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
    model="llama-3.3-70b-versatile",
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
    
    sys_prompt = f"""You are the Prefrontal Cortex — the planning and executive decision-making center.
You receive inputs from the other brain regions and produce a PLAN for the final response.

Mode: {mode.upper()}

What Wernicke's comprehended:
{wernicke}

What Parietal found (logic/bugs):
{parietal}

What Temporal found (patterns):
{temporal}

Memory from Hippocampus:
{state.get('hippocampus_report', {}).get('memory_summary', 'No prior context.')}

Biometric state (Amygdala):
Emotion: {state.get('emotion_state', 'neutral')} | Threat: {state.get('amygdala_brief', {}).get('threat_level', 0)}/10

Based on all the above, produce a STRUCTURED PLAN (not the final answer):
- What the final response should accomplish
- What sections or steps it should include
- What code should be written (if any)
- The tone/depth to use (adjust for frustration level)

This plan will be handed to Broca's Area for execution."""
    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User request: {state.get('user_input', '')}")
    ])
    return {"prefrontal_out": resp.content}

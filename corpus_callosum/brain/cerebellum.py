"""
Cerebellum — Style Refinement & Final Polish
The last node. Cleans up code style, enforces consistency, adds final polish.
Fires after Broca's — it's the fine-motor refinement step.
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

def cerebellum_node(state: AgentState) -> dict:
    llm = LLM()
    broca_output = state.get("broca_out", "")
    
    # Only refine if there's actual code to refine
    if not broca_output or len(broca_output) < 50:
        return {"final_response": broca_output}
    
    sys_prompt = """You are the Cerebellum — the fine-motor refinement center.
You receive Broca's generated response and perform a FINAL POLISH pass.

Your job:
1. Fix any inconsistent indentation or formatting in code blocks
2. Ensure variable names are consistent and idiomatic
3. Add or correct any missing docstrings on functions
4. Remove any redundant or stuttering explanations
5. Ensure the response reads cleanly from top to bottom

IMPORTANT: Return the COMPLETE polished response. Do not summarize or truncate.
If there is no code in the response, return it as-is with no changes."""
    
    resp = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Broca's output to refine:\n\n{broca_output}")
    ])
    return {"final_response": resp.content}

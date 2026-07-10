"""
Cerebellum — Pass-through node (V9.1)
Broca now handles generation + refinement in one call.
Cerebellum is kept in the graph so the brain animation still fires it,
but it makes no LLM call — it just passes final_response through.
"""
from brain.state import AgentState


def cerebellum_node(state: AgentState) -> dict:
    # Broca already wrote final_response. Just propagate it.
    return {"final_response": state.get("broca_out", state.get("final_response", ""))}

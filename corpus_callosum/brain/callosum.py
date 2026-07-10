"""
Corpus Callosum — The Neural Orchestrator (V9.1)

Firing sequence (6 LLM calls instead of 8):
  Amygdala [8b]   → cheap threat/emotion classification
  Hippocampus     → memory lookup (no LLM, pure API)
  Wernicke's [8b] → cheap comprehension summary
      ↓
  Parietal [70b] ←→ Temporal [70b]   ← true parallel
      ↓
  Prefrontal [70b] → planning
      ↓
  Broca [70b]      → generation + refinement (merged with Cerebellum)
      ↓  
  END
"""
from langgraph.graph import StateGraph, END
from brain.state import AgentState
from brain.amygdala import amygdala_node
from brain.hippocampus import hippocampus_node
from brain.wernicke import wernicke_node
from brain.parietal import parietal_node
from brain.temporal import temporal_node
from brain.prefrontal import prefrontal_node
from brain.broca import broca_node
from brain.cerebellum import cerebellum_node


def route_after_wernicke(state: AgentState):
    return ["parietal", "temporal"]


workflow = StateGraph(AgentState)

workflow.add_node("amygdala",    amygdala_node)
workflow.add_node("hippocampus", hippocampus_node)
workflow.add_node("wernicke",    wernicke_node)
workflow.add_node("parietal",    parietal_node)
workflow.add_node("temporal",    temporal_node)
workflow.add_node("prefrontal",  prefrontal_node)
workflow.add_node("broca",       broca_node)
# Cerebellum kept as a pass-through node so the brain animation still fires it
workflow.add_node("cerebellum",  cerebellum_node)

workflow.set_entry_point("amygdala")
workflow.add_edge("amygdala",    "hippocampus")
workflow.add_edge("hippocampus", "wernicke")

workflow.add_conditional_edges(
    "wernicke",
    route_after_wernicke,
    ["parietal", "temporal"]
)

workflow.add_edge("parietal",   "prefrontal")
workflow.add_edge("temporal",   "prefrontal")
workflow.add_edge("prefrontal", "broca")
workflow.add_edge("broca",      "cerebellum")
workflow.add_edge("cerebellum", END)

corpus_callosum = workflow.compile()

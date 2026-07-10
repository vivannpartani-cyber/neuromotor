"""
Corpus Callosum — The Neural Orchestrator (V9)

Implements a true anatomical brain graph:
  Amygdala → Hippocampus → Wernicke's
                              ↓
                    [Parallel: Parietal + Temporal]  ← mode-dependent
                              ↓
                          Prefrontal
                              ↓
                           Broca's
                              ↓
                          Cerebellum → END
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
    """
    Intelligent routing: which parallel lobes fire depends on the mode.
    - debug     → parietal (logic tracing) + temporal (patterns)
    - security  → temporal (patterns/anti-patterns)
    - architect → parietal (structure) + temporal (patterns)
    - chat      → parietal + temporal (always both for rich context)
    """
    mode = state.get("mode", "chat")
    # All modes currently use both; this is extensible
    return ["parietal", "temporal"]


workflow = StateGraph(AgentState)

# Register all nodes
workflow.add_node("amygdala",    amygdala_node)
workflow.add_node("hippocampus", hippocampus_node)
workflow.add_node("wernicke",    wernicke_node)
workflow.add_node("parietal",    parietal_node)
workflow.add_node("temporal",    temporal_node)
workflow.add_node("prefrontal",  prefrontal_node)
workflow.add_node("broca",       broca_node)
workflow.add_node("cerebellum",  cerebellum_node)

# Wire the graph
workflow.set_entry_point("amygdala")
workflow.add_edge("amygdala", "hippocampus")
workflow.add_edge("hippocampus", "wernicke")

# Wernicke fans out to Parietal + Temporal in parallel
workflow.add_conditional_edges(
    "wernicke",
    route_after_wernicke,
    ["parietal", "temporal"]
)

# Both parallel lobes converge on Prefrontal
workflow.add_edge("parietal", "prefrontal")
workflow.add_edge("temporal", "prefrontal")

# Sequential: Prefrontal → Broca's → Cerebellum → END
workflow.add_edge("prefrontal", "broca")
workflow.add_edge("broca",      "cerebellum")
workflow.add_edge("cerebellum", END)

corpus_callosum = workflow.compile()

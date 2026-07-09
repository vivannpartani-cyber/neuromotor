"""
The LangGraph Orchestrator
Now implements Parallel Hidden Layers for true Neural Network execution.
"""
from langgraph.graph import StateGraph, END
from brain.state import AgentState
from brain.amygdala import amygdala_node
from brain.hippocampus import hippocampus_node
from brain.syntax import syntax_node
from brain.logic import logic_node
from brain.security import security_node
from brain.frontal_lobe import frontal_lobe_node

def route_amygdala(state: AgentState):
    """
    Decides whether to do a memory retrieval or go straight to parallel execution.
    If the Amygdala flags threat > 8, we skip memory and act immediately.
    """
    threat = state.get("amygdala_brief", {}).get("threat_level", 0)
    if threat >= 8:
        return "syntax" # Skip memory, go straight to parallel
    return "hippocampus"

# Initialize graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("amygdala", amygdala_node)
workflow.add_node("hippocampus", hippocampus_node)

# Add Parallel Nodes
workflow.add_node("syntax", syntax_node)
workflow.add_node("logic", logic_node)
workflow.add_node("security", security_node)

workflow.add_node("frontal_lobe", frontal_lobe_node)

# Define Edges
workflow.set_entry_point("amygdala")
workflow.add_conditional_edges("amygdala", route_amygdala, {
    "hippocampus": "hippocampus",
    "syntax": "syntax" # Fallback mapping if urgent
})

# Fan out from hippocampus to parallel nodes
workflow.add_edge("hippocampus", "syntax")
workflow.add_edge("hippocampus", "logic")
workflow.add_edge("hippocampus", "security")

# If urgent branch was taken, we still need logic and security to fire. 
# LangGraph allows conditional edges to return lists of nodes to fan out!
# Wait, for simplicity, I'll update route_amygdala to return a list of parallel nodes.

def route_amygdala_parallel(state: AgentState):
    threat = state.get("amygdala_brief", {}).get("threat_level", 0)
    if threat >= 8:
        return ["syntax", "logic", "security"]
    return ["hippocampus"]

# Update conditional edges
workflow.add_conditional_edges("amygdala", route_amygdala_parallel, ["hippocampus", "syntax", "logic", "security"])

# Fan out from hippocampus
def fan_out_from_hippo(state: AgentState):
    return ["syntax", "logic", "security"]

workflow.add_conditional_edges("hippocampus", fan_out_from_hippo, ["syntax", "logic", "security"])

# Fan in to Frontal Lobe
workflow.add_edge("syntax", "frontal_lobe")
workflow.add_edge("logic", "frontal_lobe")
workflow.add_edge("security", "frontal_lobe")

workflow.add_edge("frontal_lobe", END)

corpus_callosum = workflow.compile()

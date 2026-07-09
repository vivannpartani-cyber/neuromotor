import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from brain.state import AgentState
from brain.amygdala import amygdala_node
from brain.hippocampus import hippocampus_node
from brain.frontal_lobe import frontal_lobe_node

# Load .env so keys are available before building the graph
load_dotenv()

def route_amygdala(state: AgentState) -> str:
    if state.get("is_urgent"):
        return "END"
    return "hippocampus"

def route_frontal_lobe(state: AgentState) -> str:
    messages = state.get("messages", [])
    if messages and hasattr(messages[-1], "tool_calls") and messages[-1].tool_calls:
        return "tools"
    return "END"

def build_graph():
    # Build tools here after .env is loaded
    from langchain_tavily import TavilySearch
    tools = [TavilySearch(max_results=2)] if os.getenv("TAVILY_API_KEY") else []

    builder = StateGraph(AgentState)
    
    # Add Nodes
    builder.add_node("amygdala", amygdala_node)
    builder.add_node("hippocampus", hippocampus_node)
    builder.add_node("frontal_lobe", frontal_lobe_node)
    builder.add_node("tools", ToolNode(tools) if tools else ToolNode([]))
    
    # Add Edges
    builder.set_entry_point("amygdala")
    builder.add_conditional_edges("amygdala", route_amygdala, {"END": END, "hippocampus": "hippocampus"})
    builder.add_edge("hippocampus", "frontal_lobe")
    builder.add_conditional_edges("frontal_lobe", route_frontal_lobe, {"tools": "tools", "END": END})
    builder.add_edge("tools", "frontal_lobe")
    
    return builder.compile()

# Export the compiled graph
corpus_callosum = build_graph()

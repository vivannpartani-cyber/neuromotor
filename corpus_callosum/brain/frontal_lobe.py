"""
Frontal Lobe Node — Executive Function

The heavy thinker. Unlike the other nodes, this agent:
- Reads the Amygdala's routing brief and adapts its tone accordingly
- Explicitly uses Hippocampus memories to ground its response
- Has access to web search for real-world data
- Uses multi-step tool calling in a loop until ready to respond

This is where ChatGPT stops — a single prompt. Here, the Frontal Lobe
is explicitly briefed by two other specialist agents before it speaks.
"""
import os
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_tavily import TavilySearch
from brain.state import AgentState
from brain.llm import get_llm


def _make_tools():
    if os.getenv("TAVILY_API_KEY"):
        return [TavilySearch(max_results=3)]
    return []


def frontal_lobe_node(state: AgentState) -> dict:
    """Executive reasoning — fully briefed by Amygdala and Hippocampus."""
    active_tools = _make_tools()
    llm = get_llm(temperature=0.3)
    llm_with_tools = llm.bind_tools(active_tools) if active_tools else llm

    # ── Read briefs from upstream agents ──────────────────────────
    amygdala_brief    = state.get("amygdala_brief", {})
    hippocampus_report = state.get("hippocampus_report", {})
    context           = state.get("context", [])

    routing_note    = amygdala_brief.get("routing_note", "Answer clearly and helpfully.")
    emotional_tone  = amygdala_brief.get("emotional_tone", "neutral")
    threat_level    = amygdala_brief.get("threat_level", 0)
    memory_summary  = hippocampus_report.get("memory_summary", "(No memories retrieved)")
    repeat_topic    = hippocampus_report.get("repeat_topic", False)

    context_block = "\n\n".join(context) if context else "(No episodic memories retrieved)"

    # ── Build a fully-briefed system prompt ───────────────────────
    system_prompt = f"""You are the Frontal Lobe — the executive reasoning center of a multi-agent AI brain called Corpus Callosum.

You have been briefed by two specialist agents before responding:

━━━ AMYGDALA BRIEF (threat & context assessment) ━━━
• Threat level: {threat_level}/10
• User's emotional tone: {emotional_tone}
• Routing directive: {routing_note}

━━━ HIPPOCAMPUS BRIEF (long-term memory) ━━━
{memory_summary}
{"⚠️  This topic has come up before — acknowledge continuity with the user." if repeat_topic else ""}

━━━ RETRIEVED EPISODIC MEMORIES ━━━
{context_block}

━━━ YOUR DIRECTIVE ━━━
Use your tools (web search) for any question requiring real-world or current data.
Explicitly acknowledge relevant memories when present — the user should feel you remember them.
Follow the Amygdala's routing directive on tone and approach.
Be genuinely useful — not generic."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        ("user", "{user_input}"),
    ])

    chain  = prompt | llm_with_tools
    response = chain.invoke({
        "messages":   state.get("messages", []),
        "user_input": state.get("user_input", ""),
    })

    return {"messages": [response], "final_response": response.content}

"""
Amygdala Node — The Sentinel

Not just urgent/not-urgent. This agent performs a full threat + context
assessment and produces a routing brief that downstream agents use to
calibrate their approach. It's the fastest, most tightly scoped agent —
zero tools, zero memory, zero latency.
"""
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from brain.state import AgentState
from brain.llm import get_llm


class AmygdalaResponse(BaseModel):
    is_urgent: bool = Field(
        description="True ONLY for immediate interrupts: 'stop', 'delete now', 'emergency', etc."
    )
    threat_level: int = Field(
        ge=0, le=10,
        description="0=benign curiosity, 5=complex/sensitive, 10=critical interrupt"
    )
    emotional_tone: str = Field(
        description="One of: neutral | curious | analytical | distressed | urgent | hostile | creative"
    )
    topic_domain: str = Field(
        description="Primary domain: science | technology | personal | creative | philosophy | current_events | code | math | other"
    )
    routing_note: str = Field(
        description=(
            "A one-sentence briefing for the Frontal Lobe on HOW to answer this. "
            "e.g. 'User seems distressed — be concise and empathetic.' "
            "or 'Deep technical question — prioritize accuracy over brevity.'"
        )
    )
    immediate_action: str = Field(
        description="The reflex response text if is_urgent=True, else empty string."
    )


AMYGDALA_PROMPT = PromptTemplate.from_template(
    """You are the Amygdala — the sentinel agent of a multi-agent AI brain.

Your ONLY job is rapid threat and context assessment. You do NOT answer the user's question.
You produce a structured brief that routes the query and briefs downstream agents.

Assess the following user input across these dimensions:
1. Is it an urgent interrupt requiring instant action? (e.g. "STOP", "DELETE", "EMERGENCY")
2. What is the threat/complexity level (0-10)?
3. What emotional tone does the user have?
4. What domain does this query belong to?
5. Write a one-sentence routing note for the Frontal Lobe on HOW to approach this.

User Input: {input}"""
)


def amygdala_node(state: AgentState) -> dict:
    """Sentinel — rapid threat assessment and routing brief."""
    llm = get_llm(temperature=0)
    structured_llm = llm.with_structured_output(AmygdalaResponse)
    chain = AMYGDALA_PROMPT | structured_llm
    result: AmygdalaResponse = chain.invoke({"input": state.get("user_input", "")})

    return {
        "is_urgent": result.is_urgent,
        "amygdala_brief": {
            "threat_level":   result.threat_level,
            "emotional_tone": result.emotional_tone,
            "topic_domain":   result.topic_domain,
            "routing_note":   result.routing_note,
        },
        "final_response": result.immediate_action if result.is_urgent else "",
    }

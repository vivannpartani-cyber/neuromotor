import operator
from typing import TypedDict, List, Annotated, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    user_input:         str
    emotion_state:      str
    messages:           Annotated[list[BaseMessage], add_messages]
    context:            List[str]
    is_urgent:          bool
    final_response:     str
    # Amygdala brief — passed to Frontal Lobe
    amygdala_brief:     dict
    # Hippocampus report — passed to Frontal Lobe
    hippocampus_report: dict
